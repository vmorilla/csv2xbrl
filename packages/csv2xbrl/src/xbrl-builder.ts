import { namespaces } from "./xbrl";
import { XMLWriter } from "./simple-xml-writer";

const { xsi, xbrli, link, xlink, xbrldi } = namespaces;
const instance_namespaces = {
    '': xbrli, xsi, link, xlink, xbrldi
}

// Dimension sets do not include OIM's concept dimensions
export type FullDimensions = { unit?: Unit } & ContextDimensions;
export type ContextDimensions = { entity: Entity, period: Period } & ETDimensions;
export type ETDimensions = { [key: string]: ExplicitMember | TypedMember | undefined };

export type ExplicitMember = string | undefined; // OIM allows null value for the representation of the default member of a dimensions
export type TypedMember = [string, string | undefined];
export type Decimals = number | "INF" | undefined;
export type Period = string | [string, string];
export type Unit = string | undefined;
export type Entity = [string, string];

/**
 * The XBRL builder does not make checks on the consistency of the usage of prefixes. It assumes user prefixes
 * (the ones used for dimension names and dimension values) are included in the constructor.
 */
export class XbrlBuilder {
    private xbrl: XMLWriter;

    // Map standard prefixes to prefixes valid in the instance document
    // Necessary to consider the case where a standard prefix is used for a different namespace in the instance document
    private prefix: Record<string, (arg: string) => string> = {};

    // Map of contexts from their surrogated key to its id
    private _lastContextId = 0;
    private _contexts: Map<string, string> = new Map();

    // Map of units from their surrogated key to its id
    private _lastUnitId = 0;
    private _unit: Map<string, string> = new Map();


    constructor(entryPoints: string[], ns_prefixes: { [prefix: string]: string }, output: NodeJS.WritableStream) {

        // Initializes the writer
        this.xbrl = new XMLWriter(output, { version: "1.0", encoding: "UTF-8" }, ns_prefixes);

        // Register xbrl instance prefixes
        for (const [prefix, ns] of Object.entries(instance_namespaces)) {
            const newPrefix = this.xbrl.registerNamespace(prefix, ns);
            this.prefix[prefix] = prefixer(newPrefix);
        }

        this.xbrl.elm("xbrl");
        const link = this.prefix.link;
        const xlink = this.prefix.xlink;

        for (const entryPoint of entryPoints) {
            if (entryPoint.trim().toLowerCase().endsWith('.xsd')) {
                this.xbrl.felm(link('schemaRef'), { [xlink('href')]: entryPoint });
            } else {
                this.xbrl.felm(link('linkbaseRef'), { [xlink('href')]: entryPoint });
            }
        }

        return this;
    }

    public context(dimensions: ContextDimensions): string {

        const key = this.surrogatedKey(dimensions);
        if (this._contexts.has(key)) {
            return this._contexts.get(key)!;
        }
        else {
            const id = `c${++this._lastContextId}`;
            this._contexts.set(key, id);
            this.addContext(id, dimensions);
            return id;
        }
    }

    private addContext(id: string, contextDimensions: ContextDimensions) {
        const { entity: [entitySchema, entityIdentifier], period, ...restDimensions } = contextDimensions;
        this.xbrl.elm('context', { id });
        this.xbrl.elm('entity').felm('identifier', { scheme: entitySchema }, entityIdentifier).end();
        if (period instanceof Array) {
            this.xbrl.elm('period')
                .felm('startDate', {}, period[0])
                .felm('endDate', {}, period[1])
                .end();
        }
        else {
            this.xbrl.elm('period').felm('instant', {}, period).end();
        }
        const xbrldi = this.prefix.xbrldi;
        if (Object.keys(restDimensions).length > 0) {
            this.xbrl.elm('scenario');
            for (const [key, value] of Object.entries(restDimensions)) {
                if (typeof value === 'string') {
                    this.xbrl.felm(xbrldi("explicitMember"), { dimension: key }, value);
                } else {
                    if (typeof value !== 'undefined') {
                        const [domain, domainValue] = value as TypedMember;
                        if (typeof domainValue !== 'undefined') {
                            this.xbrl.elm(xbrldi("typedMember"), { dimension: key }).felm(domain, {}, domainValue).end();
                        }
                    }
                }
            }
            this.xbrl.end(); // Scenario
        }
        this.xbrl.end(); // Context
    }

    private surrogatedKey(dimensions: ContextDimensions) {
        const orderedEntries = Object.entries(dimensions).sort(([keyA], [keyB]) => keyA.localeCompare(keyB));
        return JSON.stringify(orderedEntries);
    }

    public unit(unit: string) {
        if (this._contexts.has(unit)) {
            return this._contexts.get(unit)!;
        }
        else {
            const id = `u${++this._lastUnitId}`;
            this._contexts.set(unit, id);
            this.xbrl.elm('unit', { id }).felm('measure', {}, unit).end();
            return id;
        }
    }

    public numericFact(concept: string, decimals: Decimals, unit: string, contextDimensions: ContextDimensions, value: number) {
        const contextRef = this.context(contextDimensions);
        const unitRef = this.unit(unit!);
        this.xbrl.felm(concept!, { decimals: (decimals ?? "INF").toString(), contextRef, unitRef }, value.toString());
        return this;
    }

    public nonNumericFact(concept: string, contextDimensions: ContextDimensions, value: string) {
        const contextRef = this.context(contextDimensions);
        this.xbrl.felm(concept!, { contextRef }, value);
        return this;
    }

    public comment(text: string) {
        this.xbrl.comment(text);

        return this;
    }

    public end() {
        this.xbrl.end();
    }
}

/**
 * Returns a function that adds a prefix to a localName to create a QName
 * @param prefix 
 * @returns 
 */
function prefixer(prefix: string) {
    return (name: string) => `${prefix}:${name}`;
}

