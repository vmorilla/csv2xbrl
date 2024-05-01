export function resolveSQName(sqname: string, namespaces: { [prefix: string]: string }): [string, string] {
    // The identifier of a SQName might contain colons.
    const colonIndex = sqname.indexOf(':');
    const prefix = sqname.substring(0, colonIndex);
    const identifier = sqname.substring(colonIndex + 1);
    const ns = namespaces[prefix];
    if (typeof ns === 'undefined') {
        throw new Error(`Namespace prefix '${prefix}' not found`);
    }
    return [ns, identifier];
}