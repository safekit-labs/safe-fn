/**
 * SafeFn - A type-safe function builder with interceptors, schema validation, and context management for TypeScript
 *
 * @example
 * ```typescript
 * import { createClient, createSafeFn } from '@corporationx/safe-fn';
 *
 * // Create a client with global interceptors
 * const client = createSafeFnClient({
 *   errorHandler: (error, context) => console.error(error)
 * });
 *
 * // Create safe functions with chained .use() for interceptors
 * const createUser = client
 *   .meta({ operation: 'create-user' })
 *   .use(authInterceptor)
 *   .use(validationInterceptor)
 *   .input((input: unknown) => input as { name: string; email: string })
 *   .handler(async ({ ctx, parsedInput }) => {
 *     // Function logic here
 *     return { id: '123', ...parsedInput };
 *   });
 *
 * // Create functions using the client
 * const getUser = client
 *   .meta({ operation: 'get-user' })
 *   .use(cacheInterceptor)
 *   .input((input: unknown) => input as { id: string })
 *   .handler(async ({ ctx, parsedInput }) => {
 *     // Function logic here
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
  SafeFnHandler,
  SafeFnBuilder,
  Client,
  SchemaValidator,
} from '@/types';

// Client factory
export { createSafeFnClient } from '@/client';
