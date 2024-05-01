import xpath from "xpath";
import { XMLWriter } from "../simple-xml-writer";
import { StringWritable } from '../util';
import { DOMParser } from 'xmldom';


const select = xpath.useNamespaces({});

describe(XMLWriter, () => {
    it("should write a simple XML document", () => {
        const output = new StringWritable();
        const writer = new XMLWriter(output, { version: "1.0", encoding: "UTF-8" });
        writer.elm("root").elm("child").txt("text").end().end();
        // Loads the XML document and returns the text content of the specified node.
        const document = new DOMParser().parseFromString(output.toString());

        expect((select("//root/child/text()", document, true) as Node).nodeValue?.trim()).toBe("text");
        expect(output.toString()).toMatchSnapshot();
    });

    it("should write a simple XML document with text node in the same line", () => {
        const output = new StringWritable();
        const writer = new XMLWriter(output, { version: "1.0", encoding: "UTF-8" });
        writer.elm("root").felm("child", {}, "text").end();
        const document = new DOMParser().parseFromString(output.toString());

        expect((select("//root/child/text()", document, true) as Node).nodeValue).toBe("text");
        expect(output.toString()).toMatchSnapshot();
    });

    it("should write a simple XML document with attributes", () => {
        const output = new StringWritable();
        const writer = new XMLWriter(output, { version: "1.0", encoding: "UTF-8" });
        writer.elm("root", { attr1: "value1", attr2: "value2" }).end();
        const document = new DOMParser().parseFromString(output.toString());

        expect((select("//root/@attr1", document, true) as Node).nodeValue).toBe("value1");
        expect((select("//root/@attr2", document, true) as Node).nodeValue).toBe("value2");
        expect(output.toString()).toMatchSnapshot();
    });

    it("should escape special characters", () => {
        const output = new StringWritable();
        const writer = new XMLWriter(output, { version: "1.0", encoding: "UTF-8" });
        writer.felm("root", {}, "a > b");
        const document = new DOMParser().parseFromString(output.toString());

        expect(output.toString().search(/a &gt; b/)).toBeGreaterThan(-1);

        expect((select("//root/text()", document, true) as Node).nodeValue).toBe("a > b");

        expect(output.toString()).toMatchSnapshot();
    });
});