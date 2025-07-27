/**
 * Simplified handler types for middleware-only SafeFn architecture
 */

import type { Context, Metadata } from "./core";
import type { MiddlewareContext } from "./middleware";

// ========================================================================
// SIMPLIFIED HANDLER TYPES FOR MIDDLEWARE-ONLY ARCHITECTURE
// ========================================================================

/**
 * Handler function type for middleware-only SafeFn
 * All handlers receive MiddlewareContext which contains validated data from middleware
 */
export type SafeFnHandler<TOutput, TContext extends Context = Context, TMetadata extends Metadata = Metadata> = 
  (context: MiddlewareContext<TContext, TMetadata>) => Promise<TOutput> | TOutput;

/**
 * Executable function signature - the final function returned by .handler()
 * Supports both input data and partial context override
 */
export type ExecutableFunction<TOutput, TContext extends Context = Context> = 
  (input?: unknown, context?: Partial<TContext>) => Promise<TOutput>;

// ========================================================================
// LEGACY COMPATIBILITY TYPES (DEPRECATED)
// ========================================================================

/**
 * @deprecated Use MiddlewareContext instead - kept for backward compatibility
 */
export interface HandlerInput<TInput, TContext extends Context, TMetadata extends Metadata = Metadata> {
  ctx: TContext;
  input: TInput;
  metadata: TMetadata;
}

/**
 * @deprecated Use MiddlewareContext instead - kept for backward compatibility
 */
export interface ArgsHandlerInput<TArgs extends readonly any[], TContext extends Context, TMetadata extends Metadata = Metadata> {
  ctx: TContext;
  args: TArgs;
  metadata: TMetadata;
}

/**
 * @deprecated Use ArgsHandlerInput instead - kept for backward compatibility
 */
export interface TupleHandlerInput<TArgs extends readonly any[], TContext extends Context> {
  ctx: TContext;
  args: TArgs;
}

// ========================================================================
// LEGACY TYPES (DEPRECATED - KEPT FOR BACKWARD COMPATIBILITY)
// ========================================================================

/**
 * @deprecated Not used in middleware-only architecture
 */
export type InputType = 'none' | 'single' | 'args';

/**
 * @deprecated Not used in middleware-only architecture
 */
export type SafeFnSignature<TInput, TOutput, TContext extends Context> = 
  (input?: TInput, context?: Partial<TContext>) => Promise<TOutput>;

/**
 * @deprecated Not used in middleware-only architecture
 */
export type SafeFnSchemaSignature<TOutput, TContext extends Context> = 
  (input?: unknown, context?: Partial<TContext>) => Promise<TOutput>;