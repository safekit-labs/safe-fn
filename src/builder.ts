/**
 * Main safe function builder implementation
 */
import type {
  SafeFnHandler,
  Context,
  Interceptor,
  Metadata,
  SafeFnBuilder,
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
    // Fallback to legacy Zod-style .parse method
    if ('parse' in schema && typeof schema.parse === 'function') {
      return (input: unknown) => schema.parse(input);
    }

    // Support for Yup schemas (has both validate and validateSync)
    if ('validate' in schema && typeof schema.validate === 'function' && 
        'validateSync' in schema && typeof (schema as any).validateSync === 'function') {
      return (input: unknown) => {
        return (schema as any).validateSync(input);
      };
    }

    // Support for Joi schemas (has validate and describe methods)
    if ('validate' in schema && typeof schema.validate === 'function' && 
        'describe' in schema && typeof (schema as any).describe === 'function') {
      return (input: unknown) => {
        const result = schema.validate(input);
        if (result.error) {
          throw result.error;
        }
        return result.value;
      };
    }
  }
  throw new Error('Invalid schema: The provided schema is not a function and does not have a compatible .parse() or .validate() method.');
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
 * Creates a new safe function builder
 */
export function createSafeFn<TContext extends Context = Context>(): SafeFnBuilder<TContext, unknown, unknown> {
  let currentMetadata: Metadata | undefined;
  let inputValidator: ((input: unknown) => any) | undefined;
  let outputValidator: ((output: unknown) => any) | undefined;
  let interceptors: any[] = [];
  let errorHandler: ((error: Error, context: TContext) => void) | undefined;

  const builder: SafeFnBuilder<TContext, unknown, unknown> = {
    meta(metadata: Metadata) {
      currentMetadata = metadata;
      return builder;
    },

    use(interceptor: Interceptor<TContext>) {
      interceptors.push(interceptor);
      return builder;
    },

    context(context: Partial<TContext>) {
      (builder as any)._builderContext = context;
      return builder;
    },

    input<TNewInput>(schema: SchemaValidator<TNewInput>) {
      inputValidator = createSchemaValidator(schema);
      // Store the original schema for tuple detection
      (builder as any)._inputSchema = schema;
      return builder as any; // Type assertion needed for the new input type
    },

    output<TNewOutput>(schema: SchemaValidator<TNewOutput>) {
      outputValidator = createSchemaValidator(schema);
      return builder as any; // Type assertion needed for the new output type
    },

    handler<THandlerInput = any, THandlerOutput = any>(handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>) {
      // Determine if we're dealing with a tuple input using Standard Schema spec
      const isTuple = (builder as any)._inputSchema ? isStandardTupleSchema((builder as any)._inputSchema) : false;

      // Merge with default context, builder context, and any provided context
      const defaultContext = (builder as any)._defaultContext || {};
      const builderContext = (builder as any)._builderContext || {};
      const metadata = currentMetadata || {};

      // Use client error handler if available, otherwise use default
      const clientErrorHandler = (builder as any)._clientErrorHandler;
      const errorHandlerFn = errorHandler || clientErrorHandler || createDefaultErrorHandler<TContext>();

      // Use client interceptors if available
      const clientInterceptors = (builder as any)._clientInterceptors || [];
      const allInterceptors = [...clientInterceptors, ...interceptors];


      // Create the function implementation based on input type
      const finalFn = isTuple
        ? ((...args: any[]) => {
            const fullContext = { ...defaultContext, ...builderContext } as TContext;

            return (async () => {
              try {
                // For tuple schemas, pass the args array directly to be validated as a tuple
                const validatedInput = inputValidator ? inputValidator(args) : args;

                const result = await executeInterceptorChain(
                  allInterceptors,
                  validatedInput as THandlerInput,
                  fullContext,
                  metadata,
                  async (processedInput: THandlerInput, processedContext: TContext) => {
                    return handler({ ctx: processedContext, args: processedInput } as any);
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
            const fullContext = { ...defaultContext, ...builderContext, ...context } as TContext;

            return (async () => {
              try {
                const validatedInput = inputValidator ? inputValidator(input) : input;

                const result = await executeInterceptorChain(
                  allInterceptors,
                  validatedInput as THandlerInput,
                  fullContext,
                  metadata,
                  async (processedInput: THandlerInput, processedContext: TContext) => {
                    return handler({ ctx: processedContext, parsedInput: processedInput } as any);
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

  return builder;
}
