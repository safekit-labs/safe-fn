// ========================================================================
// STANDARD SCHEMA V1 VALIDATION
// ========================================================================

import { StandardSchemaV1Error } from "@/standard-schema";

import type { StandardSchemaV1 } from "@/standard-schema";
import type { SchemaValidator } from "@/types";

// ========================================================================
// PARSE FUNCTION TYPE
// ========================================================================

export type ParseFn<TType> = (value: unknown) => TType;

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
// SIMPLIFIED PARSE FUNCTION FACTORY
// ========================================================================

/**
 * Creates a parser function that supports StandardSchema V1 compatible validators
 * Simplified to follow router pattern - just wraps standardValidate
 */
export function createParseFn<T>(schema: SchemaValidator<T>): ParseFn<T> {
  // Handle null marker - skip validation and return input as-is
  if (schema === null) {
    return (value: unknown) => value as T;
  }

  // For StandardSchema V1 compatible validators, use standardValidate directly
  return (value: unknown) => {
    return standardValidate(schema as StandardSchemaV1, value) as T;
  };
}