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

// Function overloads for proper type inference from schema
export function createSafeFnClient<TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext?: Context;
  onError?: (error: Error, context: Context) => void | Promise<void>;
}): SafeFn<Context, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

export function createSafeFnClient<TContext extends Context, TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext?: TContext;
  onError?: (error: Error, context: TContext) => void | Promise<void>;
}): SafeFn<TContext, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

export function createSafeFnClient<TContext extends Context>(config: {
  defaultContext?: TContext;
  onError?: (error: Error, context: TContext) => void | Promise<void>;
}): SafeFn<TContext, unknown, unknown, Metadata>;

export function createSafeFnClient(): SafeFn<Context, unknown, unknown, Metadata>;

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
  const safeFn = createSafeFn();

  // Configure the SafeFn client with provided settings
  const metadataParser = config?.metadataSchema ? createParseFn(config.metadataSchema) : undefined;

  // Store the client configuration for use in the SafeFn client
  (safeFn as any)._defaultContext = config?.defaultContext;
  (safeFn as any)._metadataParser = metadataParser;
  (safeFn as any)._clientErrorHandler = config?.onError;

  return safeFn;
}
