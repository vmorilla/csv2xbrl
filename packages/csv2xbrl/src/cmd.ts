#!/usr/bin/env ts-node
import yargs from "yargs";
import { hideBin } from "yargs/helpers";
import fs from "fs";
import { csv2xbrl } from "./csv2xbrl";
import { loadPackages } from "./resolvers";

function args() {
    return yargs(hideBin(process.argv))
        .options({
            package: {
                alias: "z",
                type: "string",
                description: "Taxonomy package zip files to load",
            },
            output: {
                alias: "o",
                type: "string",
                description: "Output file. Standard output if - is specified. If not specified, "
                    + "it uses the same name of the input file, but with the .xbrl extension.",
            },
        })
        .demandCommand(1, "At least one JSON file is required")
        .parseSync();
}

async function main() {
    const argv = args();
    const jsonFiles = argv._ as string[];
    if (jsonFiles.length > 1 && argv.output) {
        throw new Error("Output file can only be specified when converting a single JSON file");
    }
    const resolver = await loadPackages(argv.package?.split(",") as string[]);
    for (const jsonFile of jsonFiles) {
        try {
            const outputFile = argv.output || jsonFile.replace(/\.json$/, ".xbrl");
            const output = outputFile === "-" ? process.stdout : fs.createWriteStream(outputFile);
            const jsonUrl = new URL(jsonFile, `file://${process.cwd()}/`).href;
            await csv2xbrl(jsonUrl, output, resolver);
            if (outputFile !== "-")
                console.log(`xBRL file written to ${outputFile}`);
        }
        catch (e: any) {
            console.error(`Error converting ${jsonFile}: ${e.message}`);
        }
    }
}

main();
