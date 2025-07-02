// ========================================================================
// SAFEFN FACTORY IMPLEMENTATION
// ========================================================================

import { createSafeFn } from "@/safe-fn";
import { createParseFn } from "@/libs/parser";

import type {
  Context,
  Metadata,
  SafeFn,
  SafeFnClientConfig,
  SchemaValidator,
  InferSchemaOutput
} from "@/types";

// ========================================================================
// SAFEFN CLIENT FUNCTION
// ========================================================================

// Function overloads for proper type inference

// 1. Infer metadata from schema with explicit context
export function createSafeFnClient<TContext extends Context, TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext?: TContext;
  onError?: (error: Error, context: TContext) => void | Promise<void>;
}): SafeFn<TContext, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

// 2. Infer metadata and context from schema and defaultContext
export function createSafeFnClient<TContext extends Context, TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext: TContext;
  onError?: (error: Error, context: TContext) => void | Promise<void>;
}): SafeFn<TContext, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

// 3. Only metadataSchema provided - infer metadata, use default context
export function createSafeFnClient<TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext?: Context;
  onError?: (error: Error, context: Context) => void | Promise<void>;
}): SafeFn<Context, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

// 4. Explicit context without metadataSchema
export function createSafeFnClient<TContext extends Context>(config: {
  defaultContext?: TContext;
  onError?: (error: Error, context: TContext) => void | Promise<void>;
}): SafeFn<TContext, unknown, unknown, Metadata>;

// 5. Infer context from defaultContext without metadataSchema
export function createSafeFnClient<TContext extends Context>(config: {
  defaultContext: TContext;
  onError?: (error: Error, context: TContext) => void | Promise<void>;
}): SafeFn<TContext, unknown, unknown, Metadata>;

// 6. No config provided
export function createSafeFnClient(): SafeFn<{}, unknown, unknown, Metadata>;

/**
 * Creates a SafeFn client with default context and metadata schema
 *
 * @example
 * ```ts
 * const safeFn = createSafeFnClient({
 *   defaultContext: { userId: 'anonymous' },
 *   metadataSchema: z.object({ op: z.string() })
 * });
 * ```
 */
export function createSafeFnClient(
  config?: SafeFnClientConfig<any, any>,
): SafeFn<any, unknown, unknown, any> {
  // When no config is provided, start with empty context like next-safe-action
  const safeFn = config?.defaultContext ? createSafeFn<any>() : createSafeFn<{}>();

  // Configure the SafeFn client with provided settings
  const metadataParser = config?.metadataSchema ? createParseFn(config.metadataSchema) : undefined;

  // Store the client configuration for use in the SafeFn client  
  (safeFn as any)._defaultContext = config?.defaultContext || {};
  (safeFn as any)._metadataParser = metadataParser;
  (safeFn as any)._clientErrorHandler = config?.onError;
  (safeFn as any)._clientMiddlewares = [];

  return safeFn;
}
