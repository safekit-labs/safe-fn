// ========================================================================
// MIDDLEWARE SYSTEM TYPES
// ========================================================================

import type { Context, Metadata } from "./core";

// ========================================================================
// MIDDLEWARE EXECUTION TYPES
// ========================================================================

/**
 * Output from middleware execution
 */
export interface MiddlewareResult<TOutput, TNextCtx extends Context> {
  output: TOutput;
  context: TNextCtx;
  success: boolean;
  error?: Error;
}

/**
 * Simplified Next function for middleware-only architecture
 * Similar to Express.js middleware pattern
 */
export type NextFunction<TContext extends Context = Context> = (
  context?: TContext
) => Promise<unknown>;

/**
 * Simple middleware execution context
 * Contains all the data a middleware might need
 */
export interface MiddlewareContext<TContext extends Context = Context, TMetadata extends Metadata = Metadata> {
  // Raw input data (before validation)
  rawInput?: unknown;
  rawArgs?: unknown;
  
  // Validated data (set by validation middleware)
  input?: unknown;
  args?: unknown;
  validatedInput?: unknown;
  validatedArgs?: unknown;
  
  // Context and metadata
  ctx: TContext;
  metadata: TMetadata;
}

/**
 * Validation helper function for middleware
 * Provides access to validated input or args data
 */
export type ValidateFunction = {
  (type: "input"): any;
  (type: "args"): any;
};

// ========================================================================
// MIDDLEWARE FUNCTION TYPES
// ========================================================================

/**
 * Simplified Middleware Function Type for middleware-only architecture
 * Similar to Express.js middleware pattern:
 * - Receives execution context
 * - Can modify context and call next()
 * - Can transform the result
 */
export type MiddlewareFn<
  TMetadata extends Metadata = Metadata,
  TCurrentCtx extends Context = Context,
  TNextCtx extends Context = Context,
> = (
  context: MiddlewareContext<TCurrentCtx, TMetadata>,
  next: NextFunction<TNextCtx>
) => Promise<unknown>;

export type Middleware<
  TCurrentContext extends Context = Context,
  TNewContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
> = MiddlewareFn<TMetadata, TCurrentContext, TNewContext>;

// ========================================================================
// MIDDLEWARE INFERENCE UTILITIES
// ========================================================================

/**
 * Infer the next context type that a middleware function will produce
 * This extracts the context type from the return type of a middleware function
 */
export type InferMiddlewareNextCtx<T> = T extends MiddlewareFn<any, any, infer NextCtx>
  ? NextCtx
  : never;

/**
 * Infer the current context type that a middleware function expects
 */
export type InferMiddlewareCurrentCtx<T> = T extends MiddlewareFn<any, infer CurrentCtx, any>
  ? CurrentCtx
  : never;