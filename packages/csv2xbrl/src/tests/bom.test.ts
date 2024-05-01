import { Readable, Transform } from 'stream';
import { stripBOM } from '../bom';
import { createReadStream } from 'fs';

describe('BOM tests', () => {
    it('should remove the bom character from a file', async () => {
        // Create a readable stream from a file
        const readable = createReadStream("src/tests/bom.txt");
        const noBOM = readable.pipe(stripBOM());
        const result = await streamToString(noBOM);

        expect(result).toBe('This file has the byte order mark');
    });

    it('should respect the content of a file without the bom', async () => {
        // Create a readable stream from a file
        const readable = createReadStream("src/tests/nobom.txt");
        const noBOM = readable.pipe(stripBOM());
        const result = await streamToString(noBOM);

        expect(result).toBe('This file has no byte order mark');
    });



});

async function streamToString(readable: Readable) {
    let result = '';
    for await (const chunk of readable) {
        result += chunk;
    }
    return result;
}
