# CSV2XBRL command
<p>
    <img src="https://img.shields.io/badge/status-Work%20in%20Progress-orange" alt="Work in Progress" />
    <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="MIT license" />
</p>

A simple command to convert XBRL-CSV files to XBRL-XML. Based on the library with the same name.

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

- -z, --package <package>: Specify taxonomy package zip files to load. If you want to specify multiple files, separate them with commas.
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




## Description of main classes
### TaxonomyCatalog
The taxonomy catalog is the class responsible for managing the access to taxonomy files. The simples way to create a taxonomy catalog is using the build method, which takes an array of file paths to taxonomy packages:
```js
const catalog = await TaxonomyCatalog.build(["taxonomyPackage1.zip", "taxonomyPackage2.zip"]);
```

Once the catalog is built, it is possible to load a taxonomy providing an entry point (an URL to a taxonomy module or an array to multiple ones):
```js
const taxonomy = await catalog.loadTaxonomy("http://www.eba.europa.eu/eu/fr/xbrl/crr/fws/mrel/its-006-2020/2024-02-29/mod/mrel_tlac.xsd");
```

Additionally, the catalog provides a method to load an individual file. It supports both XML and JSON files by indicating the corresponding mime type ('application/json' or 'application/xml'):
```js
const doc = await catalog.resolveDocument("http://www.eba.europa.eu/eu/fr/xbrl/crr/fws/mrel/its-006-2020/2024-02-29/tab/m_01.00/m_01.00.json", "application/json")
```

Mind that the URLs provided must be the normative ones (not local ones), since the catalog takes care of resolving the files to their location in taxonomy packages.

The provided taxonomy object provides some methods to obtain information about the elements in the taxonomy. So far, basic functionality just meant to cover the needs of the CSV to XBRL conversion.

## Not supported
- Footnotes
- Row ids