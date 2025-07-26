/**
 * Core types for the SafeFn library
 */

// ========================================================================
// UTILITY TYPES
// ========================================================================

/**
 * Takes an object type and makes it more readable, converting intersections to proper object types
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

/**
 * Unwraps complex types to show their actual structure in IDE tooltips
 * Expands generic types to their concrete form for better developer experience
 */
export type Unwrap<T> = T extends infer U ? { [K in keyof U]: U[K] } : never;

// ========================================================================
// CORE CONTEXT & METADATA TYPES
// ========================================================================

/**
 * Base context type - any object
 */
export type Context = {};

/**
 * Metadata information that can be attached to procedures
 */
export interface Metadata {}

/**
 * Marker type to indicate if a SafeFn has context capabilities
 */
export type HasContext = { __hasContext: true };

// ========================================================================
// CLIENT CONFIGURATION
// ========================================================================

// Import ValidateFunction from middleware since it's used by ErrorHandlerFn
import type { ValidateFunction } from "./middleware";
import type { SchemaValidator } from "./schema";

/**
 * Result type for error handlers - allows recovery or transformation
 */
export type ErrorHandlerResult<TOutput = any> =
  | void
  | Error
  | { success: true; data: TOutput }
  | { success: false; error: Error };

/**
 * Error handler function type - similar to middleware signature
 */
export type ErrorHandlerFn<
  TMetadata extends Metadata,
  TContext extends Context,
> = (props: {
  error: Error;
  ctx: TContext;
  metadata: TMetadata;
  rawInput: unknown;
  rawArgs: unknown;
  valid: ValidateFunction;
}) => ErrorHandlerResult | Promise<ErrorHandlerResult>;

/**
 * Configuration for the SafeFn client
 */
export interface ClientConfig<
  TContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
> {
  defaultContext?: TContext;
  onError?: ErrorHandlerFn<TMetadata, TContext>;
  metadataSchema?: SchemaValidator<TMetadata>;
}
