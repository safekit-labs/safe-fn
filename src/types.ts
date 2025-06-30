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
// INTERCEPTOR TYPES (STAGE 1: PRE-VALIDATION)
// ========================================================================

/**
 * Output from interceptor execution
 */
export interface InterceptorOutput<TOutput, TContext extends Context> {
  output: TOutput;
  context: TContext;
}

/**
 * The next function
 */
export type InterceptorNext<TNewContext extends Context> = (params?: {
  ctx: TNewContext;
}) => Promise<InterceptorOutput<unknown, TNewContext>>;

/**
 * Typed next function for the new interceptor system
 */
export type TypedNext<TCurrentContext extends Context> = (params: {
  rawInput: unknown;
  ctx: TCurrentContext;
}) => Promise<InterceptorOutput<any, TCurrentContext>>;

/**
 * STAGE 1: Pre-validation Interceptor (runs on client)
 * Handles cross-cutting concerns that do NOT depend on validated input shape
 */
export type Interceptor<
  TCurrentContext extends Context = Context,
  TNewContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
> = (params: {
  rawInput: unknown; // Correctly typed as unknown for unvalidated data
  ctx: TCurrentContext;
  metadata: TMetadata;
  next: InterceptorNext<TNewContext>;
}) => Promise<InterceptorOutput<unknown, TNewContext>>;

/**
 * The Interceptor for type inference - takes current context and returns new context
 * TCurrentContext: The context type coming into this interceptor
 * TNewContext: The context type coming out of this interceptor (inferred from return value)
 * TMetadata: The metadata type
 */
export type TypedInterceptor<
  TCurrentContext extends Context,
  TNewContext extends TCurrentContext,
  TMetadata extends Metadata = Metadata,
> = (params: {
  rawInput: unknown;
  ctx: TCurrentContext;
  metadata: TMetadata;
  next: TypedNext<TNewContext>; // next receives the NEW context shape
}) => Promise<InterceptorOutput<any, TNewContext>>;

// ========================================================================
// MIDDLEWARE TYPES (STAGE 2: POST-VALIDATION)
// ========================================================================

/**
 * Represents the next function in a middleware chain
 */
export type MiddlewareNext<TInput> = (modifiedInput: TInput) => Promise<any>;

/**
 * STAGE 2: Post-validation Middleware (runs on builder)
 * Handles logic that REQUIRES the validated and typed input
 * Examples: input-based authorization, business logic validation
 */
export type Middleware<
  TContext extends Context = Context,
  TInput = unknown,
  TMetadata extends Metadata = Metadata,
> = (params: {
  next: MiddlewareNext<TInput>;
  parsedInput: TInput; // Correctly typed as validated input
  ctx: TContext;
  metadata: TMetadata;
}) => Promise<any>;

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
// CLIENT & PROCEDURE INTERFACES
// ========================================================================

/**
 * Safe function builder
 */
export interface SafeBuilder<TContext extends Context, TMetadata extends Metadata> {
  use<TNewContext extends TContext>(
    interceptor: Interceptor<TContext, TNewContext, TMetadata>,
  ): SafeBuilder<TNewContext, TMetadata>;
  context<TNewContext extends Context = TContext>(
    defaultContext?: TNewContext
  ): SafeBuilder<TNewContext, TMetadata>;
  metadataSchema<TNewMetadata extends Metadata = TMetadata>(
    schema?: SchemaValidator<TNewMetadata>
  ): SafeBuilder<TContext, TNewMetadata>;
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
  use(middleware: Middleware<TContext, TInput, TMetadata>): SafeFn<TContext, TInput, TOutput, TMetadata>;
  input<TNewInput>(
    schema: SchemaValidator<TNewInput>,
  ): SafeFn<TContext, TNewInput, TOutput, TMetadata>;
  output<TNewOutput>(
    schema: SchemaValidator<TNewOutput>,
  ): SafeFn<TContext, TInput, TNewOutput, TMetadata>;
  handler<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>,
  ): SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
}
