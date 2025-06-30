/**
 * Main safe function builder implementation
 */
import type {
  SafeFnHandler,
  Context,
  Middleware,
  Meta,
  SafeFn,
  SchemaValidator,
  SafeFnSignature,
} from '@/types';

import { executeInterceptorChain } from '@/interceptor';

import type { ZodTuple } from 'zod';

/**
 * Creates a schema validator function that handles Standard Schema, legacy schemas, and validation functions
 */
function createSchemaValidator<T>(schema: SchemaValidator<T>): (input: unknown) => T {
  if (typeof schema === 'function') {
    return schema;
  } else if (schema && typeof schema === 'object') {
    // Check for Standard Schema first
    if ('~standard' in schema && typeof schema['~standard'] === 'object') {
      const standardSchema = schema['~standard'];
      if (typeof standardSchema.validate === 'function') {
        return (input: unknown) => {
          const result = standardSchema.validate(input);
          // Handle both sync and async results
          if (result && typeof (result as any).then === 'function') {
            throw new Error('Async Standard Schema validation not supported yet');
          }
          if ((result as any).issues) {
            throw new Error('Schema validation failed: ' + JSON.stringify((result as any).issues));
          }
          return (result as any).value;
        };
      }
    }
    // Fallback to Zod-style .parse method
    if ('parse' in schema && typeof schema.parse === 'function') {
      return (input: unknown) => schema.parse(input);
    }
  }
  throw new Error('Invalid schema: The provided schema is not a function and does not have a compatible .parse() method.');
}

/**
 * Reliably determines if a schema represents a tuple/array using Standard Schema spec
 */
function isStandardTupleSchema(schema: SchemaValidator<any>): boolean {
  // 1. Check if the object conforms to the Standard Schema spec
  if (!schema || typeof schema !== 'object' || !('~standard' in schema)) {
    return false;
  }

  const standardPart = (schema as any)['~standard'];

  // 2. The spec's `meta` property is an optional function
  if (typeof standardPart.meta === 'function') {
    try {
      // 3. Call the meta() function to get the schema's metadata
      const metadata = standardPart.meta();

      // 4. Check the 'type' property. For a tuple or array, it should be 'array'
      return metadata?.type === 'array';
    } catch (e) {
      // If calling meta() fails for any reason, fall through to vendor-specific detection
      console.error('Error introspecting standard schema meta:', e);
    }
  }

  // 5. Fallback: vendor-specific detection for schemas that don't implement meta()
  if (standardPart.vendor === 'zod') {
    // For Zod, check if it's a ZodTuple using proper typing
    const zodSchema = schema as ZodTuple<any>;
    return zodSchema._def?.typeName === 'ZodTuple';
  }

  // 6. Other vendor-specific checks can be added here as needed
  // For now, assume non-Standard Schema compliant schemas are not tuples
  return false;
}


/**
 * Creates a default error handler if none is provided
 */
function createDefaultErrorHandler<TContext extends Context>() {
  return (error: Error, context: TContext) => {
    console.error('SafeFn Error:', error.message, { context });
  };
}

/**
 * Executes the middleware chain for post-validation processing
 */
async function executeMiddlewareChain<TInput, TOutput, TContext extends Context, TMeta extends Meta>(
  middlewares: Middleware<TContext, TInput, TMeta>[],
  parsedInput: TInput,
  context: TContext,
  meta: TMeta,
  finalHandler: (input: TInput) => Promise<TOutput>
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
      meta,
    });
  };

  return next(parsedInput);
}


/**
 * Creates a safe function
 */
