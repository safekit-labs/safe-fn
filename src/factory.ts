// ========================================================================
// SAFEFN FACTORY IMPLEMENTATION
// ========================================================================

import { createSafeFn } from "@/safe-fn";
import { createParseFn } from "@/libs/parser";

import type {
  Context,
  Metadata,
  SafeFn,
  ClientConfig,
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
export function createClient<TBaseContext extends Context, TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext?: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

/**
 * Create SafeFn client with metadata schema and required context
 * @template TBaseContext - Base context object type
 * @template TMetadataSchema - Metadata schema validator type
 */
export function createClient<TBaseContext extends Context, TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

/**
 * Create SafeFn client with only metadata schema
 * @template TMetadataSchema - Metadata schema validator type
 */
export function createClient<TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  defaultContext?: Context;
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, {}, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;

/**
 * Create SafeFn client with metadata type and context
 * @template TBaseContext - Base context object type
 * @template TMetadata - Metadata object type
 */
export function createClient<TBaseContext extends Context, TMetadata extends Metadata>(config: {
  metadataSchema: SchemaValidator<TMetadata>;
  defaultContext?: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, TMetadata>;

/**
 * Create SafeFn client with metadata type and required context
 * @template TBaseContext - Base context object type
 * @template TMetadata - Metadata object type
 */
export function createClient<TBaseContext extends Context, TMetadata extends Metadata>(config: {
  metadataSchema: SchemaValidator<TMetadata>;
  defaultContext: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, TMetadata>;

/**
 * Create SafeFn client with only metadata type
 * @template TMetadata - Metadata object type
 */
export function createClient<TMetadata extends Metadata>(config: {
  metadataSchema: SchemaValidator<TMetadata>;
  defaultContext?: Context;
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, {}, unknown, unknown, TMetadata>;

/**
 * Create SafeFn client with context type
 * @template TBaseContext - Base context object type
 */
export function createClient<TBaseContext extends Context>(config: {
  defaultContext?: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, Metadata>;

/**
 * Create SafeFn client with required context
 * @template TBaseContext - Base context object type (inferred from defaultContext)
 */
export function createClient<TBaseContext extends Context>(config: {
  defaultContext: TBaseContext;
  onError?: ErrorHandlerFn<any, TBaseContext>;
}): SafeFn<TBaseContext, {}, unknown, unknown, Metadata>;

/**
 * Create SafeFn client with no configuration
 */
export function createClient(): SafeFn<{}, {}, unknown, unknown, Metadata>;

/**
 * Creates a SafeFn client with default context and metadata schema
 *
 * @example
 * ```ts
 * const safeFn = createClient({
 *   defaultContext: { userId: 'anonymous' },
 *   metadataSchema: z.object({ op: z.string() })
 * });
 * ```
 */
export function createClient(
  config?: ClientConfig<Context, Metadata>,
): SafeFn<Context, {}, unknown, unknown, Metadata> {
  // When no config is provided, start with empty context like next-safe-action
  const safeFn = createSafeFn<Context, {}>();

  // Configure the SafeFn client with provided settings
  const metadataValidator = config?.metadataSchema ? createParseFn(config.metadataSchema) : undefined;

  // Store the client configuration for use in the SafeFn client
  (safeFn as any)._defaultContext = config?.defaultContext || {};
  (safeFn as any)._metadataValidator = metadataValidator;
  (safeFn as any)._clientErrorHandler = config?.errorHandler;
  (safeFn as any)._clientMiddlewares = [];

  return safeFn;
}
