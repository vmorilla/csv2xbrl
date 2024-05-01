import yauzl from "yauzl";

export function openZipFile(filePath: string): Promise<yauzl.ZipFile> {
    return new Promise((resolve, reject) => {
        yauzl.open(filePath, { lazyEntries: true, autoClose: false }, (err, zipfile) => {
            if (err) reject(err);
            else resolve(zipfile);
        });
    });
}

export async function* iterateZipEntries(zipFile: yauzl.ZipFile): AsyncGenerator<yauzl.Entry, void, unknown> {
    let resolveNextEntry: (value: yauzl.Entry | null) => void;
    let rejectNextEntry: (reason?: any) => void;
    const nextEntry = (): Promise<yauzl.Entry | null> => new Promise((resolve, reject) => {
        resolveNextEntry = resolve;
        rejectNextEntry = reject;
    });

    zipFile.readEntry();
    zipFile.on('entry', (entry: yauzl.Entry) => {
        resolveNextEntry(entry);
        zipFile.readEntry();
    });
    zipFile.on('end', () => {
        resolveNextEntry(null);
    });
    while (true) {
        const entry = await nextEntry();
        if (entry === null) break;
        yield entry;
    }
}

export function readZipEntryStream(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<NodeJS.ReadableStream> {
    return new Promise((resolve, reject) => {
        zipfile.openReadStream(entry, (err, readStream) => {
            if (err) reject(err);
            else resolve(readStream);
        });
    });
}

const streamToString = (stream: NodeJS.ReadableStream): Promise<string> => {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => chunks.push(chunk));
        stream.on('error', reject);
        stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    });
};


export function readZipEntry(zipfile: yauzl.ZipFile, entry: yauzl.Entry): Promise<string> {
    return readZipEntryStream(zipfile, entry).then(streamToString);
}