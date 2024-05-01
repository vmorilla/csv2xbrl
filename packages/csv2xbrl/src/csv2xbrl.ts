import csv from 'csv-parser';
import fs from 'fs';
import { Metadata, Parameters, registerNamespace, TableTemplate, isFactColumn, CsvDecimals, PropertyGroup, dimensionsInPropertyGroup, decimalsInPropertyGroup, loadCSVMetadata } from './csv-metadata';
import { Decimals, XbrlBuilder } from './xbrl-builder';
import { Resolver } from './resolvers';
import { Concept, Taxonomy, isConcept, isDimension } from './taxonomy';
import { QName, resolveQName } from './qname';
import { Logger } from './logger';
import { stripBOM } from './bom';
import { fileURLToPath, resolve } from 'url';
import { XBRLError, oime, xbrlce } from './errors';
import { FullDimensions } from './xbrl-builder';
import { resolveSQName } from './oim';
import { parsePeriod } from './csv-period';
import { mapValues } from './minifunctional';
import { Stream } from 'stream';

export interface ConversionOptions {
    logger?: Logger;
    domainPrefix?: string;
}

const defaultOptions = {
    domainPrefix: "dom"
}


type Row = {
    rowNumber: number;
    columns: { [column: string]: string }
};

type DimKey = string & keyof FullDimensions; // avoids number to be considered as a possible key

type PreprocessedDimensions = {
    [K in DimKey]: ((arg: Row) => FullDimensions[K]);
};

type TablePreprocessedDimensions = {
    [columnId: string]: PreprocessedDimensions;
};

type TablePreprocessedDecimals = {
    [columnId: string]: ((arg: Row) => Decimals);
};


export async function csv2xbrl(jsonFile: string, output: NodeJS.WritableStream, resolver: Resolver, options?: ConversionOptions) {
    const transformer = await CSV2XBRLTransformer.create(jsonFile, resolver, options || {});
    await transformer.build(output);
}

class CSV2XBRLTransformer {

    static async create(jsonURL: string, resolver: Resolver, options: ConversionOptions) {
        // TODO: consider baseURL in metadata
        const metadata = await loadCSVMetadata(jsonURL, resolver);
        const entrypoint = metadata.documentInfo.taxonomy.map(t => resolve(jsonURL, t));
        const taxonomy = await Taxonomy.load(entrypoint, resolver, options.logger);
        const parametersFile = metadata.parameterURL ? await loadParametersFile(resolve(jsonURL, metadata.parameterURL), resolver) : {};
        return new CSV2XBRLTransformer(metadata, taxonomy, jsonURL, { ...defaultOptions, ...options }, parametersFile);
    }

    private conceptsCache: { [concept: string]: Concept } = {};

    public constructor(public metadata: Metadata, public taxonomy: Taxonomy, public baseURL: string, public options: ConversionOptions, public parameterFile?: Parameters) {
    }

    public async build(output: NodeJS.WritableStream): Promise<void> {
        const xbrl = new XbrlBuilder(this.taxonomy.entryPoints, this.metadata.documentInfo.namespaces, output);

        for (const tableId in this.metadata.tables) {
            xbrl.comment(`Table ${tableId}`);
            await this.parseTable(tableId, xbrl);
        }

        xbrl.end();
    }

    private parseTable(tableId: string, xbrl: XbrlBuilder): Promise<void> {
        const table = this.metadata.tables![tableId];
        const templateId = table.template || tableId;
        const template = this.metadata.tableTemplates![templateId];

        const csvFile = fileURLToPath(resolve(this.baseURL, table.url));
        const tableDimensions = this.preprocessTableDimensions(tableId);
        const tableDecimals = this.preprocessTableDecimals(tableId);

        const stream = fs.createReadStream(csvFile).pipe(stripBOM()).pipe(csv());
        return new Promise((resolve, reject) => {
            let rowNumber = 0;
            stream.on('headers', (headers) => {
                try {
                    checkHeaders(headers, table.url, template);
                } catch (error) {
                    reject(error);
                }
            });
            stream.on('data', (columns: { [col: string]: string }) => {
                rowNumber++;
                try {
                    for (const [column, value] of Object.entries(columns)) {
                        if (column !== '') { // Skips empty columns (as defined in the spec)
                            const columnDimensions = tableDimensions[column];
                            if (isFactColumn(template.columns[column])) {
                                const row = { rowNumber, columns };
                                const { concept, unit, ...contextDimensions } = evalColumnDimensions(columnDimensions, row);

                                if (this.isNumeric(concept as string)) {
                                    const [amount, expDecimals] = parseNumber(value);
                                    const columnDecimals = tableDecimals[column];
                                    const decimals = expDecimals ?? columnDecimals(row);

                                    xbrl.numericFact(concept as string, decimals as number | "INF", unit as string | null || "pure", contextDimensions, amount);
                                }
                                else {
                                    xbrl.nonNumericFact(concept as string, contextDimensions, value);
                                }
                            }
                        }
                    }
                } catch (error) {
                    reject(error);
                }
            });
            stream.on('end', resolve);
            stream.on('error', reject);
        });
    }


