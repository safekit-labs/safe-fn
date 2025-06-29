/**
 * Core types for the SafeFn library
 */

import type { StandardSchemaV1 } from '@standard-schema/spec';

/**
 * Context object passed through the procedure execution chain
 */
export interface Context {
  [key: string]: unknown;
}

/**
 * Metadata that can be attached to procedures
 */
export interface Metadata {
  [key: string]: unknown;
}

/**
 * Configuration for the SafeFn client
 */
export interface ClientConfig<TContext extends Context = Context> {
  defaultContext?: TContext;
  errorHandler?: (error: Error, context: TContext) => void | Promise<void>;
}

/**
 * Output from interceptor execution
 */
export interface InterceptorOutput<TOutput = unknown, TContext extends Context = Context> {
  output: TOutput;
  context: TContext;
}

/**
 * Represents the next function in an interceptor chain
 */
export type InterceptorNext<TContext extends Context> = (
  modifiedInput?: any,
  modifiedContext?: TContext
) => Promise<InterceptorOutput<any, TContext>>;

/**
 * Represents an interceptor function
 */
export type Interceptor<TContext extends Context = Context> = (params: {
  next: InterceptorNext<TContext>;
  rawInput: any;
  ctx: TContext;
  metadata: Metadata;
}) => Promise<InterceptorOutput<any, TContext>>;

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

/**
 * Conditional type for function signature based on input type
 * If input is a tuple, spread it as arguments (context comes from builder chain only)
 * If input is an object, use single input + context pattern
 */
export type SafeFnSignature<TInput, TOutput, TContext extends Context> = 
  TInput extends readonly any[]
    ? (...args: TInput) => Promise<TOutput>
    : (input: TInput, context?: Partial<TContext>) => Promise<TOutput>;

/**
 * Safe function handler type - conditionally uses args or parsedInput based on input type
 */
export type SafeFnHandler<TInput, TOutput, TContext extends Context> = TInput extends readonly any[]
  ? (input: TupleHandlerInput<TInput, TContext>) => Promise<TOutput>
  : (input: HandlerInput<TInput, TContext>) => Promise<TOutput>;

/**
 * Schema validation function type - uses structural typing for maximum compatibility
 * 
 * This type uses TypeScript's structural typing to support any validation library
 * without requiring specific type imports or version dependencies.
 */
export type SchemaValidator<T> = 
  | { parse: (input: unknown) => T }        // Zod-like schemas
  | { validate: (input: unknown) => any }   // Joi/Yup-like schemas (flexible return type)
  | ((input: unknown) => T)                 // Plain validation functions
  | StandardSchemaV1<T>;                    // Standard Schema spec

/**
 * Safe function builder interface with type tracking
 */
export interface SafeFnBuilder<
  TContext extends Context = Context,
  TInput = unknown,
  TOutput = unknown
> {
  meta(metadata: Metadata): SafeFnBuilder<TContext, TInput, TOutput>;
  use(interceptor: Interceptor<TContext>): SafeFnBuilder<TContext, TInput, TOutput>;
  context(context: Partial<TContext>): SafeFnBuilder<TContext, TInput, TOutput>;
  input<TNewInput>(schema: SchemaValidator<TNewInput>): SafeFnBuilder<TContext, TNewInput, TOutput>;
  output<TNewOutput>(schema: SchemaValidator<TNewOutput>): SafeFnBuilder<TContext, TInput, TNewOutput>;
  handler<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>
  ): SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
}


/**
 * SafeFn Client interface
 */
export interface Client<TContext extends Context = Context> {
  use<TNewContext extends Context>(
    interceptor: Interceptor<TNewContext>
  ): Client<TContext & TNewContext>;
  meta(metadata: Metadata): SafeFnBuilder<TContext, unknown, unknown>;
  context(context: Partial<TContext>): SafeFnBuilder<TContext, unknown, unknown>;
  input<TNewInput>(schema: SchemaValidator<TNewInput>): SafeFnBuilder<TContext, TNewInput, unknown>;
  output<TNewOutput>(schema: SchemaValidator<TNewOutput>): SafeFnBuilder<TContext, unknown, TNewOutput>;
  handler<THandlerInput = any, THandlerOutput = any>(
    handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>
  ): SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
}


