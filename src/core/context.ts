// ========================================================================
// CONTEXT EXECUTION ENGINE
// ========================================================================

import type { MiddlewareParams } from './middleware';
import type { Handler, HandlerParams } from './handler';

/**
 * Execute middleware chain with onion pattern and proper context accumulation
 */
export async function executeMiddlewareChain<TContext extends Record<string, any>>(
  middlewares: any[],
  initialContext: TContext,
  input: any,
  handler: Handler<TContext, any, any>
): Promise<any> {
  let currentIndex = 0;
  let accumulatedContext = { ...initialContext };

  const next = async (contextUpdates?: Record<string, any>) => {
    // Accumulate context updates
    if (contextUpdates) {
      accumulatedContext = { ...accumulatedContext, ...contextUpdates };
    }

    // If we've reached the end of middleware, call the handler
    if (currentIndex >= middlewares.length) {
      const handlerParams: HandlerParams<TContext, any> = {
        ctx: accumulatedContext as TContext,
        input
      };

      // Handle both sync and async handlers
      return handler(handlerParams);
    }

    // Get the next middleware and increment index
    const middleware = middlewares[currentIndex++];
    
    // Create middleware parameters with current accumulated context
    const middlewareParams: MiddlewareParams<TContext> = {
      ctx: accumulatedContext as TContext,
      input,
      next
    };

    // Execute middleware (always async)
    return await middleware(middlewareParams);
  };

  // Start the middleware chain
  return next();
}