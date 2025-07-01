/**
 * Core types for the SafeFn library
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

// ========================================================================
// CORE CONTEXT & METADATA TYPES
// ========================================================================

/**
 * Base context type - any object
 */
export type Context = Record<string, unknown>;

/**
 * Utility type to infer context from defaultContext
 */
// export type InferContext<T> = T extends Context ? T : Context;

/**
 * Metadata information that can be attached to procedures
 */
export interface Metadata {
  [key: string]: unknown;
}

// ========================================================================
// CLIENT CONFIGURATION
// ========================================================================

/**
 * Configuration for the SafeFn client
 */
export interface ClientConfig<TContext extends Context = Context, TMetadata extends Metadata = Metadata> {
  defaultContext?: TContext;
  errorHandler?: (error: Error, context: TContext) => void | Promise<void>;
  metadataSchema?: SchemaValidator<TMetadata>;
}

// ========================================================================
// UNIFIED MIDDLEWARE SYSTEM
// ========================================================================

/**
 * Output from middleware execution
 */
export interface MiddlewareOutput<TOutput, TContext extends Context> {
  output: TOutput;
  context: TContext;
}

/**
 * Next function for the unified middleware system
 */
export type MiddlewareNext<TContext extends Context> = (params?: {
  ctx: TContext;
}) => Promise<MiddlewareOutput<unknown, TContext>>;

/**
 * Unified Middleware Props - contains all necessary information for middleware execution
 */
export interface MiddlewareProps<
  TCurrentContext extends Context = Context,
  TNewContext extends Context = Context,
  TInput = unknown,
  TMetadata extends Metadata = Metadata,
> {
  /** Raw input before validation - always available */
  rawInput: unknown;
  /** Parsed input after validation - only available post-validation */
  parsedInput?: TInput;
  /** Current context */
  ctx: TCurrentContext;
  /** Metadata information */
  metadata: TMetadata;
  /** Next function in the middleware chain */
  next: MiddlewareNext<TNewContext>;
}

/**
 * Unified Middleware Type
 * Replaces both Interceptor and Middleware - works pre and post validation
 * - Before validation: only rawInput is available, parsedInput is undefined
 * - After validation: both rawInput and parsedInput are available
 */
export type Middleware<
  TCurrentContext extends Context = Context,
  TNewContext extends Context = Context,
  TInput = unknown,
  TMetadata extends Metadata = Metadata,
> = (
  props: MiddlewareProps<TCurrentContext, TNewContext, TInput, TMetadata>
) => Promise<MiddlewareOutput<unknown, TNewContext>>;

// ========================================================================
// LEGACY TYPE ALIASES (for backward compatibility)
// ========================================================================

/**
 * @deprecated Use Middleware instead
 */
export type Interceptor<
  TCurrentContext extends Context = Context,
  TNewContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
> = Middleware<TCurrentContext, TNewContext, unknown, TMetadata>;

/**
 * @deprecated Use MiddlewareOutput instead
 */
export type InterceptorOutput<TOutput, TContext extends Context> = MiddlewareOutput<TOutput, TContext>;

/**
 * @deprecated Use MiddlewareNext instead
 */
export type InterceptorNext<TNewContext extends Context> = MiddlewareNext<TNewContext>;

// ========================================================================
// HANDLER INPUT TYPES
// ========================================================================

/**
 * Handler input object for single input procedures
 */
export interface HandlerInput<TInput, TContext extends Context> {
  ctx: TContext;
  parsedInput: TInput;
}

/**
 * Handler input object for tuple procedures
 */
export interface TupleHandlerInput<TArgs extends readonly any[], TContext extends Context> {
  ctx: TContext;
  args: TArgs;
}

// ========================================================================
// PROCEDURE SIGNATURE & HANDLER TYPES
// ========================================================================

/**
 * Conditional type for function signature based on input type
 * If input is a tuple, spread it as arguments (context comes from builder chain only)
 * If input is an object, use single input + context pattern
 */
