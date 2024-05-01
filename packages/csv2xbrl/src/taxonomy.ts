import { namespaces } from "./xbrl";
import xpath from "xpath";
import { getFragmentValue, qnameValue, getQNameAttribute, getSchemaElementQName, getUrlAttribute } from "./xpath-utils";
import { QName, QNameMap } from "./qname";
import { Resolver } from "./resolvers";
import { loadDTS } from "./dts";
import { Logger } from "./logger";

// The interfaces prefixed with XBRL, replace identifiers to other objects with a reference
// export type XbrlDataType = Omit<DataType, "baseType"> & { baseType: XbrlDataType | null };
const select = xpath.useNamespaces(namespaces);

export class Taxonomy {
    private _elementsByQName: QNameMap<Element> = new QNameMap();
    private _elementsByFragmentId: Map<string, Element> = new Map();
    private _typesByQName: QNameMap<DataType> = new QNameMap();

    constructor(public docs: Document[], public entryPoints: string[]) {
        for (const doc of docs) {
            const targetNamespace = (select("/xsd:schema/@targetNamespace", doc, true) as Attr | undefined)?.nodeValue;
            if (targetNamespace) {
                const elements = select("*/xsd:element", doc) as Element[];
                const complexTypes = select("*/xsd:complexType", doc) as Element[];
                const simpleTypes = select("*/xsd:simpleType", doc) as Element[];
                const items = [...elements, ...complexTypes, ...simpleTypes];
                for (const item of items) {
                    const localName = item.getAttribute("name")!;
                    const qname = { localName, ns: targetNamespace };
                    this._elementsByQName.set(qname, item);

                    const fragment = getFragmentValue(item);
                    if (fragment) {
                        this._elementsByFragmentId.set(fragment, item);
                    }
                }
            }
        }
    }

    /**
     * Convenience method to load a taxonomy from a list of entry points and a resolver
     * Just a wrapper around the loadDTS function
     * @param url 
     * @param resolve 
     * @returns 
     */
    static async load(url: string | string[], resolve?: Resolver, logger?: Logger): Promise<Taxonomy> {
        const urls = Array.isArray(url) ? url : [url];
        const docs = await loadDTS(urls, resolve, logger);
        return new Taxonomy(docs, urls);
    }

    /**
     * 
     * @param key A fragment id or a QName
     * @returns A parsed element
     */
    get(key: string | QName): SchemaElement | undefined {
        const elm = typeof key === "string" ? this._elementsByFragmentId.get(key) : this._elementsByQName.get(key);
        return elm ? this.parseElement(elm) : undefined;
    }

    private parseElement(elm: Element): SchemaElement {
        const name = getSchemaElementQName(elm);
        const id = elm.getAttribute("id") || undefined;
        const url = elm.ownerDocument.baseURI;
        if (elm.localName === "complexType") {
            const attributeGroupElm = select(".//xsd:attributeGroup", elm, true) as Element | undefined;
            const attributeGroup = attributeGroupElm ? getQNameAttribute(attributeGroupElm, "ref") : undefined;
            const complexType: ComplexDataType = { name, type: "complex", url, id, attributeGroup };
            return complexType;
        }

        if (elm.localName === "simpleType") {
            const simpleType: SimpleDataType = { name, type: "simple", url, id };
            return simpleType;
        }

        const substitionGroup = getQNameAttribute(elm, "substitutionGroup");
        if (substitionGroup?.localName === "item") {
            const periodType = elm.getAttributeNS(namespaces.xbrli, "periodType") as "instant" | "duration";
            const abstract = elm.getAttribute("abstract") === "true";
            const type = this.getElmType(elm) as ComplexDataType;
            const numeric = type.attributeGroup?.localName === "numericItemAttrs";
            const concept: Concept = {
                name,
                url,
                id,
                type,
                periodType,
                abstract,
                numeric
            };
            return concept;
        }

        if (substitionGroup?.localName === "dimensionItem") {
            const typedDomain = this.typedDimensionDomain(elm);
            const dimension: Dimension = { name, url, id, substitionGroup: "dimensionItem", typedDomain };
            return dimension;
        }

        return { name, id, url };
    }

    private getElmType(item: Element): DataType {
        const typeQName = getQNameAttribute(item, "type");
        if (typeQName) {
            const referencedType = this._typesByQName.get(typeQName);
            if (!referencedType) {
                const referencedElm = this._elementsByQName.get(typeQName);
                if (referencedElm) {
                    const referencedType = this.parseElement(referencedElm) as DataType;
                    this._typesByQName.set(typeQName, referencedType);
                    return referencedType;
                }
                else
                    throw new Error(`Could not resolve type ${typeQName} for element ${item.getAttribute("name")}`);
            }
            else
                return referencedType;
        }
        else
            return this.parseElement(item.children[0]) as DataType;
    }

    private typedDimensionDomain(dim: Element): Concept | undefined {
        const typeURL = getUrlAttribute(dim, "typedDomainRef", namespaces.xbrldt);
        if (typeURL) {
            const typedDomain = this._elementsByFragmentId.get(typeURL);
            if (!typedDomain) {
                throw new Error(`Could not resolve typed domain ${typeURL} for dimension ${dim.getAttribute("name")}`);
            }
            return this.parseElement(typedDomain) as Concept;
        }
    }

}

interface SchemaElement {
    name: QName;
    url: string;
    id?: string;
}

interface SimpleDataType extends SchemaElement {
    type: "simple";
}

export function isSimpleDataType(dataType: DataType): dataType is SimpleDataType {
    return dataType.type === "simple";
}

interface ComplexDataType extends SchemaElement {
    type: "complex";
    attributeGroup?: QName;
}

export function isComplexDataType(dataType: DataType): dataType is ComplexDataType {
    return dataType.type === "complex";
}

export type DataType = SimpleDataType | ComplexDataType;

export interface Concept extends SchemaElement {
    type: ComplexDataType;
    periodType: "instant" | "duration";
    numeric: boolean;
    abstract: boolean;
}

export function isConcept(element: SchemaElement): element is Concept {
    return "periodType" in element;
}

export interface Dimension extends SchemaElement {
    substitionGroup: "dimensionItem";
    typedDomain?: Concept;
}

export function isDimension(element: SchemaElement): element is Dimension {
    return "substitionGroup" in element;
}


export function linkbaseArcs(docs: Document[]) {
    const arcs: { from: QName, to: QName, arcrole: QName, order: number }[] = [];
    for (const doc of docs) {
        const ns = (select("/link:linkbase/@xsi:schemaLocation", doc, true) as Attr | undefined)?.nodeValue;
        if (ns) {
            const entries = select("//link:arc", doc) as Element[];
            for (const entry of entries) {
                const from = qnameValue(entry.getAttribute("from")!, entry);
                const to = qnameValue(entry.getAttribute("to")!, entry);
                const arcrole = qnameValue(entry.getAttribute("arcrole")!, entry);
                const order = parseInt(entry.getAttribute("order")!);

                arcs.push({ from, to, arcrole, order });
            }
        }
    }
    return arcs;
}