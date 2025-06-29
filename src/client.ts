/**
 * SafeFn Client factory and implementation
 */
import type {
  Client,
  ClientConfig,
  Context,
  Interceptor,
  SafeFnHandler,
  SafeFnBuilder,
  SchemaValidator,
  Meta,
} from '@/types';


import { createSafeFn } from '@/builder';

/**
 * Creates a chainable SafeFn client builder with context inference from defaultContext
 */
export function createSafeFnClient<TContext extends Context = Context, TMeta extends Meta = Meta>(
  config?: ClientConfig<TContext, TMeta>
): ClientBuilder<TContext, TMeta> {
  const defaultContext = config?.defaultContext || ({} as TContext);
  const errorHandler = config?.errorHandler;
  const metaSchema = config?.metaSchema;

  return new ClientBuilder<TContext, TMeta>([], errorHandler, defaultContext, metaSchema);
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
            throw new Error('Meta schema validation failed: ' + JSON.stringify((result as any).issues));
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
  throw new Error('Invalid meta schema: The provided schema is not a function and does not have a compatible .parse() method.');
}

/**
 * Chainable client builder that supports .use() for interceptors
 */
class ClientBuilder<TContext extends Context = Context, TMeta extends Meta = Meta> implements Client<TContext, TMeta> {
  // Use readonly public properties instead of private to allow exports
  readonly interceptors: Interceptor<any, TMeta>[];
  readonly errorHandler?: (error: Error, context: any) => void;
  readonly defaultContext?: any;
  readonly metaValidator?: (meta: unknown) => TMeta;

  constructor(
    interceptors: Interceptor<any, TMeta>[] = [],
    errorHandler?: (error: Error, context: any) => void,
    defaultContext?: any,
    metaSchema?: SchemaValidator<TMeta>
  ) {
    this.interceptors = interceptors;
    this.errorHandler = errorHandler;
    this.defaultContext = defaultContext;
    this.metaValidator = metaSchema ? createMetaValidator(metaSchema) : undefined;
  }

  use(
    interceptor: Interceptor<TContext, TMeta>
  ): Client<Context, TMeta> {
    // For now, return Context - we'll improve this step by step
    return new ClientBuilder<Context, TMeta>(
      [...this.interceptors, interceptor],
      this.errorHandler,
      this.defaultContext,
      this.metaValidator ? {
        parse: this.metaValidator
      } as SchemaValidator<TMeta> : undefined
    );
  }

  meta<TNewMeta extends Meta>(meta: TNewMeta): SafeFnBuilder<TContext, unknown, unknown, TNewMeta> {
    return this.createConfiguredBuilder().meta(meta);
  }

  input<TNewInput>(schema: SchemaValidator<TNewInput>): SafeFnBuilder<TContext, TNewInput, unknown, TMeta> {
    return this.createConfiguredBuilder().input(schema);
  }

  output<TNewOutput>(schema: SchemaValidator<TNewOutput>): SafeFnBuilder<TContext, unknown, TNewOutput, TMeta> {
    return this.createConfiguredBuilder().output(schema);
  }

  handler<THandlerInput = any, THandlerOutput = any>(handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>) {
    return this.createConfiguredBuilder().handler<THandlerInput, THandlerOutput>(handler);
  }

  createConfiguredBuilder() {
    const builder = createSafeFn<TContext, TMeta>();
    
    // Store the client configuration for use in the builder
    (builder as any)._clientInterceptors = this.interceptors;
    (builder as any)._clientErrorHandler = this.errorHandler;
    (builder as any)._defaultContext = this.defaultContext;
    (builder as any)._metaValidator = this.metaValidator;
    
    return builder;
  }
}