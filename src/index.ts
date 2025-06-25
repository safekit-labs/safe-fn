/**
 * CQRS Builder - A type-safe, schema-agnostic CQRS implementation for TypeScript
 *
 * @example
 * ```typescript
 * import { createClient, procedure } from '@corporationx/cqrs-builder';
 *
 * // Create a client with global interceptors
 * const client = createClient({
 *   interceptors: [loggingInterceptor],
 *   errorHandler: (error, context) => console.error(error)
 * });
 *
 * // Create procedures with chained .use() for interceptors
 * const createUser = client
 *   .metadata({ operation: 'create-user' })
 *   .use(authInterceptor)
 *   .use(validationInterceptor)
 *   .inputSchema((input: unknown) => input as { name: string; email: string })
 *   .command(async ({ ctx, parsedInput }) => {
 *     // Command logic here
 *     return { id: '123', ...parsedInput };
 *   });
 *
 * // Or use standalone procedure
 * const getUser = procedure()
 *   .metadata({ operation: 'get-user' })
 *   .use(cacheInterceptor)
 *   .inputSchema((input: unknown) => input as { id: string })
 *   .query(async ({ ctx, parsedInput }) => {
 *     // Query logic here
 *     return { id: parsedInput.id, name: 'John', email: 'john@example.com' };
 *   });
 * ```
 */

// Core types
export type {
  Context,
  Metadata,
  ClientConfig,
  Interceptor,
  InterceptorOutput,
  CommandHandler,
  QueryHandler,
  ServiceHandler,
  ProcedureBuilder,
  Client,
  SchemaValidator
} from '@/types';

// Client factory
export { createClient } from '@/client';

// Standalone procedure builder
export { procedure } from '@/builder';

// Interceptor utilities
export { executeInterceptorChain } from '@/interceptor';
