"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSKQuickStartText = exports.getSearchkitConfig = exports.indexDocs = exports.getDocs = exports.addMappingES7 = exports.getMapping = exports.createIndices = exports.dropIndices = exports.transformDefinitionField = exports.toDate = exports.toNumber = exports.splitComma = void 0;
const elasticsearch_1 = require("@elastic/elasticsearch");
const lodash_1 = __importDefault(require("lodash"));
const parse_1 = __importDefault(require("date-fns/parse"));
const formatISO_1 = __importDefault(require("date-fns/formatISO"));
const splitComma = (str) => (str ? str.split(',').map((a) => a.trim()) : []);
exports.splitComma = splitComma;
const toNumber = (str) => {
    if (!str)
        return undefined;
    return Number(str.replace(/\D+/g, ''));
};
exports.toNumber = toNumber;
const toDate = (format) => (str) => {
    if (!str)
        return null;
    try {
        return formatISO_1.default(parse_1.default(str, format, new Date()));
    }
    catch (e) {
        throw new Error(str + 'incorrect time date value');
    }
};
exports.toDate = toDate;
const transformDefinitionField = (field) => {
    const subFields = [];
    if (field.type) {
        subFields.push({
            type: field.type
        });
    }
    else if (field.searchable) {
        subFields.push({
            type: 'text'
        });
    }
    else if (field.stored) {
        subFields.push({
            type: 'keyword'
        });
    }
    if (field.facet && subFields[0].type === 'text') {
        subFields.push({
            name: 'keyword',
            type: 'keyword'
        });
    }
    if (subFields.length === 1) {
        return {
            [field.fieldName]: {
                type: subFields[0].type
            }
        };
    }
    const [primaryField, ...secondaryFields] = subFields;
    return {
        [field.fieldName]: {
            type: primaryField.type,
            fields: secondaryFields.reduce((sum, a) => (Object.assign(Object.assign({}, sum), { [a.name]: { type: a.name } })), {})
        }
    };
};
exports.transformDefinitionField = transformDefinitionField;
const dropIndices = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new elasticsearch_1.Client({
        node: config.host
    });
    try {
        yield client.indices.delete({ index: config.index });
    }
    catch (e) { }
});
exports.dropIndices = dropIndices;
const createIndices = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new elasticsearch_1.Client({
        node: config.host
    });
    try {
        yield client.indices.create({ index: config.index });
    }
    catch (e) {
        throw new Error('Could not create indices. Might of failed to delete Indices.');
    }
});
exports.createIndices = createIndices;
const getMapping = (config) => {
    const fieldMappings = config.fields.map(exports.transformDefinitionField);
    return fieldMappings.reduce((sum, field) => (Object.assign(Object.assign({}, sum), field)), {});
};
exports.getMapping = getMapping;
const addMappingES7 = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new elasticsearch_1.Client({
        node: config.host
    });
    try {
        yield client.indices.putMapping({
            index: config.index,
            body: {
                properties: exports.getMapping(config)
            }
        });
    }
    catch (e) {
        throw new Error('could not put field mapping');
    }
});
exports.addMappingES7 = addMappingES7;
const getDocs = (config) => {
    if (config.source) {
        return config.source.map((doc) => config.fields
            .map((field) => {
            var _a;
            const value = field.sourceOptions ? doc[field.sourceOptions.path] : null;
            return {
                [field.fieldName]: ((_a = field.sourceOptions) === null || _a === void 0 ? void 0 : _a.transform)
                    ? field.sourceOptions.transform(value, doc)
                    : value
            };
        })
            .reduce((sum, value) => (Object.assign(Object.assign({}, sum), value)), {}));
    }
};
exports.getDocs = getDocs;
const indexDocs = (config) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new elasticsearch_1.Client({
        node: config.host
    });
    const docs = yield exports.getDocs(config);
    try {
        const cmds = lodash_1.default.flatMap(docs, (doc) => [
            { index: { _index: config.index, _id: doc.id, _type: config.type } },
            doc
        ]);
        yield client.bulk({
            body: cmds,
            refresh: true
        });
    }
    catch (e) {
        throw new Error('Could not index documents');
    }
});
exports.indexDocs = indexDocs;
const getSubFieldType = (fields, types) => {
    const key = Object.keys(fields).find((key) => types.includes(fields[key].type));
    return {
        subFieldKey: key,
        subFieldType: fields[key].type
    };
};
const getSearchkitConfig = (config, mapping) => {
    const storedFields = config.fields.filter((f) => f.stored).map((f) => f.fieldName);
    const searchableFields = config.fields
        .filter((f) => f.searchable)
        .map((f) => {
        const fieldMapping = mapping[f.fieldName];
        if (fieldMapping.type === 'text') {
            return f.fieldName;
        }
        const textFieldKey = getSubFieldType(fieldMapping.fields, ['text']);
        return `${f.fieldName}.${textFieldKey}`;
    });
    const facetFields = config.fields
        .filter((f) => f.facet)
        .map((f) => {
        const fieldMapping = mapping[f.fieldName];
        let field = '';
        let fieldType = '';
        if (['keyword', 'integer', 'date', 'float', 'geo_point'].includes(fieldMapping.type)) {
            field = f.fieldName;
            fieldType = fieldMapping.type;
        }
        else {
            const { subFieldKey, subFieldType } = getSubFieldType(fieldMapping.fields, [
                'keyword',
                'integer',
                'float',
                'date',
                'geo_point'
            ]);
            field = `${f.fieldName}.${subFieldKey}`;
            fieldType = subFieldType;
        }
        if (fieldType === 'keyword') {
            return {
                fieldType: 'refinement',
                field: field,
                identifier: f.fieldName,
                label: f.fieldName
            };
        }
        else if (fieldType === 'date') {
            return { fieldType: 'dateRange', field: field, identifier: f.fieldName, label: f.fieldName };
        }
        else if (['integer', 'float'].includes(fieldType)) {
            return {
                fieldType: 'numericRange',
                field: field,
                identifier: f.fieldName,
                label: f.fieldName
            };
        }
        return null;
    });
    return {
        searchableFields,
        facetFields,
        storedFields
    };
};
exports.getSearchkitConfig = getSearchkitConfig;
const getSKQuickStartText = ({ searchableFields, facetFields, storedFields, host, index, mapping }) => {
    const mappingCall = {
        properties: mapping
    };
    return `

First setup your indices

\`\`\`json
PUT /${index}

{}

\`\`\`

Then push your indices mapping file. This will define the field types within your document.

\`\`\`json
PUT /${index}/_mapping

${JSON.stringify(mappingCall, null, 2)}
\`\`\`

Then setup Searchkit. Below is a configuration based on your settings.

See API Setup documentation on https://searchkit.co/docs/quick-start/api-setup

\`\`\`javascript
  const searchkitConfig = {
    host: '${host}',
    index: '${index}',
    hits: {
      fields: [${storedFields.map((f) => `'${f}'`).join(',')}]
    },
    sortOptions: [
      { id: 'relevance', label: "Relevance", field: [{"_score": "desc"}], defaultOption: true}
    ],
    query: new MultiMatchQuery({ fields: [${searchableFields.map((f) => `'${f}'`).join(',')}] }),
    facets: [
      ${facetFields
        .map((f) => {
        if (f.fieldType === 'refinement') {
            return `
      new RefinementSelectFacet({
        field: '${f.field}',
        identifier: '${f.label}',
        label: '${f.label}'
      }),
          `;
        }
        else if (f.fieldType === 'dateRange') {
            return `
      new DateRangeFacet({
        field: '${f.field}',
        identifier: '${f.label}',
        label: '${f.label}'
      }),
          `;
        }
        else if (f.fieldType === 'numericRange') {
            return `
      new RangeFacet({
        field: '${f.field}',
        identifier: '${f.label}',
        label: '${f.label}'
        range: {
          min: <MIN>,
          max: <MAX>,
          interval: <internal>
        }
      }),
          `;
        }
    })
        .join(``)}
    ]
  }
\`\`\`

and update the graphql schema hitFields type. Each field type is declared as a string but you may need to update the field depending on how its stored in elasticsearch. It may be:
- a date
- an array of strings
- a number

\`\`\`gql

type ResultHit implements SKHit {
  id: ID!
  fields: HitFields
}

type HitFields {
  ${storedFields
        .map((f) => `${f}: String
  `)
        .join('')}
}
\`\`\`

  `;
};
exports.getSKQuickStartText = getSKQuickStartText;
