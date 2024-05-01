type XBRLErrorId = xbrlce | oimce | oime;

export enum xbrlce {
    conflictingColumnType = "xbrlce:conflictingColumnType",
    conflictingMetadataValue = "xbrlce:conflictingMetadataValue",
    cycleInExtensionChain = "xbrlce:cycleInExtensionChain",
    illegalExtensionOfFinalProperty = "xbrlce:illegalExtensionOfFinalProperty",
    illegalRedefinitionOfNonExtensibleProperty = "xbrlce:illegalRedefinitionOfNonExtensibleProperty",
    illegalUseOfNone = "xbrlce:illegalUseOfNone",
    invalidCSVFileFormat = "xbrlce:invalidCSVFileFormat",
    invalidConceptQName = "xbrlce:invalidConceptQName",
    invalidDecimalsSuffix = "xbrlce:invalidDecimalsSuffix",
    invalidDecimalsValue = "xbrlce:invalidDecimalsValue",
    invalidDimensionValue = "xbrlce:invalidDimensionValue",
    invalidFactValue = "xbrlce:invalidFactValue",
    invalidHeaderValue = "xbrlce:invalidHeaderValue",
    invalidIdentifier = "xbrlce:invalidIdentifier",
    invalidJSON = "xbrlce:invalidJSON",
    invalidJSONStructure = "xbrlce:invalidJSONStructure",
    invalidLanguageCode = "xbrlce:invalidLanguageCode",
    invalidParameterCSVFile = "xbrlce:invalidParameterCSVFile",
    invalidPeriodRepresentation = "xbrlce:invalidPeriodRepresentation",
    invalidPeriodSpecifier = "xbrlce:invalidPeriodSpecifier",
    invalidPropertyGroupColumnReference = "xbrlce:invalidPropertyGroupColumnReference",
    invalidReference = "xbrlce:invalidReference",
    invalidReferenceTarget = "xbrlce:invalidReferenceTarget",
    invalidRowIdColumn = "xbrlce:invalidRowIdColumn",
    invalidRowIdentifier = "xbrlce:invalidRowIdentifier",
    misplacedDecimalsOnNonFactColumn = "xbrlce:misplacedDecimalsOnNonFactColumn",
    missingParametersFile = "xbrlce:missingParametersFile",
    missingRequiredCSVFile = "xbrlce:missingRequiredCSVFile",
    missingRowIdentifier = "xbrlce:missingRowIdentifier",
    multipleDocumentTypesInExtensionChain = "xbrlce:multipleDocumentTypesInExtensionChain",
    referenceTargetNotDuration = "xbrlce:referenceTargetNotDuration",
    repeatedColumnIdentifier = "xbrlce:repeatedColumnIdentifier",
    repeatedPropertyGroupDecimalsProperty = "xbrlce:repeatedPropertyGroupDecimalsProperty",
    repeatedPropertyGroupDimension = "xbrlce:repeatedPropertyGroupDimension",
    repeatedRowIdentifier = "xbrlce:repeatedRowIdentifier",
    undefinedRowIdColumn = "xbrlce:undefinedRowIdColumn",
    unknownColumn = "xbrlce:unknownColumn",
    unknownLinkGroup = "xbrlce:unknownLinkGroup",
    unknownLinkSource = "xbrlce:unknownLinkSource",
    unknownLinkTarget = "xbrlce:unknownLinkTarget",
    unknownLinkType = "xbrlce:unknownLinkType",
    unknownPropertyGroup = "xbrlce:unknownPropertyGroup",
    unknownSpecialValue = "xbrlce:unknownSpecialValue",
    unknownTableTemplate = "xbrlce:unknownTableTemplate",
    unmappedCellValue = "xbrlce:unmappedCellValue",
    unreferencedParameter = "xbrlce:unreferencedParameter",
    unresolvableBaseMetadataFile = "xbrlce:unresolvableBaseMetadataFile",
}

export enum oimce {
    invalidSQName = "oimce:invalidSQName",
    invalidUnitStringRepresentation = "oimce:invalidUnitStringRepresentation",
    unboundPrefix = "oimce:unboundPrefix",
    invalidPeriodRepresentation = "oimce:invalidPeriodRepresentation",
}

export enum oime {
    disallowedDuplicateFacts = "oime:disallowedDuplicateFacts",
    unknownDimension = "oime:unknownDimension",
    invalidDimensionValue = "oime:invalidDimensionValue",
    unsupportedDimensionDataType = "oime:unsupportedDimensionDataType"
}

export class XBRLError extends Error {
    identifier: string;

    constructor(identifier: XBRLErrorId, message: string) {
        super(`[${identifier}] ${message}`);
        this.identifier = identifier;

        // This line is needed to restore the correct prototype chain.
        Object.setPrototypeOf(this, new.target.prototype);

        // This line is needed to make the 'instanceof' operator work.
        this.name = XBRLError.name;
    }
}

