# CSV2XBRL CLI
<p>
    <img src="https://img.shields.io/npm/v/csv2xbrl-cli" alt="Version" />
    <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="MIT license" />
</p>

A simple command-line interface to transform [xBRL-CSV](https://www.xbrl.org/Specification/xbrl-csv/REC-2021-10-13+errata-2023-04-19/xbrl-csv-REC-2021-10-13+corrected-errata-2023-04-19.html#sec-table-templates) files into [xBRL-XML](https://www.xbrl.org/Specification/XBRL-2.1/REC-2003-12-31/XBRL-2.1-REC-2003-12-31+corrected-errata-2013-02-20.html) instance documents.

## Installation

First, make sure you have Node.js and npm installed on your machine. Then, install the tool with npm:

```bash
npm install -g csv2xbrl-cli
```

## Usage

You can use the tool from the command line as follows:

```bash
csv2xbrl [options] <jsonFile>...
```

Replace <jsonFile>... with one or more paths to JSON files that you want to convert to XBRL.

### Options

- -p, --package <package>: Specify taxonomy package zip files to load. If you want to specify multiple files, separate them with commas.
- -o, --output <output>: Specify the output file. If you specify - as the output file, the tool will write to standard output. If you don't specify an output file, the tool will use the same name as the input file, but with the .xbrl extension.

### Examples

Convert a single JSON file and write the output to output.xbrl:

```bash
csv2xbrl -o output.xbrl input.json
```

Convert multiple JSON files:

```bash
csv2xbrl input1.json input2.json input3.json
```

This will create input1.xbrl, input2.xbrl and input3.xbrl.

Convert a JSON file and write the result to standard output:

```bash
csv2xbrl -o - input.json
```

## Limitations
See [limitations](../csv2xbrl/README.md#Limitations) in the CSV2XBRL package

