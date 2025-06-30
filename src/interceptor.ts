/**
 * Interceptor execution system
 */
import type { Interceptor, InterceptorOutput, Context, Metadata } from '@/types';

/**
 * Executes a chain of interceptors in sequence with proper error handling and type safety
 */
export async function executeInterceptorChain<
  TOutput,
  TContext extends Context,
  TMetadata extends Metadata,
>(
  interceptors: Interceptor<any, any, TMetadata>[],
  input: unknown,
  context: TContext,
  metadata: TMetadata,
  handler: (input: unknown, context: TContext) => Promise<TOutput>,
): Promise<TOutput> {
  // Fast path for no interceptors
  if (interceptors.length === 0) {
    return handler(input, context);
  }

  let index = -1;

  const executeNext = async (
    currentInput: unknown,
    currentContext: Context,
  ): Promise<InterceptorOutput<any, Context>> => {
    index++;

    // Base case: all interceptors executed, call the handler
    if (index === interceptors.length) {
      const output = await handler(currentInput, currentContext as TContext);
      return { output, context: currentContext };
    }

    const interceptor = interceptors[index];

    // Define the `next` function for the current interceptor.
    // When it's called, it will execute the *next* interceptor in the chain.
    const next = async (params?: { ctx: Context }) => {
      // Use provided context or current context
      const contextToUse = params?.ctx || currentContext;
      return await executeNext(currentInput, contextToUse);
    };

    return await interceptor({
      rawInput: currentInput,
      ctx: currentContext,
      metadata,
      next,
    });
  };

  // Start the chain
  const result = await executeNext(input, context);
  return result.output;
}
