// ========================================================================
// CORE CLIENT IMPLEMENTATION
// ========================================================================

import { executeMiddlewareChain } from './context';
import type { Middleware } from './middleware';
import type { Handler, InferRawInput, InferValidatedInput, InferRawOutput, InferValidatedOutput } from './handler';
import type { StandardSchemaV1 } from '../standard-schema';

// Re-export types for convenience
export type { Middleware, MiddlewareParams, NextFunction } from './middleware';
export type { Handler, HandlerParams } from './handler';

/**
 * Core client interface for building middleware chains
 */
export interface CoreClient<TContext extends Record<string, any> = {}> {
  // Add middleware to the chain - simplified to focus on functionality
  use<TNewContext extends Record<string, any> = {}>(
    middleware: Middleware | ((params: { ctx: TContext; input: any; next: (updates?: Record<string, any>) => Promise<any> }) => Promise<any>)
  ): CoreClient<TContext & TNewContext>;
  
  // Multiple middleware array
  use<TNewContext extends Record<string, any> = {}>(
    middleware: (Middleware | ((params: { ctx: TContext; input: any; next: (updates?: Record<string, any>) => Promise<any> }) => Promise<any>))[]
  ): CoreClient<TContext & TNewContext>;
  
  handler<THandler extends {
    ctx?: Record<string, any>;
    input: any | StandardSchemaV1;
    output: any | StandardSchemaV1;
  }>(
    handler: Handler<TContext, InferValidatedInput<THandler['input']>, InferValidatedOutput<THandler['output']>>
  ): (input: InferRawInput<THandler['input']>) => InferRawOutput<THandler['output']> | Promise<InferRawOutput<THandler['output']>>;
}

/**
 * Internal core client implementation
 */
class CoreClientImpl<TContext extends Record<string, any> = {}> implements CoreClient<TContext> {
  private middlewares: Middleware<any>[] = [];

  constructor(middlewares: Middleware<any>[] = []) {
    this.middlewares = middlewares;
  }

  use<TNewContext extends Record<string, any> = {}>(
    middleware: any | any[]
  ): CoreClient<TContext & TNewContext> {
    const newMiddlewares = Array.isArray(middleware) 
      ? [...this.middlewares, ...middleware]
      : [...this.middlewares, middleware];
    
    return new CoreClientImpl<TContext & TNewContext>(newMiddlewares);
  }

  handler<THandler extends {
    ctx?: Record<string, any>;
    input: any | StandardSchemaV1;
    output: any | StandardSchemaV1;
  }>(
    handler: Handler<TContext, InferValidatedInput<THandler['input']>, InferValidatedOutput<THandler['output']>>
  ): (input: InferRawInput<THandler['input']>) => InferRawOutput<THandler['output']> | Promise<InferRawOutput<THandler['output']>> {
    return (input: InferRawInput<THandler['input']>) => {
      const initialContext = {} as TContext;
      
      // If no middleware, call handler directly
      if (this.middlewares.length === 0) {
        return handler({ ctx: initialContext, input: input as any });
      }
      
      // Otherwise execute through middleware chain
      return executeMiddlewareChain(
        this.middlewares,
        initialContext,
        input,
        handler
      );
    };
  }
}

/**
 * Create a new core instance with no configuration
 */
export function createCoreClient(): CoreClient<{}> {
  return new CoreClientImpl<{}>();
}