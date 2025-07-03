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
  HasContext,
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
function createDefaultErrorHandler<TMetadata extends Metadata, TWorkingContext extends Context>(): ErrorHandlerFn<TMetadata, TWorkingContext> {
  return ({ error, ctx }): ErrorHandlerResult => {
    console.error("SafeFn Error:", error.message, { context: ctx });
    // Return void - just log the error
  };
}

/**
 * Processes error handler result and returns final result
 */
async function processErrorHandlerResult<TOutput, TWorkingContext extends Context>(
  errorHandlerResult: ErrorHandlerResult | Promise<ErrorHandlerResult>,
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

// ========================================================================
// HANDLER EXECUTION UTILITIES
// ========================================================================

// ------------------ EXECUTION OPTIONS INTERFACES ------------------

/**
 * Options for executing array input handlers
 */
interface ArrayInputHandlerOptions<
  THandlerOutput,
  TWorkingContext extends Context,
  TMetadata extends Metadata,
> {
  args: any[];
  defaultContext: TWorkingContext;
  metadata: TMetadata;
  clientMiddlewares: MiddlewareFn<TMetadata, any, any>[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  functionMiddlewares: MiddlewareFn<TMetadata, TWorkingContext, any>[];
  handler: SafeFnHandler<any, THandlerOutput, TWorkingContext, TMetadata>;
  errorHandlerFn: ErrorHandlerFn<TMetadata, TWorkingContext>;
}

/**
 * Options for executing object input handlers
 */
interface ObjectInputHandlerOptions<
  THandlerInput,
  THandlerOutput,
  TWorkingContext extends Context,
  TMetadata extends Metadata,
> {
  input: THandlerInput;
  context: Partial<TWorkingContext>;
  defaultContext: TWorkingContext;
  metadata: TMetadata;
  clientMiddlewares: MiddlewareFn<TMetadata, any, any>[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  functionMiddlewares: MiddlewareFn<TMetadata, TWorkingContext, any>[];
  handler: SafeFnHandler<THandlerInput, THandlerOutput, TWorkingContext, TMetadata>;
  errorHandlerFn: ErrorHandlerFn<TMetadata, TWorkingContext>;
}

// ------------------ ARRAY INPUT HANDLER ------------------

/**
 * Executes handler for array/multiple argument input
 */
async function executeArrayInputHandler<
  THandlerOutput,
  TWorkingContext extends Context,
  TMetadata extends Metadata,
>(options: ArrayInputHandlerOptions<THandlerOutput, TWorkingContext, TMetadata>): Promise<THandlerOutput> {
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

  const fullContext = { ...defaultContext } as TWorkingContext;

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

    const validatedOutput = outputValidator ? await outputValidator(result) : result;
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
  TWorkingContext extends Context,
  TMetadata extends Metadata,
>(
  options: ObjectInputHandlerOptions<THandlerInput, THandlerOutput, TWorkingContext, TMetadata>,
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

  const fullContext = { ...defaultContext, ...context } as TWorkingContext;

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

    const validatedOutput = outputValidator ? await outputValidator(result) : result;
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
  TBaseContext extends Context = {},
  TInputContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
>(initialState?: { currentMetadata?: TMetadata }): SafeFn<TBaseContext, TInputContext, unknown, unknown, TMetadata, 'none'> {
  let currentMetadata: TMetadata | undefined = initialState?.currentMetadata;
  let inputValidator: ParseFn<any> | undefined;
  let outputValidator: ParseFn<any> | undefined;
  let functionMiddlewares: MiddlewareFn<TMetadata, TBaseContext, any>[] = [];
  let errorHandler: ((error: Error, context: TBaseContext) => void) | undefined;
  let metadataValidator: ParseFn<TMetadata> | undefined;
  let isArrayInput = false;
  let hasContextCapability = false;

  const safeFn: SafeFn<TBaseContext, TInputContext, unknown, unknown, TMetadata, 'none'> = {
    metadata(
      metadata: TMetadata,
    ): SafeFn<TBaseContext, TInputContext, unknown, unknown, TMetadata, 'none'> {
      // For the constructor, we use the raw metadata since validation might be async
      // Validation will happen at execution time
      const newSafeFn = createSafeFn<TBaseContext, TInputContext, TMetadata>({
        currentMetadata: metadata
      });

      // Store the raw metadata for validation at execution time
      (newSafeFn as any)._currentMetadata = metadata;
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
      middleware: MiddlewareFn<TMetadata, Prettify<TBaseContext & TInputContext>, Prettify<TBaseContext & TInputContext & TNextCtx>>,
    ): SafeFn<Prettify<TBaseContext & TNextCtx>, TInputContext, unknown, unknown, TMetadata, 'none'> {
      const newSafeFn = createSafeFn<Prettify<TBaseContext & TNextCtx>, TInputContext, TMetadata>({
        currentMetadata
      });

      // Copy over current state
      (newSafeFn as any)._currentMetadata = currentMetadata;
      (newSafeFn as any)._inputValidator = inputValidator;
      (newSafeFn as any)._outputValidator = outputValidator;
      (newSafeFn as any)._functionMiddlewares = functionMiddlewares;
      (newSafeFn as any)._errorHandler = errorHandler;
      (newSafeFn as any)._metadataValidator = metadataValidator;
      (newSafeFn as any)._isArrayInput = isArrayInput;

      // Copy context capability properties
      (newSafeFn as any)._hasContextCapability = (safeFn as any)._hasContextCapability;
      (newSafeFn as any)._contextValidator = (safeFn as any)._contextValidator;

      // Copy client configuration if present and add new middleware to client middlewares
      const existingClientMiddlewares = (safeFn as any)._clientMiddlewares || [];
      (newSafeFn as any)._clientMiddlewares = [...existingClientMiddlewares, middleware];
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._metadataValidator = (safeFn as any)._metadataValidator;

      return newSafeFn;
    },

    context<TNewInputContext extends Context>(
      schema?: SchemaValidator<TNewInputContext>
    ): SafeFn<TBaseContext, TNewInputContext, unknown, unknown, TMetadata, 'none', HasContext> {
      const newSafeFn = createSafeFn<TBaseContext, TNewInputContext, TMetadata>({
        currentMetadata
      });

      // Copy over current state
      (newSafeFn as any)._currentMetadata = currentMetadata;
      (newSafeFn as any)._inputValidator = inputValidator;
      (newSafeFn as any)._outputValidator = outputValidator;
      (newSafeFn as any)._functionMiddlewares = functionMiddlewares;
      (newSafeFn as any)._errorHandler = errorHandler;
      (newSafeFn as any)._metadataValidator = metadataValidator;
      (newSafeFn as any)._isArrayInput = isArrayInput;
      (newSafeFn as any)._hasContextCapability = true;

      // Set up context validation if schema provided
      if (schema) {
        (newSafeFn as any)._contextValidator = createParseFn(schema);
      }

      // Copy client configuration if present
      (newSafeFn as any)._clientMiddlewares = (safeFn as any)._clientMiddlewares;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._metadataValidator = (safeFn as any)._metadataValidator;

      return newSafeFn as any;
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
    ): SafeFn<TBaseContext, TInputContext, unknown, TNewOutput, TMetadata, 'none'> {
      outputValidator = createParseFn(schema);
      return safeFn as any; // Type assertion needed for the new output type
    },

    handler<THandlerInput = any, THandlerOutput = any>(
      handler: SafeFnHandler<THandlerInput, THandlerOutput, TBaseContext, TMetadata>,
    ) {
      // Store the handler for context-bound functions
      (safeFn as any)._handler = handler;

      // If this is a context-capable function, return the SafeFn object for withContext usage
      if (hasContextCapability || (safeFn as any)._hasContextCapability) {
        return safeFn as any;
      }

      // For non-context functions, create the function implementation as before
      const defaultContext = (safeFn as any)._defaultContext || {};
      const metadata = ((safeFn as any)._currentMetadata || currentMetadata || {}) as TMetadata;

      // Get meta validator from client if available
      metadataValidator = (safeFn as any)._metadataValidator;

      // Use client error handler if available, otherwise use default
      const clientErrorHandler = (safeFn as any)._clientErrorHandler;
      const errorHandlerFn =
        errorHandler || clientErrorHandler || createDefaultErrorHandler<TMetadata, TBaseContext>();

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
        : (input: THandlerInput, context: Partial<TBaseContext> = {}) => {
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
      return finalFn as SafeFnSignature<THandlerInput, THandlerOutput, TBaseContext>;
    },
  };

  // Set up withContext method dynamically
  Object.defineProperty(safeFn, 'withContext', {
    get() {
      // Only available for context-capable functions
      if (!(hasContextCapability || (safeFn as any)._hasContextCapability)) {
        throw new Error("withContext is only available for context-enabled functions. Call .context<ContextType>() first.");
      }

      return (context: any) => {
        // Validate context if schema was provided
        const contextValidatorFn = (safeFn as any)._contextValidator;

        // Create the context-bound executor function
        const createBoundExecutor = (isArgs: boolean) => {
          if (isArgs) {
            // Args pattern executor
            const executor = async (...args: any[]) => {
              // Validate context if schema was provided
              let validatedContext = context;
              if (contextValidatorFn) {
                try {
                  validatedContext = await contextValidatorFn(context);
                } catch (error) {
                  throw new Error(`Context validation failed: ${error instanceof Error ? error.message : String(error)}`);
                }
              }

              const defaultContext = (safeFn as any)._defaultContext || {};
              const metadata = ((safeFn as any)._currentMetadata || currentMetadata || {}) as TMetadata;
              const clientMiddlewares = (safeFn as any)._clientMiddlewares || [];
              const errorHandlerFn = errorHandler || (safeFn as any)._clientErrorHandler || createDefaultErrorHandler<TMetadata, any>();

              // For context-bound functions, we need to get the handler from the internal state
              const handlerFn = (safeFn as any)._handler;
              if (!handlerFn) {
                throw new Error("Handler not defined. Call .handler() before using .withContext()");
              }

              return executeArrayInputHandler({
                args,
                defaultContext: { ...defaultContext, ...validatedContext },
                metadata,
                clientMiddlewares,
                inputValidator,
                outputValidator,
                functionMiddlewares,
                handler: handlerFn,
                errorHandlerFn,
              });
            };

            // Add execute method
            (executor as any).execute = (...args: any[]) => executor(...args);
            return executor;
          } else {
            // Single input pattern executor
            const executor = async (input: any) => {
              // Validate context if schema was provided
              let validatedContext = context;
              if (contextValidatorFn) {
                try {
                  validatedContext = await contextValidatorFn(context);
                } catch (error) {
                  throw new Error(`Context validation failed: ${error instanceof Error ? error.message : String(error)}`);
                }
              }

              const defaultContext = (safeFn as any)._defaultContext || {};
              const metadata = ((safeFn as any)._currentMetadata || currentMetadata || {}) as TMetadata;
              const clientMiddlewares = (safeFn as any)._clientMiddlewares || [];
              const errorHandlerFn = errorHandler || (safeFn as any)._clientErrorHandler || createDefaultErrorHandler<TMetadata, any>();

              // For context-bound functions, we need to get the handler from the internal state
              const handlerFn = (safeFn as any)._handler;
              if (!handlerFn) {
                throw new Error("Handler not defined. Call .handler() before using .withContext()");
              }

              return executeObjectInputHandler({
                input,
                context: validatedContext,
                defaultContext: defaultContext,
                metadata,
                clientMiddlewares,
                inputValidator,
                outputValidator,
                functionMiddlewares,
                handler: handlerFn,
                errorHandlerFn,
              });
            };

            // Add execute method
            (executor as any).execute = (input: any) => executor(input);
            return executor;
          }
        };

        return createBoundExecutor(isArrayInput);
      };
    },
    configurable: true,
    enumerable: true,
  });

  return safeFn;
}
