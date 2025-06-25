/**
 * CQRS Client factory and implementation
 */
import { procedure } from '@/builder';

import type {
  Client,
  ClientConfig,
  Context,
  Interceptor,
  CommandHandler,
  QueryHandler,
  ServiceHandler
} from '@/types';

/**
 * Creates a chainable CQRS client builder with explicit context type
 */
export function createClient<TContext extends Context = Context>(
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
  ): ClientBuilder<TContext & TNewContext> {
    // Create a new client builder with the intersection type
    // Note: We use any for the interceptors array since TypeScript can't prove compatibility
    // but at runtime, the interceptors will work correctly with the intersection context
    return new ClientBuilder<TContext & TNewContext>(
      [...this.interceptors, interceptor] as any,
      this.errorHandler as any,
      this.defaultContext as any
    );
  }

  metadata(metadata: any) {
    return this.createConfiguredBuilder().metadata(metadata);
  }

  inputSchema(schema: any) {
    return this.createConfiguredBuilder().inputSchema(schema);
  }

  outputSchema(schema: any) {
    return this.createConfiguredBuilder().outputSchema(schema);
  }

  command<THandlerInput = unknown, THandlerOutput = unknown>(
    handler: CommandHandler<THandlerInput, THandlerOutput, TContext>
  ) {
    return this.createConfiguredBuilder().command<THandlerInput, THandlerOutput>(handler);
  }

  query<THandlerInput = unknown, THandlerOutput = unknown>(
    handler: QueryHandler<THandlerInput, THandlerOutput, TContext>
  ) {
    return this.createConfiguredBuilder().query<THandlerInput, THandlerOutput>(handler);
  }

  service<THandlerInput = unknown, THandlerOutput = unknown>(
    handler: ServiceHandler<THandlerInput, THandlerOutput, TContext>
  ) {
    return this.createConfiguredBuilder().service<THandlerInput, THandlerOutput>(handler);
  }

  private createConfiguredBuilder() {
    const builder = procedure<TContext>();
    
    // Store the client configuration for use in the builder
    (builder as any)._clientInterceptors = this.interceptors;
    (builder as any)._clientErrorHandler = this.errorHandler;
    (builder as any)._defaultContext = this.defaultContext;
    
    return builder;
  }
}