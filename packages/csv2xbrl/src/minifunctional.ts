
// Small library with functional programming utilities

/**
 * Maps the values of an object
 * @param obj Object
 * @param fn Mapping function that receives the value and as optional parameter the key
 * @returns the converted object with the same keys and converted values
 */
export function mapValues<V, W>(obj: { [key: string]: V }, fn: (value: V, key: string) => W): { [key: string]: W } {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [key, fn(value, key)]));
}

export function mapKeys<K, V>(obj: { [key: string]: V }, fn: (key: string, value: V) => K): { [key: string]: V } {
    return Object.fromEntries(Object.entries(obj).map(([key, value]) => [fn(key, value), value]));
}

export function arrayIntersection<T>(a: T[], b: T[]): T[] {
    return a.filter(value => b.includes(value));
}

export function arrayDifference<T>(a: T[], b: T[]): T[] {
    return a.filter(value => !b.includes(value));
}
