/**
 * SafeFn Client factory and implementation
 */
import type {
  Client,
  ClientConfig,
  Context,
  Interceptor,
  SafeFnHandler,
  SchemaValidator
} from '@/types';

import { createSafeFn } from '@/builder';

/**
 * Creates a chainable SafeFn client builder with explicit context type
 */
export function createSafeFnClient<TContext extends Context = Context>(
  config?: ClientConfig<TContext>
): ClientBuilder<TContext> {
  const defaultContext = config?.defaultContext || ({} as TContext);
  const errorHandler = config?.errorHandler;

  return new ClientBuilder<TContext>([], errorHandler, defaultContext);
}


/**
 * Chainable client builder that supports .use() for interceptors
 */
class ClientBuilder<TContext extends Context = Context> implements Client<TContext> {
  constructor(
    private interceptors: Interceptor<any>[] = [],
    private errorHandler?: (error: Error, context: any) => void,
    private defaultContext?: any
  ) {}

  use<TNewContext extends Context>(
    interceptor: Interceptor<TNewContext>
  ): Client<TContext & TNewContext> {
    // Create a new client builder with the intersection type
    // Note: We use any for the interceptors array since TypeScript can't prove compatibility
    // but at runtime, the interceptors will work correctly with the intersection context
    return new ClientBuilder<TContext & TNewContext>(
      [...this.interceptors, interceptor] as any,
      this.errorHandler as any,
      this.defaultContext as any
    );
  }

  meta(metadata: any) {
    return this.createConfiguredBuilder().meta(metadata);
  }

  context(context: any) {
    return this.createConfiguredBuilder().context(context);
  }

  input<TNewInput>(schema: SchemaValidator<TNewInput>) {
    return this.createConfiguredBuilder().input(schema);
  }

  output<TNewOutput>(schema: SchemaValidator<TNewOutput>) {
    return this.createConfiguredBuilder().output(schema);
  }

  handler<THandlerInput = any, THandlerOutput = any>(handler: SafeFnHandler<THandlerInput, THandlerOutput, TContext>) {
    return this.createConfiguredBuilder().handler<THandlerInput, THandlerOutput>(handler);
  }

  private createConfiguredBuilder() {
    const builder = createSafeFn<TContext>();
    
    // Store the client configuration for use in the builder
    (builder as any)._clientInterceptors = this.interceptors;
    (builder as any)._clientErrorHandler = this.errorHandler;
    (builder as any)._defaultContext = this.defaultContext;
    
    return builder;
  }
}