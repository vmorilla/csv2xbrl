import { csv2xbrl } from "../csv2xbrl";
import { Resolver, loadPackages } from "../resolvers";
import { Taxonomy } from "../taxonomy";
import { StringWritable } from "../util";
import { namespaces } from "../xbrl";
import { parseXMLFromString } from "../xml-base";
import xpath from "xpath";

const taxpackages = "testdata";
const csvfiles = "testdata/xbrl-csv-tutorial";
const packages = [`${taxpackages}/sample-taxonomy.zip`, `${taxpackages}/xbrl-org.zip`, `${taxpackages}/eurofiling.zip`];

const entryPoints = {
    example: "http://example.com/xbrl-csv/taxonomy.xsd",
};

const select = xpath.useNamespaces({ eg: "http://example.com/xbrl-csv/taxonomy", ...namespaces });

let resolver: Resolver;
beforeAll(async () => {
    resolver = await loadPackages(packages);
});


describe("Test taxonomy (for convenience)", () => {
    it("Loads a taxonomy from a taxonomy package", async () => {
        const resolver = await loadPackages(packages);
        const taxonomy = await Taxonomy.load(entryPoints.example, resolver);
        expect(taxonomy).toBeDefined();
    });
});

describe("CSV tutorial examples", () => {
    it("example1", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example1.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(3);
        expect((select("//xbrldi:typedMember", xbrl) as Node[]).length).toBe(3);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
    });

    it("example2", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example2.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(3);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
    });

    it("example3", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example3.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(3);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(4);
    });

    it("example4", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example4.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(9);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(2);
    });

    it("example5", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example5.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(6);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
    });

    it("example6", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example6.json`);
        expect(select("count(//xbrli:context)", xbrl) as number).toBe(9);
        expect(select("count(//xbrli:unit)", xbrl) as number).toBe(2);

        const f1 = (select("count(//eg:LoanAmount[@decimals = 0])", xbrl) as number);
        expect(f1).toBe(6);

        const f2 = (select("count(//eg:InterestRate[@decimals = 4])", xbrl) as number);
        expect(f2).toBe(3);

    });

    it("example6.1", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example6.1.json`);
        expect(select("count(//xbrli:context)", xbrl) as number).toBe(9);
        expect(select("count(//xbrli:unit)", xbrl) as number).toBe(2);

        const f1 = (select("count(//eg:LoanAmount[@decimals = -3])", xbrl) as number);
        expect(f1).toBe(1);

        const f2 = (select("count(//eg:LoanAmount[@decimals = 2])", xbrl) as number);
        expect(f2).toBe(1);

        const f3 = (select("count(//eg:LoanAmount[@decimals = 'INF'])", xbrl) as number);
        expect(f3).toBe(1);
    });

    // This example includes:
    //  - A table with empty columns
    //  - Multiple tables in a single report
    //  - Report level dimensions
    it("example7", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example7.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(6);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
    });

    // This example includes:
    // - Usage of the special parameter rowNumber
    it("example8", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example8.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(3);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
    });

    it("example9", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example9.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(3);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
    });

    it("example10", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example10-extend.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(6);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
    });

    it("example11", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example11.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(1);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(2);
        expect((select("//*[@contextRef]", xbrl) as Node[]).length).toBe(6);
    });

    it("example12", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example12.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(15);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
        expect((select("//*[@contextRef]", xbrl) as Node[]).length).toBe(15);
    });


    // Footnotes are not supported yet
    xit("example13", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example13.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(15);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
        expect((select("//*[@contextRef]", xbrl) as Node[]).length).toBe(15);
    });

    xit("example13.1", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example13.1.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(15);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
        expect((select("//*[@contextRef]", xbrl) as Node[]).length).toBe(15);
    });

    xit("example13.2", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example13.2.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(15);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
        expect((select("//*[@contextRef]", xbrl) as Node[]).length).toBe(15);
    });

    xit("example14", async () => {
        const xbrl = await csv2xbrlTest(`${csvfiles}/example14.json`);
        expect((select("//xbrli:context", xbrl) as Node[]).length).toBe(15);
        expect((select("//xbrli:unit", xbrl) as Node[]).length).toBe(1);
        expect((select("//*[@contextRef]", xbrl) as Node[]).length).toBe(15);
    });



});

async function csv2xbrlTest(jsonFile: string) {
    const output = new StringWritable();
    const cwd = process.cwd();
    const jsonFileUrl = new URL(jsonFile, `file://${cwd}/`).toString();
    await csv2xbrl(jsonFileUrl, output, resolver);
    const xbrl = parseXMLFromString(output.toString());
    return xbrl;
}

