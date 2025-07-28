// ========================================================================
// SIMPLIFIED MIDDLEWARE-ONLY SAFEFN IMPLEMENTATION
// ========================================================================

import type {
  Context,
  Metadata,
  MiddlewareFn,
  MiddlewareContext,
  NextFunction,
  SchemaValidator,
} from "./types";

import { 
  inputValidationMiddleware, 
  outputValidationMiddleware, 
  argsValidationMiddleware 
} from "./middleware/validation";

// ========================================================================
// CORE SAFEFN INTERFACE (SIMPLIFIED)
// ========================================================================

/**
 * Simplified SafeFn interface with input/output type safety and middleware composition
 */
export interface SafeFn<
  TContext extends Context = Context, 
  TMetadata extends Metadata = Metadata,
  TInput = unknown,
  TOutput = unknown
> {
  /**
   * Add middleware to the function chain
   */
  use(middleware: MiddlewareFn<TMetadata, TContext, any>): SafeFn<TContext, TMetadata, TInput, TOutput>;

  /**
   * Set metadata for this function
   */
  metadata(metadata: TMetadata): SafeFn<TContext, TMetadata, TInput, TOutput>;

  /**
   * Define context type and enable context capabilities
   */
  context<TNewContext extends Context>(schema?: SchemaValidator<TNewContext>): SafeFn<TNewContext, TMetadata, TInput, TOutput>;

  /**
   * API Alias: Add input validation middleware
   */
  input<TNewInput>(schema?: SchemaValidator<TNewInput>): SafeFn<TContext, TMetadata, TNewInput, TOutput>;

  /**
   * API Alias: Add output validation middleware
   */
  output<TNewOutput>(schema?: SchemaValidator<TNewOutput>): SafeFn<TContext, TMetadata, TInput, TNewOutput>;

  /**
   * API Alias: Add args validation middleware
   */
  args<TArgs extends readonly any[]>(...schemas: readonly SchemaValidator<TArgs[number]>[]): SafeFn<TContext, TMetadata, TArgs, TOutput>;

  /**
   * Define the handler function - this creates the executable function
   * Returns different signatures based on whether it's an args function or input function
   */
  handler(
    handlerFn: (context: MiddlewareContext<TContext, TMetadata>) => Promise<TOutput> | TOutput
  ): TInput extends readonly any[] 
    ? (...args: TInput) => Promise<TOutput>
    : (input?: TInput, context?: Partial<TContext>) => Promise<TOutput>;
}

// ========================================================================
// MIDDLEWARE EXECUTION ENGINE
// ========================================================================

/**
 * Execute middleware chain with simplified context-based approach
 */
async function executeMiddlewareChain<TContext extends Context, TMetadata extends Metadata>(
  middlewares: MiddlewareFn<TMetadata, TContext, any>[],
  context: MiddlewareContext<TContext, TMetadata>,
  handler: (context: MiddlewareContext<TContext, TMetadata>) => Promise<unknown> | unknown,
  errorHandler?: (errorContext: any) => void
): Promise<unknown> {
  let currentIndex = 0;

  const next: NextFunction<TContext> = async (modifiedContext?: any) => {
    const nextContext = modifiedContext || context;
    
    // If we've reached the end of middleware, call the handler
    if (currentIndex >= middlewares.length) {
      try {
        return await handler(nextContext);
      } catch (handlerError) {
        // Call error handler if provided
        if (errorHandler) {
          const errorContext = {
            error: handlerError,
            ctx: nextContext.ctx,
            metadata: nextContext.metadata || {},
            rawInput: nextContext.rawInput,
            rawArgs: nextContext.rawArgs,
            valid: (type: string) => {
              if (type === 'input') return nextContext.input || nextContext.validatedInput;
              if (type === 'args') return nextContext.args || nextContext.validatedArgs;
              return undefined;
            }
          };
          errorHandler(errorContext);
        }
        throw handlerError;
      }
    }

    // Get the next middleware and increment index
    const middleware = middlewares[currentIndex++];
    
    // Detect middleware pattern by checking function parameters
    // Legacy pattern: ({ next }) => ... (1 parameter) - next is part of context
    // New pattern: (context, next) => ... (2 parameters) - next is separate
    if (middleware.length === 1) {
      // Legacy pattern: next function is part of the context object
      const legacyNext = async (updates?: any) => {
        if (updates && updates.ctx) {
          // Merge context updates
          const updatedContext = {
            ...nextContext,
            ctx: { ...nextContext.ctx, ...updates.ctx }
          };
          return next(updatedContext);
        }
        // When no updates provided, pass through the current context
        return next(nextContext);
      };
      
      // Add next function to the context object itself
      const contextWithNext = {
        ...nextContext,
        next: legacyNext
      };
      
      return (middleware as any)(contextWithNext);
    } else {
      // New pattern: call with (context, next)
      return middleware(nextContext, next);
    }
  };

  // Start the middleware chain
  return next();
}

