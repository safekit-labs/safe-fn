// ========================================================================
// SAFEFN FACTORY IMPLEMENTATION
// ========================================================================

import { createSafeFn } from "@/safe-fn";
import { createParseFn } from "@/validator";

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
 * Create SafeFn client with metadata schema
 * @template TMetadataSchema - Metadata schema validator type
 */
export function createClient<TMetadataSchema extends SchemaValidator<any>>(config: {
  metadataSchema: TMetadataSchema;
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, {}, unknown, unknown, InferSchemaOutput<TMetadataSchema>>;



/**
 * Create SafeFn client with metadata type
 * @template TMetadata - Metadata object type
 */
export function createClient<TMetadata extends Metadata>(config: {
  metadataSchema: SchemaValidator<TMetadata>;
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, {}, unknown, unknown, TMetadata>;



/**
 * Create SafeFn client with error handler
 */
export function createClient(config: {
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, {}, unknown, unknown, Metadata>;


/**
 * Create SafeFn client with no configuration
 */
export function createClient(): SafeFn<{}, {}, unknown, unknown, Metadata>;

/**
 * Creates a SafeFn client with metadata schema and error handling
 *
 * @example
 * ```ts
 * const safeFn = createClient({
 *   metadataSchema: z.object({ op: z.string() }),
 *   onError: ({ error, ctx }) => console.error(error)
 * });
 *
 * // Add context via middleware instead:
 * const clientWithContext = safeFn.use(async ({ next }) => {
 *   return next({ ctx: { userId: 'anonymous' } });
 * });
 * ```
 */
export function createClient(
  config?: ClientConfig<Context, Metadata>,
): SafeFn<Context, {}, unknown, unknown, Metadata> {
  // Start with empty context - use middleware for context injection
  const safeFn = createSafeFn<Context, {}>();

  // Configure the SafeFn client with provided settings
  const metadataValidator = config?.metadataSchema ? createParseFn(config.metadataSchema) : undefined;

  // Store the client configuration for use in the SafeFn client
  (safeFn as any)._metadataValidator = metadataValidator;
  (safeFn as any)._clientErrorHandler = config?.onError;
  (safeFn as any)._clientMiddlewares = [];

  return safeFn;
}
