import { z as zod3 } from "zod/v3";
import { z as zod4 } from "zod/v4";
import * as yup from "yup";
import * as st from "superstruct";
import * as v from "valibot";
import * as arktype from "arktype";
import { Schema } from "effect";
import * as T from "runtypes";
import type { SchemaValidator } from "@/types";

/**
 * Test schema definitions for different validation libraries
 * Each library implements the same validation logic in its own dialect
 */

// Define common types for better type inference
export interface User {
  name: string;
  age: number;
}

export interface Email {
  email: string;
}

export interface NumberTransform {
  result: number;
}

export interface Operation {
  op: string;
}

export interface AuthOperation {
  op: string;
  auth: boolean;
}

export interface TestSchemas {
  objectSchemas: {
    userSchema: SchemaValidator<User>;
    emailSchema: SchemaValidator<Email>;
  };
  argumentSchemas: {
    stringNumberArray: [SchemaValidator<string>, SchemaValidator<number>];
    emptyArray: [];
    stringMinArray: [SchemaValidator<string>];
  };
  outputSchemas: {
    numberTransform: SchemaValidator<NumberTransform>;
  };
  metadataSchemas: {
    operationSchema: SchemaValidator<Operation>;
    authSchema: SchemaValidator<AuthOperation>;
  };
}

// ------------------ ZOD v3 SCHEMAS ------------------

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

// ------------------ ZOD v4 SCHEMAS ------------------

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

// ------------------ YUP SCHEMAS ------------------

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

// ------------------ SUPERSTRUCT SCHEMAS ------------------

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

// ------------------ VALIBOT SCHEMAS ------------------

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

// ------------------ ARKTYPE SCHEMAS ------------------

export const arktypeSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: arktype.type({ name: "string", age: "number" }),
    emailSchema: arktype.type({ email: "string.email" }),
  },
  argumentSchemas: {
    stringNumberArray: [arktype.type("string"), arktype.type("number")],
    emptyArray: [],
    stringMinArray: [arktype.type("string>0")],
  },
  outputSchemas: {
    numberTransform: arktype.type({ result: "number" }),
  },
  metadataSchemas: {
    operationSchema: arktype.type({ op: "string" }),
    authSchema: arktype.type({ op: "string", auth: "boolean" }),
  },
};

// ------------------ EFFECT SCHEMA SCHEMAS ------------------

export const effectSchemas: TestSchemas = {
  objectSchemas: {
    userSchema: Schema.standardSchemaV1(Schema.Struct({ name: Schema.String, age: Schema.Number })),
    emailSchema: Schema.standardSchemaV1(Schema.Struct({ email: Schema.String })), // Effect has email validation but it's more complex
  },
  argumentSchemas: {
    stringNumberArray: [
      Schema.standardSchemaV1(Schema.String),
      Schema.standardSchemaV1(Schema.Number),
    ],
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

// ------------------ RUNTYPES SCHEMAS ------------------

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

// ------------------ TEST DATA ------------------

export const testData = {
  validUser: { name: "John", age: 25 },
  validEmail: { email: "test@example.com" },
  invalidEmail: { email: "invalid" },
  validStringNumber: ["Alice", 28] as const,
  validNumberTransform: { value: 5 },
  expectedNumberResult: { result: 10 },
  validMetadata: { op: "test" },
  validAuthMetadata: { op: "test", auth: true },
  emptyString: "",
};
