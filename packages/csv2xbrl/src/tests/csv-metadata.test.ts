import exp from "constants";
import { MetadataSpec, normalizeMetadata } from "../csv-metadata";


describe(normalizeMetadata, () => {
    it("normalizes a minimum metadata file", async () => {
        const metadata: MetadataSpec = {
            documentInfo: {
                documentType: "https://xbrl.org/2021/xbrl-csv",
            }
        };

        const normalized = normalizeMetadata(metadata, "https://example.com/metadata.json");

        expect(normalized.documentInfo.documentType).toEqual("https://xbrl.org/2021/xbrl-csv");
        expect(normalized.documentInfo.extends).toEqual([]);
        expect(normalized.documentInfo.namespaces).toEqual({});
        expect(normalized.documentInfo.features).toEqual({});
        expect(normalized.documentInfo.final).toEqual({});
        expect(normalized.documentInfo.linkGroups).toEqual({});
        expect(normalized.documentInfo.linkTypes).toEqual({});

        expect(normalized.links).toEqual({});
        expect(normalized.tables).toEqual({});
        expect(normalized.tableTemplates).toEqual({});
    });

    it("resolves url to the file location", () => {
        const metadata: MetadataSpec = {
            documentInfo: {
                documentType: "https://xbrl.org/2021/xbrl-csv",
                extends: ["extended-metadata.json"],
            }
        };

        const normalized = normalizeMetadata(metadata, "https://example.com/metadata.json");

        expect(normalized.documentInfo.extends).toEqual(["https://example.com/extended-metadata.json"]);
    });

    it("resolves relative URLs considering the base URL in the metadata", () => {
        const metadata: MetadataSpec = {
            documentInfo: {
                documentType: "https://xbrl.org/2021/xbrl-csv",
                extends: ["extended-metadata.json"],
                baseURL: "https://example.com/folder/"
            },
            tables: {
                "table1": {
                    url: "table1.csv"
                }
            }
        };

        const normalized = normalizeMetadata(metadata, "file://localfolder/metadata.json");

        expect(normalized.documentInfo.extends).toEqual(["https://example.com/folder/extended-metadata.json"]);
        expect(normalized.tables.table1.url).toEqual("https://example.com/folder/table1.csv");
    });

});