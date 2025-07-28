import type { Middleware, InferMiddlewareContexts } from "./hook-middleware";
import type { Handler } from "./handler";
import type { MaybePromise } from "./types";

// ========================================================================
// CORE CLIENT TYPES
// ========================================================================

/**
 * Extract the config object from a Handler type
 */
type ExtractHandlerConfig<THandler extends Handler> = THandler extends Handler<infer TConfig>
  ? TConfig
  : never;

/**
 * Infer the return type for a handler - returns a function that takes the handler's input
 * and returns a MaybePromise of the handler's output
 */
type InferHandlerFunction<THandler extends Handler> =
  THandler extends Handler<infer TConfig>
    ? (input: TConfig["input"]) => MaybePromise<TConfig["output"]>
    : never;

/**
 * Core client interface for building middleware chains
 */
export interface CoreClient<TContext extends Record<string, unknown> = {}> {
  // Single middleware
  use<TMiddleware extends Middleware>(
    middleware: TMiddleware
  ): TMiddleware extends Middleware<infer TConfig>
    ? CoreClient<TContext & TConfig["outputContext"]>
    : CoreClient<TContext>;

  // Multiple middleware array
  use<TMiddlewares extends readonly Middleware[]>(
    middleware: TMiddlewares
  ): CoreClient<TContext & InferMiddlewareContexts<TMiddlewares>>;

  handler<TInput, TOutput>(
    handler: Handler<{ input: TInput; output: TOutput; context: TContext }>
  ): (input: TInput) => MaybePromise<TOutput>;
}

// ========================================================================
// MIDDLEWARE EXECUTION ENGINE
// ========================================================================

/**
 * Executes middleware lifecycle hooks in the correct order
 */
async function executeMiddleware<
  TInput = unknown,
  TOutput = unknown,
  TContext extends Record<string, unknown> = {},
>(params: {
  context: TContext;
  middlewares: Middleware[];
  handler: Handler<{ input: TInput; output: TOutput; context: TContext }>;
  input: TInput;
}): Promise<{ result: TOutput; context: TContext }> {
  const { context, middlewares, handler, input } = params;
  let currentContext = { ...context } as TContext;
  const beforeResults: unknown[] = [];

  // Execute all before hooks in order
  for (let i = 0; i < middlewares.length; i++) {
    const middleware = middlewares[i];

    if (middleware.before) {
      try {
        const beforeResult = await middleware.before({ ctx: currentContext });
        beforeResults[i] = beforeResult;

        if (beforeResult && typeof beforeResult === "object") {
          currentContext = { ...currentContext, ...beforeResult } as TContext;
        }
      } catch (error) {
        // If before hook fails, execute onError hooks in reverse order
        await executeErrorHooks({
          context: currentContext,
          middlewares,
          startIndex: i,
          error: error as Error,
          beforeResults,
        });
        throw error;
      }
    } else {
      beforeResults[i] = undefined;
    }
  }

  // Execute handler
  let result: TOutput;
  try {
    result = await handler({ ctx: currentContext, input });
  } catch (error) {
    // If handler fails, execute onError hooks in reverse order
    await executeErrorHooks({
      context: currentContext,
      middlewares,
      startIndex: middlewares.length - 1,
      error: error as Error,
      beforeResults,
    });
    throw error;
  }

  // Execute all after hooks in reverse order
  for (let i = middlewares.length - 1; i >= 0; i--) {
    const middleware = middlewares[i];

    if (middleware.after) {
      try {
        await middleware.after({ ctx: currentContext, output: result });
      } catch (error) {
        // If after hook fails, execute onError hooks in reverse order
        await executeErrorHooks({
          context: currentContext,
          middlewares,
          startIndex: i,
          error: error as Error,
          beforeResults,
        });
        throw error;
      }
    }
  }

  return { result, context: currentContext };
}

/**
 * Executes onError hooks in reverse order when an error occurs
 */
async function executeErrorHooks<TContext extends Record<string, unknown> = {}>(params: {
  context: TContext;
  middlewares: Middleware[];
  startIndex: number;
  error: Error;
  beforeResults: unknown[];
}): Promise<void> {
  const { context, middlewares, startIndex, error, beforeResults } = params;
  let currentContext = { ...context } as TContext;

  // Execute onError hooks in reverse order from the point of failure
  for (let i = startIndex; i >= 0; i--) {
    const middleware = middlewares[i];

    if (middleware.onError) {
      try {
        // Create context with partial output context (TRPC pattern)
        const beforeResult = beforeResults[i];
        const errorContext =
          beforeResult && typeof beforeResult === "object"
            ? { ...currentContext, ...beforeResult }
            : currentContext;

        const errorResult = await middleware.onError({ ctx: errorContext, error });
        if (errorResult && typeof errorResult === "object") {
          currentContext = { ...currentContext, ...errorResult } as TContext;
        }
      } catch {
        // If onError hook itself fails, continue with other onError hooks
      }
    }
  }
}

// ========================================================================
// CLIENT CREATION FUNCTIONS
// ========================================================================

/**
 * Internal function to create a core client with accumulated context
 */
function createCoreClientInternal<TContext extends Record<string, unknown> = {}>(
  middlewares: Middleware[] = []
): CoreClient<TContext> {
  return {
    use: <TMiddleware extends Middleware | readonly Middleware[]>(middleware: TMiddleware) => {
      const newMiddlewares = Array.isArray(middleware)
        ? [...middlewares, ...middleware]
        : [...middlewares, middleware];

      if (Array.isArray(middleware)) {
        // Multiple middleware array
        return createCoreClientInternal<TContext & InferMiddlewareContexts<TMiddleware>>(newMiddlewares);
      } else {
        // Single middleware - extract output context and merge with current context
        type MiddlewareConfig = TMiddleware extends Middleware<infer TConfig> ? TConfig : never;
        type NewContext = TContext & MiddlewareConfig["outputContext"];
        return createCoreClientInternal<NewContext>(newMiddlewares);
      }
    },

    handler: <TInput, TOutput>(
      handler: Handler<{ input: TInput; output: TOutput; context: TContext }>
    ): (input: TInput) => MaybePromise<TOutput> => {
      return (async (input: TInput): Promise<TOutput> => {
        const initialContext = {} as TContext;
        const { result } = await executeMiddleware<TInput, TOutput, TContext>({
          context: initialContext,
          middlewares,
          handler,
          input,
        });
        return result;
      }) as (input: TInput) => MaybePromise<TOutput>;
    },
  };
}

/**
 * Creates a new core client with no configuration
 */
export function createCoreClient(): CoreClient<{}> {
  return createCoreClientInternal<{}>([]);
}
