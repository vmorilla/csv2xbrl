import axios from "axios";
import { parseXMLFromString } from "./xml-base";
import fs from "fs";
import { fileURLToPath } from "url";
import { Catalog, makeCatalogResolver } from "./catalog";
import { TaxonomyPackage } from "./taxonomy-package";

export type MimeTypeMap = {
    "application/xml": Document,
    "application/json": any,
    "text/csv": string,
};
export type SupportedMimeTypes = keyof MimeTypeMap;

export type Resolver = <T extends keyof MimeTypeMap>(url: string, mimeType: T) => Promise<MimeTypeMap[T] | null>;

/**
 * Resolver that fetches the document directly from the URL
 * @param urlString The URL of the document to fetch
 * @param mimeType The MIME type of the document
 * @returns The fetched document
 * @throws Error if the document could not be fetched
 * */
export const httpResolver: Resolver = async (urlString, mimeType) => {
    const url = new URL(urlString);
    if (url.protocol == "http:" || url.protocol == "https:") {
        const response = await axios.get(urlString);
        return parseMimeType(urlString, response.data, mimeType);
    }
    else {
        return null;
    }
}

export function makeCascadeResolver(...resolvers: Resolver[]): Resolver {
    return async (url: string, mimeType) => {
        for (const resolver of resolvers) {
            const response = await resolver(url, mimeType as any);
            if (response) return response;
        }
        return null;
    };
}

export function makeCachedResolver(resolver: Resolver): Resolver {
    const cache = new Map<string, any | null>();
    return async (url: string, mimeType: string) => {
        if (!cache.has(url)) {
            const response = await resolver(url, mimeType as any);
            cache.set(url, response);
        }
        return cache.get(url)!;
    };
}

export function fileResolver(urlString: string, mimeType: SupportedMimeTypes): Promise<MimeTypeMap[SupportedMimeTypes] | null> {

    const path = fileURLToPath(urlString);
    const content = fs.readFileSync(path, { encoding: "utf-8" });
    return parseMimeType(urlString, content, mimeType);
}

/**
 * Cascade resolver with cache that first tries to resolve via the catalogs, then via HTTP, and finally via the file system 
 * @param catalogs List of catalogs to resolve URLs
 * @returns A resolver function
 * */
export function makeFullResolver(catalogs: Catalog[] = []): Resolver {
    return makeCachedResolver(
        makeCascadeResolver(makeCatalogResolver(catalogs), httpResolver, fileResolver));
}

/**
 * Convenience function to prepare the resolver from a list of packages
 * @param packages 
 * @returns 
 */
export function loadPackages(packages: string[] = []): Promise<Resolver> {
    return Promise.all(packages.map(TaxonomyPackage.load)).then(makeFullResolver);
}

export function parseMimeType<T extends keyof MimeTypeMap>(url: string, response: string, mimeType: T): MimeTypeMap[T] {
    if (mimeType === "application/xml") {
        return parseXMLFromString(response, url);
    }
    if (mimeType === "application/json") {
        return JSON.parse(response);
    }
    if (mimeType === "text/csv") {
        return response;
    }

    throw new Error(`Unsupported MIME type: ${mimeType}`);
}