    private isNumeric(conceptStr: string) {
        const cachedConcept = this.conceptsCache[conceptStr] as Concept | undefined;
        if (cachedConcept) {
            return cachedConcept.numeric;
        } else {
            const qname = resolveQName(conceptStr, this.metadata.documentInfo.namespaces);
            const concept = this.taxonomy.get(qname);
            if (!concept || !isConcept(concept))
                throw new Error(`Concept ${conceptStr} not found in taxonomy`);

            this.conceptsCache[conceptStr] = concept;
            return concept.numeric;
        }
    }

    /**
     * Gets a prefixed qname string for the given qname. If the namespace is not yet in the metadata, a new prefix is
     * assigned using the provided prefix as first part.
     * @param qname 
     * @param prefix 
     * @returns 
     */
    private prefixedQName(qname: QName, prefix: string) {
        const nsprefix = registerNamespace(this.metadata, qname.ns, prefix);
        return `${nsprefix}:${qname.localName}`;
    }

    private getTypedDomain(dimension: string) {
        const dimQName = resolveQName(dimension, this.namespaces);
        const dimObject = this.taxonomy.get(dimQName);
        if (!dimObject || !isDimension(dimObject))
            throw new XBRLError(oime.unknownDimension, `Dimension ${dimension} not found in the taxonomy`);

        if (dimObject.typedDomain) {
            const domainPrefix = this.options.domainPrefix!;
            return this.prefixedQName(dimObject.typedDomain.name, domainPrefix);
        }
        else {
            return undefined;
        }
    }

    private get namespaces() {
        return this.metadata.documentInfo.namespaces;
    }

    public async transform(output: NodeJS.WritableStream) {
        const xbrl = new XbrlBuilder(this.taxonomy.entryPoints, this.metadata.documentInfo.namespaces, output);

        for (const tableId in this.metadata.tables) {
            xbrl.comment(`Table ${tableId}`);
            await this.parseTable(tableId, xbrl);
        }

        xbrl.end();
    }

    private preprocessTableDecimals(tableId: string): TablePreprocessedDecimals {
        const metadata = this.metadata;
        const reportDecimals = metadata.decimals;
        const reportParameters = { ...metadata.parameters, ...this.parameterFile };

        const table = metadata.tables![tableId];
        const tableTemplateId = table.template || tableId;
        const tableTemplate = metadata.tableTemplates[tableTemplateId] as TableTemplate | undefined;
        if (!tableTemplate) throw new XBRLError(xbrlce.unknownTableTemplate, `Template ${tableTemplateId} not found in metadata`);

        const tableDecimals = tableTemplate.decimals ?? reportDecimals;

        const tableParameters = { ...reportParameters, ...table.parameters };
        const tableColumnIds = Object.keys(tableTemplate.columns);
        const tablePreprocessedDecimals: { [columnId: string]: ((arg: Row) => Decimals) } = {};

        for (const columnId in tableTemplate.columns) {
            const column = tableTemplate.columns[columnId];
            if (isFactColumn(column)) {

                const columnDecimals = column.decimals ?? tableDecimals;
                let preprocessedColumnDecimals;
                for (const propertyFrom of column.propertiesFrom || []) {
                    if (!tableColumnIds.includes(propertyFrom))
                        throw new XBRLError(xbrlce.invalidPropertyGroupColumnReference, `Invalid column reference "${propertyFrom}" in propertiesFrom field in table ${tableId}, column ${columnId}`);

                    const propertyGroup = tableTemplate.columns[propertyFrom].propertyGroups;
                    if (!propertyGroup)
                        throw new XBRLError(xbrlce.invalidPropertyGroupColumnReference, `Column referenced "${propertyFrom}" in propertiesFrom field does not have a propertiesGroup defined in table ${tableId}`);

                    if (decimalsInPropertyGroup(propertyGroup)) {
                        if (preprocessedColumnDecimals)
                            throw new XBRLError(xbrlce.repeatedPropertyGroupDecimalsProperty, `Repeated property decimals in column "${columnId}", table "${tableId} `);
                        preprocessedColumnDecimals = this.preprocessPropertyGroupDecimals(propertyGroup, tableParameters, tableColumnIds, propertyFrom);
                    }
                }

                if (!preprocessedColumnDecimals)
                    preprocessedColumnDecimals = this.preprocessDecimals(columnDecimals ?? "#none", tableParameters, tableColumnIds);

                tablePreprocessedDecimals[columnId] = preprocessedColumnDecimals;
            }
        }
        return tablePreprocessedDecimals;
    }

