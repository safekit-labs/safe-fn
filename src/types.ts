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

/**
 * Context-bound function that supports both direct calls and .execute() method
 */
export interface ContextBoundFunction<TInput, TOutput> {
  (input: TInput): Promise<TOutput>;
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Context-bound function for no-input functions
 */
export interface ContextBoundNoInputFunction<TOutput> {
  (): Promise<TOutput>;
  execute(): Promise<TOutput>;
}

/**
 * Context-bound function for args pattern
 */
export interface ContextBoundArgsFunction<TArgs extends readonly any[], TOutput> {
  (...args: TArgs): Promise<TOutput>;
  execute(...args: TArgs): Promise<TOutput>;
}

// ========================================================================
// CLIENT CONFIGURATION
// ========================================================================

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
  errorHandler?: ErrorHandlerFn<TMetadata, TContext>;
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
export interface HandlerInput<TInput, TContext extends Context, TMetadata extends Metadata = Metadata> {
  ctx: Prettify<TContext>;
  input: TInput;
  metadata: TMetadata;
}

/**
 * Handler input object for multiple argument procedures
 */
export interface ArgsHandlerInput<TArgs extends readonly any[], TContext extends Context, TMetadata extends Metadata = Metadata> {
  ctx: Prettify<TContext>;
  args: TArgs;
  metadata: TMetadata;
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
 * Clean function signature type that avoids args_0, args_1 parameter names
 */
type CleanTupleSignature<TTuple extends readonly any[], TOutput> = 
  TTuple extends readonly [infer T1]  
    ? (arg1: T1) => Promise<TOutput>
  : TTuple extends readonly [infer T1, infer T2]
    ? (arg1: T1, arg2: T2) => Promise<TOutput>
  : TTuple extends readonly [infer T1, infer T2, infer T3]
    ? (arg1: T1, arg2: T2, arg3: T3) => Promise<TOutput>
  : TTuple extends readonly [infer T1, infer T2, infer T3, infer T4]
    ? (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<TOutput>
  : TTuple extends readonly [infer T1, infer T2, infer T3, infer T4, infer T5]
    ? (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<TOutput>
  : (...args: TTuple) => Promise<TOutput>; // fallback for longer tuples

/**
 * Conditional type for function signature based on input type
 * If input is a tuple, spread it as arguments (context comes from builder chain only)
 * If input is an object, use single input + context pattern
 */
export type SafeFnSignature<
  TInput,
  TOutput,
  TContext extends Context,
  TInputType extends InputType = 'none',
> = TInputType extends 'args'
  ? TInput extends InferTupleFromSchemas<readonly SchemaValidator<any>[]>
    ? CleanTupleSignature<TInput, TOutput>
    : TInput extends readonly []
    ? () => Promise<TOutput>
    : (...args: any[]) => Promise<TOutput>
  : TInputType extends 'single'
  ? (input: TInput, context?: Partial<TContext>) => Promise<TOutput>
  : TInputType extends 'none'
  ? () => Promise<TOutput>
  : unknown extends TInput
  ? () => Promise<TOutput>
  : (input: TInput, context?: Partial<TContext>) => Promise<TOutput>;

/**
 * Safe function handler type - conditionally uses args or input based on input type
 */
export type SafeFnHandler<TInput, TOutput, TContext extends Context, TMetadata extends Metadata = Metadata> = TInput extends readonly any[]
  ? (input: ArgsHandlerInput<TInput, TContext, TMetadata>) => Promise<TOutput>
  : (input: HandlerInput<TInput, TContext, TMetadata>) => Promise<TOutput>;

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
export interface SafeFnClientConfig<TBaseContext extends Context, TMetadata extends Metadata> {
  defaultContext?: TBaseContext;
  metadataSchema?: SchemaValidator<TMetadata>;
  onError?: ErrorHandlerFn<TMetadata, TBaseContext>;
}

// ========================================================================
// CLIENT & PROCEDURE INTERFACES
// ========================================================================

/**
 * Safe function builder with proper context type chaining
 */
export interface SafeFnBuilder<TBaseContext extends Context, TMetadata extends Metadata> {
  use<TNextCtx extends Context>(
    middleware: MiddlewareFn<TMetadata, TBaseContext, TBaseContext & TNextCtx>,
  ): SafeFnBuilder<Prettify<TBaseContext & TNextCtx>, TMetadata>;
  context<TNewBaseContext extends Context = TBaseContext>(
    defaultContext?: TNewBaseContext,
  ): SafeFnBuilder<TNewBaseContext, TMetadata>;
  metadataSchema<TNewMetadata extends Metadata = TMetadata>(
    schema?: SchemaValidator<TNewMetadata>,
  ): SafeFnBuilder<TBaseContext, TNewMetadata>;
  create(): SafeFn<TBaseContext, Context, unknown, unknown, TMetadata, 'none'>;
}

/**
 * Input type tracking for SafeFn
 */
export type InputType = 'none' | 'single' | 'args';

/**
 * Base SafeFn interface with common methods
 * @template TBaseContext - Base context from factory (defaultContext)
 * @template TInputContext - Input context defined via .context<T>() and passed to .withContext()
 * @template TInput - Input type (from .input() or .args())
 * @template TOutput - Output type (from .output())
 * @template TMetadata - Metadata object type
 * @template TInputType - Input method used ('none' | 'single' | 'args')
 * @template TContextCapable - Whether this SafeFn has context capabilities
 */
interface SafeFnBase<
  TBaseContext extends Context = Context,
  TInputContext extends Context = Context,
  TInput = unknown,
  TOutput = unknown,
  TMetadata extends Metadata = Metadata,
  TInputType extends InputType = 'none',
  TContextCapable = {}
> {
  /**
   * Set metadata for this function
   */
  metadata(
    metadata: TMetadata,
  ): SafeFn<TBaseContext, TInputContext, TInput, TOutput, TMetadata, TInputType, TContextCapable>;
  
  /**
   * Add middleware to the function chain
   * @template TNextCtx - Additional context type from middleware
   */
  use<TNextCtx extends Context>(
    middleware: MiddlewareFn<TMetadata, Prettify<TBaseContext & TInputContext>, Prettify<TBaseContext & TInputContext & TNextCtx>>,
  ): SafeFn<Prettify<TBaseContext & TNextCtx>, TInputContext, TInput, TOutput, TMetadata, TInputType, TContextCapable>;
  
  /**
   * Define input context type and enable context capabilities
   * @template TNewInputContext - Input context type
   */
  context<TNewInputContext extends Context>(
    schema?: SchemaValidator<TNewInputContext>
  ): SafeFn<TBaseContext, TNewInputContext, TInput, TOutput, TMetadata, TInputType, HasContext>;
  
  /**
   * Define input schema for validation
   * @template TNewInput - Input type inferred from schema
   */
  input<TNewInput>(
    schema: SchemaValidator<TNewInput>,
  ): TInputType extends 'none'
    ? SafeFn<TBaseContext, TInputContext, TNewInput, TOutput, TMetadata, 'single', TContextCapable>
    : never;

  /**
   * Define input type without validation (type-only)
   * @template TNewInput - Input type (no runtime validation)
   */
  input<TNewInput>(): TInputType extends 'none'
    ? SafeFn<TBaseContext, TInputContext, TNewInput, TOutput, TMetadata, 'single', TContextCapable>
    : never;

  /**
   * Define multiple argument schemas for validation
   * @template TArgs - Tuple of argument types inferred from schemas
   */
  args<TArgs extends readonly any[]>(
    ...schemas: InputSchemaArray<TArgs>
  ): TInputType extends 'none'
    ? SafeFn<TBaseContext, TInputContext, TArgs, TOutput, TMetadata, 'args', TContextCapable>
    : never;

  /**
   * Define multiple argument types without validation (type-only)
   * @template TArgs - Tuple of argument types (no runtime validation)
   */
  args<TArgs extends readonly any[]>(): TInputType extends 'none'
    ? SafeFn<TBaseContext, TInputContext, TArgs, TOutput, TMetadata, 'args', TContextCapable>
    : never;
    
  /**
   * Define output schema for validation
   * @template TNewOutput - Output type inferred from schema
   */
  output<TNewOutput>(
    schema: SchemaValidator<TNewOutput>,
  ): SafeFn<TBaseContext, TInputContext, TInput, TNewOutput, TMetadata, TInputType, TContextCapable>;

  /**
   * Define output type without validation (type-only)
   * @template TNewOutput - Output type (no runtime validation)
   */
  output<TNewOutput>(): SafeFn<TBaseContext, TInputContext, TInput, TNewOutput, TMetadata, TInputType, TContextCapable>;


  /**
   * Define the handler function
   * Handler receives the combined working context (TBaseContext & TInputContext & middleware enhancements)
   * @template THandlerInput - Handler input type (defaults to TInput)
   * @template THandlerOutput - Handler output type (defaults to TOutput)
   */
  handler<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: TInputType extends 'args'
      ? THandlerInput extends readonly any[]
        ? (input: ArgsHandlerInput<THandlerInput, Prettify<TBaseContext & TInputContext>, TMetadata>) => Promise<THandlerOutput>
        : never
      : TInputType extends 'single'
      ? (input: HandlerInput<THandlerInput, Prettify<TBaseContext & TInputContext>, TMetadata>) => Promise<THandlerOutput>
      : SafeFnHandler<THandlerInput, THandlerOutput, Prettify<TBaseContext & TInputContext>, TMetadata>
  ): TContextCapable extends HasContext
    ? SafeFn<TBaseContext, TInputContext, THandlerInput, THandlerOutput, TMetadata, TInputType, TContextCapable>
    : SafeFnSignature<THandlerInput, THandlerOutput, Prettify<TBaseContext & TInputContext>, TInputType>;
}

/**
 * Context-enabled SafeFn with proper withContext typing
 */
export interface SafeFnWithContext<
  TBaseContext extends Context = Context,
  TInputContext extends Context = Context,
  TInput = unknown,
  TOutput = unknown,
  TMetadata extends Metadata = Metadata,
  TInputType extends InputType = 'none'
> extends SafeFnBase<TBaseContext, TInputContext, TInput, TOutput, TMetadata, TInputType, HasContext> {
  /**
   * Bind context to create a context-aware function
   */
  withContext(context: TInputContext): TInputType extends 'args'
    ? TInput extends readonly any[]
      ? ContextBoundArgsFunction<TInput, TOutput>
      : never
    : TInputType extends 'none'
    ? ContextBoundNoInputFunction<TOutput>
    : ContextBoundFunction<TInput, TOutput>;
}

/**
 * Non-context SafeFn without withContext capability
 */
export interface SafeFnWithoutContext<
  TBaseContext extends Context = Context,
  TInputContext extends Context = Context,
  TInput = unknown,
  TOutput = unknown,
  TMetadata extends Metadata = Metadata,
  TInputType extends InputType = 'none'
> extends SafeFnBase<TBaseContext, TInputContext, TInput, TOutput, TMetadata, TInputType, {}> {
  // No withContext method
}

/**
 * Main SafeFn type - conditionally includes context capabilities
 */
export type SafeFn<
  TBaseContext extends Context = Context,
  TInputContext extends Context = Context,
  TInput = unknown,
  TOutput = unknown,
  TMetadata extends Metadata = Metadata,
  TInputType extends InputType = 'none',
  TContextCapable = {}
> = TContextCapable extends HasContext
  ? SafeFnWithContext<TBaseContext, TInputContext, TInput, TOutput, TMetadata, TInputType>
  : SafeFnWithoutContext<TBaseContext, TInputContext, TInput, TOutput, TMetadata, TInputType>;