export type SafeFnSignature<
  TInput,
  TOutput,
  TContext extends Context,
> = TInput extends readonly any[]
  ? (...args: TInput) => Promise<TOutput>
  : (input: TInput, context?: Partial<TContext>) => Promise<TOutput>;

/**
 * Safe function handler type - conditionally uses args or parsedInput based on input type
 */
export type SafeFnHandler<
  TInput,
  TOutput,
  TContext extends Context,
> = TInput extends readonly any[]
  ? (input: TupleHandlerInput<TInput, TContext>) => Promise<TOutput>
  : (input: HandlerInput<TInput, TContext>) => Promise<TOutput>;

// ========================================================================
// SCHEMA VALIDATION TYPES
// ========================================================================

/**
 * Schema validation function type - focuses on Zod and custom functions
 *
 * Supports Zod schemas, custom functions, and Standard Schema spec.
 */
export type SchemaValidator<T> =
  | { parse: (input: unknown) => T } // Zod schemas
  | ((input: unknown) => T) // Plain validation functions
  | StandardSchemaV1<T>; // Standard Schema spec

// ========================================================================
// TUPLE INFERENCE UTILITIES
// ========================================================================

/**
 * Utility type to infer the output type of a schema validator
 */
type InferSchemaOutput<T> = T extends SchemaValidator<infer U> ? U : never;

/**
 * Utility type to convert array of schema validators to tuple of their output types
 */
export type InferTupleFromSchemas<T extends readonly SchemaValidator<any>[]> = {
  readonly [K in keyof T]: InferSchemaOutput<T[K]>;
};

// ========================================================================
// SAFEFN CLIENT TYPES
// ========================================================================

/**
 * Configuration for creating a SafeFn client
 */
export interface SafeFnClientConfig<TContext extends Context, TMetadata extends Metadata> {
  defaultContext: TContext;
  metadataSchema?: SchemaValidator<TMetadata>;
  onError?: (error: Error, context: TContext) => void | Promise<void>;
}


// ========================================================================
// CLIENT & PROCEDURE INTERFACES
// ========================================================================

/**
 * Safe function builder
 */
export interface SafeFnBuilder<TContext extends Context, TMetadata extends Metadata> {
  use<TNewContext extends TContext>(
    middleware: Middleware<TContext, TNewContext, unknown, TMetadata>,
  ): SafeFnBuilder<TNewContext, TMetadata>;
  context<TNewContext extends Context = TContext>(
    defaultContext?: TNewContext
  ): SafeFnBuilder<TNewContext, TMetadata>;
  metadataSchema<TNewMetadata extends Metadata = TMetadata>(
    schema?: SchemaValidator<TNewMetadata>
  ): SafeFnBuilder<TContext, TNewMetadata>;
  create(): SafeFn<TContext, unknown, unknown, TMetadata>;
}

/**
 * Safe function procedure
 */
export interface SafeFn<
  TContext extends Context = Context,
  TInput = unknown,
  TOutput = unknown,
  TMetadata extends Metadata = Metadata,
> {
  metadata<TNewMetadata extends Metadata>(metadata: TNewMetadata): SafeFn<TContext, TInput, TOutput, TNewMetadata>;
  use(middleware: Middleware<TContext, TContext, TInput, TMetadata>): SafeFn<TContext, TInput, TOutput, TMetadata>;
  // Overload for array of schemas (tuple inference)
  input<T extends readonly SchemaValidator<any>[]>(
    schema: T
  ): SafeFn<TContext, InferTupleFromSchemas<T>, TOutput, TMetadata>;
  // Overload for single schema
  input<TNewInput>(
    schema: SchemaValidator<TNewInput>
  ): SafeFn<TContext, TNewInput, TOutput, TMetadata>;
  output<TNewOutput>(
    schema: SchemaValidator<TNewOutput>,
  ): SafeFn<TContext, TInput, TNewOutput, TMetadata>;
  handler<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>,
  ): SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
}
