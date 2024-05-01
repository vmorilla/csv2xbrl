import xpath from "xpath";
import { namespaces } from "./xbrl";
import { httpResolver } from "./resolvers";
import { resolveNodeUrl } from "./xml-base";
import { Logger } from "./logger";

const stopOnErrorLogger: Logger =
{
    log: () => { },
    warn: () => { },
    error: (message) => {
        throw new Error(message);
    }
};

const select = xpath.useNamespaces(namespaces);

/**
 * Loads the discoverable taxonomy set (DTS) from the given URL(s)
 * @param url list of urls where the discovery process starts
 * @param resolver resolver function in charge of fetching the documents
 * @param logger logger object to log the loading process. If the user of this function wants to stop with errors,
 * a custom logger that throws an exception on error should be provided.
 * @returns list of loaded documents in the DTS
 */
export async function loadDTS(urls: string[], resolver = httpResolver, logger = stopOnErrorLogger): Promise<Document[]> {

    const files: { [filename: string]: Document } = {};

    async function tryLoad(url: string) {
        if (!(url in files)) {
            logger.log(`Loading ${url}...`);
            try {
                const doc = await resolver(url, "application/xml");
                if (doc)
                    files[url] = doc;
                else
                    throw new Error(`Could not resolve ${url}`);

                const references = findDTSReferences(doc, url);
                for (const refUrl of references) {
                    await tryLoad(refUrl);
                }
            }
            catch (error) {
                logger.error(`Failed to load ${url}: ${error}`);
            }
        }
    }

    for (const u of urls) {
        await tryLoad(u);
    }

    return Object.values(files);
}


function findDTSReferences(doc: Document, url: string): string[] {
    let nodes: Attr[] = [];
    if (isSchemaUrl(url)) {
        const imports = select("//xsd:import/@schemaLocation", doc) as Attr[];
        const includes = select("//xsd:include/@schemaLocation", doc) as Attr[];
        const linkbaseRefs = select("//link:linkbaseRef/@xlink:href", doc) as Attr[];
        nodes = [...imports, ...includes, ...linkbaseRefs];
    }
    if (isLinkbaseUrl(url)) {
        nodes = select("//link:*/@xlink:href", doc) as Attr[];
    }
    return nodes.map(node => resolveNodeUrl(removeFragment(node.value), node));
}

function removeFragment(fullUrl: string): string {
    const [url,] = fullUrl.split("#");
    return url;
}

function isSchemaUrl(url: string): boolean {
    return url.toLocaleLowerCase().endsWith(".xsd");
}

function isLinkbaseUrl(url: string): boolean {
    return url.toLocaleLowerCase().endsWith(".xml");
}