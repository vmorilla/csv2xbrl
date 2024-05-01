import { parsePeriod } from "../csv-period";

describe("The parser manages correctly the CSV period syntax", () => {
    it("Parses a single date", () => {
        const period = parsePeriod("2020-01-01T00:00:00");
        expect(period).toBe("2020-01-01T00:00:00");
    });

    it("parses an interval using the / separator", () => {
        const period = parsePeriod("2020-01-01T00:00:00/2020-12-31T23:59:59");
        expect(period).toEqual(["2020-01-01T00:00:00", "2020-12-31T23:59:59"]);
    });

    it("parses an interval using the .. separator", () => {
        const period = parsePeriod("2020-01-01..2020-12-31");
        expect(period).toEqual(["2020-01-01", "2020-12-31"]);
    });

    it("parses a date in UTC timezone", () => {
        const period = parsePeriod("2020-01-01T00:00:00Z");
        expect(period).toBe("2020-01-01T00:00:00Z");
    });

    it("parses a date with a timezone offset", () => {
        const period = parsePeriod("2020-01-01T01:02:03+01:00");
        expect(period).toBe("2020-01-01T01:02:03+01:00");

        const period2 = parsePeriod("2020-01-01T01:02:03-01:00");
        expect(period2).toBe("2020-01-01T01:02:03-01:00");
    });

    it("parses a day as an interval", () => {
        const period = parsePeriod("2020-01-01");
        expect(period).toEqual(["2020-01-01", "2020-01-01"]);
    });

    it("parses a month as an internval", () => {
        const period = parsePeriod("2020-01");
        expect(period).toEqual(["2020-01-01", "2020-01-31"]);
    });

    it("parses a year as an interval", () => {
        const period = parsePeriod("2020");
        expect(period).toEqual(["2020-01-01", "2020-12-31"]);
    });

    it("parses a weak as an interval", () => {
        const period = parsePeriod("2020W04");
        expect(period).toEqual(["2020-01-22", "2020-01-28"]);
    });

    it("parses the end part of different abbreviation formats", () => {
        const period = parsePeriod("2020W04@end");
        expect(period).toBe("2020-01-28");

        const period2 = parsePeriod("2020-01@end");
        expect(period2).toBe("2020-01-31");

        const period3 = parsePeriod("2020H2@end");
        expect(period3).toBe("2020-12-31");
    });

    it("parses the start part of different abbreviation formats", () => {
        const period = parsePeriod("2020W04@start");
        expect(period).toBe("2020-01-22");

        const period2 = parsePeriod("2020-01@start");
        expect(period2).toBe("2020-01-01");
    });


});