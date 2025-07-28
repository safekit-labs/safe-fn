import type {
  MaybePromise,
  InferRawInput,
  InferValidatedInput,
  InferRawOutput,
  InferValidatedOutput,
} from "./types";

// ========================================================================
// HANDLER
// ========================================================================

// ------------------ TYPES ------------------

/**
 * Handler function type that receives context and input, returns output
 */
export type Handler<
  TConfig extends {
    input?: unknown;
    output?: unknown;
    context?: unknown;
  } = {
    input: unknown;
    output: unknown;
    context: Record<string, unknown>;
  },
> = (params: {
  ctx: TConfig["context"];
  input: TConfig["input"];
}) => MaybePromise<TConfig["output"]>;

// ------------------ CREATION FUNCTIONS ------------------

/**
 * Creates a typed handler with positional generics and schema support.
 * The generic parameters are ordered for the best developer experience.
 *
 * 1. `TInput`: The input parameters (most common to type).
 * 2. `TOutput`: The result this handler produces.
 * 3. `TContext`: The context from middleware (often inferred).
 */
export function createHandler<
  TInput = unknown,
  TOutput = unknown,
  TContext = Record<string, unknown>,
>(
  fn: Handler<{
    input: InferValidatedInput<TInput>;
    output: InferRawOutput<TOutput>;
    context: TContext;
  }>,
): Handler<{
  input: InferRawInput<TInput>;
  output: InferValidatedOutput<TOutput>;
  context: TContext;
}> {
  // The validation layer will handle the conversion between raw/validated types
  return fn as Handler<{
    input: InferRawInput<TInput>;
    output: InferValidatedOutput<TOutput>;
    context: TContext;
  }>;
}
