# CSV2XBRL
<p>
    <img src="https://img.shields.io/npm/v/csv2xbrl" alt="Version" />
    <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="MIT license" />
</p>

A javascript / typescript library designed to transform [xBRL-CSV](https://www.xbrl.org/Specification/xbrl-csv/REC-2021-10-13+errata-2023-04-19/xbrl-csv-REC-2021-10-13+corrected-errata-2023-04-19.html#sec-table-templates) files into [xBRL-XML](https://www.xbrl.org/Specification/XBRL-2.1/REC-2003-12-31/XBRL-2.1-REC-2003-12-31+corrected-errata-2013-02-20.html) instance documents. 

## Installation

First, make sure you have Node.js and npm installed on your machine. Then, install the package with npm or your favourite package manager:

```bash
npm install csv2xbrl
```

## Usage
The following piece code shows the basic usage of the library:

```typescript
import { csv2xbrl, loadPackages } from "csv2xbrl";

async function main() {

    const resolver = await loadPackages(["mytaxonomy.zip", "xbrl-org.zip"]);
    const output = fs.createWriteStream("output.xbrl");

    await csv2xbrl("file:///path/to/metadata.json", output, resolver);
}

```

1. It first calls the **loadPackages** function with two zip files following the [taxonomy package format](https://www.xbrl.org/Specification/taxonomy-package/REC-2016-04-19/taxonomy-package-REC-2016-04-19.html). This function produces a resolver: a function that, given a URL with the official location of a file and a mime-type, takes care of loading such file. 
   
   In this case, taxonomy packages provide a local copy of resources available on the internet, like a the set of files of a taxonomy or the normative files published by XBRL international. The resolver will be used later by the csv2xbrl function to load files. 
   
   Since loadpackages returns a Promise to a resolver object, the await keyword is used to pause the execution of the function until the Promise is resolved.

2. It then creates a writable stream to a file named *"output.xbrl"* using Node.js's fs.createWriteStream method. This stream will be used to write the output XBRL file.


3. Finally, it calls the csv2xbrl function with three arguments: a URL to the JSON file, the writable stream, and the resolver object. This function is also expected to return a Promise, and the await keyword is used to pause the execution of the function until this Promise is resolved.

## Limitations

The following features in the specification are not supported by the current implementation:
- Footnotes
- Row ids

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

