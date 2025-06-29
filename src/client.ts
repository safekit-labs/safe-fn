/**
 * SafeFn Client factory and implementation
 */
import { createProcedure } from '@/procedure';

import type {
  Client,
  ClientConfig,
  Context,
  Interceptor,
  ProcedureHandler,
  Procedure,
  SchemaValidator,
  Meta,
} from '@/types';

export function createSafeFnClient<TContext extends Context = Context, TMeta extends Meta = Meta>(
  config?: ClientConfig<TContext, TMeta>,
): ClientImplementation<TContext, TMeta> {
  const defaultContext = config?.defaultContext || ({} as TContext);
  const errorHandler = config?.errorHandler;
  const metaSchema = config?.metaSchema;

  return new ClientImplementation<TContext, TMeta>([], errorHandler, defaultContext, metaSchema);
}

/**
 * Schema validator function that handles meta schema validation
 */
function createMetaValidator<T>(schema: SchemaValidator<T>): (meta: unknown) => T {
  if (typeof schema === 'function') {
    return schema;
  } else if (schema && typeof schema === 'object') {
    // Check for Standard Schema first
    if ('~standard' in schema && typeof schema['~standard'] === 'object') {
      const standardSchema = schema['~standard'];
      if (typeof standardSchema.validate === 'function') {
        return (meta: unknown) => {
          const result = standardSchema.validate(meta);
          if (result && typeof (result as any).then === 'function') {
            throw new Error('Async Standard Schema meta validation not supported yet');
          }
          if ((result as any).issues) {
            throw new Error(
              'Meta schema validation failed: ' + JSON.stringify((result as any).issues),
            );
          }
          return (result as any).value;
        };
      }
    }
    // Fallback to Zod-style .parse method
    if ('parse' in schema && typeof schema.parse === 'function') {
      return (meta: unknown) => schema.parse(meta);
    }
  }
  throw new Error(
    'Invalid meta schema: The provided schema is not a function and does not have a compatible .parse() method.',
  );
}

/**
 * Chainable client builder that supports .use() for interceptors
 */
class ClientImplementation<TContext extends Context, TMeta extends Meta>
  implements Client<TContext, TMeta>
{
  // Use readonly public properties instead of private to allow exports
  readonly interceptors: Interceptor<any, any, TMeta>[];
  readonly errorHandler?: (error: Error, context: any) => void;
  readonly defaultContext?: any;
  readonly metaValidator?: (meta: unknown) => TMeta;

  constructor(
    interceptors: Interceptor<any, any, TMeta>[] = [],
    errorHandler?: (error: Error, context: any) => void,
    defaultContext?: any,
    metaSchema?: SchemaValidator<TMeta>,
  ) {
    this.interceptors = interceptors;
    this.errorHandler = errorHandler;
    this.defaultContext = defaultContext;
    this.metaValidator = metaSchema ? createMetaValidator(metaSchema) : undefined;
  }

  use<TNewContext extends TContext>(
    interceptor: Interceptor<TContext, TNewContext, TMeta>,
  ): Client<TNewContext, TMeta> {
    // We create a NEW ClientBuilder whose generic is the NEW context type.
    // This is how the type information is preserved and chained.
    return new ClientImplementation<TNewContext, TMeta>(
      [...this.interceptors, interceptor],
      this.errorHandler,
      this.defaultContext,
      this.metaValidator
        ? ({
            parse: this.metaValidator,
          } as SchemaValidator<TMeta>)
        : undefined,
    );
  }

  meta<TNewMeta extends Meta>(meta: TNewMeta): Procedure<TContext, unknown, unknown, TNewMeta> {
    return this.createConfiguredProcedure<TNewMeta>().meta(meta);
  }

  input<TNewInput>(
    schema: SchemaValidator<TNewInput>,
  ): Procedure<TContext, TNewInput, unknown, TMeta> {
    return this.createConfiguredProcedure().input(schema);
  }

  output<TNewOutput>(
    schema: SchemaValidator<TNewOutput>,
  ): Procedure<TContext, unknown, TNewOutput, TMeta> {
    return this.createConfiguredProcedure().output(schema);
  }

  handler<THandlerInput = any, THandlerOutput = any>(
    handler: ProcedureHandler<THandlerInput, THandlerOutput, TContext>,
  ) {
    return this.createConfiguredProcedure().handler<THandlerInput, THandlerOutput>(handler);
  }

  createConfiguredProcedure<TProcedureMeta extends Meta = TMeta>() {
    const procedure = createProcedure<TContext, TProcedureMeta>();

    // Store the client configuration for use in the builder
    (procedure as any)._clientInterceptors = this.interceptors;
    (procedure as any)._clientErrorHandler = this.errorHandler;
    (procedure as any)._defaultContext = this.defaultContext;
    (procedure as any)._metaValidator = this.metaValidator;

    return procedure;
  }
}
