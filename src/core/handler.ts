// ========================================================================
// HANDLER TYPES AND CREATION
// ========================================================================

import type { StandardSchemaV1 } from '../standard-schema';

// ========================================================================
// CONDITIONAL TYPE UTILITIES FOR SCHEMA SUPPORT
// ========================================================================

/**
 * Extract raw input type - if StandardSchemaV1, use Input generic, otherwise use type directly
 */
export type InferRawInput<T> = T extends StandardSchemaV1<infer Input, any> 
  ? Input 
  : T;

/**
 * Extract validated input type - if StandardSchemaV1, use Output generic, otherwise use type directly
 */
export type InferValidatedInput<T> = T extends StandardSchemaV1<any, infer Output>
  ? Output
  : T;

/**
 * Extract raw output type - if StandardSchemaV1, use Input generic, otherwise use type directly
 */
export type InferRawOutput<T> = T extends StandardSchemaV1<infer Input, any>
  ? Input
  : T;

/**
 * Extract validated output type - if StandardSchemaV1, use Output generic, otherwise use type directly
 */
export type InferValidatedOutput<T> = T extends StandardSchemaV1<any, infer Output>
  ? Output  
  : T;

/**
 * Handler parameter object
 */
export interface HandlerParams<
  TContext extends Record<string, any> = {},
  TInput = unknown
> {
  ctx: TContext;
  input: TInput;
}

/**
 * Handler function type
 */
export type Handler<
  TContext extends Record<string, any> = {},
  TInput = unknown,
  TOutput = unknown
> = (params: HandlerParams<TContext, TInput>) => TOutput | Promise<TOutput>;

/**
 * Create typed handler with input/output requirements
 * Supports both regular types and StandardSchemaV1 schemas
 */
export function createHandler<TContext extends {
  ctx?: Record<string, any>;
  input: any | StandardSchemaV1;
  output: any | StandardSchemaV1;
}>(
  handler: Handler<
    TContext['ctx'] extends Record<string, any> ? TContext['ctx'] : {},
    InferValidatedInput<TContext['input']>,
    InferValidatedOutput<TContext['output']>
  >
): Handler<
  TContext['ctx'] extends Record<string, any> ? TContext['ctx'] : {},
  InferValidatedInput<TContext['input']>,
  InferValidatedOutput<TContext['output']>
> {
  return handler;
}