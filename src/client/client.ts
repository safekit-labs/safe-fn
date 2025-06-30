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
} from '@/types';

import { executeInterceptorChain } from '@/interceptor';
import { createParseFn, type ParseFn } from '@/libs/parser';

// ========================================================================
// ERROR HANDLING UTILITIES
// ========================================================================

// ------------------ DEFAULT ERROR HANDLER ------------------

/**
 * Creates a default error handler if none is provided
 */
function createDefaultErrorHandler<TContext extends Context>() {
  return (error: Error, context: TContext) => {
    console.error('SafeFn Error:', error.message, { context });
  };
}

// ========================================================================
// MIDDLEWARE EXECUTION UTILITIES
// ========================================================================

// ------------------ MIDDLEWARE CHAIN EXECUTOR ------------------

/**
 * Executes the middleware chain for post-validation processing
 */
async function executeMiddlewareChain<
  TInput,
  TOutput,
  TContext extends Context,
  TMetadata extends Metadata,
>(
  middlewares: Middleware<TContext, TInput, TMetadata>[],
  parsedInput: TInput,
  context: TContext,
  metadata: TMetadata,
  finalHandler: (input: TInput) => Promise<TOutput>,
): Promise<TOutput> {
  if (middlewares.length === 0) {
    return finalHandler(parsedInput);
  }

  let index = 0;

  const next = async (modifiedInput: TInput): Promise<TOutput> => {
    if (index >= middlewares.length) {
      return finalHandler(modifiedInput);
    }

    const middleware = middlewares[index++];
    return middleware({
      next,
      parsedInput: modifiedInput,
      ctx: context,
      metadata,
    });
  };

  return next(parsedInput);
}

// ========================================================================
// HANDLER EXECUTION UTILITIES
// ========================================================================

// ------------------ EXECUTION OPTIONS INTERFACES ------------------

/**
 * Options for executing array input handlers
 */
interface ArrayInputHandlerOptions<THandlerOutput, TContext extends Context, TMetadata extends Metadata> {
  args: any[];
  defaultContext: TContext;
  metadata: TMetadata;
  clientInterceptors: any[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  middlewares: Middleware<TContext, any, TMetadata>[];
  handler: SafeFnHandler<any, THandlerOutput, TContext>;
  errorHandlerFn: (error: Error, context: TContext) => void;
}

/**
 * Options for executing object input handlers
 */
interface ObjectInputHandlerOptions<THandlerInput, THandlerOutput, TContext extends Context, TMetadata extends Metadata> {
  input: THandlerInput;
  context: Partial<TContext>;
  defaultContext: TContext;
  metadata: TMetadata;
  clientInterceptors: any[];
  inputValidator: ParseFn<any> | undefined;
  outputValidator: ParseFn<any> | undefined;
  middlewares: Middleware<TContext, any, TMetadata>[];
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
>(
  options: ArrayInputHandlerOptions<THandlerOutput, TContext, TMetadata>,
): Promise<THandlerOutput> {
  const {
    args,
    defaultContext,
    metadata,
    clientInterceptors,
    inputValidator,
    outputValidator,
    middlewares,
    handler,
    errorHandlerFn,
  } = options;

  const fullContext = { ...defaultContext } as TContext;

  try {
    // For array schemas, pass the args array directly to interceptors (raw input)
    const result = await executeInterceptorChain<THandlerOutput, TContext, TMetadata>(
      clientInterceptors,
      args,
      fullContext,
      metadata,
      async (processedInput: unknown, processedContext: TContext) => {
        // Validate the processed input from interceptors
        const validatedInput = inputValidator
          ? await inputValidator(processedInput)
          : processedInput;

        // Execute middleware chain with validated input
        return executeMiddlewareChain(
          middlewares,
          validatedInput as any,
          processedContext,
          metadata,
          async (finalInput: any) => {
            return handler({ ctx: processedContext, parsedInput: finalInput } as any);
          },
        );
      },
    );

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
    clientInterceptors,
    inputValidator,
    outputValidator,
    middlewares,
    handler,
    errorHandlerFn,
  } = options;

  const fullContext = { ...defaultContext, ...context } as TContext;

  try {
    // For object schemas, pass the input directly to interceptors (raw input)
    const result = await executeInterceptorChain<THandlerOutput, TContext, TMetadata>(
      clientInterceptors,
      input,
      fullContext,
      metadata,
      async (processedInput: unknown, processedContext: TContext) => {
        // Validate the processed input from interceptors
        const validatedInput = inputValidator
          ? await inputValidator(processedInput)
          : processedInput;

        // Execute middleware chain with validated input
        return executeMiddlewareChain(
          middlewares,
          validatedInput as any,
          processedContext,
          metadata,
          async (finalInput: any) => {
            return handler({ ctx: processedContext, parsedInput: finalInput } as any);
          },
        );
      },
    );

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
  let middlewares: Middleware<TContext, any, TMetadata>[] = [];
  let errorHandler: ((error: Error, context: TContext) => void) | undefined;
  let metadataValidator: ParseFn<TMetadata> | undefined;
  let isArrayInput = false;

  const safeFn: SafeFn<TContext, unknown, unknown, TMetadata> = {
    metadata<TNewMetadata extends Metadata>(metadata: TNewMetadata): SafeFn<TContext, unknown, unknown, TNewMetadata> {
      const newSafeFn = createSafeFn<TContext, TNewMetadata>();

      // Copy over current state
      (newSafeFn as any)._currentMetadata = metadataValidator ? metadataValidator(metadata) : metadata;
      (newSafeFn as any)._inputValidator = inputValidator;
      (newSafeFn as any)._outputValidator = outputValidator;
      (newSafeFn as any)._middlewares = middlewares;
      (newSafeFn as any)._errorHandler = errorHandler;
      (newSafeFn as any)._metadataValidator = metadataValidator;

      // Copy client configuration if present
      (newSafeFn as any)._clientInterceptors = (safeFn as any)._clientInterceptors;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._inputSchema = (safeFn as any)._inputSchema;

      return newSafeFn;
    },

    use(middleware: Middleware<TContext, any, TMetadata>): SafeFn<TContext, unknown, unknown, TMetadata> {
      middlewares.push(middleware);
      return safeFn;
    },

    input<TNewInput>(
      schema: SchemaValidator<TNewInput> | SchemaValidator<any>[],
    ): SafeFn<TContext, TNewInput, unknown, TMetadata> {
      if (Array.isArray(schema)) {
        isArrayInput = true;
        // For array of schemas, create a validator that handles each argument
        inputValidator = (input: unknown) => {
          if (!Array.isArray(input)) {
            throw new Error('Expected array input for multiple argument validation');
          }
          return input.map((arg, index) => {
            if (index >= schema.length) {
              throw new Error(
                `Too many arguments provided. Expected ${schema.length}, got ${input.length}`,
              );
            }
            return createParseFn(schema[index])(arg);
          });
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

      // Use client interceptors if available
      const clientInterceptors = (safeFn as any)._clientInterceptors || [];

      // Create the function implementation based on input type
      const finalFn = isArrayInput
        ? (...args: any[]) => {
            return executeArrayInputHandler({
              args,
              defaultContext,
              metadata,
              clientInterceptors,
              inputValidator,
              outputValidator,
              middlewares,
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
              clientInterceptors,
              inputValidator,
              outputValidator,
              middlewares,
              handler,
              errorHandlerFn,
            });
          };

      return finalFn as SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
    },
  };

  return safeFn;
}