    private preprocessDecimals(value: CsvDecimals, parameters: Parameters, columns: string[]): (row: Row) => Decimals {
        if (typeof value === 'number') {
            return () => value;
        }
        if (value.startsWith("$")) {
            const parameterReference = value.substring(1);

            // Column reference
            if (columns.includes(parameterReference))
                return (row: Row) => parseDecimalsReference(row.columns[parameterReference]);

            // Row number reference
            if (parameterReference === 'rowNumber')
                return (row: Row) => parseDecimalsReference(row.rowNumber.toString());

            // Parameter reference
            const parameterValue = parameters[parameterReference];
            if (parameterValue) {
                const value = parseDecimalsReference(parameterValue);
                return () => value;
            }
            else throw new XBRLError(xbrlce.invalidReferenceTarget, `Parameter ${parameterReference} not found in the metadata`);
        }
        else {
            // Direct value
            if (value === "#none")
                return () => "INF";
            else
                throw new XBRLError(xbrlce.invalidDecimalsValue, `Invalid decimals value in metadata: ${value}`)
        }
    }

    private preprocessPropertyGroupDecimals(propertyGroup: PropertyGroup, parameters: Parameters, columns: string[], pgColumn: string) {
        const fnByGroup = mapValues(propertyGroup, (pg) => this.preprocessDecimals(pg.decimals!, parameters, columns));
        return (row: Row) => fnByGroup[row.columns[pgColumn]](row);
    }

    private preprocessTableDimensions(tableId: string): TablePreprocessedDimensions {
        const metadata = this.metadata;
        const reportDimensions = metadata.dimensions;
        const reportParameters = { ...metadata.parameters, ...this.parameterFile };

        const table = metadata.tables![tableId];
        const tableTemplateId = table.template ?? tableId;
        const tableTemplate = metadata.tableTemplates[tableTemplateId] as TableTemplate | undefined;
        if (!tableTemplate) throw new XBRLError(xbrlce.unknownTableTemplate, `Template ${tableTemplateId} not found in metadata`);

        const tableDimensions = { ...reportDimensions, ...tableTemplate.dimensions };

        const tableParameters = { ...reportParameters, ...table.parameters };
        const tableColumnIds = Object.keys(tableTemplate.columns);
        const tablePreprocessedDimensions: TablePreprocessedDimensions = {};

        for (const columnId in tableTemplate.columns) {
            const column = tableTemplate.columns[columnId];
            if (isFactColumn(column)) {
                const columnDimensions = { ...tableDimensions, ...column.dimensions };

                const preprocessedColumnDimensions = mapValues(columnDimensions, (value, dim) => this.preprocessDimension(dim, value, tableParameters, tableColumnIds));
                // Property groups
                for (const propertyFrom of column.propertiesFrom || []) {
                    if (!(tableColumnIds.includes(propertyFrom)))
                        throw new XBRLError(xbrlce.invalidPropertyGroupColumnReference, `Invalid column reference "${propertyFrom}" in propertiesFrom field in table ${tableId}, column ${columnId}`);

                    const propertyGroup = tableTemplate.columns[propertyFrom].propertyGroups;
                    if (!propertyGroup)
                        throw new XBRLError(xbrlce.invalidPropertyGroupColumnReference, `Column referenced "${propertyFrom}" in propertiesFrom field does not have a propertiesGroup defined in table ${tableId}`);

                    for (const dim of dimensionsInPropertyGroup(propertyGroup)) {
                        if (dim in preprocessedColumnDimensions)
                            throw new XBRLError(xbrlce.repeatedPropertyGroupDimension, `Duplicated dimension "${dim}" in propertyGroup "${propertyGroup}"`);
                        preprocessedColumnDimensions[dim] = this.preprocessPropertyGroupDimension(dim, propertyGroup, tableParameters, tableColumnIds, propertyFrom);
                    }
                }
                tablePreprocessedDimensions[columnId] = preprocessedColumnDimensions;

                if (!("entity" in preprocessedColumnDimensions)) throw new XBRLError(xbrlce.invalidJSON, `Entity is missing in dimensions of table ${tableId}`);
                if (!("period" in preprocessedColumnDimensions)) throw new XBRLError(xbrlce.invalidJSON, `Period is missing in dimensions of table ${tableId}`);
                if (!("concept" in preprocessedColumnDimensions)) throw new XBRLError(xbrlce.invalidJSON, `Concept is missing in dimensions of table ${tableId}`);
            }
        }
        return tablePreprocessedDimensions
    }


