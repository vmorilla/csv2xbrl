import { resolveNodeUrl } from "../xml-base";
import { DOMParser } from 'xmldom';
import xpath from "xpath";

const select = xpath.useNamespaces({ 'xml': 'http://www.w3.org/XML/1998/namespace' });

describe(resolveNodeUrl, () => {
    it("Resolves a relative URL in the context of a XML node", () => {
        const doc = new DOMParser().parseFromString('<root xml:base="http://www.example.com/blah/META-INF/"></root>', 'application/xml');
        const url = resolveNodeUrl("file.xsd", doc.documentElement);
        expect(url).toBe("http://www.example.com/blah/META-INF/file.xsd");
    });

    it("Resolves a relative URL in the context of a XML node with multiple xml:base attributes", () => {
        const doc = new DOMParser().parseFromString('<root xml:base="http://www.example.com/blah/META-INF/"><child xml:base="../"/></root>', 'application/xml');
        const node = (select('child', doc.documentElement) as Node[])[0];
        const url = resolveNodeUrl("file.xsd", node);
        expect(url).toBe("http://www.example.com/blah/file.xsd");
    });

    it("An absolute URL is not affected by xml:base attributes", () => {
        const doc = new DOMParser().parseFromString('<root xml:base="http://www.example.com/blah/META-INF/"></root>', 'application/xml');
        const url = resolveNodeUrl("http://www.example.com/file.xsd", doc.documentElement);
        expect(url).toBe("http://www.example.com/file.xsd");
    });
});