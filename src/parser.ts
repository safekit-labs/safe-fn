// ========================================================================
// SCHEMA PARSING UTILITIES
// ========================================================================

import { StandardSchemaV1Error } from "@/standard-schema";

import type { StandardSchemaV1 } from "@/standard-schema";
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
export type ParserCustomValidatorEsque<TInput> = (input: unknown) => TInput;

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

export type ParseFn<TType> = (value: unknown) => TType;

// ========================================================================
// STANDARD SCHEMA VALIDATION
// ========================================================================

/**
 * Validates input using Standard Schema specification directly
 * Uses proper Standard Schema type inference for input/output
 * Note: Only supports synchronous validation
 */
function standardValidate<T extends StandardSchemaV1>(
  schema: T,
  input: StandardSchemaV1.InferInput<T>
): StandardSchemaV1.InferOutput<T> {
  const result = schema["~standard"].validate(input);

  // Handle async results by throwing an error - we only support sync validation
  if (result instanceof Promise) {
    throw new Error("Async validation is not supported. Please use synchronous Standard Schema validation.");
  }

  // If the `issues` field exists, the validation failed
  if (result.issues) {
    throw new StandardSchemaV1Error(result.issues);
  }

  return result.value;
}

// ========================================================================
// MAIN VALIDATOR FUNCTION
// ========================================================================

// ------------------ MAIN PARSER FACTORY ------------------

/**
 * Creates a parser function that supports multiple schema libraries
 * and lets underlying schema errors flow through naturally
 */
export function createParseFn<T>(schema: SchemaValidator<T>): ParseFn<T> {
  // Handle null marker - skip validation and return input as-is
  if (schema === null) {
    return (value: unknown) => value as T;
  }

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

  // Zod/Valibot sync parsing (prioritize sync over async)
  if (typeof parser.parse === "function") {
    return parser.parse.bind(parser);
  }

  // Zod async parsing (fallback - but we throw error for async)
  if (typeof parser.parseAsync === "function") {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return (_value: unknown) => {
      throw new Error("Async validation is not supported. Use synchronous parsing methods only.");
    };
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

  // Standard Schema - use standardValidate function
  if (isStandardSchema) {
    return (value: unknown) => {
      return standardValidate(parser, value);
    };
  }

  throw new Error("Could not find a compatible parser method");
}