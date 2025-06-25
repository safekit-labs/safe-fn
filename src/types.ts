/**
 * Core types for the CQRS Builder library
 */

/**
 * Context object passed through the procedure execution chain
 */
export interface Context {
  [key: string]: unknown;
}

/**
 * Metadata that can be attached to procedures
 */
export interface Metadata {
  [key: string]: unknown;
}

/**
 * Configuration for the CQRS client
 */
export interface ClientConfig<TContext extends Context = Context> {
  defaultContext?: TContext;
  errorHandler?: (error: Error, context: TContext) => void | Promise<void>;
}

/**
 * Output from interceptor execution
 */
export interface InterceptorOutput<TOutput = unknown, TContext extends Context = Context> {
  output: TOutput;
  context: TContext;
}

/**
 * Represents the next function in an interceptor chain
 */
export type InterceptorNext<TContext extends Context> = (
  modifiedInput?: any,
  modifiedContext?: TContext
) => Promise<InterceptorOutput<any, TContext>>;

/**
 * Represents an interceptor function
 */
export type Interceptor<TContext extends Context = Context> = (params: {
  next: InterceptorNext<TContext>;
  clientInput: any;
  ctx: TContext;
  metadata: Metadata;
}) => Promise<InterceptorOutput<any, TContext>>;

/**
 * Handler input object for procedures
 */
export interface HandlerInput<TInput, TContext extends Context> {
  ctx: TContext;
  parsedInput: TInput;
}

/**
 * Command handler function type
 */
export type CommandHandler<TInput, TOutput, TContext extends Context> = (
  input: HandlerInput<TInput, TContext>
) => Promise<TOutput>;

/**
 * Query handler function type
 */
export type QueryHandler<TInput, TOutput, TContext extends Context> = (
  input: HandlerInput<TInput, TContext>
) => Promise<TOutput>;

/**
 * Service handler function type - for general business logic
 */
export type ServiceHandler<TInput, TOutput, TContext extends Context> = (
  input: HandlerInput<TInput, TContext>
) => Promise<TOutput>;

/**
 * Schema validation function type - can accept Zod schemas directly or validation functions
 */
export type SchemaValidator<T> = ((input: unknown) => T) | { parse: (input: unknown) => T };

/**
 * Procedure builder interface with type tracking
 */
export interface ProcedureBuilder<
  TContext extends Context = Context,
  TInput = unknown,
  TOutput = unknown
> {
  metadata(metadata: Metadata): ProcedureBuilder<TContext, TInput, TOutput>;
  use(interceptor: Interceptor<TContext>): ProcedureBuilder<TContext, TInput, TOutput>;
  inputSchema<TNewInput>(schema: SchemaValidator<TNewInput>): ProcedureBuilder<TContext, TNewInput, TOutput>;
  outputSchema<TNewOutput>(schema: SchemaValidator<TNewOutput>): ProcedureBuilder<TContext, TInput, TNewOutput>;
  command<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: CommandHandler<THandlerInput, THandlerOutput, TContext>
  ): (input: THandlerInput, context?: Partial<TContext>) => Promise<THandlerOutput>;
  query<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: QueryHandler<THandlerInput, THandlerOutput, TContext>
  ): (input: THandlerInput, context?: Partial<TContext>) => Promise<THandlerOutput>;
  service<THandlerInput = TInput, THandlerOutput = TOutput>(
    handler: ServiceHandler<THandlerInput, THandlerOutput, TContext>
  ): (input: THandlerInput, context?: Partial<TContext>) => Promise<THandlerOutput>;
}


/**
 * CQRS Client interface
 */
export interface Client<TContext extends Context = Context> extends ProcedureBuilder<TContext, unknown, unknown> {}


