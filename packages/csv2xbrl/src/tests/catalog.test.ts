import { makeCatalogResolver } from "../catalog";
import { TaxonomyPackage } from "../taxonomy-package";

const samples = "testdata";
const packages = {
    lei: [`${samples}/lei-taxonomy-REC-2020-07-02.zip`],
    eba: [`${samples}/eba_dictionary_3.4.0.0.zip`, `${samples}/eba_frameworks_3.4.0.0.zip`],
}

describe(makeCatalogResolver, () => {
    it("Adds a taxonomy package", async () => {
        const taxonomyPackage = await TaxonomyPackage.load(packages.lei[0]);
        const resolver = makeCatalogResolver([taxonomyPackage]);
        const url = taxonomyPackage.entryPoints[0]!.docs[0]!;
        const doc = await resolver(url, "application/xml");

        expect(doc).not.toBeNull();
        expect(doc?.baseURI).toBe(url);
    });

    it("Resolves a JSON document", async () => {
        const taxonomyPackages = await Promise.all(packages.eba.map(async (path) => await TaxonomyPackage.load(path)));
        const resolver = makeCatalogResolver(taxonomyPackages);
        const url = "http://www.eba.europa.eu/eu/fr/xbrl/crr/fws/mrel/its-006-2020/2024-02-29/tab/m_01.00/m_01.00.json";
        const doc = await resolver(url, "application/json");

        expect(doc).not.toBeNull();
        expect(doc.hasOwnProperty("documentInfo")).toBe(true)
    });

    it("Produces an exception if there is a conflict of the catalogs", async () => {
        const taxonomyPackage = await TaxonomyPackage.load(packages.lei[0]);
        expect(() => makeCatalogResolver([taxonomyPackage, taxonomyPackage])).toThrow();

    });



});