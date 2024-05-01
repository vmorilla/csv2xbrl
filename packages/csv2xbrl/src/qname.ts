import { ObjectMap } from "./object-map";


export interface QName {
    ns: string;
    localName: string;
}

export function resolveQName(qname: string, namespaces: { [key: string]: string }): QName {
    let [prefix, localName] = qname.split(":");
    if (!localName) {
        localName = prefix;
        prefix = "";
    }
    const ns = namespaces[prefix];
    return { ns, localName };
}


function qname_serialize(value: QName): string {
    return `${value.localName}@${value.ns}`;
}

function qname_deserialize(value: string): QName {
    const [localName, ns] = value.split("@");
    return { localName, ns };
}



export class QNameMap<T> extends ObjectMap<QName, T> {
    constructor(iterable?: Iterable<[QName, T]>) {
        super(qname_serialize, qname_deserialize, iterable);
    }
}

