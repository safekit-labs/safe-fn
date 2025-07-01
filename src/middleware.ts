/**
 * Unified middleware execution system
 */
import type { Middleware, MiddlewareOutput, Context, Metadata } from "@/types";

/**
 * Parameters for executeMiddlewareChain
 */
export interface ExecuteMiddlewareChainParams<
  TOutput,
  TContext extends Context,
  TMetadata extends Metadata,
> {
  middlewares: Middleware<any, any, any, TMetadata>[];
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

  const executeNext = async (currentContext: Context): Promise<MiddlewareOutput<any, Context>> => {
    index++;

    // Base case: all middlewares executed, call the handler
    if (index === middlewares.length) {
      const output = await handler(parsedInput ?? rawInput, currentContext as TContext);
      return { output, context: currentContext };
    }

    const middleware = middlewares[index];

    // Define the `next` function for the current middleware.
    // When it's called, it will execute the *next* middleware in the chain.
    const next = async (params?: { ctx: Context }) => {
      // Use provided context or current context
      const contextToUse = params?.ctx || currentContext;
      return await executeNext(contextToUse);
    };

    return await middleware({
      rawInput,
      parsedInput,
      ctx: currentContext,
      metadata,
      next,
    });
  };

  // Start the chain
  const result = await executeNext(context);
  return result.output;
}

/**
 * Creates a middleware function with proper typing for better DX
 */
export const createMiddleware = <
  TCurrentContext extends Context = Context,
  TNewContext extends Context = Context,
  TInput = unknown,
  TMetadata extends Metadata = Metadata,
>(
  middleware: Middleware<TCurrentContext, TNewContext, TInput, TMetadata>,
): Middleware<TCurrentContext, TNewContext, TInput, TMetadata> => middleware;
