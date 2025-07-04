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
  InferSchemaOutput,
  ErrorHandlerFn
} from "@/types";

// ========================================================================
// SAFEFN CLIENT FUNCTION
// ========================================================================

// Function overloads for proper type inference

/**
 * Create SafeFn client with metadata schema and context
 * @template TBaseContext - Base context object type
 * @template TMetadataSchema - Metadata schema validator type
 */
export function createSafeFnClient<TBaseContext extends Context, TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext?: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

/**
 * Create SafeFn client with metadata schema and required context
 * @template TBaseContext - Base context object type
 * @template TMetadataSchema - Metadata schema validator type
 */
export function createSafeFnClient<TBaseContext extends Context, TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

/**
 * Create SafeFn client with only metadata schema
 * @template TMetadataSchema - Metadata schema validator type
 */
export function createSafeFnClient<TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext?: Context;
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, {}, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

/**
 * Create SafeFn client with metadata type and context
 * @template TBaseContext - Base context object type
 * @template TMetadata - Metadata object type
 */
export function createSafeFnClient<TBaseContext extends Context, TMetadata extends Metadata>(config: {
  metadataSchema: SchemaValidator<TMetadata>;
  defaultContext?: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, TMetadata>;

/**
 * Create SafeFn client with metadata type and required context
 * @template TBaseContext - Base context object type
 * @template TMetadata - Metadata object type
 */
export function createSafeFnClient<TBaseContext extends Context, TMetadata extends Metadata>(config: {
  metadataSchema: SchemaValidator<TMetadata>;
  defaultContext: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, TMetadata>;

/**
 * Create SafeFn client with only metadata type
 * @template TMetadata - Metadata object type
 */
export function createSafeFnClient<TMetadata extends Metadata>(config: {
  metadataSchema: SchemaValidator<TMetadata>;
  defaultContext?: Context;
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, {}, unknown, unknown, TMetadata>;

/**
 * Create SafeFn client with context type
 * @template TBaseContext - Base context object type
 */
export function createSafeFnClient<TBaseContext extends Context>(config: {
  defaultContext?: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, Metadata>;

/**
 * Create SafeFn client with required context
 * @template TBaseContext - Base context object type (inferred from defaultContext)
 */
export function createSafeFnClient<TBaseContext extends Context>(config: {
  defaultContext: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, Metadata>;

/**
 * Create SafeFn client with no configuration
 */
export function createSafeFnClient(): SafeFn<{}, {}, unknown, unknown, Metadata>;

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
  config?: SafeFnClientConfig<Context, Metadata>,
): SafeFn<Context, {}, unknown, unknown, Metadata> {
  // When no config is provided, start with empty context like next-safe-action
  const safeFn = createSafeFn<Context, {}>();

  // Configure the SafeFn client with provided settings
  const metadataValidator = config?.metadataSchema ? createParseFn(config.metadataSchema) : undefined;

  // Store the client configuration for use in the SafeFn client  
  (safeFn as any)._defaultContext = config?.defaultContext || {};
  (safeFn as any)._metadataValidator = metadataValidator;
  (safeFn as any)._clientErrorHandler = config?.onError;
  (safeFn as any)._clientMiddlewares = [];

  return safeFn;
}
