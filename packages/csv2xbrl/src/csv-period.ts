import { XBRLError, oimce } from "./errors";
import { DateTime, DurationLike } from "luxon";

const year = '\\d{4}';
const month = '\\d{2}';
const day = '\\d{2}';
const time = '\\d{2}:\\d{2}:\\d{2}';
const fractionalSecond = '\\.\\d+';
const timeZone = '(?:Z|[+-]\\d{2}:\\d{2})';

const xsDateTimePattern = new RegExp(`^${year}-${month}-${day}T${time}(?:${fractionalSecond})?(?:${timeZone})?$`);
const xsDatePattern = new RegExp(`^${year}-${month}-${day}(?:${timeZone})?$`);
const xsMonthPattern = new RegExp(`^${year}-${month}$`);
const xsYearPattern = new RegExp(`^(${year})((H|Q|W)(\\d{1,2}))?$`);

/**
 * Parses a CSV period and returns a string (for instant types) or a tuple of strings (for duration types).
 * @param input The period string to parse
 * @returns  A string for instant types or a tuple of strings for duration types [start, end]
 */
export function parsePeriod(input: string): string | [string, string] {

    if (xsDateTimePattern.test(input)) {
        return input;
    }

    const [period, suffix] = input.split('@');


    const [start, end] = parseAbbreviatedPeriod(period);

    if (!suffix)
        return [start, end];
    else if (suffix === 'start')
        return start;
    else if (suffix === 'end')
        return end;
    else
        throw new XBRLError(oimce.invalidPeriodRepresentation, `Invalid suffix in date: ${input}`);

}

function parseAbbreviatedPeriod(period: string): [string, string] {
    if (period.includes("/")) {
        const [start, end] = period.split("/");
        assertValidXsDateTime(start);
        assertValidXsDateTime(end);
        return [start, end];
    }

    if (period.includes("..")) {
        const [start, end] = period.split("..");
        assertValidXsDate(start);
        assertValidXsDate(end);
        return [start, end];
    }

    // Abbreviated formats
    if (xsDatePattern.test(period)) {
        return [period, period]; // It's an interval (start of the day, end of the day)
    }

    if (xsMonthPattern.test(period)) {
        return buildAbbreviatePeriod(period, {}, { months: 1 });
    }

    const m = period.match(xsYearPattern);
    if (m) {
        const suffix = m[3];
        const indexStr = m[4];
        const index = parseInt(indexStr);
        const year = m[1];

        if (suffix) {
            if (suffix === 'H') {
                if (index < 1 || index > 2 || indexStr.length > 1)
                    throw new XBRLError(oimce.invalidPeriodRepresentation, `Invalid date: ${period}. Abbreviation suffix is not valid`);
                else {
                    return buildAbbreviatePeriod(year, { months: 6 * (index - 1) }, { months: 6 });
                }
            } else if (suffix === 'Q') {
                if (index < 1 || index > 4 || indexStr.length > 1)
                    throw new XBRLError(oimce.invalidPeriodRepresentation, `Invalid date: ${period}. Abbreviation suffix is not valid`);
                else {
                    return buildAbbreviatePeriod(year, { months: 3 * (index - 1) }, { months: 3 });
                }

            } else {
                if (index < 1 || index > 52 || indexStr.length != 2)
                    throw new XBRLError(oimce.invalidPeriodRepresentation, `Invalid date: ${period}. Abbreviation suffix is not valid`);
                else {
                    return buildAbbreviatePeriod(year, { weeks: (index - 1) }, { weeks: 1 });
                }
            }

        } else
            return buildAbbreviatePeriod(year, {}, { year: 1 });
    }
    throw new XBRLError(oimce.invalidPeriodRepresentation, `Invalid date: ${period}`);
}


function toXSDDate(date: DateTime) {
    return date.toFormat('yyyy-MM-dd');
}


function buildAbbreviatePeriod(yearString: string, offset: DurationLike, length: DurationLike): [string, string] {
    const year = DateTime.fromISO(yearString);
    const start = year.plus(offset);
    const end = start.plus(length).minus({ days: 1 });

    return [toXSDDate(start), toXSDDate(end)];
}

function assertValidXsDateTime(date: string) {
    if (!xsDateTimePattern.test(date)) {
        throw new XBRLError(oimce.invalidPeriodRepresentation, `Invalid date: ${date}. It must follow xs:dateTime format`);
    }
}

function assertValidXsDate(date: string) {
    if (!xsDatePattern.test(date)) {
        throw new XBRLError(oimce.invalidPeriodRepresentation, `Invalid date: ${date}. It must follow xs:date format`);
    }
}