export function createSafeFn<TContext extends Context = Context, TMeta extends Meta = Meta>(): SafeFn<TContext, unknown, unknown, TMeta> {
  let currentMeta: TMeta | undefined;
  let inputValidator: ((input: unknown) => any) | undefined;
  let outputValidator: ((output: unknown) => any) | undefined;
  let middlewares: Middleware<TContext, any, TMeta>[] = [];
  let errorHandler: ((error: Error, context: TContext) => void) | undefined;
  let metaValidator: ((meta: unknown) => TMeta) | undefined;

  const safeFn: SafeFn<TContext, unknown, unknown, TMeta> = {
    meta<TNewMeta extends Meta>(meta: TNewMeta): SafeFn<TContext, unknown, unknown, TNewMeta> {
      const newSafeFn = createSafeFn<TContext, TNewMeta>();

      // Copy over current state
      (newSafeFn as any)._currentMeta = metaValidator ? metaValidator(meta) : meta;
      (newSafeFn as any)._inputValidator = inputValidator;
      (newSafeFn as any)._outputValidator = outputValidator;
      (newSafeFn as any)._middlewares = middlewares;
      (newSafeFn as any)._errorHandler = errorHandler;
      (newSafeFn as any)._metaValidator = metaValidator;

      // Copy client configuration if present
      (newSafeFn as any)._clientInterceptors = (safeFn as any)._clientInterceptors;
      (newSafeFn as any)._clientErrorHandler = (safeFn as any)._clientErrorHandler;
      (newSafeFn as any)._defaultContext = (safeFn as any)._defaultContext;
      (newSafeFn as any)._inputSchema = (safeFn as any)._inputSchema;

      return newSafeFn;
    },

    use(middleware: Middleware<TContext, any, TMeta>): SafeFn<TContext, unknown, unknown, TMeta> {
      middlewares.push(middleware);
      return safeFn;
    },

    input<TNewInput>(schema: SchemaValidator<TNewInput>): SafeFn<TContext, TNewInput, unknown, TMeta> {
      inputValidator = createSchemaValidator(schema);
      // Store the original schema for tuple detection
      (safeFn as any)._inputSchema = schema;
      return safeFn as any; // Type assertion needed for the new input type
    },

    output<TNewOutput>(schema: SchemaValidator<TNewOutput>): SafeFn<TContext, unknown, TNewOutput, TMeta> {
      outputValidator = createSchemaValidator(schema);
      return safeFn as any; // Type assertion needed for the new output type
    },

    handler<THandlerInput = any, THandlerOutput = any>(handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>) {
      // Determine if we're dealing with a tuple input using Standard Schema spec
      const isTuple = (safeFn as any)._inputSchema ? isStandardTupleSchema((safeFn as any)._inputSchema) : false;

      // Merge with default context and any provided context
      const defaultContext = (safeFn as any)._defaultContext || {};
      const meta = ((safeFn as any)._currentMeta || currentMeta || {}) as TMeta;

      // Get meta validator from client if available
      metaValidator = (safeFn as any)._metaValidator;

      // Use client error handler if available, otherwise use default
      const clientErrorHandler = (safeFn as any)._clientErrorHandler;
      const errorHandlerFn = errorHandler || clientErrorHandler || createDefaultErrorHandler<TContext>();

      // Use client interceptors if available
      const clientInterceptors = (safeFn as any)._clientInterceptors || [];


      // Create the function implementation based on input type
      const finalFn = isTuple
        ? ((...args: any[]) => {
            const fullContext = { ...defaultContext } as TContext;

            return (async () => {
              try {
                // For tuple schemas, pass the args array directly to interceptors (raw input)

                const result = await executeInterceptorChain<THandlerOutput, TContext, TMeta>(
                  clientInterceptors,
                  args,
                  fullContext,
                  meta,
                  async (processedInput: unknown, processedContext: TContext) => {
                    // Validate the processed input from interceptors
                    const validatedInput = inputValidator ? inputValidator(processedInput) : processedInput;

                    // Execute middleware chain with validated input
                    return executeMiddlewareChain(
                      middlewares,
                      validatedInput as any,
                      processedContext,
                      meta,
                      async (finalInput: any) => {
                        return handler({ ctx: processedContext, args: finalInput } as any);
                      }
                    );
                  },
                );

                const validatedOutput = outputValidator ? outputValidator(result) : result;
                return validatedOutput as THandlerOutput;
              } catch (error) {
                const safeFnError = error instanceof Error ? error : new Error(String(error));
                errorHandlerFn(safeFnError, fullContext);
                throw safeFnError;
              }
            })();
          })
        : ((input: THandlerInput, context: Partial<TContext> = {}) => {
            const fullContext = { ...defaultContext, ...context } as TContext;

            return (async () => {
              try {
                // For object schemas, pass the input directly to interceptors (raw input)

                const result = await executeInterceptorChain<THandlerOutput, TContext, TMeta>(
                  clientInterceptors,
                  input,
                  fullContext,
                  meta,
                  async (processedInput: unknown, processedContext: TContext) => {
                    // Validate the processed input from interceptors
                    const validatedInput = inputValidator ? inputValidator(processedInput) : processedInput;

                    // Execute middleware chain with validated input
                    return executeMiddlewareChain(
                      middlewares,
                      validatedInput as any,
                      processedContext,
                      meta,
                      async (finalInput: any) => {
                        return handler({ ctx: processedContext, parsedInput: finalInput } as any);
                      }
                    );
                  },
                );

                const validatedOutput = outputValidator ? outputValidator(result) : result;
                return validatedOutput as THandlerOutput;
              } catch (error) {
                const safeFnError = error instanceof Error ? error : new Error(String(error));
                errorHandlerFn(safeFnError, fullContext);
                throw safeFnError;
              }
            })();
          });

      return finalFn as SafeFnSignature<THandlerInput, THandlerOutput, TContext>;
    },
  };

  return safeFn;
}
