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
  clientInput: any;
  ctx: TContext;
  metadata: Metadata;
}) => Promise<InterceptorOutput<any, TContext>>;

/**
 * Handler input object for procedures
 */
export interface HandlerInput<TInput, TContext extends Context> {
  ctx: TContext;
  parsedInput: TInput;
}

/**
 * Safe function handler type
 */
export type SafeFnHandler<TInput, TOutput, TContext extends Context> = (
  input: HandlerInput<TInput, TContext>
) => Promise<TOutput>;

/**
 * Schema validation function type - supports Standard Schema spec and legacy formats
 */
export type SchemaValidator<T> = StandardSchemaV1<T> | ((input: unknown) => T) | { parse: (input: unknown) => T };

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
  input<TNewInput>(schema: SchemaValidator<TNewInput>): SafeFnBuilder<TContext, TNewInput, TOutput>;
  output<TNewOutput>(schema: SchemaValidator<TNewOutput>): SafeFnBuilder<TContext, TInput, TNewOutput>;
  handler<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>
  ): (context: Partial<TContext>, input: THandlerInput) => Promise<THandlerOutput>;
}


/**
 * SafeFn Client interface
 */
export interface Client<TContext extends Context = Context> {
  use<TNewContext extends Context>(
    interceptor: Interceptor<TNewContext>
  ): Client<TContext & TNewContext>;
  meta(metadata: Metadata): SafeFnBuilder<TContext, unknown, unknown>;
  input<TNewInput>(schema: SchemaValidator<TNewInput>): SafeFnBuilder<TContext, TNewInput, unknown>;
  output<TNewOutput>(schema: SchemaValidator<TNewOutput>): SafeFnBuilder<TContext, unknown, TNewOutput>;
  handler<THandlerInput = any, THandlerOutput = any>(
    handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>
  ): (context: Partial<TContext>, input: THandlerInput) => Promise<THandlerOutput>;
}


