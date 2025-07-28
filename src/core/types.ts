// ========================================================================
// SAFEFN CORE TYPE UTILITIES
// ========================================================================

import type { StandardSchemaV1 } from '../standard-schema';

/**
 * Takes an object type and makes it more readable, converting intersections to proper object types
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

export type MaybePromise<T> = T | Promise<T>;

// ========================================================================
// SCHEMA INFERENCE UTILITIES
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