// ========================================================================
// MAIN SAFE FUNCTION BUILDER IMPLEMENTATION
// ========================================================================

import type {
  SafeFnHandler,
  Context,
  MiddlewareFn,
  Metadata,
  SafeFn,
  SchemaValidator,
  SafeFnSignature,
  InputSchemaArray,
  Prettify,
  ErrorHandlerResult,
  ErrorHandlerFn,
  MiddlewareResult,
  ValidateFunction,
} from "@/types";

import { executeMiddlewareChain } from "@/middleware";
import { createParseFn, type ParseFn } from "@/libs/parser";

// ========================================================================
// VALIDATION HELPER
// ========================================================================

/**
 * Creates a validation helper function for error handlers
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

// ========================================================================
// ERROR HANDLING UTILITIES
// ========================================================================

// ------------------ DEFAULT ERROR HANDLER ------------------

/**
 * Creates a default error handler if none is provided
 */
function createDefaultErrorHandler<TMetadata extends Metadata, TContext extends Context>(): ErrorHandlerFn<TMetadata, TContext> {
  return ({ error, ctx }): ErrorHandlerResult => {
    console.error("SafeFn Error:", error.message, { context: ctx });
    // Return void - just log the error
  };
}

/**
 * Processes error handler result and returns final result
 */
