import fs from 'fs';
import path from 'path';
import xpath from 'xpath';
import yauzl from 'yauzl';
import { iterateZipEntries, openZipFile, readZipEntry } from './unzip';
import { resolveNodeUrl } from './xml-base';
import { DOMParser } from 'xmldom';
import { resolve } from 'url';
import { MimeTypeMap, parseMimeType } from './resolvers';
import { Catalog } from './catalog';

// No support for multilanguage entries for the moment

export interface EntryPoint {
    docs: string[];
    name?: string;
    version?: string;
    description?: string;
}

const select = xpath.useNamespaces({
    'cat': 'urn:oasis:names:tc:entity:xmlns:xml:catalog',
    'tp': 'http://xbrl.org/2016/taxonomy-package'
});

function* findFiles(startPath: string, fileExtension: string, recursive = false): Generator<string> {
    const files = fs.readdirSync(startPath);
    for (const fileName of files) {
        const filePath = path.join(startPath, fileName);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory()) {
            if (recursive) {
                yield* findFiles(filePath, fileExtension, recursive);
            }
        } else if (fileName.endsWith(fileExtension)) {
            yield filePath;
        }
    }
}

export async function* findTaxonomyPackages(startPath: string, recursive = false): AsyncGenerator<string> {
    for await (const filePath of findFiles(startPath, '.zip', recursive)) {
        if (isTaxonomyPackage(filePath)) {
            yield filePath;
        }
    }
}

export function isTaxonomyPackage(filePath: string): boolean {
    return filePath.endsWith('.zip') && TaxonomyPackage.load(filePath) !== null;
}

const taxonomyPackageRegex = /^[^\/]+\/META-INF\/taxonomyPackage.xml$/;

export class TaxonomyPackage implements Catalog {
    public entryPoints: EntryPoint[];
    public remappings: { [key: string]: string } = {};
    public get uriPrefixes(): string[] {
        return Object.keys(this.remappings);
    }

    private constructor(public zip: yauzl.ZipFile, private baseUrl: string, public entries: { [key: string]: yauzl.Entry }, public taxpackage: Document, public catalog?: Document) {
        this.entryPoints = entryPoints(taxpackage);
        this.remappings = catalog ? catalogRemappings(catalog) : {};
    }

    static async load(filePath: string): Promise<TaxonomyPackage> {
        const zip = await openZipFile(filePath);
        const entries: { [key: string]: yauzl.Entry } = {};

        for await (const entry of iterateZipEntries(zip)) {
            entries[entry.fileName] = entry;
        }

        // Find the taxonomy package entry
        const taxonomyPackageEntry = Object.keys(entries).find((name) => taxonomyPackageRegex.test(name));
        if (!taxonomyPackageEntry) throw new Error(`Invalid taxonomy package file ${filePath}. Missing META-INF/taxonomyPackage.xml`);

        const topDir = taxonomyPackageEntry.split('/')[0];
        const taxpackage = await readZipEntry(zip, entries[taxonomyPackageEntry]);
        const taxpackageDoc = new DOMParser().parseFromString(taxpackage, 'application/xml');
        // Checks if there is an entry that matches a top level directory followed by META-INF/taxonomyPackage.xml
        const catalogFileName = `${topDir}/META-INF/catalog.xml`;
        const catalogEntry = entries.hasOwnProperty(catalogFileName) ? entries[catalogFileName] : undefined;
        if (!catalogEntry) throw new Error(`Catalog file ${catalogFileName} not found in taxonomy package ${filePath}`);
        const catalog = await readZipEntry(zip, catalogEntry);
        const catalogDoc = new DOMParser().parseFromString(catalog, 'application/xml');

        return new TaxonomyPackage(zip, topDir + "/META-INF/", entries, taxpackageDoc, catalogDoc);
    }

    public async resolve<T extends keyof MimeTypeMap>(url: string, mimeType: T, uriStartString: string): Promise<MimeTypeMap[T] | null> {
        const rewritePrefix = this.remappings[uriStartString];
        const rewrittenUrl = rewritePrefix + url.substring(uriStartString.length);
        const resolvedUrl = resolve(this.baseUrl, rewrittenUrl);
        const entry = this.entries[resolvedUrl];
        if (!entry) throw new Error(`Entry ${url} not found in taxonomy package ${this}`);
        const content = await readZipEntry(this.zip, entry);
        return parseMimeType(url, content, mimeType);
    }

}

/**
 * Extracts the remappings from a catalog file
 * @param catalog XML Catalog Document
 * @returns a dictionary of remappings (uriStartString -> rewritePrefix)
 */
export function catalogRemappings(catalog: Document): { [key: string]: string } {
    const remappings: { [key: string]: string } = {};
    const mappings = select('//cat:rewriteURI', catalog) as Element[];
    for (const mapping of mappings) {
        const rewritePrefix = mapping.getAttribute('rewritePrefix');
        const uriStartString = mapping.getAttribute('uriStartString');
        if (!uriStartString || !rewritePrefix) throw new Error(`Invalid catalog rewriteUriEntry in ${catalog.baseURI}`);
        const resolvedUriStartString = resolveNodeUrl(uriStartString, mapping);
        const resolvedRewritePrefix = resolveNodeUrl(rewritePrefix, mapping);

        remappings[resolvedUriStartString] = resolvedRewritePrefix;
    }
    return remappings;
}


function entryPoints(taxpackage: Document): EntryPoint[] {
    const entries: EntryPoint[] = [];
    const entryPoints = select('//tp:entryPoint', taxpackage) as Element[];
    for (const entryPoint of entryPoints) {
        const hrefs = select('tp:entryPointDocument/@href', entryPoint) as Attr[];
        const docs = hrefs.map((href) => resolveNodeUrl(href.value, href.ownerElement!));
        const name = (select('tp:name', entryPoint, true) as Element | undefined)?.textContent as string | undefined;
        const version = (select('tp:version', entryPoint, true) as Element | undefined)?.textContent as string | undefined;
        const description = (select('tp:version', entryPoint, true) as Element | undefined)?.textContent as string | undefined;
        entries.push({ docs, name, version, description });
    }

    return entries;
}