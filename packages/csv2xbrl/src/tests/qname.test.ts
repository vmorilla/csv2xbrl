import exp from "constants";
import { QName, QNameMap } from "../qname";

describe(QNameMap, () => {
    it("Stores and retrieves a value", () => {
        const map = new QNameMap<number>();
        const key = { ns: "http://example.com", localName: "key" };
        map.set(key, 42);
        expect(map.get(key)).toBe(42);
    });

    it("Stores and retrieves a value with a different key", () => {
        const map = new QNameMap<number>();
        const key = { ns: "http://example.com", localName: "key" };
        const key2 = { ns: "http://example.com", localName: "key2" };
        map.set(key, 42);
        expect(map.get(key2)).toBeUndefined();
    });

    it("Stores and retrieves a value with a different namespace", () => {
        const map = new QNameMap<number>();
        const key = { ns: "http://example.com", localName: "key" };
        const key2 = { ns: "http://example2.com", localName: "key" };
        map.set(key, 42);
        expect(map.get(key2)).toBeUndefined();
    });

    it("Stores multiple values and retrieves a specific one", () => {
        const map = new QNameMap<number>();
        const key = { ns: "http://example.com", localName: "key" };
        const key2 = { ns: "http://example.com", localName: "key2" };
        map.set(key, 42);
        map.set(key2, 43);
        expect(map.get(key)).toBe(42);
        expect(map.get(key2)).toBe(43);
    });

    it("Initializes from an iterable", () => {
        const map = new QNameMap<number>([[{ ns: "http://example.com", localName: "key" }, 42]]);
        expect(map.get({ ns: "http://example.com", localName: "key" })).toBe(42);
    });
});