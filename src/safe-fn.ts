// ========================================================================
// MAIN SAFE FUNCTION BUILDER IMPLEMENTATION
// ========================================================================

import type {
  SafeFnHandler,
  Context,
  Middleware,
  Metadata,
  SafeFn,
  SchemaValidator,
  SafeFnSignature,
} from "@/types";

import { executeMiddlewareChain } from "@/middleware";
import { createParseFn, type ParseFn } from "@/libs/parser";

// ========================================================================
// ERROR HANDLING UTILITIES
// ========================================================================

// ------------------ DEFAULT ERROR HANDLER ------------------

/**
 * Creates a default error handler if none is provided
 */
function createDefaultErrorHandler<TContext extends Context>() {
  return (error: Error, context: TContext) => {
    console.error("SafeFn Error:", error.message, { context });
  };
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
  clientMiddlewares: Middleware<any, any, any, TMetadata>[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  functionMiddlewares: Middleware<TContext, any, any, TMetadata>[];
  handler: SafeFnHandler<any, THandlerOutput, TContext>;
  errorHandlerFn: (error: Error, context: TContext) => void;
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
  clientMiddlewares: Middleware<any, any, any, TMetadata>[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  functionMiddlewares: Middleware<TContext, any, any, TMetadata>[];
  handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>;
  errorHandlerFn: (error: Error, context: TContext) => void;
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

    // Validate input first
    const validatedInput = inputValidator ? await inputValidator(args) : args;

    // Execute unified middleware chain with both raw and parsed input
    const result = await executeMiddlewareChain<THandlerOutput, TContext, TMetadata>({
      middlewares: allMiddlewares,
      rawInput: args,
      parsedInput: validatedInput,
      context: fullContext,
      metadata,
      handler: async (finalInput: unknown, finalContext: TContext) => {
        return handler({ ctx: finalContext, args: finalInput } as any);
      },
    });

    const validatedOutput = outputValidator ? await outputValidator(result) : result;
    return validatedOutput as THandlerOutput;
  } catch (error) {
    const safeFnError = error instanceof Error ? error : new Error(String(error));
    errorHandlerFn(safeFnError, fullContext);
    throw safeFnError;
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

    // Validate input first
    const validatedInput = inputValidator ? await inputValidator(input) : input;

    // Execute unified middleware chain with both raw and parsed input
    const result = await executeMiddlewareChain<THandlerOutput, TContext, TMetadata>({
      middlewares: allMiddlewares,
      rawInput: input,
      parsedInput: validatedInput,
      context: fullContext,
      metadata,
      handler: async (finalInput: unknown, finalContext: TContext) => {
        return handler({ ctx: finalContext, parsedInput: finalInput } as any);
      },
    });

    const validatedOutput = outputValidator ? await outputValidator(result) : result;
    return validatedOutput as THandlerOutput;
  } catch (error) {
    const safeFnError = error instanceof Error ? error : new Error(String(error));
    errorHandlerFn(safeFnError, fullContext);
    throw safeFnError;
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
  TContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
>(): SafeFn<TContext, unknown, unknown, TMetadata> {
  let currentMetadata: TMetadata | undefined;
  let inputValidator: ParseFn<any> | undefined;
  let outputValidator: ParseFn<any> | undefined;
  let functionMiddlewares: Middleware<TContext, any, any, TMetadata>[] = [];
  let errorHandler: ((error: Error, context: TContext) => void) | undefined;
  let metadataValidator: ParseFn<TMetadata> | undefined;
  let isArrayInput = false;

  const safeFn: SafeFn<TContext, unknown, unknown, TMetadata> = {
    metadata<TNewMetadata extends Metadata>(
      metadata: TNewMetadata,
    ): SafeFn<TContext, unknown, unknown, TNewMetadata> {
      const newSafeFn = createSafeFn<TContext, TNewMetadata>();

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

    use<TNewContext extends TContext>(
      middleware: Middleware<TContext, TNewContext, any, TMetadata>,
    ): SafeFn<TNewContext, unknown, unknown, TMetadata> {
      const newSafeFn = createSafeFn<TNewContext, TMetadata>();

      // Copy over current state
      (newSafeFn as any)._currentMetadata = currentMetadata;
      (newSafeFn as any)._inputValidator = inputValidator;
      (newSafeFn as any)._outputValidator = outputValidator;
      (newSafeFn as any)._functionMiddlewares = [...functionMiddlewares, middleware];
      (newSafeFn as any)._errorHandler = errorHandler;
      (newSafeFn as any)._metadataValidator = metadataValidator;
      (newSafeFn as any)._isArrayInput = isArrayInput;

      // Copy client configuration if present
      (newSafeFn as any)._clientMiddlewares = (safeFn as any)._clientMiddlewares;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._metadataParser = (safeFn as any)._metadataParser;

      return newSafeFn;
    },

    input<TNewInput>(
      schema: SchemaValidator<TNewInput> | SchemaValidator<any>[],
    ): SafeFn<TContext, TNewInput, unknown, TMetadata> {
      if (Array.isArray(schema)) {
        isArrayInput = true;
        // For array of schemas, create a validator that handles each argument
        inputValidator = async (input: unknown) => {
          if (!Array.isArray(input)) {
            throw new Error("Expected array input for multiple argument validation");
          }

          // Handle empty schema array (zero arguments)
          if (schema.length === 0) {
            if (input.length > 0) {
              throw new Error(`No arguments expected, but got ${input.length}`);
            }
            return [];
          }

          // Handle mismatched argument count
          if (input.length !== schema.length) {
            throw new Error(`Expected ${schema.length} arguments, but got ${input.length}`);
          }

          // Parse each argument and await all results
          const parsePromises = input.map((arg, index) => {
            const parseFn = createParseFn(schema[index]);
            return Promise.resolve(parseFn(arg));
          });

          return Promise.all(parsePromises);
        };
      } else {
        isArrayInput = false;
        inputValidator = createParseFn(schema);
      }
      return safeFn as any; // Type assertion needed for the new input type
    },

    output<TNewOutput>(
      schema: SchemaValidator<TNewOutput>,
    ): SafeFn<TContext, unknown, TNewOutput, TMetadata> {
      outputValidator = createParseFn(schema);
      return safeFn as any; // Type assertion needed for the new output type
    },

    handler<THandlerInput = any, THandlerOutput = any>(
      handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>,
    ) {
      // Merge with default context and any provided context
      const defaultContext = (safeFn as any)._defaultContext || {};
      const metadata = ((safeFn as any)._currentMetadata || currentMetadata || {}) as TMetadata;

      // Get meta validator from client if available
      metadataValidator = (safeFn as any)._metadataValidator;

      // Use client error handler if available, otherwise use default
      const clientErrorHandler = (safeFn as any)._clientErrorHandler;
      const errorHandlerFn =
        errorHandler || clientErrorHandler || createDefaultErrorHandler<TContext>();

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

      return finalFn as SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
    },
  };

  return safeFn;
}
