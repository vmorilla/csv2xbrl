import { makeCatalogResolver } from "../catalog";
import { loadDTS } from "../dts";
import { makeFullResolver } from "../resolvers";
import { TaxonomyPackage } from "../taxonomy-package";

describe(loadDTS, () => {
    it("Loads a taxonomy from a taxonomy package and counts the number of files", async () => {
        const taxpackage = await TaxonomyPackage.load("testdata/lei-taxonomy-REC-2020-07-02.zip");
        const resolver = makeFullResolver([taxpackage]);
        const urls = taxpackage.entryPoints[0].docs;
        const tax = await loadDTS(urls, resolver);
        expect(tax.length).toBe(15);
    });

    it("Throws an error if a file of the taxonomy cannot", async () => {
        const taxpackage = await TaxonomyPackage.load("testdata/lei-taxonomy-REC-2020-07-02.zip");
        const resolver = makeCatalogResolver([taxpackage]);
        const urls = taxpackage.entryPoints[0].docs;
        await expect(loadDTS(urls, resolver)).rejects.toThrow();
    });

});