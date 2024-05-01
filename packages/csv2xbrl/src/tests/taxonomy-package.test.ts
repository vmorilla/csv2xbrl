import { TaxonomyPackage, catalogRemappings } from "../taxonomy-package";
import { DOMParser } from 'xmldom';

describe("catalogRemappings", () => {
    it("Returns empty object for empty catalog", () => {
        const catalog = new DOMParser().parseFromString('<catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog"></catalog>', 'application/xml');
        const remappings = catalogRemappings(catalog);
        expect(remappings).toEqual({});
    });

    it("Returns a single remapping", () => {
        const catalog = new DOMParser().parseFromString('<catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog"><rewriteURI uriStartString="http://www.example.com/" rewritePrefix="../tmp/"></rewriteURI></catalog>', 'application/xml');
        const remappings = catalogRemappings(catalog);
        expect(remappings).toEqual({ 'http://www.example.com/': '../tmp/' });
    });

    it("Returns a single remapping with base URI", () => {
        const catalog = new DOMParser().parseFromString('<catalog xmlns="urn:oasis:names:tc:entity:xmlns:xml:catalog" xml:base="../"><rewriteURI uriStartString="http://www.example.com/" rewritePrefix="www.example.com/"/></catalog>', 'application/xml');
        const remappings = catalogRemappings(catalog);
        expect(remappings).toEqual({ 'http://www.example.com/': '../www.example.com/' });
    });
});

describe("entryPoints", () => {
    it("Returns the entry points for the LEI taxonomy", async () => {
        const taxPackage = await TaxonomyPackage.load('testdata/lei-taxonomy-REC-2020-07-02.zip');
        expect(taxPackage.entryPoints.length).toBe(3);
    });
});

