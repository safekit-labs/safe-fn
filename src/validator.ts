// ========================================================================
// STANDARDSCHEMA V1 VALIDATION UTILITIES
// ========================================================================

import { StandardSchemaV1Error } from "@/standard-schema";

import type { StandardSchemaV1 } from "@/standard-schema";
import type { SchemaValidator } from "@/types";

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
export function standardValidate<T extends StandardSchemaV1>(
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

/**
 * Creates a parser function that supports StandardSchema V1 compatible validators
 * Simplified from multi-library support to StandardSchema-only approach
 */
export function createParseFn<T>(schema: SchemaValidator<T>): ParseFn<T> {
  // Handle null marker - skip validation and return input as-is
  if (schema === null) {
    return (value: unknown) => value as T;
  }

  const parser = schema as any;
  const isStandardSchema = "~standard" in parser;

  // StandardSchema V1 - the only supported validation pattern
  if (isStandardSchema) {
    return (value: unknown) => {
      return standardValidate(parser, value);
    };
  }

  // All other validators must implement StandardSchema V1 interface
  throw new Error(
    "Only StandardSchema V1 compatible validators are supported. " +
    "Please ensure your validator implements the StandardSchema V1 interface with a '~standard' property."
  );
}