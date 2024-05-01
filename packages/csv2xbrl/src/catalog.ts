import { MimeTypeMap, Resolver, SupportedMimeTypes } from "./resolvers";

export interface Catalog {
    uriPrefixes: string[];
    resolve<T extends keyof MimeTypeMap>(url: string, mimeType: T, uriStartString: string): Promise<MimeTypeMap[T] | null>;
}

export interface CatalogEntry {
    uriStartString: string;
    rewritePrefix: string;
}

interface TrieInternalNode {
    children: { [key: string]: TrieNode };
}

interface TrieLeafNode {
    catalog: Catalog;
    uriStartString: string;
}

type TrieNode = TrieInternalNode | TrieLeafNode;

function isInternalNode(node: TrieNode): node is TrieInternalNode {
    return 'children' in node;
}

/**
 * Creates a resolver function that uses the provided catalogs to resolve URLs to documents.
 * The resolver is based on a trie index of the entries of the catalog, where each node is a segment of the URL
 * The implementation assumes that the catalog is created using full segments 
 * @param catalogs list of objects implementing the Catalog interface
 * @returns a resolver function
 */
export function makeCatalogResolver(catalogs: Catalog[]): Resolver {
    const rootNode: TrieInternalNode = { children: {} };
    for (const catalog of catalogs)
        addCatalogEntries(catalog, rootNode);

    return async (url: string, mimeType: SupportedMimeTypes) => {
        let currentNode: TrieNode = rootNode;
        for (const segment of urlSegments(url)) {
            if (isInternalNode(currentNode)) {
                if (segment in currentNode.children)
                    currentNode = currentNode.children[segment];
                else
                    return null; // No match
            }
            else
                return currentNode.catalog.resolve(url, mimeType, currentNode.uriStartString);
        }
    };
}


function addCatalogEntries(catalog: Catalog, rootNode: TrieInternalNode) {
    for (const uriStartString of catalog.uriPrefixes) {
        const segments = urlSegments(uriStartString);
        const lastSegment = segments.pop()!;
        let currentNode = rootNode;
        for (const segment of segments) {
            if (segment in currentNode.children) {
                const existingNode = currentNode.children[segment];
                if ('catalog' in existingNode)
                    throw new Error(`Conflict with ${uriStartString} in catalogs`);

                else
                    currentNode = existingNode;
            }

            else
                currentNode = currentNode.children[segment] = { children: {} };
        }

        if (lastSegment in currentNode.children)
            throw new Error(`Conflict with ${uriStartString} in catalogs`);

        else
            currentNode.children[lastSegment] = { catalog, uriStartString };
    }
}

function urlSegments(urlString: string): string[] {
    const url = new URL(urlString);
    const segments = url.pathname.split('/').filter(s => s.length > 0);
    return [url.origin, ...segments];
}
