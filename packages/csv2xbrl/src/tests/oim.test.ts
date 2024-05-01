import { resolveSQName } from "../oim";

describe(resolveSQName, () => {
    it("should resolve a SQName", () => {
        const sqname = "xbrli:unit";
        const namespaces = {
            xbrli: "http://www.xbrl.org/2003/instance"
        };
        const [ns, identifier] = resolveSQName(sqname, namespaces);
        expect(ns).toBe("http://www.xbrl.org/2003/instance");
        expect(identifier).toBe("unit");
    });

    it("should throw an exception if resolving a SQName with an unknown prefix", () => {
        const sqname = "xbrli:unit";
        const namespaces = {};
        expect(() => resolveSQName(sqname, namespaces)).toThrow();
    });

    it("should throw an error when the prefix is not found", () => {
        const sqname = "xbrli:unit";
        const namespaces = {};
        expect(() => resolveSQName(sqname, namespaces)).toThrow();
    });

    it("should throw an error when the colon is not found", () => {
        const sqname = "xbrliunit";
        const namespaces = {};
        expect(() => resolveSQName(sqname, namespaces)).toThrow();
    });

    it("should throw an error when the colon is at the beginning", () => {
        const sqname = ":unit";
        const namespaces = {};
        expect(() => resolveSQName(sqname, namespaces)).toThrow();
    });

    it("should parse correctly an identifier containing colons", () => {
        const sqname = "xbrli:unit:measure";
        const namespaces = {
            xbrli: "http://www.xbrl.org/2003/instance"
        };
        const [ns, identifier] = resolveSQName(sqname, namespaces);
        expect(ns).toBe("http://www.xbrl.org/2003/instance");
        expect(identifier).toBe("unit:measure");
    });

});