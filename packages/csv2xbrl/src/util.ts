import { Writable } from "stream";

export class StringWritable extends Writable {
    private _data = '';

    _write(chunk: any, encoding: BufferEncoding, callback: (error?: Error | null) => void): void {
        this._data += chunk.toString();
        callback();
    }

    toString(): string {
        return this._data;
    }
}
