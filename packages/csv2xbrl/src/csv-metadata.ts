// Definition of the metadata structure for XBRL CSV files and some helper functions

import { XBRLError, xbrlce } from "./errors";
import { arrayDifference, arrayIntersection, mapValues } from "./minifunctional";
import { resolve } from "url";
import { Resolver } from "./resolvers";

type url = string; // Alias to improve readability of types (using lowercase to avoid conflict with the stadard URL type in the browser)

// Metadata structure has been simplified removing some optional fields, whereas MetadataSpec represents the
// structure as defined in the XBRL specification.
export interface Metadata {
    documentInfo: DocumentInfo;
    tableTemplates: TableTemplates;
    tables: Tables;
    parameters: Parameters;
    parameterURL?: string;
    dimensions: Dimensions;
    decimals?: CsvDecimals;
    links: { [uriAlias: string]: Link };
}

export interface MetadataSpec {
    documentInfo: DocumentInfoSpec;
    tableTemplates?: TableTemplates;
    tables?: Tables;
    parameters?: Parameters;
    parameterURL?: string;
    dimensions?: Dimensions;
    decimals?: CsvDecimals;
    links?: { [uriAlias: string]: Link };
}

export type TableTemplates = { [tableId: string]: TableTemplate };
export type Tables = { [tableId: string]: Table };
export type Parameters = { [parameterId: string]: string };
export type Link = { [uriAlias: string]: { [id: string]: [string] } }

export interface DocumentInfo {
    documentType: string;
    namespaces: Namespaces;
    linkTypes: URIMap;
    linkGroups: URIMap;
    taxonomy: url[];
    extends: url[];
    final: Finals;
    features: Features;
    baseURL?: url;
}

interface DocumentInfoSpec {
    documentType: string;
    namespaces?: Namespaces;
    linkTypes?: URIMap;
    linkGroups?: URIMap;
    taxonomy?: url[];
    extends?: url[];
    final?: Finals;
    features?: Features;
    baseURL?: url;
}

export type CsvDecimals = number | string;
export type ExtensibleObject = "namespaces" | "taxonomy" | "linkTypes" | "linkGroups" | "features" | "tableTemplates" | "tables" | "dimensions" | "parameters" | "parameterURL";
export type Finals = Partial<{ [final in ExtensibleObject]: true }>;

export type Features = { [feature: string]: any };

export type Namespaces = { [prefix: string]: string };
export type URIMap = { [alias: string]: string };

export interface TableTemplate {
    rowIdColumn?: string;
    columns: Columns;
    decimals?: CsvDecimals;
    dimensions?: Dimensions;
}

export type Columns = { [columnID: string]: Column };

export interface Column {
    comment?: boolean;
    decimals?: CsvDecimals;
    dimensions?: Dimensions;
    propertyGroups?: PropertyGroup;
    propertiesFrom?: [string];
}

export type PropertyGroup = { [groupID: string]: FactPropertyGroup };

export interface FactPropertyGroup {
    decimals?: CsvDecimals;
    dimensions?: Dimensions;
}

export type Dimensions = { [dimensionID: string]: string };

export interface Table {
    template?: string;
    url: string;
    optional?: boolean;
    parameters?: Parameters;

}

// TODO: detect cycles in metadata inheritance
export async function loadCSVMetadata(jsonFile: string, resolver: Resolver): Promise<Metadata> {
    let metadata = await resolver(jsonFile, "application/json") as Metadata;
    metadata = normalizeMetadata(metadata, jsonFile);
    checkMetadata(metadata);

    const importedMetadata: Metadata[] = [];

    for (const importedMetadataUrl of metadata.documentInfo.extends) {
        importedMetadata.push(await loadCSVMetadata(importedMetadataUrl, resolver));
    }

    return combineMetadata(metadata, importedMetadata);
}

/**
 * Simplifies the metadata object by giving default values to some optional fields (arrays are given an
 * empty array and objects an empty object). It also resolves urls to the base URL attribute in the metadata
 * if present and the url of the metadata file.
 * @param metadata Metadata object as defined in the CSV specification
 * @param fileURL location of the metadata file
 * @returns 
 */
export function normalizeMetadata(metadata: MetadataSpec, fileURL: string): Metadata {
    if (metadata.documentInfo.baseURL) {
        fileURL = resolve(fileURL, metadata.documentInfo.baseURL);
    }

    const documentInfo: DocumentInfo = {
        ...metadata.documentInfo,
        namespaces: metadata.documentInfo.namespaces || {},
        linkTypes: metadata.documentInfo.linkTypes || {},
        linkGroups: metadata.documentInfo.linkGroups || {},
        taxonomy: metadata.documentInfo.taxonomy ? metadata.documentInfo.taxonomy.map(t => resolve(fileURL, t)) : [],
        extends: metadata.documentInfo.extends ? metadata.documentInfo.extends.map(t => resolve(fileURL, t)) : [],
        final: metadata.documentInfo.final || {},
        features: metadata.documentInfo.features || {}
    };

    const resolvedMetadata: Metadata = {
        ...metadata,
        documentInfo,
        parameterURL: metadata.parameterURL ? resolve(fileURL, metadata.parameterURL) : undefined,
        tableTemplates: metadata.tableTemplates || {},
        tables: mapValues(metadata.tables || {}, (table) => ({ ...table, url: resolve(fileURL, table.url) })),
        parameters: metadata.parameters || {},
        dimensions: metadata.dimensions || {},
        links: metadata.links || {}
    };

    return resolvedMetadata;
}

