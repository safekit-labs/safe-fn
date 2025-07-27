// ========================================================================
// MIDDLEWARE TYPES AND CREATION
// ========================================================================

/**
 * Next function type for middleware
 */
export type NextFunction = (contextUpdates?: Record<string, any>) => Promise<any>;

/**
 * Middleware parameter object
 */
export interface MiddlewareParams<TContext extends Record<string, any> = {}> {
  ctx: TContext;
  input: any;
  next: NextFunction;
}

/**
 * Middleware function type using object generics pattern
 * Takes an object with ctx and nextCtx properties to define context transformation
 */
export type Middleware<TMiddleware extends {
  ctx?: Record<string, any>;
  nextCtx?: Record<string, any>;
} = {
  ctx: {};
  nextCtx: {};
}> = (
  params: MiddlewareParams<TMiddleware['ctx'] extends Record<string, any> ? TMiddleware['ctx'] : {}>
) => Promise<any>;

/**
 * Utility to extract the output context type from a middleware
 */
export type InferMiddlewareOutputContext<T> = T extends Middleware<infer TMiddleware>
  ? TMiddleware['nextCtx'] extends Record<string, any> ? TMiddleware['nextCtx'] : {}
  : {};

/**
 * Create typed middleware using object generics pattern
 */
export function createMiddleware<TMiddleware extends {
  ctx?: Record<string, any>;
  nextCtx?: Record<string, any>;
} = {
  ctx: {};
  nextCtx: {};
}>(
  middleware: (params: MiddlewareParams<TMiddleware['ctx'] extends Record<string, any> ? TMiddleware['ctx'] : {}>) => Promise<any>
): Middleware<TMiddleware> {
  return middleware;
}

/**
 * Legacy support: Simple middleware without explicit typing
 */
export function createSimpleMiddleware(
  middleware: (params: MiddlewareParams) => Promise<any>
): Middleware {
  return middleware;
}