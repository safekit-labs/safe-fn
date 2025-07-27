// ========================================================================
// INPUT HANDLING AND EXECUTION UTILITIES
// ========================================================================

import type {
  SafeFnHandler,
  Context,
  MiddlewareFn,
  Metadata,
  ErrorHandlerFn,
  MiddlewareResult,
  ValidateFunction,
} from "@/types";

import { executeMiddlewareChain } from "@/middleware";
import { type ParseFn } from "@/validator";

// ========================================================================
// VALIDATION HELPER
// ========================================================================

/**
 * Creates a validation helper function for error handlers
 */
export function createValidationHelper(
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

// ========================================================================
// EXECUTION OPTIONS INTERFACES
// ========================================================================

/**
 * Options for executing array input handlers
 */
export interface ArrayInputHandlerOptions<
  THandlerOutput,
  TWorkingContext extends Context,
  TMetadata extends Metadata,
> {
  args: any[];
  context?: Partial<TWorkingContext>;
  metadata: TMetadata;
  clientMiddlewares: MiddlewareFn<TMetadata, any, any>[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  functionMiddlewares: MiddlewareFn<TMetadata, TWorkingContext, any>[];
  handler: SafeFnHandler<THandlerOutput, TWorkingContext, TMetadata>;
  errorHandlerFn: ErrorHandlerFn<TMetadata, TWorkingContext>;
}

/**
 * Options for executing object input handlers
 */
export interface ObjectInputHandlerOptions<
  THandlerInput,
  THandlerOutput,
  TWorkingContext extends Context,
  TMetadata extends Metadata,
> {
  input: THandlerInput;
  context: Partial<TWorkingContext>;
  metadata: TMetadata;
  clientMiddlewares: MiddlewareFn<TMetadata, any, any>[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  functionMiddlewares: MiddlewareFn<TMetadata, TWorkingContext, any>[];
  handler: SafeFnHandler<THandlerOutput, TWorkingContext, TMetadata>;
  errorHandlerFn: ErrorHandlerFn<TMetadata, TWorkingContext>;
}

// ========================================================================
// INPUT HANDLER EXECUTION FUNCTIONS  
// ========================================================================

/**
 * Processes error handler result and returns final result
 */
async function processErrorHandlerResult<TOutput, TWorkingContext extends Context>(
  errorHandlerResult: any | Promise<any>,
  originalError: Error,
  context: TWorkingContext
): Promise<MiddlewareResult<TOutput, TWorkingContext>> {
  const result = await errorHandlerResult;

  if (result === undefined) {
    // Handler returned void - return original error
    return { output: undefined as any, context, success: false, error: originalError };
  }

  if (result instanceof Error) {
    // Handler returned a new error
    return { output: undefined as any, context, success: false, error: result };
  }

  if (typeof result === 'object' && 'success' in result) {
    // Handler returned a result object
    if (result.success) {
      return { output: result.data, context, success: true };
    } else {
      return { output: undefined as any, context, success: false, error: result.error };
    }
  }

  // Fallback - return original error
  return { output: undefined as any, context, success: false, error: originalError };
}

/**
 * Executes handler for array/multiple argument input
 */
export async function executeArrayInputHandler<
  THandlerOutput,
  TWorkingContext extends Context,
  TMetadata extends Metadata,
>(options: ArrayInputHandlerOptions<THandlerOutput, TWorkingContext, TMetadata>): Promise<THandlerOutput> {
  const {
    args,
    context,
    metadata,
    clientMiddlewares,
    inputValidator,
    outputValidator,
    functionMiddlewares,
    handler,
    errorHandlerFn,
  } = options;

  const fullContext = { ...context } as TWorkingContext;

  try {
    // Combine client and function middlewares
    const allMiddlewares = [...clientMiddlewares, ...functionMiddlewares];

    // Execute unified middleware chain with new validation system
    const result = await executeMiddlewareChain<THandlerOutput, TWorkingContext, TMetadata>({
      middlewares: allMiddlewares,
      rawInput: args,
      rawArgs: args, // For array input, both rawInput and rawArgs are the same
      context: fullContext,
      metadata,
      inputValidator,
      argsValidator: inputValidator, // For array input, use same validator for both
      handler: async (finalInput: unknown, finalContext: TWorkingContext) => {
        return handler({ ctx: finalContext, args: finalInput, metadata } as any);
      },
    });

    const validatedOutput = outputValidator ? outputValidator(result) : result;
    return validatedOutput as THandlerOutput;
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    // Use the context from middleware execution if available, otherwise fall back to fullContext
    const errorContext = (originalError as any)._middlewareContext || fullContext;

    // Create validation helper for error handler
    const valid = createValidationHelper(args, args, inputValidator, inputValidator);

    const errorResult = await processErrorHandlerResult<THandlerOutput, TWorkingContext>(
      errorHandlerFn({
        error: originalError,
        ctx: errorContext,
        metadata,
        rawInput: args,
        rawArgs: args,
        valid
      }),
      originalError,
      errorContext
    );

    if (errorResult.success) {
      const validatedOutput = outputValidator ? outputValidator(errorResult.output) : errorResult.output;
      return validatedOutput as THandlerOutput;
    } else {
      throw errorResult.error;
    }
  }
}

/**
 * Executes handler for single object input
 */
export async function executeObjectInputHandler<
  THandlerInput,
  THandlerOutput,
  TWorkingContext extends Context,
  TMetadata extends Metadata,
>(
  options: ObjectInputHandlerOptions<THandlerInput, THandlerOutput, TWorkingContext, TMetadata>,
): Promise<THandlerOutput> {
  const {
    input,
    context,
    metadata,
    clientMiddlewares,
    inputValidator,
    outputValidator,
    functionMiddlewares,
    handler,
    errorHandlerFn,
  } = options;

  const fullContext = { ...context } as TWorkingContext;

  try {
    // Combine client and function middlewares
    const allMiddlewares = [...clientMiddlewares, ...functionMiddlewares];

    // Execute unified middleware chain with new validation system
    const result = await executeMiddlewareChain<THandlerOutput, TWorkingContext, TMetadata>({
      middlewares: allMiddlewares,
      rawInput: input,
      rawArgs: undefined, // For single input, no args
      context: fullContext,
      metadata,
      inputValidator,
      argsValidator: undefined, // For single input, no args validator
      handler: async (finalInput: unknown, finalContext: TWorkingContext) => {
        return handler({ ctx: finalContext, input: finalInput, metadata } as any);
      },
    });

    const validatedOutput = outputValidator ? outputValidator(result) : result;
    return validatedOutput as THandlerOutput;
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    // Use the context from middleware execution if available, otherwise fall back to fullContext
    const errorContext = (originalError as any)._middlewareContext || fullContext;

    // Create validation helper for error handler
    const valid = createValidationHelper(input, undefined, inputValidator, undefined);

    const errorResult = await processErrorHandlerResult<THandlerOutput, TWorkingContext>(
      errorHandlerFn({
        error: originalError,
        ctx: errorContext,
        metadata,
        rawInput: input,
        rawArgs: undefined,
        valid
      }),
      originalError,
      errorContext
    );

    if (errorResult.success) {
      const validatedOutput = outputValidator ? outputValidator(errorResult.output) : errorResult.output;
      return validatedOutput as THandlerOutput;
    } else {
      throw errorResult.error;
    }
  }
}