// ========================================================================
// SAFEFN IMPLEMENTATION
// ========================================================================

/**
 * Create a new SafeFn instance with simplified middleware-only architecture
 */
export function createSafeFn<
  TContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
  TInput = unknown,
  TOutput = unknown
>(): SafeFn<TContext, TMetadata, TInput, TOutput> {
  // Simple state - just middleware chain and metadata
  let middlewares: MiddlewareFn<TMetadata, TContext, any>[] = [];
  let currentMetadata: TMetadata | undefined;
  
  // Track validation state for runtime warnings
  let hasInputValidation = false;
  let hasArgsValidation = false;

  const safeFn: SafeFn<TContext, TMetadata, TInput, TOutput> = {
    use(middleware: MiddlewareFn<TMetadata, TContext, any>) {
      // Copy existing state - read from instance for proper chaining
      const existingMiddlewares = (this as any).middlewares || middlewares;
      const existingMetadata = (this as any).currentMetadata || currentMetadata;
      const existingInputValidation = (this as any).hasInputValidation || hasInputValidation;
      const existingArgsValidation = (this as any).hasArgsValidation || hasArgsValidation;
      const existingErrorHandler = (this as any)._errorHandler;
      
      const newSafeFn = createSafeFn<TContext, TMetadata, TInput, TOutput>();
      
      // Copy existing state and add new middleware
      const newMiddlewares = [...existingMiddlewares, middleware];
      (newSafeFn as any).middlewares = newMiddlewares;
      (newSafeFn as any).currentMetadata = existingMetadata;
      (newSafeFn as any).hasInputValidation = existingInputValidation;
      (newSafeFn as any).hasArgsValidation = existingArgsValidation;
      (newSafeFn as any)._errorHandler = existingErrorHandler;
      
      return newSafeFn;
    },

    metadata(metadata: TMetadata) {
      const newSafeFn = createSafeFn<TContext, TMetadata, TInput, TOutput>();
      
      // Copy existing state and set metadata - read from instance
      const existingMiddlewares = (this as any).middlewares || middlewares;
      const existingInputValidation = (this as any).hasInputValidation || hasInputValidation;
      const existingArgsValidation = (this as any).hasArgsValidation || hasArgsValidation;
      const existingErrorHandler = (this as any)._errorHandler;
      
      (newSafeFn as any).middlewares = [...existingMiddlewares];
      (newSafeFn as any).currentMetadata = metadata;
      (newSafeFn as any).hasInputValidation = existingInputValidation;
      (newSafeFn as any).hasArgsValidation = existingArgsValidation;
      (newSafeFn as any)._errorHandler = existingErrorHandler;
      
      return newSafeFn;
    },

    context<TNewContext extends Context>(schema?: SchemaValidator<TNewContext>) {
      const newSafeFn = createSafeFn<TNewContext, TMetadata, TInput, TOutput>();
      
      // Copy existing state - read from instance
      const existingMiddlewares = (this as any).middlewares || middlewares;
      const existingMetadata = (this as any).currentMetadata || currentMetadata;
      const existingInputValidation = (this as any).hasInputValidation || hasInputValidation;
      const existingArgsValidation = (this as any).hasArgsValidation || hasArgsValidation;
      const existingErrorHandler = (this as any)._errorHandler;
      
      (newSafeFn as any).middlewares = [...existingMiddlewares];
      (newSafeFn as any).currentMetadata = existingMetadata;
      (newSafeFn as any).hasInputValidation = existingInputValidation;
      (newSafeFn as any).hasArgsValidation = existingArgsValidation;
      (newSafeFn as any)._errorHandler = existingErrorHandler;
      
      // Note: Context validation could be added here if needed
      // For now, just change the context type, actual context is passed at runtime
      
      return newSafeFn;
    },

    input<TNewInput>(schema?: SchemaValidator<TNewInput>) {
      // Read state from instance - critical fix for middleware propagation
      const existingArgsValidation = (this as any).hasArgsValidation || hasArgsValidation;
      
      // Runtime warning for conflicting usage
      if (existingArgsValidation) {
        console.warn("Warning: Using .input() after .args() is not recommended. Choose one validation pattern.");
      }

      const newSafeFn = createSafeFn<TContext, TMetadata, TNewInput, TOutput>();
      
      // Add input validation middleware (even for type-only inputs to set context.input)
      const existingMiddlewares = (this as any).middlewares || middlewares;
      const existingMetadata = (this as any).currentMetadata || currentMetadata;
      const existingErrorHandler = (this as any)._errorHandler;
      const newMiddlewares = [...existingMiddlewares, inputValidationMiddleware(schema || null)];
      
      (newSafeFn as any).middlewares = newMiddlewares;
      (newSafeFn as any).currentMetadata = existingMetadata;
      (newSafeFn as any).hasInputValidation = true;
      (newSafeFn as any).hasArgsValidation = existingArgsValidation;
      (newSafeFn as any)._errorHandler = existingErrorHandler;
      
      return newSafeFn;
    },

    output<TNewOutput>(schema?: SchemaValidator<TNewOutput>) {
      const newSafeFn = createSafeFn<TContext, TMetadata, TInput, TNewOutput>();
      
      // Copy existing state - read from instance
      const existingMiddlewares = (this as any).middlewares || middlewares;
      const existingMetadata = (this as any).currentMetadata || currentMetadata;
      const existingInputValidation = (this as any).hasInputValidation || hasInputValidation;
      const existingArgsValidation = (this as any).hasArgsValidation || hasArgsValidation;
      const existingErrorHandler = (this as any)._errorHandler;
      
      // Add output validation middleware if schema provided
      const newMiddlewares = schema 
        ? [...existingMiddlewares, outputValidationMiddleware(schema)]
        : existingMiddlewares;
      
      (newSafeFn as any).middlewares = newMiddlewares;
      (newSafeFn as any).currentMetadata = existingMetadata;
      (newSafeFn as any).hasInputValidation = existingInputValidation;
      (newSafeFn as any).hasArgsValidation = existingArgsValidation;
      (newSafeFn as any)._errorHandler = existingErrorHandler;
      
      return newSafeFn;
    },

    args<TArgs extends readonly any[]>(...schemas: readonly SchemaValidator<TArgs[number]>[]) {
      // Read state from instance - critical fix for middleware propagation
      const existingInputValidation = (this as any).hasInputValidation || hasInputValidation;
      
      // Runtime warning for conflicting usage
      if (existingInputValidation) {
        console.warn("Warning: Using .args() after .input() is not recommended. Choose one validation pattern.");
      }

      const newSafeFn = createSafeFn<TContext, TMetadata, TArgs, TOutput>();
      
      // Copy existing state - read from instance
      const existingMiddlewares = (this as any).middlewares || middlewares;
      const existingMetadata = (this as any).currentMetadata || currentMetadata;
      const existingErrorHandler = (this as any)._errorHandler;
      
      // Add args validation middleware
      const newMiddlewares = [...existingMiddlewares, argsValidationMiddleware(schemas)];
      
      (newSafeFn as any).middlewares = newMiddlewares;
      (newSafeFn as any).currentMetadata = existingMetadata;
      (newSafeFn as any).hasInputValidation = existingInputValidation;
      (newSafeFn as any).hasArgsValidation = true;
      (newSafeFn as any)._errorHandler = existingErrorHandler;
      
      return newSafeFn;
    },

    handler(
      handlerFn: (context: MiddlewareContext<TContext, TMetadata>) => Promise<TOutput> | TOutput
    ) {
      // Read state from instance - critical fix for middleware propagation
      const instanceHasArgsValidation = (this as any).hasArgsValidation || hasArgsValidation;
      const instanceMetadata = (this as any).currentMetadata || currentMetadata;
      const instanceErrorHandler = (this as any)._errorHandler;
      
      // Check if this is an args function by looking for args validation middleware
      if (instanceHasArgsValidation) {
        // Return args function signature: (...args) => Promise<TOutput>
        return (async (...args: any[]): Promise<TOutput> => {
          // Prepare initial context for args function
          const initialContext: MiddlewareContext<TContext, TMetadata> = {
            rawInput: undefined, // No single input for args functions
            rawArgs: args, // Multiple arguments as array
            ctx: {} as TContext, // No context parameter for args functions
            metadata: instanceMetadata as TMetadata,
          };

          // Get middlewares from instance (they might have been updated)
          const instanceMiddlewares = (this as any).middlewares || middlewares;
          
          // Execute middleware chain + handler
          const result = await executeMiddlewareChain(
            instanceMiddlewares,
            initialContext,
            handlerFn,
            instanceErrorHandler
          );

          return result as TOutput;
        }) as any;
      } else {
        // Return input function signature: (input?, context?) => Promise<TOutput>
        return async (input?: TInput, context?: Partial<TContext>): Promise<TOutput> => {
          // Prepare initial context for input function
          const initialContext: MiddlewareContext<TContext, TMetadata> = {
            rawInput: input,
            rawArgs: undefined, // No args for input functions
            ctx: (context ? { ...context } : {}) as TContext, // Start with provided context or empty
            metadata: instanceMetadata as TMetadata,
          };

          // Get middlewares from instance (they might have been updated)
          const instanceMiddlewares = (this as any).middlewares || middlewares;
          
          // Execute middleware chain + handler
          const result = await executeMiddlewareChain(
            instanceMiddlewares,
            initialContext,
            handlerFn,
            instanceErrorHandler
          );

          return result as TOutput;
        };
      }
    },
  };

  // Store state in closure
  (safeFn as any).middlewares = middlewares;
  (safeFn as any).currentMetadata = currentMetadata;
  (safeFn as any).hasInputValidation = hasInputValidation;
  (safeFn as any).hasArgsValidation = hasArgsValidation;

  return safeFn;
}