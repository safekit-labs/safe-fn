// ========================================================================
// MIDDLEWARE SYSTEM TYPES
// ========================================================================

import type { Context, Metadata, Prettify, Unwrap } from "./core";

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
 * Next function for the unified middleware system
 * Generic over the context type that will be passed to the next middleware
 */
export type MiddlewareNext = {
  <TNextCtx extends Context = {}>(params?: { ctx?: TNextCtx }): Promise<MiddlewareResult<unknown, TNextCtx>>;
};

/**
 * Clean type alias for middleware next function with proper overloads
 * Provides a much more readable type display in IDEs
 */
export interface NextFunction<TCurrentCtx extends Context = {}> {
  (): Promise<Unwrap<MiddlewareResult<unknown, TCurrentCtx>>>;
  <TNextCtx extends Context>(opts: { ctx: TNextCtx }): Promise<Unwrap<MiddlewareResult<unknown, Prettify<TCurrentCtx & TNextCtx>>>>;
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
 * Unified Middleware Function Type
 * Similar to next-safe-action's MiddlewareFn but adapted for safe-fn
 * - Takes current context type as input
 * - Returns new context type through MiddlewareResult
 * - The return type's context becomes the input for the next middleware
 */
export type MiddlewareFn<
  TMetadata extends Metadata,
  TCurrentCtx extends Context,
  TNextCtx extends Context,
> = (props: {
  rawInput: unknown;
  rawArgs: unknown;
  ctx: Prettify<TCurrentCtx>;
  metadata: TMetadata;
  next: NextFunction<TCurrentCtx>;
  valid: ValidateFunction;
}) => Promise<MiddlewareResult<unknown, TNextCtx>>;

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