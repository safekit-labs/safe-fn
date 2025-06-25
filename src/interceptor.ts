/**
 * Interceptor execution system
 */

import {
  Interceptor,
  InterceptorOutput,
  InterceptorNext,
  Context,
  Metadata
} from '@/types';

/**
 * Executes a chain of interceptors in sequence
 */
export async function executeInterceptorChain<TInput, TOutput, TContext extends Context>(
  interceptors: Interceptor<TContext>[],
  input: TInput,
  context: TContext,
  metadata: Metadata,
  handler: (input: TInput, context: TContext) => Promise<TOutput>
): Promise<TOutput> {
  if (interceptors.length === 0) {
    return handler(input, context);
  }

  let currentIndex = 0;

  const executeNext = async (
    currentInput: any,
    currentContext: TContext
  ): Promise<InterceptorOutput<any, TContext>> => {
    if (currentIndex >= interceptors.length) {
      // All interceptors have been executed, call the actual handler
      const output = await handler(currentInput, currentContext);
      return { output, context: currentContext };
    }

    const interceptor = interceptors[currentIndex++];

    // Create next function that accepts modified input/context
    const next: InterceptorNext<TContext> = async (
      modifiedInput?: any,
      modifiedContext?: TContext
    ) => {
      // Use modified values if provided, otherwise use current values
      const nextInput = modifiedInput !== undefined ? modifiedInput : currentInput;
      const nextContext = modifiedContext !== undefined ? modifiedContext : currentContext;
      return executeNext(nextInput, nextContext);
    };

    // Call interceptor with new object-based signature
    const result = await interceptor({
      next,
      clientInput: currentInput,
      ctx: currentContext,
      metadata
    });

    return result;
  };

  const result = await executeNext(input, context);
  return result.output as TOutput;
}