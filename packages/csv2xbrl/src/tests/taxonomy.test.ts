import { Resolver, loadPackages } from "../resolvers";
import { Concept, Dimension, Taxonomy, isComplexDataType, isConcept, isDimension, isSimpleDataType } from "../taxonomy";
import { namespaces } from "../xbrl";

// TODO: organize better the common variables
const SECONDS = 1000;

const leiNS = "http://www.xbrl.org/taxonomy/int/lei/2020-07-02";
const samples = "testdata";
const packages = {
    lei: [`${samples}/lei-taxonomy-REC-2020-07-02.zip`],
    eba: [
        `${samples}/eba_dictionary_3.4.0.0.zip`,
        `${samples}/eba_frameworks_3.4.0.0.zip`,
        `${samples}/eba_severity_3.4.0.0.zip`
    ],
}

const eba_modules = {
    mrel_tlac: ["http://www.eba.europa.eu/eu/fr/xbrl/crr/fws/mrel/its-006-2020/2024-02-29/mod/mrel_tlac.xsd"]
}

const lei_module = ["https://www.xbrl.org/taxonomy/int/lei/2020-07-02/lei.xsd"];

// Loads an caches a taxonomy...
async function loadTaxonomy(module: string[], resolver: Resolver) {
    if (taxonomyCache.has(module[0])) {
        return taxonomyCache.get(module[0])!;
    }
    const taxonomy = await Taxonomy.load(module, resolver);
    taxonomyCache.set(module[0], taxonomy);
    return taxonomy;
}

const taxonomyCache = new Map<string, Taxonomy>();


describe("Taxonomy dictionary", () => {
    it("Finds the items in a taxonomy", async () => {
        // const package = await TaxonomyPackage.load(packages.lei[0]);
        const resolver = await loadPackages(packages.lei);
        const taxonomy = await loadTaxonomy(lei_module, resolver);
        const testItem = taxonomy.get("https://www.xbrl.org/taxonomy/int/lei/2020-07-02/lei.xsd#lei_LEI")! as Concept;
        expect(isConcept(testItem)).toBe(true);
        expect(testItem.id).toBe("lei_LEI");
        expect(testItem.name.ns).toBe("http://www.xbrl.org/taxonomy/int/lei/2020-07-02");
        expect(testItem.type.name.localName).toBe("leiItemType");
        expect(testItem.numeric).toBe(false);
        // expect(testItem.periodType).toBe("duration");
    });

    it("Finds a dimension in a taxonomy", async () => {
        const resolver = await loadPackages(packages.eba);
        const taxonomy = await loadTaxonomy(eba_modules.mrel_tlac, resolver);
        const testItem = taxonomy.get({ localName: "MCC", ns: "http://www.eba.europa.eu/xbrl/crr/dict/dim" })! as Dimension;
        expect(isDimension(testItem)).toBe(true);
        expect(testItem.id).toBe("eba_MCC");
        expect(testItem.typedDomain).toBeUndefined();
    }, 30 * SECONDS);

    it("Finds a typed dimension in a taxonomy", async () => {
        const resolver = await loadPackages(packages.eba);
        const taxonomy = await loadTaxonomy(eba_modules.mrel_tlac, resolver);
        const testItem = taxonomy.get({ localName: "LEC", ns: "http://www.eba.europa.eu/xbrl/crr/dict/dim" })! as Dimension;
        expect(isDimension(testItem)).toBe(true);
        expect(testItem.id).toBe("eba_LEC");
        expect(testItem.typedDomain).toBeDefined();
        expect(testItem.typedDomain?.name).toEqual({ ns: "http://www.eba.europa.eu/xbrl/crr/dict/typ", localName: "LE" });
    }, 30 * SECONDS);

    it("Finds a numeric concept in a taxonomy", async () => {
        const resolver = await loadPackages(packages.eba);
        const taxonomy = await loadTaxonomy(eba_modules.mrel_tlac, resolver);
        const testItem = taxonomy.get({ localName: "mi1", ns: "http://www.eba.europa.eu/xbrl/crr/dict/met" })! as Concept;
        expect(isConcept(testItem)).toBe(true);
        expect(testItem.id).toBe("eba_mi1");
        expect(testItem.numeric).toBe(true);
    }, 30 * SECONDS);
});


// describe("Taxonomy data types", () => {

//     it("Checks a complex data type", async () => {
//         const catalog = await TaxonomyCatalog.build(packages.lei);
//         const taxonomy = await catalog.loadTaxonomy(lei_module);
//         const types = [...taxonomy.dataTypes.values()];
//         const testType = types.filter(isComplexDataType).filter(t => t.name.ns == leiNS)[0];
//         expect(testType.name).toEqual({ ns: leiNS, localName: "leiItemType" });
//         expect(testType.baseType).toEqual({ ns: namespaces.xbrli, localName: "stringItemType" });
//         expect(testType.id).toBeUndefined();
//         expect(testType.attributeGroup?.localName).toBe("nonNumericItemAttrs");
//     });

//     it("Checks a simple data type", async () => {
//         const files = await sampleDTS(packages.lei);
//         const types = explicitDataTypes(files);
//         const testType = types.filter(isSimpleDataType).filter(t => t.name.ns == leiNS)[0];
//         expect(testType.name).toEqual({ ns: leiNS, localName: "leiType" });
//         expect(testType.baseType).toEqual({ ns: namespaces.xsd, localName: "string" });
//         expect(testType.id).toBeUndefined();
//     });


// describe("Taxonomy data types with references", () => {
//     it("Checks the the reference type of the primary item in a simple taxonomy", async () => {
//         const files = await sampleDTS(packages.lei);
//         const taxonomy = new Taxonomy(files);
//         const primaryItem = [...taxonomy.concepts.values()][0];
//         expect(primaryItem.type.name.localName).toBe("leiItemType");
//         expect(primaryItem.type.name.ns).toEqual(leiNS);
//     });

//     it("Checks the the reference type of the primary item in a larger taxonomy", async () => {
//         const catalog = await TaxonomyCatalog.build(packages.eba);
//         const taxonomy = await catalog.loadTaxonomy(eba_modules.mrel_tlac);
//         const primaryItem = taxonomy.concepts.get({ ns: "http://www.eurofiling.info/xbrl/ext/filing-indicators", localName: "filingIndicator" })!;
//         expect(primaryItem.type.name.localName).toBe("stringItemType");
//     }, 30 * SECONDS);
// });


