// ========================================================================
// SAFEFN FACTORY IMPLEMENTATION
// ========================================================================

import { createSafeFn } from '@/safe-fn';
import { createParseFn } from '@/libs/parser';

import type { Context, Metadata, SafeFn, SafeFnClientConfig } from '@/types';

// ========================================================================
// SAFEFN CLIENT FUNCTION
// ========================================================================

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
export function createSafeFnClient<TContext extends Context, TMetadata extends Metadata>(
  config: SafeFnClientConfig<TContext, TMetadata>,
): SafeFn<TContext, unknown, unknown, TMetadata> {
  const safeFn = createSafeFn<TContext, TMetadata>();

  // Configure the SafeFn client with provided settings
  const metadataParser = config.metadataSchema ? createParseFn(config.metadataSchema) : undefined;

  // Store the client configuration for use in the SafeFn client
  (safeFn as any)._defaultContext = config.defaultContext;
  (safeFn as any)._metadataParser = metadataParser;
  (safeFn as any)._clientErrorHandler = config.onError;

  return safeFn;
}
