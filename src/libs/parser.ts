// ========================================================================
// SCHEMA PARSING UTILITIES
// ========================================================================

import { StandardSchemaV1Error } from "@/libs/standard-schema-v1/error";

import type { StandardSchemaV1 } from "@/libs/standard-schema-v1/spec";
import type { SchemaValidator } from "@/types";

// ========================================================================
// VALIDATOR TYPE DEFINITIONS
// ========================================================================

// ------------------ INDIVIDUAL PARSER TYPES ------------------

// Zod / TypeSchema
export type ParserZodEsque<TInput, TParsedInput> = {
  _input: TInput;
  _output: TParsedInput;
};

// Valibot
export type ParserValibotEsque<TInput, TParsedInput> = {
  schema: {
    _types?: {
      input: TInput;
      output: TParsedInput;
    };
  };
};

// ArkType
export type ParserArkTypeEsque<TInput, TParsedInput> = {
  inferIn: TInput;
  infer: TParsedInput;
};

// Standard Schema
export type ParserStandardSchemaEsque<TInput, TParsedInput> = StandardSchemaV1<
  TInput,
  TParsedInput
>;

// Zod-like with parse method
export type ParserMyZodEsque<TInput> = {
  parse: (input: any) => TInput;
};

// Superstruct
export type ParserSuperstructEsque<TInput> = {
  create: (input: unknown) => TInput;
};

// Custom validator function
export type ParserCustomValidatorEsque<TInput> = (input: unknown) => Promise<TInput> | TInput;

// Yup
export type ParserYupEsque<TInput> = {
  validateSync: (input: unknown) => TInput;
};

// Scale
export type ParserScaleEsque<TInput> = {
  assert(value: unknown): asserts value is TInput;
};

// ------------------ UNION TYPES FOR CLASSIFICATION ------------------

export type ParserWithoutInput<TInput> =
  | ParserCustomValidatorEsque<TInput>
  | ParserMyZodEsque<TInput>
  | ParserScaleEsque<TInput>
  | ParserSuperstructEsque<TInput>
  | ParserYupEsque<TInput>;

export type ParserWithInputOutput<TInput, TParsedInput> =
  | ParserZodEsque<TInput, TParsedInput>
  | ParserValibotEsque<TInput, TParsedInput>
  | ParserArkTypeEsque<TInput, TParsedInput>
  | ParserStandardSchemaEsque<TInput, TParsedInput>;

export type Parser = ParserWithInputOutput<any, any> | ParserWithoutInput<any>;

// ========================================================================
// PARSE FUNCTION TYPE
// ========================================================================

export type ParseFn<TType> = (value: unknown) => Promise<TType> | TType;

// ========================================================================
// MAIN VALIDATOR FUNCTION
// ========================================================================

// ------------------ MAIN PARSER FACTORY ------------------

/**
 * Creates a parser function that supports multiple schema libraries
 * and lets underlying schema errors flow through naturally
 */
export function createParseFn<T>(schema: SchemaValidator<T>): ParseFn<T> {
  const parser = schema as any;
  const isStandardSchema = "~standard" in parser;

  // ArkType - has both function call and assert method
  if (typeof parser === "function" && typeof parser.assert === "function") {
    return parser.assert.bind(parser);
  }

  // Custom validator function (but not Standard Schema)
  if (typeof parser === "function" && !isStandardSchema) {
    return parser;
  }

  // Zod async parsing
  if (typeof parser.parseAsync === "function") {
    return parser.parseAsync.bind(parser);
  }

  // Zod/Valibot sync parsing
  if (typeof parser.parse === "function") {
    return parser.parse.bind(parser);
  }

  // Yup validation
  if (typeof parser.validateSync === "function") {
    return parser.validateSync.bind(parser);
  }

  // Superstruct
  if (typeof parser.create === "function") {
    return parser.create.bind(parser);
  }

  // Scale assert
  if (typeof parser.assert === "function") {
    return (value) => {
      parser.assert(value);
      return value as T;
    };
  }

  // Standard Schema - only case where we need to create our own error
  if (isStandardSchema) {
    return async (value: unknown) => {
      const result = await parser["~standard"].validate(value);
      if (result.issues) {
        throw new StandardSchemaV1Error(result.issues);
      }
      return result.value;
    };
  }

  throw new Error("Could not find a compatible parser method");
}
