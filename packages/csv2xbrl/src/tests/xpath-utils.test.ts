import { parseXMLFromString } from "../xml-base";
import { qnameValue, urlValue, getFragmentValue, getQNameAttribute, getSchemaElementQName, getUrlAttribute } from "../xpath-utils";
import { DOMParser } from "xmldom";
import xpath from "xpath";

describe(getQNameAttribute, () => {
    it("Obtains the value of a QName attribute", () => {
        const doc = new DOMParser().parseFromString("<element xmlns:ns='http://example.com' ns:attr='ns:name' />", "application/xml");
        const elm = doc.documentElement;
        const qname = getQNameAttribute(elm, "attr", "http://example.com");
        expect(qname).toEqual({ ns: "http://example.com", localName: "name" });
    });

    it("Obtains the value of a QName attribute without a prefix", () => {
        const doc = new DOMParser().parseFromString("<element xmlns='http://example.com' attr='name' />", "application/xml");
        const elm = doc.documentElement;
        const qname = getQNameAttribute(elm, "attr");
        expect(qname).toEqual({ ns: "http://example.com", localName: "name" });
    });

    it("Obtains the value of a QName attribute in a child element", () => {
        const doc = new DOMParser().parseFromString("<element xmlns:ns='http://example.com'><child ns:attr='ns:name' /></element>", "application/xml");
        const elm = doc.documentElement.firstChild as Element;
        const qname = getQNameAttribute(elm, "attr", "http://example.com");
        expect(qname).toEqual({ ns: "http://example.com", localName: "name" });
    });

    it("Obtains the value of a QName attribute in a child element the redefines the prefix", () => {
        const doc = new DOMParser().parseFromString("<element xmlns:ns='http://example.com'><child xmlns:ns='http://other.com' attr='ns:name' /></element>", "application/xml");
        const elm = doc.documentElement.firstChild as Element;
        const qname = getQNameAttribute(elm, "attr");
        expect(qname).toEqual({ ns: "http://other.com", localName: "name" });
    });
});

describe(getSchemaElementQName, () => {
    it("Obtains the value of a schema element QName", () => {
        const doc = new DOMParser().parseFromString("<schema targetNamespace='http://example.com' xmlns='http://www.w3.org/2001/XMLSchema'><element name='name' /></schema>", "application/xml");
        const elm = doc.documentElement.firstChild as Element;
        const qname = getSchemaElementQName(elm);
        expect(qname).toEqual({ ns: "http://example.com", localName: "name" });
    });
});

describe(getUrlAttribute, () => {
    it("Obtains the value of a URL attribute", () => {
        const doc = parseXMLFromString("<element xmlns='http://example.com' attr='ref.xml' />", "http://example.com/example.xml");
        const elm = doc.documentElement;
        const url = getUrlAttribute(elm, "attr");
        expect(url).toBe("http://example.com/ref.xml");
    });

    it("Obtains the value of a URL attribute in a child element", () => {
        const doc = parseXMLFromString("<element xmlns='http://example.com'><child attr='ref.xml' /></element>", "http://example.com/example.xml");
        const elm = doc.documentElement.firstChild as Element;
        const url = getUrlAttribute(elm, "attr");
        expect(url).toBe("http://example.com/ref.xml");
    });

    it("Obtains the value of a URL attribute in a child element that redefines the base URI", () => {
        const doc = parseXMLFromString(
            "<element>"
            + "<child xml:base='http://other.com' attr='ref.xml' />"
            + "</element>",
            "http://example.com/example.xml");
        const elm = doc.documentElement.firstChild as Element;
        const url = getUrlAttribute(elm, "attr");
        expect(url).toBe("http://other.com/ref.xml");
    });

    it("Obtains the valye of a URL attribute refined with a relative URL in a child element", () => {
        const doc = parseXMLFromString(
            "<element>"
            + "<child xml:base='./subdir/' attr='ref.xml' />"
            + "</element>",
            "http://example.com/example.xml");
        const elm = doc.documentElement.firstChild as Element;
        const url = getUrlAttribute(elm, "attr");
        expect(url).toBe("http://example.com/subdir/ref.xml");
    });

    it("Obtains the value of a URL attribute with fragment id, refined with a relative URL in a child element", () => {
        const doc = parseXMLFromString(
            "<element>"
            + "<child1 xml:base='./subdir/'>"
            + "<child2 xml:base='subdir2/' attr='ref.xml#id' />"
            + "</child1>"
            + "</element>",
            "http://example.com/example.xml");
        const elm = doc.documentElement.firstChild?.firstChild as Element;
        const url = getUrlAttribute(elm, "attr");
        expect(url).toBe("http://example.com/subdir/subdir2/ref.xml#id");
    });
});

describe(qnameValue, () => {
    it("Obtains the value of a node as a QName", () => {
        const doc = new DOMParser().parseFromString("<element xmlns:ns='http://example.com'>ns:name</element>", "application/xml");
        const node = doc.documentElement.firstChild!;
        const qname = qnameValue(node.nodeValue!, node);
        expect(qname).toEqual({ ns: "http://example.com", localName: "name" });
    });

    it("Obtains the value of a node as a QName without a prefix", () => {
        const doc = new DOMParser().parseFromString("<element xmlns='http://example.com'>name</element>", "application/xml");
        const node = doc.documentElement.firstChild!;
        const qname = qnameValue(node.nodeValue!, node);
        expect(qname).toEqual({ ns: "http://example.com", localName: "name" });
    });
});

describe(urlValue, () => {
    it("Obtains the value of a node as a url resolved in the context of the node", () => {
        const doc = parseXMLFromString("<element xmlns='http://example.com' ref='ref.xml'>333</element>", "http://example.com/");
        const node = xpath.select("*/@ref", doc) as Attr[];
        const url = urlValue(node[0]);
        expect(url).toBe("http://example.com/ref.xml");
    });
});


describe(getFragmentValue, () => {
    it("Obtains the fragment id of an element as a resolved URI in its context", () => {
        const doc = parseXMLFromString("<element xmlns='http://example.com' id='id'>333</element>", "http://example.com/file.xml");
        const node = doc.documentElement;
        const url = getFragmentValue(node);
        expect(url).toBe("http://example.com/file.xml#id");
    });
});