// ========================================================================
// SAFEFN FACTORY IMPLEMENTATION
// ========================================================================

import { createSafeFn } from "@/safe-fn";
import type { SafeFn } from "@/safe-fn";

import type {
  Context,
  Metadata,
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
}): SafeFn<Context, InferSchemaOutput<TMetadataSchema>>;

/**
 * Create SafeFn client with metadata type
 * @template TMetadata - Metadata object type
 */
export function createClient<TMetadata extends Metadata>(config: {
  metadataSchema: SchemaValidator<TMetadata>;
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, TMetadata>;

/**
 * Create SafeFn client with error handler
 */
export function createClient(config: {
  onError?: ErrorHandlerFn<any, Context>;
}): SafeFn<Context, Metadata>;

/**
 * Create SafeFn client with no configuration
 */
export function createClient(): SafeFn<Context, Metadata>;

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
): SafeFn<Context, Metadata> {
  // Create simplified SafeFn - middleware handles all validation
  const safeFn = createSafeFn<Context, Metadata>();

  // Add metadata validation middleware if schema provided
  if (config?.metadataSchema) {
    // We'll add metadata validation via middleware in the future
    // For now, just store the schema for backward compatibility
    (safeFn as any)._metadataSchema = config.metadataSchema;
  }

  // Store error handler for backward compatibility
  if (config?.onError) {
    (safeFn as any)._errorHandler = config.onError;
  }

  return safeFn;
}
