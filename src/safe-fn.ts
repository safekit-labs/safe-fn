// ========================================================================
// MAIN SAFE FUNCTION BUILDER IMPLEMENTATION
// ========================================================================

import type {
  Context,
  ErrorHandlerFn,
  ErrorHandlerResult,
  HasContext,
  InputSchemaArray,
  Metadata,
  MiddlewareFn,
  Prettify,
  SafeFn,
  SafeFnHandler,
  SafeFnSignature,
  SchemaValidator,
} from "@/types";

import { executeArrayInputHandler, executeObjectInputHandler } from "@/input";
import { createParseFn, type ParseFn } from "@/libs/parser";

// ========================================================================
// ERROR HANDLING UTILITIES
// ========================================================================

// ------------------ DEFAULT ERROR HANDLER ------------------

/**
 * Creates a default error handler if none is provided
 */
function createDefaultErrorHandler<
  TMetadata extends Metadata,
  TWorkingContext extends Context,
>(): ErrorHandlerFn<TMetadata, TWorkingContext> {
  return ({ error, ctx }): ErrorHandlerResult => {
    console.error("SafeFn Error:", error.message, { context: ctx });
    // Return void - just log the error
  };
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
>(initialState?: {
  currentMetadata?: TMetadata;
  inputValidator?: ParseFn<any>;
  outputValidator?: ParseFn<any>;
  functionMiddlewares?: MiddlewareFn<TMetadata, TBaseContext, any>[];
  errorHandler?: (error: Error, context: TBaseContext) => void;
  metadataValidator?: ParseFn<TMetadata>;
  isArrayInput?: boolean;
  hasContextCapability?: boolean;
  hasInputDefined?: boolean;
}): SafeFn<TBaseContext, TInputContext, unknown, unknown, TMetadata, "none"> {
  let currentMetadata: TMetadata | undefined = initialState?.currentMetadata;
  let inputValidator: ParseFn<any> | undefined = initialState?.inputValidator;
  let outputValidator: ParseFn<any> | undefined = initialState?.outputValidator;
  let functionMiddlewares: MiddlewareFn<TMetadata, TBaseContext, any>[] =
    initialState?.functionMiddlewares || [];
  let errorHandler: ((error: Error, context: TBaseContext) => void) | undefined =
    initialState?.errorHandler;
  let metadataValidator: ParseFn<TMetadata> | undefined = initialState?.metadataValidator;
  let isArrayInput = initialState?.isArrayInput || false;
  let hasContextCapability = initialState?.hasContextCapability || false;
  let hasInputDefined = initialState?.hasInputDefined || false;

  const safeFn: SafeFn<TBaseContext, TInputContext, unknown, unknown, TMetadata, "none"> = {
    metadata(
      metadata: TMetadata,
    ): SafeFn<TBaseContext, TInputContext, unknown, unknown, TMetadata, "none"> {
      // For the constructor, we use the raw metadata since validation might be async
      // Validation will happen at execution time
      const newSafeFn = createSafeFn<TBaseContext, TInputContext, TMetadata>({
        currentMetadata: metadata,
        inputValidator,
        outputValidator,
        functionMiddlewares,
        errorHandler,
        metadataValidator,
        isArrayInput,
        hasContextCapability,
        hasInputDefined,
      });

      // Store the raw metadata for validation at execution time
      (newSafeFn as any)._currentMetadata = metadata;
      (newSafeFn as any)._inputValidator = inputValidator;
      (newSafeFn as any)._outputValidator = outputValidator;
      (newSafeFn as any)._functionMiddlewares = functionMiddlewares;
      (newSafeFn as any)._errorHandler = errorHandler;
      (newSafeFn as any)._metadataValidator = metadataValidator;
      (newSafeFn as any)._isArrayInput = isArrayInput;
      (newSafeFn as any)._hasContextCapability = hasContextCapability;
      (newSafeFn as any)._hasInputDefined = hasInputDefined;

      // Copy client configuration if present
      (newSafeFn as any)._clientMiddlewares = (safeFn as any)._clientMiddlewares;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._metadataValidator = (safeFn as any)._metadataValidator;
      (newSafeFn as any)._inputSchema = (safeFn as any)._inputSchema;

      return newSafeFn;
    },

    use<TNextCtx extends Context>(
      middleware: MiddlewareFn<
        TMetadata,
        Prettify<TBaseContext & TInputContext>,
        Prettify<TBaseContext & TInputContext & TNextCtx>
      >,
    ): SafeFn<
      Prettify<TBaseContext & TNextCtx>,
      TInputContext,
      unknown,
      unknown,
      TMetadata,
      "none"
    > {
      const newSafeFn = createSafeFn<Prettify<TBaseContext & TNextCtx>, TInputContext, TMetadata>({
        currentMetadata,
        inputValidator,
        outputValidator,
        functionMiddlewares,
        errorHandler,
        metadataValidator,
        isArrayInput,
        hasContextCapability,
        hasInputDefined,
      });

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
      schema?: SchemaValidator<TNewInputContext>,
    ): SafeFn<TBaseContext, TNewInputContext, unknown, unknown, TMetadata, "none", HasContext> {
      const newSafeFn = createSafeFn<TBaseContext, TNewInputContext, TMetadata>({
        currentMetadata,
        inputValidator,
        outputValidator,
        functionMiddlewares,
        errorHandler,
        metadataValidator,
        isArrayInput,
        hasContextCapability: true,
        hasInputDefined,
      });

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

    input<TNewInput>(schema?: SchemaValidator<TNewInput>) {
      // Create new SafeFn with updated input state - don't modify closure variables
      const newInputValidator = schema !== undefined ? createParseFn(schema) : undefined;

      const newSafeFn = createSafeFn<TBaseContext, TInputContext, TMetadata>({
        currentMetadata,
        inputValidator: newInputValidator,
        outputValidator,
        functionMiddlewares,
        errorHandler,
        metadataValidator,
        isArrayInput: false,
        hasContextCapability,
        hasInputDefined: true,
      });

      // Copy client configuration
      (newSafeFn as any)._clientMiddlewares = (safeFn as any)._clientMiddlewares;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._metadataValidator = (safeFn as any)._metadataValidator;
      (newSafeFn as any)._contextValidator = (safeFn as any)._contextValidator;

      return newSafeFn as any; // Type assertion needed for the new input type
    },

    args<TArgs extends readonly any[]>(...schemas: InputSchemaArray<TArgs>) {
      // Create new SafeFn with updated args state - don't modify closure variables
      let newInputValidator: ParseFn<any> | undefined;

      // If schemas are provided, set up validation
      if (schemas.length > 0) {
        // Create validator for multiple arguments
        newInputValidator = async (input: unknown) => {
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
        newInputValidator = undefined;
      }

      const newSafeFn = createSafeFn<TBaseContext, TInputContext, TMetadata>({
        currentMetadata,
        inputValidator: newInputValidator,
        outputValidator,
        functionMiddlewares,
        errorHandler,
        metadataValidator,
        isArrayInput: true,
        hasContextCapability,
        hasInputDefined: true,
      });

      // Copy client configuration
      (newSafeFn as any)._clientMiddlewares = (safeFn as any)._clientMiddlewares;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._metadataValidator = (safeFn as any)._metadataValidator;
      (newSafeFn as any)._contextValidator = (safeFn as any)._contextValidator;

      return newSafeFn as any; // Type assertion needed for the new input type
    },

    output<TNewOutput>(
      schema?: SchemaValidator<TNewOutput>,
    ): SafeFn<TBaseContext, TInputContext, unknown, TNewOutput, TMetadata, "none"> {
      // Create new SafeFn with updated output state - don't modify closure variables
      const newOutputValidator = schema !== undefined ? createParseFn(schema) : undefined;

      const newSafeFn = createSafeFn<TBaseContext, TInputContext, TMetadata>({
        currentMetadata,
        inputValidator,
        outputValidator: newOutputValidator,
        functionMiddlewares,
        errorHandler,
        metadataValidator,
        isArrayInput,
        hasContextCapability,
        hasInputDefined,
      });

      // Copy client configuration
      (newSafeFn as any)._clientMiddlewares = (safeFn as any)._clientMiddlewares;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._metadataValidator = (safeFn as any)._metadataValidator;
      (newSafeFn as any)._contextValidator = (safeFn as any)._contextValidator;

      return newSafeFn as any; // Type assertion needed for the new output type
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

      // Get meta validator from client if available - this should NOT affect input validation
      // const clientMetadataValidator = (safeFn as any)._metadataValidator;

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
        : hasInputDefined
          ? (input: THandlerInput, context: Partial<TBaseContext> = {}) => {
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
            }
          : () => {
              // No input required - only use defaultContext
              return executeObjectInputHandler({
                input: undefined as any,
                context: {},
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
  Object.defineProperty(safeFn, "withContext", {
    get() {
      // Only available for context-capable functions
      if (!(hasContextCapability || (safeFn as any)._hasContextCapability)) {
        throw new Error(
          "withContext is only available for context-enabled functions. Call .context<ContextType>() first.",
        );
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
                  throw new Error(
                    `Context validation failed: ${error instanceof Error ? error.message : String(error)}`,
                  );
                }
              }

              const defaultContext = (safeFn as any)._defaultContext || {};
              const metadata = ((safeFn as any)._currentMetadata ||
                currentMetadata ||
                {}) as TMetadata;
              const clientMiddlewares = (safeFn as any)._clientMiddlewares || [];
              const errorHandlerFn =
                errorHandler ||
                (safeFn as any)._clientErrorHandler ||
                createDefaultErrorHandler<TMetadata, any>();

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
            const executor = inputValidator
              ? async (input: any) => {
                  // Validate context if schema was provided
                  let validatedContext = context;
                  if (contextValidatorFn) {
                    try {
                      validatedContext = await contextValidatorFn(context);
                    } catch (error) {
                      throw new Error(
                        `Context validation failed: ${error instanceof Error ? error.message : String(error)}`,
                      );
                    }
                  }

                  const defaultContext = (safeFn as any)._defaultContext || {};
                  const metadata = ((safeFn as any)._currentMetadata ||
                    currentMetadata ||
                    {}) as TMetadata;
                  const clientMiddlewares = (safeFn as any)._clientMiddlewares || [];
                  const errorHandlerFn =
                    errorHandler ||
                    (safeFn as any)._clientErrorHandler ||
                    createDefaultErrorHandler<TMetadata, any>();

                  // For context-bound functions, we need to get the handler from the internal state
                  const handlerFn = (safeFn as any)._handler;
                  if (!handlerFn) {
                    throw new Error(
                      "Handler not defined. Call .handler() before using .withContext()",
                    );
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
                }
              : async () => {
                  // No input required - validate context only
                  let validatedContext = context;
                  if (contextValidatorFn) {
                    try {
                      validatedContext = await contextValidatorFn(context);
                    } catch (error) {
                      throw new Error(
                        `Context validation failed: ${error instanceof Error ? error.message : String(error)}`,
                      );
                    }
                  }

                  const defaultContext = (safeFn as any)._defaultContext || {};
                  const metadata = ((safeFn as any)._currentMetadata ||
                    currentMetadata ||
                    {}) as TMetadata;
                  const clientMiddlewares = (safeFn as any)._clientMiddlewares || [];
                  const errorHandlerFn =
                    errorHandler ||
                    (safeFn as any)._clientErrorHandler ||
                    createDefaultErrorHandler<TMetadata, any>();

                  // For context-bound functions, we need to get the handler from the internal state
                  const handlerFn = (safeFn as any)._handler;
                  if (!handlerFn) {
                    throw new Error(
                      "Handler not defined. Call .handler() before using .withContext()",
                    );
                  }

                  return executeObjectInputHandler({
                    input: undefined as any,
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
            (executor as any).execute = inputValidator
              ? (input: any) => (executor as any)(input)
              : () => (executor as any)();
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
