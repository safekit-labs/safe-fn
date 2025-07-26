/**
 * Handler types for the SafeFn library
 */

import type { Context, Metadata, Prettify } from "./core";

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
// HANDLER FUNCTION TYPES
// ========================================================================

/**
 * Clean function signature type that avoids args_0, args_1 parameter names
 */
type CleanTupleSignature<TTuple extends readonly any[], TOutput> =
  TTuple extends readonly [infer T1]
    ? (arg1: T1) => Promise<TOutput> | TOutput
  : TTuple extends readonly [infer T1, infer T2]
    ? (arg1: T1, arg2: T2) => Promise<TOutput> | TOutput
  : TTuple extends readonly [infer T1, infer T2, infer T3]
    ? (arg1: T1, arg2: T2, arg3: T3) => Promise<TOutput> | TOutput
  : TTuple extends readonly [infer T1, infer T2, infer T3, infer T4]
    ? (arg1: T1, arg2: T2, arg3: T3, arg4: T4) => Promise<TOutput> | TOutput
  : TTuple extends readonly [infer T1, infer T2, infer T3, infer T4, infer T5]
    ? (arg1: T1, arg2: T2, arg3: T3, arg4: T4, arg5: T5) => Promise<TOutput> | TOutput
  : (...args: TTuple) => Promise<TOutput> | TOutput; // fallback for longer tuples

/**
 * Input type tracking for SafeFn
 */
export type InputType = 'none' | 'single' | 'args';

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
    ? () => Promise<TOutput> | TOutput
    : (...args: any[]) => Promise<TOutput> | TOutput
  : TInputType extends 'single'
  ? (input: TInput, context?: Partial<TContext>) => Promise<TOutput> | TOutput
  : TInputType extends 'none'
  ? () => Promise<TOutput> | TOutput
  : unknown extends TInput
  ? () => Promise<TOutput> | TOutput
  : (input: TInput, context?: Partial<TContext>) => Promise<TOutput> | TOutput;

/**
 * Function signature type that uses schema input types for the call signature
 * This handles coerce schemas where input type differs from output type
 */
export type SafeFnSchemaSignature<
  TSchema extends SchemaValidator<any>,
  TOutput,
  TContext extends Context,
  TInputType extends InputType = 'none',
> = TInputType extends 'single'
  ? (input: InferSchemaInput<TSchema>, context?: Partial<TContext>) => Promise<TOutput>
  : SafeFnSignature<InferSchemaOutput<TSchema>, TOutput, TContext, TInputType>;

/**
 * Safe function handler type - conditionally uses args or input based on input type
 */
export type SafeFnHandler<TInput, TOutput, TContext extends Context, TMetadata extends Metadata = Metadata> = TInput extends readonly any[]
  ? (input: ArgsHandlerInput<TInput, TContext, TMetadata>) => Promise<TOutput> | TOutput
  : (input: HandlerInput<TInput, TContext, TMetadata>) => Promise<TOutput> | TOutput;

// Import types needed for SafeFnSignature
import type { SchemaValidator, InferTupleFromSchemas, InferSchemaInput, InferSchemaOutput } from "./schema";