/**
 * Schema validation types for the SafeFn library
 */

import type { StandardSchemaV1 } from "@/standard-schema";

// ========================================================================
// SCHEMA VALIDATION TYPES
// ========================================================================

/**
 * Schema validation function type - supports multiple validation libraries
 *
 * Supports Zod, Yup, Valibot, ArkType, Effect Schema, Superstruct, Scale Codec,
 * Runtypes, custom functions, Standard Schema spec, and null for unvalidated arguments.
 */
export type SchemaValidator<T> =
  | { parse: (input: unknown) => T } // Zod schemas
  | { parseAsync: (input: unknown) => Promise<T> } // Zod async
  | { validateSync: (input: unknown) => T } // Yup schemas
  | { create: (input: unknown) => T } // Superstruct schemas
  | { assert: (value: unknown) => asserts value is T } // Scale Codec schemas
  | ((input: unknown) => T) // Plain validation functions & ArkType
  | StandardSchemaV1<T> // Standard Schema spec
  | null; // Skip validation marker

// ========================================================================
// TUPLE INFERENCE UTILITIES
// ========================================================================

/**
 * Helper type for mixed validation schema arrays with explicit type parameters
 */
export type InputSchemaArray<TArgs extends readonly any[]> = {
  [K in keyof TArgs]: SchemaValidator<TArgs[K]> | null;
};

/**
 * Utility type to infer the output type of a schema validator
 */
export type InferSchemaOutput<T> = T extends null
  ? unknown // null markers produce unknown type
  : T extends StandardSchemaV1<any, infer Output>
  ? Output
  : T extends { parse: (input: unknown) => infer U }
  ? U
  : T extends { parseAsync: (input: unknown) => Promise<infer U> }
  ? U
  : T extends { validateSync: (input: unknown) => infer U }
  ? U
  : T extends { create: (input: unknown) => infer U }
  ? U
  : T extends { assert: (value: unknown) => asserts value is infer U }
  ? U
  : T extends (input: unknown) => infer U
  ? U
  : T extends SchemaValidator<infer U>
  ? U
  : never;

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