/**
 * Returns an array of the dimensions (prefixed qname) found in the metadata
 * @param metadata 
 * @returns 
 */
export function metadataDimensions(metadata: Metadata): string[] {
    const documentDimensions = Object.keys(metadata.dimensions);
    const tableTemplates = Object.values(metadata.tableTemplates);
    const columns = tableTemplates.map(t => Object.values(t.columns)).flat();
    const columnDimensions = columns.map(c => c.dimensions ? Object.keys(c.dimensions) : []).flat();

    const allDimensionsSet = new Set([...documentDimensions, ...columnDimensions]);
    // Discards non qname entries
    const allDimensions = Array.from(allDimensionsSet.keys()).filter(d => d.includes(":"));
    return allDimensions;
}

// TODO: simplify this... this does not belong here
/**
 * Registers a namespace in the metadata and assigns a prefix to it, unless it is already registered
 * @param metadata CSV metadata object
 * @param namespaceURI namespace URI to register
 * @param prefix prefix to use for the prefix. For instance, if prefix is "ns", the prefix assigned will be 
 * the first available in the sequence ns, ns1, ns2, ...
 * @returns the prefix assigned
 */
export function registerNamespace(metadata: Metadata, namespaceURI: string, prefix: string = "ns"): string {

    const match = Object.entries(metadata.documentInfo.namespaces).find(([, ns]) => ns === namespaceURI);
    if (match)
        return match[0];

    let suffix = 0;
    const regexp = new RegExp(`^${prefix}(\\d*)$`);
    for (const nsprefix in Object.keys(metadata.documentInfo.namespaces)) {
        const m = nsprefix.match(regexp);
        if (m) {
            const index = m[1].length ? parseInt(m[1]) : 0;
            if (index >= suffix)
                suffix = index + 1;
        }
    }

    const nsprefix = suffix > 0 ? `${prefix}${suffix}` : prefix;
    metadata.documentInfo.namespaces[nsprefix] = namespaceURI;

    return nsprefix;
}


export function isFactColumn(column: Column): boolean {
    return column.dimensions !== undefined || column.propertiesFrom !== undefined;
}

export function checkMetadata(metadata: Metadata) {

    // if (!metadata.documentInfo.taxonomy) {
    //     throw new Error('Taxonomy is missing in json file');
    // }

    if (metadata.documentInfo.documentType != "https://xbrl.org/2021/xbrl-csv") {
        throw new Error('DocumentType is not supported');
    }
}

// TODO: resolve URLs in metadata with the baseURL
export function combineMetadata(extension: Metadata, importedFiles: Metadata[]): Metadata {
    let prevImportedFinals: Finals = {};
    let combinedMetadata = extension;
    for (const imported of importedFiles) {

        const namespaces = merge(combinedMetadata.documentInfo.namespaces,
            imported.documentInfo.namespaces,
            prevImportedFinals.namespaces || false,
            imported.documentInfo.final.namespaces || false, "/documentInfo/namespaces");

        const linkTypes = merge(combinedMetadata.documentInfo.linkTypes,
            imported.documentInfo.linkTypes,
            prevImportedFinals.linkTypes || false,
            imported.documentInfo.final.linkTypes || false, "/documentInfo/linkTypes");

        const linkGroups = merge(combinedMetadata.documentInfo.linkGroups,
            imported.documentInfo.linkGroups,
            prevImportedFinals.linkGroups || false,
            imported.documentInfo.final.linkGroups || false, "/documentInfo/linkGroups");

        const features = merge(combinedMetadata.documentInfo.features,
            imported.documentInfo.features,
            prevImportedFinals.features || false,
            imported.documentInfo.final.features || false, "/documentInfo/features");

        const tableTemplates = merge(combinedMetadata.tableTemplates,
            imported.tableTemplates,
            prevImportedFinals.tableTemplates || false,
            imported.documentInfo.final.tableTemplates || false, "/tableTemplates");

        const tables = merge(combinedMetadata.tables,
            imported.tables,
            prevImportedFinals.tables || false,
            imported.documentInfo.final.tables || false, "/tables");

        const dimensions = merge(combinedMetadata.dimensions,
            imported.dimensions,
            prevImportedFinals.dimensions || false,
            imported.documentInfo.final.dimensions || false, "/dimensions");

        const parameters = merge(combinedMetadata.parameters,
            imported.parameters,
            prevImportedFinals.parameters || false,
            imported.documentInfo.final.parameters || false, "/parameters");

        const taxonomy = mergeArrays(combinedMetadata.documentInfo.taxonomy,
            imported.documentInfo.taxonomy,
            prevImportedFinals.taxonomy || false,
            imported.documentInfo.final.taxonomy || false, "/documentInfo/taxonomy");

        const parameterURL = mergeStrings(combinedMetadata.parameterURL,
            imported.parameterURL,
            prevImportedFinals.parameterURL || false,
            imported.documentInfo.final.parameterURL || false, "/parameterURL"
        )

        prevImportedFinals = { ...prevImportedFinals, ...imported.documentInfo.final };
        combinedMetadata = {
            ...combinedMetadata,
            tableTemplates,
            tables,
            dimensions,
            parameters,
            parameterURL,
            documentInfo: {
                ...combinedMetadata.documentInfo,
                namespaces,
                linkTypes,
                linkGroups,
                features,
                taxonomy
            }
        };
    }

    return combinedMetadata;
}

