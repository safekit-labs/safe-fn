/**
 * Schema validation types for the SafeFn library
 * Simplified to support only StandardSchema V1 compatible validators
 */

import type { StandardSchemaV1 } from "@/standard-schema";

// ========================================================================
// SCHEMA VALIDATION TYPES
// ========================================================================

/**
 * Schema validation function type - supports only StandardSchema V1 compatible validators
 * 
 * All validators must implement the StandardSchema V1 interface or be null for unvalidated arguments.
 * This includes Zod, Valibot, ArkType, Effect Schema, and Superstruct when used with StandardSchema adapters.
 */
export type SchemaValidator<T> = StandardSchemaV1<T> | null;

// ========================================================================
// TUPLE INFERENCE UTILITIES
// ========================================================================

/**
 * Helper type for mixed validation schema arrays with explicit type parameters
 */
export type InputSchemaArray<TArgs extends readonly any[]> = {
  [K in keyof TArgs]: SchemaValidator<TArgs[K]> | null;
};

// ========================================================================
// TYPE UTILITIES (following better-call pattern)
// ========================================================================

/**
 * Utility type to infer the input type of a schema validator
 * Following better-call pattern from router implementation
 */
export type InferSchemaInput<T> = T extends StandardSchemaV1 
  ? StandardSchemaV1.InferInput<T> 
  : T extends null
  ? unknown // null markers produce unknown type
  : unknown;

/**
 * Utility type to infer the output type of a schema validator
 * Following better-call pattern from router implementation
 */
export type InferSchemaOutput<T> = T extends StandardSchemaV1 
  ? StandardSchemaV1.InferOutput<T> 
  : T extends null
  ? unknown // null markers produce unknown type
  : unknown;

/**
 * Utility type to convert array of schema validators to tuple of their output types
 */
export type InferTupleFromSchemas<T extends readonly SchemaValidator<any>[]> = T extends readonly []
  ? readonly []
  : T extends readonly [infer First, ...infer Rest]
  ? First extends SchemaValidator<any>
    ? Rest extends readonly SchemaValidator<any>[]
      ? readonly [InferSchemaOutput<First>, ...InferTupleFromSchemas<Rest>]
      : never
    : never
  : {
      readonly [K in keyof T]: InferSchemaOutput<T[K]>;
    };

// ========================================================================
// RAW/VALIDATED TYPE INFERENCE UTILITIES
// ========================================================================

/**
 * Extract raw input type - if StandardSchemaV1, use Input generic, otherwise use type directly
 */
export type InferRawInput<T> = T extends StandardSchemaV1<infer Input, unknown>
  ? Input
  : T;

/**
 * Extract validated input type - if StandardSchemaV1, use Output generic, otherwise use type directly
 */
export type InferValidatedInput<T> = T extends StandardSchemaV1<unknown, infer Output>
  ? Output
  : T;

/**
 * Extract raw output type - if StandardSchemaV1, use Input generic, otherwise use type directly
 */
export type InferRawOutput<T> = T extends StandardSchemaV1<infer Input, unknown>
  ? Input
  : T;

/**
 * Extract validated output type - if StandardSchemaV1, use Output generic, otherwise use type directly
 */
export type InferValidatedOutput<T> = T extends StandardSchemaV1<unknown, infer Output>
  ? Output
  : T;