# CSV2XBRL
<p>
    <img src="https://img.shields.io/badge/status-Work%20in%20Progress-orange" alt="Work in Progress" />
    <img src="https://img.shields.io/badge/license-MIT-purple.svg" alt="MIT license" />
</p>

A library to convert XBRL-CSV files to XBRL-XML.

## Installation

First, make sure you have Node.js and npm installed on your machine. Then, install the package with npm or your favourite package manager:

```bash
npm install csv2xbrl
```

## Usage


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