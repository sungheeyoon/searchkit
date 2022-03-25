export declare const splitComma: (str: any) => any;
export declare const toNumber: (str: any) => number;
export declare const toDate: (format: any) => (str: any) => string;
export declare const transformDefinitionField: (field: any) => {
    [x: number]: {
        type: any;
    };
} | {
    [x: number]: {
        type: any;
        fields: any;
    };
};
export declare const dropIndices: (config: any) => Promise<void>;
export declare const createIndices: (config: any) => Promise<void>;
export declare const getMapping: (config: any) => any;
export declare const addMappingES7: (config: any) => Promise<void>;
export declare const getDocs: (config: any) => any;
export declare const indexDocs: (config: any) => Promise<void>;
export declare const getSearchkitConfig: (config: any, mapping: any) => {
    searchableFields: any;
    facetFields: any;
    storedFields: any;
};
export declare const getSKQuickStartText: ({ searchableFields, facetFields, storedFields, host, index, mapping }: {
    searchableFields: any;
    facetFields: any;
    storedFields: any;
    host: any;
    index: any;
    mapping: any;
}) => string;
