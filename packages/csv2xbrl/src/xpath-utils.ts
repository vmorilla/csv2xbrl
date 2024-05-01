import { QName } from "./qname";
import { resolveNodeUrl } from "./xml-base";

export function getQNameAttribute(elm: Element, attrName: string, attrNS: string | null = null): QName | undefined {
    const attr = attrNS ? elm.getAttributeNS(attrNS, attrName) : elm.getAttribute(attrName);
    if (attr) {
        const splitValue = attr.split(":");
        const [prefix, localName] = splitValue.length === 2 ? splitValue : ["", splitValue[0]];
        return {
            ns: elm.lookupNamespaceURI(prefix)!,
            localName
        };
    }
    else
        return undefined;
}

export function getSchemaElementQName(element: Element): QName {
    const rootNode = element.ownerDocument.documentElement;
    const ns = rootNode.getAttribute("targetNamespace")!;
    const localName = element.getAttribute("name")!;
    return { localName, ns };
}

export function getUrlAttribute(elm: Element, attrName: string, attrNS?: string): string | undefined {
    const attr = attrNS ? elm.getAttributeNS(attrNS, attrName) : elm.getAttribute(attrName);
    if (attr) return resolveNodeUrl(attr, elm);
    else return undefined;
}

/**
 * Provides a QName evaluated with the namespaces of the node
 * @param prefixedName qname with the syntax prefix:name 
 * @param node xml node to evaluate the qname
 * @returns 
 */
export function qnameValue(prefixedName: string, node: Node): QName {
    const splitValue = prefixedName.split(":");
    if (splitValue.length === 2) {
        return {
            ns: node.lookupNamespaceURI(splitValue[0])!,
            localName: splitValue[1]
        };
    }
    else return {
        ns: node.lookupNamespaceURI("")!,
        localName: prefixedName
    };
}

/**
 * Obtains the value of a node as a url resolved in the context of the node
 * @param node 
 * @returns the url as a string
 */
export function urlValue(node: Node): string | null {
    const nodeValue = node.nodeValue;
    if (nodeValue) return resolveNodeUrl(nodeValue, node);
    else return null
}

/**
 * Obtains the id of an element as a resolved URI in its context
 * @param elm 
 * @returns the full ID as a string
 */
export function getFragmentValue(elm: Element): string | undefined {
    const id = elm.getAttribute("id");

    if (id) {
        const baseUri = resolveNodeUrl("", elm);
        return `${baseUri}#${id}`;
    }
    else return undefined;
}