/**
 * Core types for the SafeFn library
 */

import type { StandardSchemaV1 } from "@/libs/standard-schema-v1/spec";

// ========================================================================
// UTILITY TYPES
// ========================================================================

/**
 * Takes an object type and makes it more readable, converting intersections to proper object types
 */
export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

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

// ========================================================================
// CLIENT CONFIGURATION
// ========================================================================

/**
 * Configuration for the SafeFn client
 */
export interface ClientConfig<
  TContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
> {
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
export interface MiddlewareResult<TOutput, TNextCtx extends Context> {
  output: TOutput;
  context: TNextCtx;
  success: boolean;
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
  (): Promise<MiddlewareResult<unknown, TCurrentCtx>>;
  <TNextCtx extends Context>(opts: { ctx: TNextCtx }): Promise<MiddlewareResult<unknown, Prettify<TCurrentCtx & TNextCtx>>>;
}

/**
 * Validation helper function for middleware
 * Provides access to validated input or args data
 */
export type ValidateFunction = {
  (type: "input"): any;
  (type: "args"): any;
};

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

/**
 * @deprecated Use MiddlewareFn instead - keeping for backward compatibility
 */
export type Middleware<
  TCurrentContext extends Context = Context,
  TNewContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
> = MiddlewareFn<TMetadata, TCurrentContext, TNewContext>;

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


// ========================================================================
// HANDLER INPUT TYPES
// ========================================================================

/**
 * Handler input object for single input procedures
 */
export interface HandlerInput<TInput, TContext extends Context> {
  ctx: Prettify<TContext>;
  input: TInput;
}

/**
 * Handler input object for multiple argument procedures
 */
export interface ArgsHandlerInput<TArgs extends readonly any[], TContext extends Context> {
  ctx: Prettify<TContext>;
  args: TArgs;
}

/**
 * @deprecated Use ArgsHandlerInput instead
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
> = TInput extends InferTupleFromSchemas<readonly SchemaValidator<any>[]>
  ? (...args: TInput) => Promise<TOutput>
  : TInput extends readonly []
  ? () => Promise<TOutput>
  : (input: TInput, context?: Partial<TContext>) => Promise<TOutput>;

/**
 * Safe function handler type - conditionally uses args or input based on input type
 */
export type SafeFnHandler<TInput, TOutput, TContext extends Context> = TInput extends readonly any[]
  ? (input: ArgsHandlerInput<TInput, TContext>) => Promise<TOutput>
  : (input: HandlerInput<TInput, TContext>) => Promise<TOutput>;

// ========================================================================
// SCHEMA VALIDATION TYPES
// ========================================================================

/**
 * Schema validation function type - supports multiple validation libraries
 *
 * Supports Zod, Yup, Valibot, ArkType, Effect Schema, Superstruct, Scale Codec,
 * Runtypes, custom functions, Standard Schema spec, and null for unvalidated arguments.
 */
export type SchemaValidator<T> =
  | { parse: (input: unknown) => T } // Zod schemas
  | { parseAsync: (input: unknown) => Promise<T> } // Zod async
  | { validateSync: (input: unknown) => T } // Yup schemas
  | { create: (input: unknown) => T } // Superstruct schemas
  | { assert: (value: unknown) => asserts value is T } // Scale Codec schemas
  | ((input: unknown) => T) // Plain validation functions & ArkType
  | StandardSchemaV1<T> // Standard Schema spec
  | null; // Skip validation marker

// ========================================================================
// TUPLE INFERENCE UTILITIES
// ========================================================================

/**
 * Helper type for mixed validation schema arrays with explicit type parameters
 */
export type InputSchemaArray<TArgs extends readonly any[]> = {
  [K in keyof TArgs]: SchemaValidator<TArgs[K]> | null;
};

/**
 * Utility type to infer the output type of a schema validator
 */
export type InferSchemaOutput<T> = T extends null
  ? unknown // null markers produce unknown type
  : T extends StandardSchemaV1<any, infer Output>
  ? Output
  : T extends { parse: (input: unknown) => infer U }
  ? U
  : T extends { parseAsync: (input: unknown) => Promise<infer U> }
  ? U
  : T extends { validateSync: (input: unknown) => infer U }
  ? U
  : T extends { create: (input: unknown) => infer U }
  ? U
  : T extends { assert: (value: unknown) => asserts value is infer U }
  ? U
  : T extends (input: unknown) => infer U
  ? U
  : T extends SchemaValidator<infer U>
  ? U
  : never;

/**
 * Utility type to convert array of schema validators to tuple of their output types
 */
export type InferTupleFromSchemas<T extends readonly SchemaValidator<any>[]> = T extends readonly []
  ? readonly []
  : T extends readonly [infer First, ...infer Rest]
  ? First extends SchemaValidator<any>
    ? Rest extends readonly SchemaValidator<any>[]
      ? readonly [InferSchemaOutput<First>, ...InferTupleFromSchemas<Rest>]
      : never
    : never
  : {
      readonly [K in keyof T]: InferSchemaOutput<T[K]>;
    };

// ========================================================================
// SAFEFN CLIENT TYPES
// ========================================================================

/**
 * Configuration for creating a SafeFn client
 */
export interface SafeFnClientConfig<TContext extends Context, TMetadata extends Metadata> {
  defaultContext?: TContext;
  metadataSchema?: SchemaValidator<TMetadata>;
  onError?: (error: Error, context: TContext) => void | Promise<void>;
}

// ========================================================================
// CLIENT & PROCEDURE INTERFACES
// ========================================================================

/**
 * Safe function builder with proper context type chaining
 */
export interface SafeFnBuilder<TContext extends Context, TMetadata extends Metadata> {
  use<TNextCtx extends Context>(
    middleware: MiddlewareFn<TMetadata, TContext, TContext & TNextCtx>,
  ): SafeFnBuilder<Prettify<TContext & TNextCtx>, TMetadata>;
  context<TNewContext extends Context = TContext>(
    defaultContext?: TNewContext,
  ): SafeFnBuilder<TNewContext, TMetadata>;
  metadataSchema<TNewMetadata extends Metadata = TMetadata>(
    schema?: SchemaValidator<TNewMetadata>,
  ): SafeFnBuilder<TContext, TNewMetadata>;
  create(): SafeFn<TContext, unknown, unknown, TMetadata, 'none'>;
}

/**
 * Input type tracking for SafeFn
 */
export type InputType = 'none' | 'single' | 'args';

/**
 * Safe function procedure
 */
export interface SafeFn<
  TContext extends Context = Context,
  TInput = unknown,
  TOutput = unknown,
  TMetadata extends Metadata = Metadata,
  TInputType extends InputType = 'none',
> {
  metadata<TNewMetadata extends Metadata>(
    metadata: TNewMetadata,
  ): SafeFn<TContext, TInput, TOutput, TNewMetadata, TInputType>;
  use<TNextCtx extends Context>(
    middleware: MiddlewareFn<TMetadata, TContext, TContext & TNextCtx>,
  ): SafeFn<Prettify<TContext & TNextCtx>, TInput, TOutput, TMetadata, TInputType>;
  // Single input method - only available when no input is set
  input<TNewInput>(
    schema: SchemaValidator<TNewInput>,
  ): TInputType extends 'none'
    ? SafeFn<TContext, TNewInput, TOutput, TMetadata, 'single'>
    : never;

  // Schema-less single input method - type-only, no validation
  input<TNewInput>(): TInputType extends 'none'
    ? SafeFn<TContext, TNewInput, TOutput, TMetadata, 'single'>
    : never;

  // Multiple arguments method - only available when no input is set
  args<TArgs extends readonly any[]>(
    ...schemas: InputSchemaArray<TArgs>
  ): TInputType extends 'none'
    ? SafeFn<TContext, TArgs, TOutput, TMetadata, 'args'>
    : never;

  // Schema-less multiple arguments method - type-only, no validation
  args<TArgs extends readonly any[]>(): TInputType extends 'none'
    ? SafeFn<TContext, TArgs, TOutput, TMetadata, 'args'>
    : never;
  output<TNewOutput>(
    schema: SchemaValidator<TNewOutput>,
  ): SafeFn<TContext, TInput, TNewOutput, TMetadata, TInputType>;

  // Handler method with different signatures based on input type
  handler<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: TInputType extends 'args'
      ? THandlerInput extends readonly any[]
        ? (input: ArgsHandlerInput<THandlerInput, TContext>) => Promise<THandlerOutput>
        : never
      : TInputType extends 'single'
      ? (input: HandlerInput<THandlerInput, TContext>) => Promise<THandlerOutput>
      : SafeFnHandler<THandlerInput, THandlerOutput, TContext>
  ): SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
}
