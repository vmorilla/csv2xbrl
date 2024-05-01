// A very simple XML writer that produces well formatted XBRL documents
// Implemented to replace XMLBuilder2 which does not allow proper XBML formatting

import { mapKeys } from "./minifunctional";

export class XMLWriter {
    private openTags: string[] = [];

    /**
     * 
     * @param output Writeable stream to write the XML document to
     * @param attrs Attributes of the XML declaration
     * @param namespaces An initial list of namespaces by prefix to be used in the document
     */
    constructor(private output: NodeJS.WritableStream,
        attrs: { version?: "1.0", encoding?: string, standalone?: boolean },
        public namespaces: { [prefix: string]: string } = {}) {
        output.write(`<?xml`);
        for (const [key, value] of Object.entries(attrs)) {
            this.output.write(` ${key}="${value}"`);
        }
        this.output.write("?>\n");
    }

    registerNamespace(prefix: string, uri: string): string {
        if (this.openTags.length) {
            throw new Error("Cannot register namespace after writing an element");
        }

        const matchingKeyValues = Object.entries(this.namespaces).find(([key, value]) => value === uri);
        if (matchingKeyValues) {
            return matchingKeyValues[0];
        }

        let newPrefix = prefix;
        let suffix = 0;
        while (newPrefix in this.namespaces) {
            // Prefix is already in use, we need to change it
            newPrefix = `${prefix}${suffix++}`;
        }
        this.namespaces[newPrefix] = uri;

        return newPrefix;
    }

    /**
     * Writes an open element provided the tag and attributes. It should be later be closed by calling the end method.
     * @param tag 
     * @param attrs 
     * @returns The writer object to allow fluent chaining
     */
    elm(tag: string, attrs: { [key: string]: string } = {}) {
        this.openTag(tag, attrs);
        this.output.write(">\n");
        this.openTags.push(tag);
        return this;
    }

    /**
     * Writes a closed element provided the tag, attributes and text content
     * @param tag 
     * @param attrs 
     * @param text 
     * @returns The writer object to allow fluent chaining
     */
    felm(tag: string, attrs: { [key: string]: string } = {}, text?: string) {
        this.openTag(tag, attrs);
        if (text) {
            this.output.write(`>${encodeXML(text)}</${tag}>\n`);
        }
        else {
            this.output.write(` />\n`);
        }
        return this;
    }

    private openTag(tag: string, attrs: { [key: string]: string }) {
        this.indent().write(`<${tag}`);
        // The root element also includes the namespaces attributes
        const nsAttrs = this.openTags.length ? {} : mapKeys(this.namespaces, (prefix) => prefix ? `xmlns:${prefix}` : "xmlns");
        const allAttrs = { ...nsAttrs, ...attrs };
        for (const key of Object.keys(allAttrs).sort()) {
            const value = allAttrs[key];
            this.output.write(this.openTags.length ? ` ${key}="${value}"` : `\n\t${key}="${value}"`);
        }
    }

    /**
     * Writes a text node
     * @param text 
     * @returns The writer object to allow fluent chaining
     */
    txt(text: string) {
        if (!this.openTags.length)
            throw new Error("Cannot write text to document node");

        this.indent().write(encodeXML(text));
        this.output.write('\n');
        return this;
    }

    /**
     * Closes the currently open element
     * @returns The writer object to allow fluent chaining
     */
    end() {
        if (!this.openTags.length)
            throw new Error("Cannot end document node");

        const tag = this.openTags.pop();
        this.indent().write(`</${tag}>\n`);
        return this;
    }

    /**
     * Writes a comment node
     * @param text 
     * @returns The writer object to allow fluent chaining
     */
    comment(text: string) {
        this.indent().write(`<!-- ${encodeXML(text)} -->\n`);
        return this;
    }

    private indent() {
        this.output.write(`${'\t'.repeat(this.openTags.length)}`);
        return this.output;
    }


}

function encodeXML(text: string) {
    function replaceChar(char: string): string {
        switch (char) {
            case '&': return '&amp;';
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '"': return '&quot;';
            case "'": return '&apos;';
            default: throw new Error(`Unexpected character ${char}`);
        }
    }

    return text.replace(/[&<>"']/g, replaceChar);
}