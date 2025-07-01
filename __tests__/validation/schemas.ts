import { z as zod3 } from 'zod/v3';
import { z as zod4 } from 'zod/v4';
import * as yup from 'yup';
import * as st from 'superstruct';
import * as v from 'valibot';
import * as arktype from 'arktype';
import { Schema } from 'effect';
import * as $ from 'scale-codec';
import * as T from 'runtypes';

/**
 * Test schema definitions for different validation libraries
 * Each library implements the same validation logic in its own dialect
 */

export interface TestSchemas {
  objectSchemas: {
    userSchema: any;
    emailSchema: any;
  };
  argumentSchemas: {
    stringNumberArray: any[];
    emptyArray: any[];
    stringMinArray: any[];
  };
  outputSchemas: {
    numberTransform: any;
  };
  metadataSchemas: {
    operationSchema: any;
    authSchema: any;
  };
}


// Zod v3 schemas
export const zod3Schemas: TestSchemas = {
  objectSchemas: {
    userSchema: zod3.object({ name: zod3.string(), age: zod3.number() }),
    emailSchema: zod3.object({ email: zod3.string().email() }),
  },
  argumentSchemas: {
    stringNumberArray: [zod3.string(), zod3.number()],
    emptyArray: [],
    stringMinArray: [zod3.string().min(1)],
  },
  outputSchemas: {
    numberTransform: zod3.object({ result: zod3.number() }),
  },
  metadataSchemas: {
    operationSchema: zod3.object({ op: zod3.string() }),
    authSchema: zod3.object({ op: zod3.string(), auth: zod3.boolean() }),
  },
};

// Zod v4 schemas
export const zod4Schemas: TestSchemas = {
  objectSchemas: {
    userSchema: zod4.object({ name: zod4.string(), age: zod4.number() }),
    emailSchema: zod4.object({ email: zod4.email() }),
  },
  argumentSchemas: {
    stringNumberArray: [zod4.string(), zod4.number()],
    emptyArray: [],
    stringMinArray: [zod4.string().min(1)],
  },
  outputSchemas: {
    numberTransform: zod4.object({ result: zod4.number() }),
  },
  metadataSchemas: {
    operationSchema: zod4.object({ op: zod4.string() }),
    authSchema: zod4.object({ op: zod4.string(), auth: zod4.boolean() }),
  },
};

// Yup schemas
export const yupSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: yup.object({ name: yup.string().required(), age: yup.number().required() }),
    emailSchema: yup.object({ email: yup.string().email().required() }),
  },
  argumentSchemas: {
    stringNumberArray: [yup.string().required(), yup.number().required()],
    emptyArray: [],
    stringMinArray: [yup.string().min(1).required()],
  },
  outputSchemas: {
    numberTransform: yup.object({ result: yup.number().required() }),
  },
  metadataSchemas: {
    operationSchema: yup.object({ op: yup.string().required() }),
    authSchema: yup.object({ op: yup.string().required(), auth: yup.boolean().required() }),
  },
};

// Superstruct schemas
export const superstructSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: st.object({ name: st.string(), age: st.number() }),
    emailSchema: st.object({ email: st.string() }), // Note: superstruct doesn't have built-in email validation
  },
  argumentSchemas: {
    stringNumberArray: [st.string(), st.number()],
    emptyArray: [],
    stringMinArray: [st.size(st.string(), 1, Infinity)],
  },
  outputSchemas: {
    numberTransform: st.object({ result: st.number() }),
  },
  metadataSchemas: {
    operationSchema: st.object({ op: st.string() }),
    authSchema: st.object({ op: st.string(), auth: st.boolean() }),
  },
};

// Valibot schemas
export const valibotSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: v.object({ name: v.string(), age: v.number() }),
    emailSchema: v.object({ email: v.pipe(v.string(), v.email()) }),
  },
  argumentSchemas: {
    stringNumberArray: [v.string(), v.number()],
    emptyArray: [],
    stringMinArray: [v.pipe(v.string(), v.minLength(1))],
  },
  outputSchemas: {
    numberTransform: v.object({ result: v.number() }),
  },
  metadataSchemas: {
    operationSchema: v.object({ op: v.string() }),
    authSchema: v.object({ op: v.string(), auth: v.boolean() }),
  },
};

// ArkType schemas
export const arktypeSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: arktype.type({ name: 'string', age: 'number' }),
    emailSchema: arktype.type({ email: 'string.email' }),
  },
  argumentSchemas: {
    stringNumberArray: [arktype.type('string'), arktype.type('number')],
    emptyArray: [],
    stringMinArray: [arktype.type('string>0')],
  },
  outputSchemas: {
    numberTransform: arktype.type({ result: 'number' }),
  },
  metadataSchemas: {
    operationSchema: arktype.type({ op: 'string' }),
    authSchema: arktype.type({ op: 'string', auth: 'boolean' }),
  },
};

// Effect Schema schemas (with standard schema wrapper)
export const effectSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: Schema.standardSchemaV1(Schema.Struct({ name: Schema.String, age: Schema.Number })),
    emailSchema: Schema.standardSchemaV1(Schema.Struct({ email: Schema.String })), // Effect has email validation but it's more complex
  },
  argumentSchemas: {
    stringNumberArray: [Schema.standardSchemaV1(Schema.String), Schema.standardSchemaV1(Schema.Number)],
    emptyArray: [],
    stringMinArray: [Schema.standardSchemaV1(Schema.String)], // Effect's minLength is more complex
  },
  outputSchemas: {
    numberTransform: Schema.standardSchemaV1(Schema.Struct({ result: Schema.Number })),
  },
  metadataSchemas: {
    operationSchema: Schema.standardSchemaV1(Schema.Struct({ op: Schema.String })),
    authSchema: Schema.standardSchemaV1(Schema.Struct({ op: Schema.String, auth: Schema.Boolean })),
  },
};

// Scale Codec schemas
export const scaleSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: $.object($.field('name', $.str), $.field('age', $.i32)),
    emailSchema: $.object($.field('email', $.str)), // scale-codec doesn't have email validation
  },
  argumentSchemas: {
    stringNumberArray: [$.str, $.i32],
    emptyArray: [],
    stringMinArray: [$.str], // scale-codec doesn't have string length validation
  },
  outputSchemas: {
    numberTransform: $.object($.field('result', $.i32)),
  },
  metadataSchemas: {
    operationSchema: $.object($.field('op', $.str)),
    authSchema: $.object($.field('op', $.str), $.field('auth', $.bool)),
  },
};

// Runtypes schemas
export const runtypesSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: T.Object({ name: T.String, age: T.Number }),
    emailSchema: T.Object({ email: T.String }), // runtypes doesn't have built-in email validation
  },
  argumentSchemas: {
    stringNumberArray: [T.String, T.Number],
    emptyArray: [],
    stringMinArray: [T.String], // runtypes doesn't have built-in min length
  },
  outputSchemas: {
    numberTransform: T.Object({ result: T.Number }),
  },
  metadataSchemas: {
    operationSchema: T.Object({ op: T.String }),
    authSchema: T.Object({ op: T.String, auth: T.Boolean }),
  },
};

// Test data for validation scenarios
export const testData = {
  validUser: { name: 'John', age: 25 },
  validEmail: { email: 'test@example.com' },
  invalidEmail: { email: 'invalid' },
  validStringNumber: ['Alice', 28] as const,
  validNumberTransform: { value: 5 },
  expectedNumberResult: { result: 10 },
  validMetadata: { op: 'test' },
  validAuthMetadata: { op: 'test', auth: true },
  emptyString: '',
};