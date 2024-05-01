import xpath from "xpath";
import { resolve } from "url";
import { DOMParser } from "xmldom";

/**
 * Resolves a URL in the context of an XML node, considering the semantics of xml:base attributes.
 * @param url URL to resolve
 * @param node Node to resolve URL against
 * @returns resolved URL
 */
export function resolveNodeUrl(url: string, node: Node): string {
    const select = xpath.useNamespaces({ 'xml': 'http://www.w3.org/XML/1998/namespace' });
    let baseUri = (node.ownerDocument || node).baseURI;
    const xml_base_attrs = select('ancestor-or-self::*/@xml:base', node) as Attr[];
    for (const xml_base_attr of xml_base_attrs) {
        baseUri = baseUri ? resolve(baseUri, xml_base_attr.value) : xml_base_attr.value;
    }

    return baseUri ? resolve(baseUri, url) : url;
}

/**
 * Parses a document from a string, setting the baseURI to the provided URL
 * The implementation overrides a read-only attribute at document level
 * @param xmlString 
 * @param url 
 * @returns 
 */
export function parseXMLFromString(xmlString: string, url?: string): Document {
    const doc = new DOMParser().parseFromString(xmlString, "application/xml");
    if (url)
        (doc as any).baseURI = url;
    return doc;
}