async function processErrorHandlerResult<TOutput, TContext extends Context>(
  errorHandlerResult: ErrorHandlerResult | Promise<ErrorHandlerResult>,
  originalError: Error,
  context: TContext
): Promise<MiddlewareResult<TOutput, TContext>> {
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

// ========================================================================
// HANDLER EXECUTION UTILITIES
// ========================================================================

// ------------------ EXECUTION OPTIONS INTERFACES ------------------

/**
 * Options for executing array input handlers
 */
interface ArrayInputHandlerOptions<
  THandlerOutput,
  TContext extends Context,
  TMetadata extends Metadata,
> {
  args: any[];
  defaultContext: TContext;
  metadata: TMetadata;
  clientMiddlewares: MiddlewareFn<TMetadata, any, any>[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  functionMiddlewares: MiddlewareFn<TMetadata, TContext, any>[];
  handler: SafeFnHandler<any, THandlerOutput, TContext, TMetadata>;
  errorHandlerFn: ErrorHandlerFn<TMetadata, TContext>;
}

/**
 * Options for executing object input handlers
 */
interface ObjectInputHandlerOptions<
  THandlerInput,
  THandlerOutput,
  TContext extends Context,
  TMetadata extends Metadata,
> {
  input: THandlerInput;
  context: Partial<TContext>;
  defaultContext: TContext;
  metadata: TMetadata;
  clientMiddlewares: MiddlewareFn<TMetadata, any, any>[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  functionMiddlewares: MiddlewareFn<TMetadata, TContext, any>[];
  handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext, TMetadata>;
  errorHandlerFn: ErrorHandlerFn<TMetadata, TContext>;
}

// ------------------ ARRAY INPUT HANDLER ------------------

/**
 * Executes handler for array/multiple argument input
 */
async function executeArrayInputHandler<
  THandlerOutput,
  TContext extends Context,
  TMetadata extends Metadata,
>(options: ArrayInputHandlerOptions<THandlerOutput, TContext, TMetadata>): Promise<THandlerOutput> {
  const {
    args,
    defaultContext,
    metadata,
    clientMiddlewares,
    inputValidator,
    outputValidator,
    functionMiddlewares,
    handler,
    errorHandlerFn,
  } = options;

  const fullContext = { ...defaultContext } as TContext;

  try {
    // Combine client and function middlewares
    const allMiddlewares = [...clientMiddlewares, ...functionMiddlewares];

    // Execute unified middleware chain with new validation system
    const result = await executeMiddlewareChain<THandlerOutput, TContext, TMetadata>({
      middlewares: allMiddlewares,
      rawInput: args,
      rawArgs: args, // For array input, both rawInput and rawArgs are the same
      context: fullContext,
      metadata,
      inputValidator,
      argsValidator: inputValidator, // For array input, use same validator for both
      handler: async (finalInput: unknown, finalContext: TContext) => {
        return handler({ ctx: finalContext, args: finalInput, metadata } as any);
      },
    });

    const validatedOutput = outputValidator ? await outputValidator(result) : result;
    return validatedOutput as THandlerOutput;
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    // Use the context from middleware execution if available, otherwise fall back to fullContext
    const errorContext = (originalError as any)._middlewareContext || fullContext;
    
    // Create validation helper for error handler
    const valid = createValidationHelper(args, args, inputValidator, inputValidator);
    
    const errorResult = await processErrorHandlerResult<THandlerOutput, TContext>(
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
      const validatedOutput = outputValidator ? await outputValidator(errorResult.output) : errorResult.output;
      return validatedOutput as THandlerOutput;
    } else {
      throw errorResult.error;
    }
  }
}

// ------------------ OBJECT INPUT HANDLER ------------------

/**
 * Executes handler for single object input
 */
async function executeObjectInputHandler<
  THandlerInput,
  THandlerOutput,
  TContext extends Context,
  TMetadata extends Metadata,
>(
  options: ObjectInputHandlerOptions<THandlerInput, THandlerOutput, TContext, TMetadata>,
): Promise<THandlerOutput> {
  const {
    input,
    context,
    defaultContext,
    metadata,
    clientMiddlewares,
    inputValidator,
    outputValidator,
    functionMiddlewares,
    handler,
    errorHandlerFn,
  } = options;

  const fullContext = { ...defaultContext, ...context } as TContext;

  try {
    // Combine client and function middlewares
    const allMiddlewares = [...clientMiddlewares, ...functionMiddlewares];

    // Execute unified middleware chain with new validation system
    const result = await executeMiddlewareChain<THandlerOutput, TContext, TMetadata>({
      middlewares: allMiddlewares,
      rawInput: input,
      rawArgs: undefined, // For single input, no args
      context: fullContext,
      metadata,
      inputValidator,
      argsValidator: undefined, // For single input, no args validator
      handler: async (finalInput: unknown, finalContext: TContext) => {
        return handler({ ctx: finalContext, input: finalInput, metadata } as any);
      },
    });

    const validatedOutput = outputValidator ? await outputValidator(result) : result;
    return validatedOutput as THandlerOutput;
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    // Use the context from middleware execution if available, otherwise fall back to fullContext
    const errorContext = (originalError as any)._middlewareContext || fullContext;
    
    // Create validation helper for error handler
    const valid = createValidationHelper(input, undefined, inputValidator, undefined);
    
    const errorResult = await processErrorHandlerResult<THandlerOutput, TContext>(
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
      const validatedOutput = outputValidator ? await outputValidator(errorResult.output) : errorResult.output;
      return validatedOutput as THandlerOutput;
    } else {
      throw errorResult.error;
    }
  }
}

// ========================================================================
// CREATE SAFE FN
// ========================================================================

// ------------------ MAIN FACTORY FUNCTION ------------------

/**
 * Creates a safe function
 */
export function createSafeFn<
  TContext extends Context = {},
  TMetadata extends Metadata = Metadata,
>(): SafeFn<TContext, unknown, unknown, TMetadata, 'none'> {
  let currentMetadata: TMetadata | undefined;
  let inputValidator: ParseFn<any> | undefined;
  let outputValidator: ParseFn<any> | undefined;
  let functionMiddlewares: MiddlewareFn<TMetadata, TContext, any>[] = [];
  let errorHandler: ((error: Error, context: TContext) => void) | undefined;
  let metadataValidator: ParseFn<TMetadata> | undefined;
  let isArrayInput = false;

  const safeFn: SafeFn<TContext, unknown, unknown, TMetadata, 'none'> = {
    metadata(
      metadata: TMetadata,
    ): SafeFn<TContext, unknown, unknown, TMetadata, 'none'> {
      const newSafeFn = createSafeFn<TContext, TMetadata>();

      // Copy over current state
      (newSafeFn as any)._currentMetadata = metadataValidator
        ? metadataValidator(metadata)
        : metadata;
      (newSafeFn as any)._inputValidator = inputValidator;
      (newSafeFn as any)._outputValidator = outputValidator;
      (newSafeFn as any)._functionMiddlewares = functionMiddlewares;
      (newSafeFn as any)._errorHandler = errorHandler;
      (newSafeFn as any)._metadataValidator = metadataValidator;

      // Copy client configuration if present
      (newSafeFn as any)._clientMiddlewares = (safeFn as any)._clientMiddlewares;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._inputSchema = (safeFn as any)._inputSchema;

      return newSafeFn;
    },

    use<TNextCtx extends Context>(
      middleware: MiddlewareFn<TMetadata, TContext, TContext & TNextCtx>,
    ): SafeFn<Prettify<TContext & TNextCtx>, unknown, unknown, TMetadata, 'none'> {
      const newSafeFn = createSafeFn<Prettify<TContext & TNextCtx>, TMetadata>();

      // Copy over current state
      (newSafeFn as any)._currentMetadata = currentMetadata;
      (newSafeFn as any)._inputValidator = inputValidator;
      (newSafeFn as any)._outputValidator = outputValidator;
      (newSafeFn as any)._functionMiddlewares = functionMiddlewares;
      (newSafeFn as any)._errorHandler = errorHandler;
      (newSafeFn as any)._metadataValidator = metadataValidator;
      (newSafeFn as any)._isArrayInput = isArrayInput;

      // Copy client configuration if present and add new middleware to client middlewares
      const existingClientMiddlewares = (safeFn as any)._clientMiddlewares || [];
      (newSafeFn as any)._clientMiddlewares = [...existingClientMiddlewares, middleware];
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._metadataParser = (safeFn as any)._metadataParser;

      return newSafeFn;
    },

    input<TNewInput>(
      schema?: SchemaValidator<TNewInput>,
    ) {
      isArrayInput = false;

      // If schema is provided, set up validation
      if (schema !== undefined) {
        inputValidator = createParseFn(schema);
      } else {
        // Schema-less variant - no validation, type-only
        inputValidator = undefined;
      }

      return safeFn as any; // Type assertion needed for the new input type
    },

    args<TArgs extends readonly any[]>(
      ...schemas: InputSchemaArray<TArgs>
    ) {
      isArrayInput = true;

      // If schemas are provided, set up validation
      if (schemas.length > 0) {
        // Create validator for multiple arguments
        inputValidator = async (input: unknown) => {
          if (!Array.isArray(input)) {
            throw new Error("Expected array input for multiple argument validation");
          }

          // Handle mismatched argument count
          if (input.length !== schemas.length) {
            throw new Error(`Expected ${schemas.length} arguments, but got ${input.length}`);
          }

          // Parse each argument and await all results
          const parsePromises = input.map((arg, index) => {
            const parseFn = createParseFn(schemas[index]);
            return Promise.resolve(parseFn(arg));
          });

          return Promise.all(parsePromises);
        };
      } else {
        // Schema-less variant - no validation, type-only
        inputValidator = undefined;
      }

      return safeFn as any; // Type assertion needed for the new input type
    },

    output<TNewOutput>(
      schema: SchemaValidator<TNewOutput>,
    ): SafeFn<TContext, unknown, TNewOutput, TMetadata, 'none'> {
      outputValidator = createParseFn(schema);
      return safeFn as any; // Type assertion needed for the new output type
    },

    handler<THandlerInput = any, THandlerOutput = any>(
      handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext, TMetadata>,
    ) {
      // Merge with default context and any provided context
      const defaultContext = (safeFn as any)._defaultContext || {};
      const metadata = ((safeFn as any)._currentMetadata || currentMetadata || {}) as TMetadata;

      // Get meta validator from client if available
      metadataValidator = (safeFn as any)._metadataValidator;

      // Use client error handler if available, otherwise use default
      const clientErrorHandler = (safeFn as any)._clientErrorHandler;
      const errorHandlerFn =
        errorHandler || clientErrorHandler || createDefaultErrorHandler<TMetadata, TContext>();

      // Use client middlewares if available
      const clientMiddlewares = (safeFn as any)._clientMiddlewares || [];

      // Create the function implementation based on input type
      const finalFn = isArrayInput
        ? (...args: any[]) => {
            return executeArrayInputHandler({
              args,
              defaultContext,
              metadata,
              clientMiddlewares,
              inputValidator,
              outputValidator,
              functionMiddlewares,
              handler,
              errorHandlerFn,
            });
          }
        : (input: THandlerInput, context: Partial<TContext> = {}) => {
            return executeObjectInputHandler({
              input,
              context,
              defaultContext,
              metadata,
              clientMiddlewares,
              inputValidator,
              outputValidator,
              functionMiddlewares,
              handler,
              errorHandlerFn,
            });
          };

      // Use the correct type based on whether we have array input
      return finalFn as SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
    },
  };

  return safeFn;
}
