#!/usr/bin/env node
import { csv2xbrl, loadPackages } from "csv2xbrl";
import { program } from '@commander-js/extra-typings';
import fs from "fs";

function parseArgs() {
    return program
        .name("csv2xbrl")
        .description("JSON files to convert to xBRL")
        .argument("<jsonFiles...>", "JSON files to convert to xBRL")
        .option("-p, --package <package>", "Taxonomy package zip files to load")
        .option("-o, --output <output>", "Output file. Standard output if - is specified. If not specified, "
            + "it uses the same name of the input file, but with the .xbrl extension.")
        .action((args, options, logger) => {
            if (args.length > 1 && options.output) {
                logger.error("Output file can only be specified when converting a single JSON file.");
                process.exit(1);
            }
        })
        .parse();
}


async function main() {
    const command = parseArgs();
    const args = command.args;
    const options = command.opts();

    const resolver = await loadPackages(options.package?.split(",") as string[]);
    for (const jsonFile of args) {
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
