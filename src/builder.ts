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
} from '@/types';

import { executeInterceptorChain } from '@/interceptor';

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
  }
  throw new Error('Invalid schema: must be a function, Standard Schema, or object with parse method');
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

    input<TNewInput>(schema: SchemaValidator<TNewInput>) {
      inputValidator = createSchemaValidator(schema);
      return builder as any; // Type assertion needed for the new input type
    },

    output<TNewOutput>(schema: SchemaValidator<TNewOutput>) {
      outputValidator = createSchemaValidator(schema);
      return builder as any; // Type assertion needed for the new output type
    },

    handler<THandlerInput = any, THandlerOutput = any>(handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>) {
      return async (input: THandlerInput, context?: Partial<TContext>) => {
        // Merge with default context if available
        const defaultContext = (builder as any)._defaultContext || {};
        const fullContext = { ...defaultContext, ...context } as TContext;
        const metadata = currentMetadata || {};

        // Use client error handler if available, otherwise use default
        const clientErrorHandler = (builder as any)._clientErrorHandler;
        const errorHandlerFn =
          errorHandler || clientErrorHandler || createDefaultErrorHandler<TContext>();

        // Use client interceptors if available
        const clientInterceptors = (builder as any)._clientInterceptors || [];
        const allInterceptors = [...clientInterceptors, ...interceptors];

        try {
          // Validate input if schema is provided
          const validatedInput = inputValidator ? inputValidator(input) : input;

          // Execute the function with interceptors
          const result = await executeInterceptorChain(
            allInterceptors,
            validatedInput,
            fullContext,
            metadata,
            async (processedInput: THandlerInput, processedContext: TContext) => {
              return handler({ ctx: processedContext, parsedInput: processedInput });
            },
          );

          // Validate output if schema is provided
          const validatedOutput = outputValidator ? outputValidator(result) : result;
          return validatedOutput as THandlerOutput;
        } catch (error) {
          const safeFnError = error instanceof Error ? error : new Error(String(error));
          errorHandlerFn(safeFnError, fullContext);
          throw safeFnError;
        }
      };
    },
  };

  return builder;
}
