/**
 * Main procedure builder implementation
 */

import { executeInterceptorChain } from '@/interceptor';
import type {
  CommandHandler,
  Context,
  Interceptor,
  Metadata,
  ProcedureBuilder,
  QueryHandler,
  ServiceHandler,
  SchemaValidator,
} from '@/types';

/**
 * Creates a schema validator function that handles both direct schemas and validation functions
 */
function createSchemaValidator<T>(schema: SchemaValidator<T>): (input: unknown) => T {
  if (typeof schema === 'function') {
    return schema;
  } else if (schema && typeof schema.parse === 'function') {
    return (input: unknown) => schema.parse(input);
  }
  throw new Error('Invalid schema: must be a function or object with parse method');
}

/**
 * Creates a default error handler if none is provided
 */
function createDefaultErrorHandler<TContext extends Context>() {
  return (error: Error, context: TContext) => {
    console.error('CQRS Error:', error.message, { context });
  };
}

/**
 * Creates a new procedure builder
 */
export function procedure<TContext extends Context = Context>(): ProcedureBuilder<TContext, unknown, unknown> {
  let currentMetadata: Metadata | undefined;
  let inputValidator: ((input: unknown) => any) | undefined;
  let outputValidator: ((output: unknown) => any) | undefined;
  let interceptors: any[] = [];
  let errorHandler: ((error: Error, context: TContext) => void) | undefined;

  const builder: ProcedureBuilder<TContext, unknown, unknown> = {
    metadata(metadata: Metadata) {
      currentMetadata = metadata;
      return builder;
    },

    use(interceptor: Interceptor<TContext>) {
      interceptors.push(interceptor);
      return builder;
    },

    inputSchema<TNewInput>(schema: SchemaValidator<TNewInput>) {
      inputValidator = createSchemaValidator(schema);
      return builder as any; // Type assertion needed for the new input type
    },

    outputSchema<TNewOutput>(schema: SchemaValidator<TNewOutput>) {
      outputValidator = createSchemaValidator(schema);
      return builder as any; // Type assertion needed for the new output type
    },

    command<THandlerInput = unknown, THandlerOutput = unknown>(handler: CommandHandler<THandlerInput, THandlerOutput, TContext>) {
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

          // Execute the command with interceptors
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
          const cqrsError = error instanceof Error ? error : new Error(String(error));
          errorHandlerFn(cqrsError, fullContext);
          throw cqrsError;
        }
      };
    },

    query<THandlerInput = unknown, THandlerOutput = unknown>(handler: QueryHandler<THandlerInput, THandlerOutput, TContext>) {
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

          // Execute the query with interceptors
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
          const cqrsError = error instanceof Error ? error : new Error(String(error));
          errorHandlerFn(cqrsError, fullContext);
          throw cqrsError;
        }
      };
    },

    service<THandlerInput = unknown, THandlerOutput = unknown>(handler: ServiceHandler<THandlerInput, THandlerOutput, TContext>) {
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

          // Execute the service with interceptors
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
          const cqrsError = error instanceof Error ? error : new Error(String(error));
          errorHandlerFn(cqrsError, fullContext);
          throw cqrsError;
        }
      };
    },
  };

  return builder;
}
