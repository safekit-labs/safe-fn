/**
 * SafeFn interface and builder types
 */

import type { Context, Metadata, Prettify, HasContext } from "./core";
import type { SchemaValidator, InputSchemaArray } from "./schema";
import type { HandlerInput, ArgsHandlerInput, SafeFnHandler, SafeFnSignature, InputType } from "./handler";
import type { MiddlewareFn } from "./middleware";

// ========================================================================
// CONTEXT-BOUND FUNCTION TYPES
// ========================================================================

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
// BUILDER INTERFACE
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

// ========================================================================
// SAFEFN CLIENT CONFIGURATION
// ========================================================================

/**
 * Configuration for creating a SafeFn client
 */
export interface ClientConfig<TBaseContext extends Context, TMetadata extends Metadata> {
  defaultContext?: TBaseContext;
  metadataSchema?: SchemaValidator<TMetadata>;
  onError?: ErrorHandlerFn<TMetadata, TBaseContext>;
}

// Import ErrorHandlerFn from core
import type { ErrorHandlerFn } from "./core";

// ========================================================================
// SAFEFN INTERFACE
// ========================================================================

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
   * Define no input (equivalent to omitting .input() entirely)
   */
  input(): TInputType extends 'none'
    ? SafeFn<TBaseContext, TInputContext, unknown, TOutput, TMetadata, 'none', TContextCapable>
    : never;

  /**
   * Define input type without validation (type-only)
   * @template TNewInput - Input type (no runtime validation)
   */
  input<TNewInput>(): TInputType extends 'none'
    ? SafeFn<TBaseContext, TInputContext, TNewInput, TOutput, TMetadata, 'single', TContextCapable>
    : never;

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
   * Define void output (no meaningful return value)
   */
  output(): SafeFn<TBaseContext, TInputContext, TInput, void, TMetadata, TInputType, TContextCapable>;

  /**
   * Define output type without validation (type-only)
   * @template TNewOutput - Output type (no runtime validation)
   */
  output<TNewOutput>(): SafeFn<TBaseContext, TInputContext, TInput, TNewOutput, TMetadata, TInputType, TContextCapable>;

  /**
   * Define output schema for validation
   * @template TNewOutput - Output type inferred from schema
   */
  output<TNewOutput>(
    schema: SchemaValidator<TNewOutput>,
  ): SafeFn<TBaseContext, TInputContext, TInput, TNewOutput, TMetadata, TInputType, TContextCapable>;


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