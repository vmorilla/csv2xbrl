type KeySerializer<K> = (key: K) => string;
type KeyDeserializer<K> = (key: string) => K;


/**
 * A Map implementation that uses a custom key serializer and deserializer to store keys as strings.
 */
export class ObjectMap<K, V> implements Map<K, V> {

    private _map: Map<string, V> = new Map();
    private _keySerializer: KeySerializer<K>;
    private _keyDeserializer: KeyDeserializer<K>;

    constructor(keySerializer: KeySerializer<K>, keyDeserializer: KeyDeserializer<K>, iterable?: Iterable<[K, V]>) {
        this._keySerializer = keySerializer;
        this._keyDeserializer = keyDeserializer;
        if (iterable) {
            for (const [key, value] of iterable) {
                this.set(key, value);
            }
        }
    }

    clear(): void {
        this._map.clear();
    }

    delete(key: K): boolean {
        return this._map.delete(this._keySerializer(key));
    }

    forEach(callbackfn: (value: V, key: K, map: Map<K, V>) => void, thisArg?: any): void {
        this._map.forEach((value, key) => {
            callbackfn(value, this._keyDeserializer(key), this);
        }, thisArg);
    }

    get(key: K): V | undefined {
        return this._map.get(this._keySerializer(key));
    }

    has(key: K): boolean {
        return this._map.has(this._keySerializer(key));
    }

    set(key: K, value: V): this {
        this._map.set(this._keySerializer(key), value);
        return this;
    }

    get size(): number { return this._map.size; }

    entries(): IterableIterator<[K, V]> {
        return Array.from(this._map.entries())
            .map(([key, value]) => [this._keyDeserializer(key), value] as [K, V])[Symbol.iterator]();
    }

    keys(): IterableIterator<K> {
        return Array.from(this._map.keys())
            .map(key => this._keyDeserializer(key))[Symbol.iterator]();

    }

    values(): IterableIterator<V> {
        return this._map.values();
    }

    [Symbol.iterator](): IterableIterator<[K, V]> {
        return this.entries()
    }

    get [Symbol.toStringTag](): string {
        return this._map[Symbol.toStringTag];
    }

}
