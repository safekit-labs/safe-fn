/**
 * Interceptor execution system
 */
import type {
  Interceptor,
  InterceptorOutput,
  InterceptorNext,
  Context,
  Metadata
} from '@/types';

/**
 * Executes a chain of interceptors in sequence with proper error handling and type safety
 */
export async function executeInterceptorChain<TInput, TOutput, TContext extends Context>(
  interceptors: Interceptor<TContext>[],
  input: TInput,
  context: TContext,
  metadata: Metadata,
  handler: (input: TInput, context: TContext) => Promise<TOutput>
): Promise<TOutput> {
  // Fast path for no interceptors
  if (interceptors.length === 0) {
    return handler(input, context);
  }

  let currentIndex = 0;

  const executeNext = async (
    currentInput: TInput,
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

    // Create next function that accepts modified input/context
    const next: InterceptorNext<TContext> = async (
      modifiedInput?: any,
      modifiedContext?: TContext
    ): Promise<InterceptorOutput<any, TContext>> => {
      // Use modified values if provided, otherwise use current values
      const nextInput = modifiedInput !== undefined ? modifiedInput : currentInput;
      const nextContext = modifiedContext !== undefined ? modifiedContext : currentContext;
      return executeNext(nextInput, nextContext);
    };

    try {
      // Call interceptor with object-based signature
      const result = await interceptor({
        next,
        rawInput: currentInput,
        ctx: currentContext,
        metadata
      });

      // Validate interceptor return value
      if (!result || typeof result !== 'object' || !('output' in result) || !('context' in result)) {
        throw new Error('Interceptor must return an object with "output" and "context" properties');
      }

      return result;
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