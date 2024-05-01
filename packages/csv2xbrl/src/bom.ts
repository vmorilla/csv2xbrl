import { Transform } from "stream";

export function stripBOM(): Transform {
    let isFirstChunk = true;
    // Create a transform stream that removes the utf-8 BOM from the first chunk
    const transform = new Transform({
        transform(chunk, _, callback) {
            if (isFirstChunk) {
                isFirstChunk = false;
                if (chunk[0] === 0xEF && chunk[1] === 0xBB && chunk[2] === 0xBF) {
                    callback(null, chunk.slice(3));
                }
                else
                    callback(null, chunk);
            } else {
                callback(null, chunk);
            }
        }
    });
    return transform;
}