    private preprocessDimension<D extends DimKey>(dimension: D, referenceOrValue: string, parameters: Parameters, columns: string[]): (row: Row) => FullDimensions[D] {
        if (referenceOrValue.startsWith("$$")) {
            const fn = this.dimValueFn(dimension);
            // Literal starting with $
            const value = fn(referenceOrValue.substring(1));
            return () => value;
        }

        const match = referenceOrValue.match(/^\$(.+?)(?:@(.+))?$/);
        if (match) {
            const [, parameterReference, periodSpecifier] = match;
            const fn = this.dimValueFn(dimension, periodSpecifier);
            // Reference to a column
            if (columns.includes(parameterReference))
                return (row: Row) => fn(row.columns[parameterReference]);
            // Reference to the row number
            if (parameterReference === 'rowNumber')
                return (row: Row) => fn(row.rowNumber.toString());
            // Reference to a parameter
            const parameterValue = parameters[parameterReference];
            if (parameterValue) {
                const value = fn(parameterValue);
                return () => value;
            }
            else throw new XBRLError(xbrlce.invalidReferenceTarget, `Parameter ${parameterReference} not found in the metadata`);
        }
        else {
            // It is a literal value
            const fn = this.dimValueFn(dimension);
            const value = fn(referenceOrValue);
            return () => value;
        }
    }

    /**
     * Returns a function that given a row will provide the value of a dimension that has been defined via a reference to a property group
     * @param dim dimension defined in a property group
     * @param propertyGroup property group in the metadata file
     * @param parameters table parameters
     * @param columns columns in the table template
     * @param pgColumn column defining the property group
     * @returns a function that given a row will provide the value of a dimension
     */
    private preprocessPropertyGroupDimension<D extends DimKey>(dim: D, propertyGroup: PropertyGroup, parameters: Parameters, columns: string[], pgColumn: string) {
        const fnByGroup = mapValues(propertyGroup, (pg) => {
            if (!pg.dimensions || !(dim in pg.dimensions))
                return () => undefined;
            return this.preprocessDimension(dim, pg.dimensions![dim], parameters, columns);
        });
        return (row: Row) => fnByGroup[row.columns[pgColumn]](row);
    }

