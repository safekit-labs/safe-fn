/**
 * Unified middleware execution system
 */
import type { MiddlewareFn, MiddlewareResult, Context, Metadata, ValidateFunction } from "@/types";
import type { ParseFn } from "@/validator";

/**
 * Creates a validation helper function for middleware
 */
function createValidationHelper(
  rawInput: unknown,
  rawArgs: unknown,
  inputValidator?: ParseFn<any>,
  argsValidator?: ParseFn<any>
): ValidateFunction {
  let validatedInput: any;
  let validatedArgs: any;
  let inputValidated = false;
  let argsValidated = false;

  return function valid(type: "input" | "args"): any {
    if (type === "input") {
      if (!inputValidator) {
        throw new Error("No input schema defined. Use rawInput to access unvalidated data.");
      }
      if (!inputValidated) {
        validatedInput = inputValidator(rawInput);
        inputValidated = true;
      }
      return validatedInput;
    } else if (type === "args") {
      if (!argsValidator) {
        throw new Error("No args schema defined. Use rawArgs to access unvalidated data.");
      }
      if (!argsValidated) {
        validatedArgs = argsValidator(rawArgs);
        argsValidated = true;
      }
      return validatedArgs;
    }
    throw new Error(`Invalid validation type: ${type}. Use "input" or "args".`);
  };
}

/**
 * Parameters for executeMiddlewareChain
 */
export interface ExecuteMiddlewareChainParams<
  TOutput,
  TContext extends Context,
  TMetadata extends Metadata,
> {
  middlewares: MiddlewareFn<TMetadata, any, any>[];
  rawInput: unknown;
  rawArgs: unknown;
  context: TContext;
  metadata: TMetadata;
  inputValidator?: ParseFn<any>;
  argsValidator?: ParseFn<any>;
  handler: (input: unknown, context: TContext) => Promise<TOutput> | TOutput;
}

/**
 * Executes a chain of middleware in sequence with proper error handling and type safety
 * Provides validation helper function to middleware for accessing validated data
 */
export async function executeMiddlewareChain<
  TOutput,
  TContext extends Context,
  TMetadata extends Metadata,
>(params: ExecuteMiddlewareChainParams<TOutput, TContext, TMetadata>): Promise<TOutput> {
  const { middlewares, rawInput, rawArgs, context, metadata, inputValidator, argsValidator, handler } = params;

  // Fast path for no middlewares
  if (middlewares.length === 0) {
    // If no middlewares, use validated input if available, otherwise raw
    const finalInput = inputValidator ? inputValidator(rawInput) : rawInput;
    return await Promise.resolve(handler(finalInput, context));
  }

  let index = -1;
  let currentContext: Context = context;
  const middlewareResult: MiddlewareResult<any, Context> = {
    output: undefined,
    context: currentContext,
    success: false
  };

  const executeMiddlewareStack = async (idx = 0): Promise<void> => {
    index = idx;

    // Base case: all middlewares executed, call the handler
    if (index === middlewares.length) {
      // Use validated input if available, otherwise raw
      const finalInput = inputValidator ? inputValidator(rawInput) : rawInput;
      const output = await Promise.resolve(handler(finalInput, currentContext as TContext));
      middlewareResult.output = output;
      middlewareResult.context = currentContext;
      middlewareResult.success = true;
      return;
    }

    const middleware = middlewares[index];

    // Define the `next` function for the current middleware.
    // Overloaded to handle both next() and next({ ctx: ... }) calls
    const next: {
      (): Promise<MiddlewareResult<unknown, any>>;
      <NC extends Context>(opts: { ctx: NC }): Promise<MiddlewareResult<unknown, any>>;
    } = async (params?: { ctx?: any }): Promise<MiddlewareResult<unknown, any>> => {
      // Merge provided context with current context (current context takes precedence over middleware)
      currentContext = params?.ctx ? { ...params.ctx, ...currentContext } : currentContext;
      await executeMiddlewareStack(idx + 1);
      return middlewareResult; // Always return the same middlewareResult object
    };

    // Create validation helper for this middleware
    const valid = createValidationHelper(rawInput, rawArgs, inputValidator, argsValidator);

    // Execute the middleware (updated for new MiddlewareFn signature)
    await middleware({
      rawInput,
      rawArgs,
      ctx: currentContext,
      metadata,
    } as any, next as any);
  };

  // Start the chain
  try {
    await executeMiddlewareStack(0);
    return middlewareResult.output;
  } catch (error) {
    // Attach the final context to the error so it can be used by error handlers
    (error as any)._middlewareContext = currentContext;
    throw error;
  }
}

/**
 * Creates a standalone middleware function with full type safety.
 * 
 * @template TCurrentCtx - Current context type expected by middleware
 * @template TMetadata - Metadata object type
 * @template TNextCtx - Context type after middleware execution
 * @param middlewareFn - The middleware function implementation
 * @returns The same middleware function with proper typing
 * 
 * @example
 * ```typescript
 * // Simple middleware (types inferred)
 * const timing = createMiddleware(async ({ next }) => {
 *   return next({ ctx: { requestTime: Date.now() } });
 * });
 * 
 * // Advanced middleware with explicit types
 * const auth = createMiddleware<{}, AuthMetadata, UserContext>(middlewareFn);
 * ```
 */
export function createMiddleware<
  TCurrentCtx extends Context = {},
  TMetadata extends Metadata = Metadata,
  TNextCtx extends Context = Context
>(
  middlewareFn: MiddlewareFn<TMetadata, TCurrentCtx, TNextCtx>
): typeof middlewareFn {
  return middlewareFn;
}
