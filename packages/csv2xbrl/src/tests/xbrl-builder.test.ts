
import { StringWritable } from '../util';
import { namespaces } from '../xbrl';
import { XbrlBuilder } from '../xbrl-builder';
import { parseXMLFromString } from '../xml-base';
import xpath from 'xpath';

const select = xpath.useNamespaces(namespaces);

describe(XbrlBuilder, () => {
    it("should create a basic instance with no facts", () => {
        const output = new StringWritable();
        const builder = new XbrlBuilder([], {}, output).end();
        expect(output.toString()).toMatchSnapshot();
    });

    it("should create a basic instance with target schmea but no facts", () => {
        const output = new StringWritable();
        const builder = new XbrlBuilder(["https://www.acme.org/taxonomy.xsd"], {}, output).end();
        expect(output.toString()).toMatchSnapshot();
    });

    it("uses a different prefix if there is a conflict with user defined ones", () => {
        const output = new StringWritable();
        const builder = new XbrlBuilder([], { xbrldi: "http://acme.org/xbrldi" }, output)
            .nonNumericFact("xbrldi:concept", { entity: ["http://iso.com/lei", "FAKELEI"], period: "2020-01-01", "xbrldi:dim": "xbrldi:exp" }, "Hello World")
            .end();
        expect(output.toString()).toMatchSnapshot();
        const xbrl = parseXMLFromString(output.toString());
        const dim = select("//xbrldi:explicitMember", xbrl, true) as Node;
        const [prefix, _] = dim.nodeName.split(":");
        expect(xbrl.documentElement.getAttributeNS("http://www.w3.org/2000/xmlns/", prefix)).toBe("http://xbrl.org/2006/xbrldi");
    });

    it("adds a nonNumeric fact with a simple context of instant type", () => {
        const output = new StringWritable();
        const builder = new XbrlBuilder([], { acme: "acme.org/taxonomy" }, output)
            .nonNumericFact("acme:Sales", { entity: ["http://iso.com/lei", "FAKELEI"], period: "2020-01-01" }, "Hello World")
            .end();
        expect(output.toString()).toMatchSnapshot();
        const xbrl = parseXMLFromString(output.toString());
        expect((select("//xbrli:instant", xbrl) as Node[]).length).toBe(1);
        expect(output.toString()).toMatchSnapshot();

    });

    it("adds a nonNumeric fact with a simple context of duration type", () => {
        const output = new StringWritable();
        const builder = new XbrlBuilder([], { acme: "acme.org/taxonomy" }, output)
            .nonNumericFact("acme:Sales", { entity: ["http://iso.com/lei", "FAKELEI"], period: ["2020-01-01", "2020-12-31"] }, "Hello World")
            .end();
        expect(output.toString()).toMatchSnapshot();
        const xbrl = parseXMLFromString(output.toString());
        expect((select("//xbrli:startDate", xbrl) as Node[]).length).toBe(1);
        expect((select("//xbrli:endDate", xbrl) as Node[]).length).toBe(1);
        expect(output.toString()).toMatchSnapshot();
    });

    it("adds a fact with a typed dimension", () => {
        const output = new StringWritable();
        const builder = new XbrlBuilder([], { acme: "acme.org/taxonomy" }, output)
            .nonNumericFact("acme:Sales", { entity: ["http://iso.com/lei", "FAKELEI"], period: "2020-01-01", "acme:dim": ["acme:LE", "TyuepedVal"] }, "Hello World")
            .end();
        expect(output.toString()).toMatchSnapshot();
        const xbrl = parseXMLFromString(output.toString());
        expect((select("//xbrldi:typedMember", xbrl) as Node[]).length).toBe(1);
    });

    it("adds a fact with an explicit dimension dimension", () => {
        const output = new StringWritable();
        const builder = new XbrlBuilder([], { acme: "acme.org/taxonomy" }, output)
            .nonNumericFact("acme:Sales", { entity: ["http://iso.com/lei", "FAKELEI"], period: "2020-01-01", "acme:dim": "acme:explicit" }, "Hello World")
            .end();
        expect(output.toString()).toMatchSnapshot();
        const xbrl = parseXMLFromString(output.toString());
        expect((select("//xbrldi:explicitMember", xbrl) as Node[]).length).toBe(1);
    });

    it("adds a numeric fact with a simple context of instant type", () => {
        const output = new StringWritable();
        const builder = new XbrlBuilder([], { acme: "acme.org/taxonomy" }, output)
            .numericFact("acme:Sales", 2, "iso4217:USD", { entity: ["http://iso.com/lei", "FAKELEI"], period: "2020-01-01" }, 100)
            .end();
        expect(output.toString()).toMatchSnapshot();
        const xbrl = parseXMLFromString(output.toString());
        expect((select("//xbrli:instant", xbrl) as Node[]).length).toBe(1);
    });


});