    private dimValueFn<D extends DimKey>(dimension: D, periodSpecifier?: string): (value: string) => FullDimensions[D] {
        const namespaces = this.namespaces;

        function entityFn(value: string): [string, string] {
            return resolveSQName(value, namespaces);
        }

        function unitFn(value: string): string {
            return value === '#none' ? "pure" : value;
        }

        function conceptFn(value: string): string {
            const [prefix, localName] = value.split(":");
            if (!localName)
                throw new XBRLError(xbrlce.invalidConceptQName, `Concept QNames should have a prefix: ${value}`);
            else if (prefix === "xbrl")
                throw new XBRLError(xbrlce.invalidConceptQName, `Concept QNames should not have the xbrl prefix: ${value}`);
            const ns = namespaces[prefix];
            if (!ns)
                throw new XBRLError(xbrlce.invalidConceptQName, `Prefix for concept qname ${value} not found in namespaces`);
            return value;
        }

        function expDimensionFn(value: string): string | undefined {
            if (value === "#none") return undefined;
            const [prefix, localName] = value.split(":");
            if (!localName)
                throw new XBRLError(xbrlce.invalidDimensionValue, `Dimension qnames should have a prefix: ${value}`);
            else if (prefix === "xbrl")
                throw new XBRLError(xbrlce.invalidDimensionValue, `Dimension qNames should not have the xbrl prefix: ${value}`);
            if (!namespaces[prefix])
                throw new XBRLError(xbrlce.invalidDimensionValue, `Prefix for dimension qname ${value} not found in namespaces`);
            return value;
        }

        function typedDimensionFn(domain: string, value: string): [string, string] {
            return [domain, value];
        }

        if (dimension === 'period' || periodSpecifier) {
            if (!periodSpecifier)
                return parsePeriod;
            else if (periodSpecifier === 'start')
                return (value: string) => parsePeriod(value)[0];
            else if (periodSpecifier === 'end')
                return (value: string) => parsePeriod(value)[1];
            else
                throw new XBRLError(xbrlce.invalidPeriodSpecifier, `Invalid period specifier in JSON metadata: ${periodSpecifier}`);
        }
        else if (dimension === 'entity') return entityFn;
        else if (dimension === 'unit') return unitFn;
        else if (dimension === 'concept') return conceptFn;
        else if (dimension === 'language') return (value: string) => value; // TODO: support syntax check for language dimensions

        const [dimPrefix, dimLocalName] = dimension.split(":");
        if (!dimLocalName)
            throw new XBRLError(xbrlce.invalidDimensionValue, `Invalid dimension reference with no prefix in JSON metadata: ${dimension}`);
        if (!namespaces[dimPrefix])
            throw new XBRLError(xbrlce.invalidDimensionValue, `Prefix for dimension reference ${dimension} not found in namespaces`);

        const domain = this.getTypedDomain(dimension);
        if (domain)
            return (value: string) => typedDimensionFn(domain, value);
        else
            return expDimensionFn;

    }

}

function parseNumber(value: string): [number, Decimals | undefined] {
    const [amount, exp_decimals] = value.split("d") as [string, string | undefined];
    const decimals = typeof exp_decimals === "undefined" ? undefined : exp_decimals === 'INF' ? 'INF' : parseDecimals(exp_decimals!);

    return [parseFloat(amount), decimals];
}

function parseDecimals(value: string): Decimals {
    try {
        return parseInt(value);
    } catch (error) {
        throw new XBRLError(xbrlce.invalidDecimalsValue, `Invalid decimals value found: ${value}`);
    }
}

function parseDecimalsReference(value: string): Decimals {
    return (value === "#other") ? "INF" : parseDecimals(value);
}

function checkHeaders(headers: string[], url: string, template: TableTemplate) {
    const nonNullHeaders = headers.filter(h => h !== "");
    const set = new Set(nonNullHeaders);
    if (set.size !== nonNullHeaders.length) {
        throw new XBRLError(xbrlce.repeatedColumnIdentifier, `Duplicated column headers in table ${url}`);
    }
    for (const header of nonNullHeaders) {
        if (!Object.keys(template.columns).includes(header)) {
            throw new XBRLError(xbrlce.unknownColumn, `CSV column ${header} is not defined in template`);
        }
    }

}

function evalColumnDimensions(dimensions: PreprocessedDimensions, row: Row): FullDimensions {
    return mapValues(dimensions, (value) => value(row)) as FullDimensions; // Oddly typescript does not infer the type correctly without the cast
}


async function loadParametersFile(url: string, resolver: Resolver): Promise<Parameters> {
    const parameters = await resolver(url, "text/csv");

    const readableStream = new Stream.Readable({
        read() {
            this.push(parameters);
            this.push(null);
        }
    });

    return new Promise((resolve, reject) => {
        const parameters: Parameters = {};
        readableStream
            .pipe(csv())
            .on('data', (row) => {
                parameters[row['name']] = row['value'];
            })
            .on('end', () => {
                resolve(parameters);
            })
            .on('error', reject);
    });
}
