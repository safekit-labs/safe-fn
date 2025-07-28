import type {
  MaybePromise,
  Prettify,
  InferRawInput,
  InferValidatedOutput
} from "./types";

// ========================================================================
// HOOK MIDDLEWARE
// ========================================================================

// ------------------ TYPES ------------------

type MiddlewareResponse<T> = T | null | void | undefined;

/**
 * Middleware with lifecycle hooks using object-based generics
 * Follows TRPC pattern for honest error context typing
 */
interface HookMiddleware<
  TConfig extends {
    // The handler's external contract
    input?: unknown;
    output?: unknown;
    // The middleware's internal state management
    inputContext?: unknown;
    outputContext?: unknown;
  } = {
    input: unknown;
    output: unknown;
    inputContext: Record<string, unknown>;
    outputContext: Record<string, unknown>;
  }
> {
  before?: (params: {
    ctx: TConfig["inputContext"];
  }) => MaybePromise<MiddlewareResponse<TConfig["outputContext"]>>;
  // Returns void as there shouldn't be a downstream consumer and handler return values should be immutable for type safety
  after?: (params: {
    ctx: TConfig["inputContext"] & TConfig["outputContext"];
    // Renamed to `output` for consistency with handler
    output: TConfig["output"];
  }) => MaybePromise<void>;
  onError?: (params: {
    ctx: TConfig["inputContext"] & Partial<TConfig["outputContext"]>;
    error: Error;
  }) => MaybePromise<MiddlewareResponse<Partial<TConfig["outputContext"]>>>;
}

// ------------------ UTILITIES ------------------

/**
 * Recursively merge context types from an array of middleware
 */
type MergeHookMiddlewareContexts<T extends readonly HookMiddleware[]> = T extends readonly [
  infer First,
  ...infer Rest,
]
  ? First extends HookMiddleware<{
      input: unknown;
      output: unknown;
      inputContext: unknown;
      outputContext: infer FirstOutput;
    }>
    ? Rest extends readonly HookMiddleware[]
      ? Prettify<FirstOutput & MergeHookMiddlewareContexts<Rest>>
      : FirstOutput
    : {}
  : {};

/**
 * Infer the final merged context type from middleware array or single middleware
 */
type InferHookMiddlewareContexts<T> = T extends readonly HookMiddleware[]
  ? MergeHookMiddlewareContexts<T>
  : {};

// ------------------ CREATION FUNCTIONS ------------------

/**
 * Creates a middleware with lifecycle hooks.
 * The generic parameters are ordered for the best developer experience.
 *
 * 1. `TInputContext`: The context from previous middleware (most common to type).
 * 2. `TInput`: The parameters of the handler this middleware can wrap.
 * 3. `TOutput`: The result of the handler this middleware can wrap.
 * 4. `TOutputContext`: The new context this middleware produces (ALWAYS inferred).
 */
function createHookMiddleware<
  TInputContext = Record<string, unknown>,
  TInput = unknown,
  TOutput = unknown,
  TOutputContext = Record<string, unknown>
>(
  middleware: {
    before?: (params: {
      ctx: TInputContext;
    }) => MaybePromise<MiddlewareResponse<TOutputContext>>;
    after?: (params: {
      ctx: Prettify<TInputContext & TOutputContext>;
      output: InferValidatedOutput<TOutput>;
    }) => MaybePromise<void>;
    onError?: (params: {
      ctx: Prettify<TInputContext & Partial<TOutputContext>>;
      error: Error;
    }) => MaybePromise<MiddlewareResponse<Partial<TOutputContext>>>;
  }
): HookMiddleware<{
  input: InferRawInput<TInput>;
  output: InferValidatedOutput<TOutput>;
  inputContext: TInputContext;
  outputContext: TOutputContext;
}> {
  if (!middleware.before && !middleware.after && !middleware.onError) {
    throw new Error("Middleware must define at least one of: before, after, or onError");
  }

  // We can safely cast here because our function signature ensures
  // the provided middleware object matches the structure of the return type.
  return middleware as HookMiddleware<{
    input: InferRawInput<TInput>;
    output: InferValidatedOutput<TOutput>;
    inputContext: TInputContext;
    outputContext: TOutputContext;
  }>;
}

// ========================================================================
// ALIAS
// ========================================================================
// Alias the name for it and keep it as hook middleware internally
export type Middleware<
  TConfig extends {
    input?: unknown;
    output?: unknown;
    inputContext?: unknown;
    outputContext?: unknown;
  } = {
    input: unknown;
    output: unknown;
    inputContext: unknown;
    outputContext: unknown;
  }
> = HookMiddleware<TConfig>;
export type InferMiddlewareContexts<T> = InferHookMiddlewareContexts<T>;
export const createMiddleware = createHookMiddleware;
