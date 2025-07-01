/**
 * Unified middleware execution system
 */
import type { MiddlewareFn, MiddlewareResult, Context, Metadata } from "@/types";

/**
 * Parameters for executeMiddlewareChain
 */
export interface ExecuteMiddlewareChainParams<
  TOutput,
  TContext extends Context,
  TMetadata extends Metadata,
> {
  middlewares: MiddlewareFn<TMetadata, any, any>[];
  rawInput: unknown;
  parsedInput: unknown | undefined;
  context: TContext;
  metadata: TMetadata;
  handler: (input: unknown, context: TContext) => Promise<TOutput>;
}

/**
 * Executes a chain of middleware in sequence with proper error handling and type safety
 * Supports both pre-validation (rawInput only) and post-validation (rawInput + parsedInput) middleware
 */
export async function executeMiddlewareChain<
  TOutput,
  TContext extends Context,
  TMetadata extends Metadata,
>(params: ExecuteMiddlewareChainParams<TOutput, TContext, TMetadata>): Promise<TOutput> {
  const { middlewares, rawInput, parsedInput, context, metadata, handler } = params;

  // Fast path for no middlewares
  if (middlewares.length === 0) {
    return handler(parsedInput ?? rawInput, context);
  }

  let index = -1;
  let currentContext: Context = context;
  const middlewareResult: MiddlewareResult<any, Context> = {
    output: undefined,
    context: currentContext,
    success: false
  };

  const executeMiddlewareStack = async (idx = 0): Promise<void> => {
    index = idx;

    // Base case: all middlewares executed, call the handler
    if (index === middlewares.length) {
      const output = await handler(parsedInput ?? rawInput, currentContext as TContext);
      middlewareResult.output = output;
      middlewareResult.context = currentContext;
      middlewareResult.success = true;
      return;
    }

    const middleware = middlewares[index];

    // Define the `next` function for the current middleware.
    // Overloaded to handle both next() and next({ ctx: ... }) calls
    const next: {
      (): Promise<MiddlewareResult<unknown, any>>;
      <NC extends Context>(opts: { ctx: NC }): Promise<MiddlewareResult<unknown, any>>;
    } = async (params?: { ctx?: any }): Promise<MiddlewareResult<unknown, any>> => {
      // Merge provided context with current context (similar to next-safe-action's deepmerge)
      currentContext = params?.ctx ? { ...currentContext, ...params.ctx } : currentContext;
      await executeMiddlewareStack(idx + 1);
      return middlewareResult; // Always return the same middlewareResult object
    };

    // Execute the middleware
    await middleware({
      rawInput,
      parsedInput,
      ctx: currentContext,
      metadata,
      next,
    });
  };

  // Start the chain
  await executeMiddlewareStack(0);
  return middlewareResult.output;
}

/**
 * Creates a standalone middleware function with full type safety.
 * 
 * @param middlewareFn - The middleware function implementation
 * @returns The same middleware function with proper typing
 * 
 * @example
 * ```typescript
 * // Simple middleware (types inferred)
 * const timing = createMiddleware(async ({ next }) => {
 *   return next({ ctx: { requestTime: Date.now() } });
 * });
 * 
 * // Advanced middleware with explicit types
 * const auth = createMiddleware<{}, AuthMetadata, UserContext>(middlewareFn);
 * ```
 */
export function createMiddleware<
  TCurrentCtx extends Context = {},
  TMetadata extends Metadata = Metadata,
  TNextCtx extends Context = Context
>(
  middlewareFn: MiddlewareFn<TMetadata, TCurrentCtx, TNextCtx>
): typeof middlewareFn {
  return middlewareFn;
}
