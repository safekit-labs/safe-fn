/**
 * Interceptor execution system
 */
import type {
  Interceptor,
  InterceptorOutput,
  InterceptorNext,
  Context,
  Meta
} from '@/types';

/**
 * Executes a chain of interceptors in sequence with proper error handling and type safety
 */
export async function executeInterceptorChain<TOutput, TContext extends Context, TMeta extends Meta = Meta>(
  interceptors: Interceptor<TContext, TMeta>[],
  input: unknown,
  context: TContext,
  meta: TMeta,
  handler: (input: unknown, context: TContext) => Promise<TOutput>
): Promise<TOutput> {
  // Fast path for no interceptors
  if (interceptors.length === 0) {
    return handler(input, context);
  }

  // Fast path for no interceptors
  if (interceptors.length === 0) {
    return handler(input, context);
  }

  let currentIndex = 0;

  const executeNext = async (
    currentInput: unknown,
    currentContext: TContext
  ): Promise<InterceptorOutput<TOutput, TContext>> => {
    // Base case: all interceptors executed, call the handler
    if (currentIndex >= interceptors.length) {
      try {
        const output = await handler(currentInput, currentContext);
        return { output, context: currentContext };
      } catch (error) {
        // Ensure errors from handler are properly propagated
        throw error instanceof Error ? error : new Error(String(error));
      }
    }

    const interceptor = interceptors[currentIndex];
    currentIndex++; // Increment after accessing to prevent issues with async execution

    // Create next function that accepts optional { ctx } object
    const next: InterceptorNext = async (params?: { ctx: Context }) => {
      // Use provided context or current context
      const contextToUse = params?.ctx || currentContext;
      const result = await executeNext(currentInput, contextToUse as TContext);
      return {
        output: result.output,
        context: contextToUse as TContext
      };
    };

    try {
      // Call interceptor with object-based signature
      const result = await interceptor({
        next,
        rawInput: currentInput,
        ctx: currentContext,
        meta
      });

      // Validate interceptor return value
      if (!result || typeof result !== 'object' || !('output' in result) || !('context' in result)) {
        throw new Error('Interceptor must return an object with "output" and "context" properties');
      }

      return {
        output: result.output as TOutput,
        context: result.context as TContext
      };
    } catch (error) {
      // Ensure interceptor errors are properly wrapped
      throw error instanceof Error ? error : new Error(`Interceptor error: ${String(error)}`);
    }
  };

  try {
    const result = await executeNext(input, context);
    return result.output;
  } catch (error) {
    // Final error handling layer
    throw error instanceof Error ? error : new Error(`Chain execution failed: ${String(error)}`);
  }
}