type ExtensibleTypes = Namespaces | URIMap | Features | TableTemplates | Tables | Dimensions | Parameters;
// Given two objects:
//   - If there is a common key with different values, throw an error
//   - If the imported is final, if there is a key in the importing object not in the imported one, throw an error
//   - If the importing is final, if there is a key in the imported object not in the importing one, throw an error
//   - Otherwise, returns the merged object
function merge<T extends ExtensibleTypes>(extension: T, imported: T, extensionFinal: boolean, importedFinal: boolean, path: string): T {
    const commonKeys = arrayIntersection(Object.keys(extension), Object.keys(imported));
    for (const key in commonKeys) {
        if (extension[key] !== imported[key]) {
            throw new XBRLError(xbrlce.conflictingMetadataValue, `Conflicting values in metadata field "${path}": "${extension[key]}" and "${imported[key]}"`);
        }
    }

    if (importedFinal) {
        const extensionExtraKeys = arrayDifference(Object.keys(extension), Object.keys(imported));
        if (extensionExtraKeys.length) {
            throw new XBRLError(xbrlce.illegalExtensionOfFinalProperty, `Field "${path}" is final and cannot be extended`);
        }
    }

    if (extensionFinal) {
        const importedExtraKeys = arrayDifference(Object.keys(imported), Object.keys(extension));
        if (importedExtraKeys.length) {
            throw new XBRLError(xbrlce.illegalExtensionOfFinalProperty, `Field "${path}" is final and cannot be extended`);
        }
    }

    return { ...imported, ...extension };
}

function mergeArrays(extension: string[], imported: string[], extensionFinal: boolean, importedFinal: boolean, path: string): string[] {
    if (importedFinal) {
        const extensionExtra = arrayDifference(extension, imported);
        if (extensionExtra.length) {
            throw new XBRLError(xbrlce.illegalExtensionOfFinalProperty, `Field "${path}" is final and cannot be extended`);
        }
    }

    if (extensionFinal) {
        const importedExtra = arrayDifference(imported, extension);
        if (importedExtra.length) {
            throw new XBRLError(xbrlce.illegalExtensionOfFinalProperty, `Field "${path}" is final and cannot be extended`);
        }
    }

    return Array.from(new Set([...imported, ...extension]));
}

function mergeStrings(extension: string | undefined, imported: string | undefined, extensionFinal: boolean, importedFinal: boolean, path: string): string | undefined {
    if (extension && imported && extension !== imported) {
        throw new XBRLError(xbrlce.conflictingMetadataValue, `Conflicting values in metadata field "${path}": "${extension}" and "${imported}"`);
    }

    if (importedFinal && extension !== imported) {
        throw new XBRLError(xbrlce.illegalExtensionOfFinalProperty, `Field "${path}" is final and cannot be extended`);
    }

    if (extensionFinal && extension !== imported) {
        throw new XBRLError(xbrlce.illegalExtensionOfFinalProperty, `Field "${path}" is final and cannot be extended`);
    }

    return imported || extension;
}

/**
 * Returns the list of dimensions in a property group. Hopefully, the dimensions are consistent through all values (spec is not clear)
 * @param propertyGroup 
 * @returns array of dimensions defined in the property group
 */
export function dimensionsInPropertyGroup(propertyGroup: PropertyGroup): string[] {
    const allDims = Object.values(propertyGroup).flatMap((dv) => dv.dimensions ? Object.keys(dv.dimensions) : []);
    const uniqueDims = new Set(allDims);
    return [...uniqueDims];
}

/**
 * Indicates wether the property group defines the decimals property.
 * @param propertyGroup 
 * @returns 
 */
export function decimalsInPropertyGroup(propertyGroup: PropertyGroup): boolean {
    const decimals = Object.values(propertyGroup).find((fpg) => fpg.decimals);
    return decimals ? true : false;
}
