#!/usr/bin/env node
import { csv2xbrl, loadPackages } from "csv2xbrl";
import { program } from '@commander-js/extra-typings';
import fs from "fs";
import { version } from "../package.json";

async function main() {
    const options = program
        .name("csv2xbrl")
        .version(version)
        .description("Transforms xBRL-CSV files into xBRL-XML instance documents")
        .option("-p, --packages <package...>", "Taxonomy package zip files to load")
        .option("-o, --output <output>", "Output file. Standard output if - is specified. If not specified, "
            + "it uses the same name as the metadata JSON file, but with the .xbrl extension.")
        .requiredOption("-j, --json <json...>", "CSV JSON files with the metadata")
        .action((options, logger) => {
            if (options.json.length > 1 && options.output) {
                logger.error("Output file can only be specified when converting a single JSON file.");
                process.exit(1);
            }
        }).showHelpAfterError()
        .parse()
        .opts();

    const resolver = await loadPackages(options.packages || []);
    for (const jsonFile of options.json) {
        try {
            const outputFile = options.output || jsonFile.replace(/\.json$/, ".xbrl");
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
