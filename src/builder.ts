// ========================================================================
// SAFEFN BUILDER FACTORY AND IMPLEMENTATION
// ========================================================================

import { createSafeFn } from "@/safe-fn";
import { createParseFn, type ParseFn } from "@/libs/parser";

import type {
  SafeFnBuilder,
  Context,
  Middleware,
  SafeFn,
  SchemaValidator,
  Metadata,
  Prettify,
} from "@/types";

// ========================================================================
// BUILDER CLASS IMPLEMENTATION
// ========================================================================

// ------------------ MAIN BUILDER CLASS ------------------

/**
 * Chainable builder that supports .use() for interceptors and creates SafeFn clients
 */
class SafeFnBuilderImpl<TBaseContext extends Context, TMetadata extends Metadata>
  implements SafeFnBuilder<TBaseContext, TMetadata>
{
  // Use readonly public properties instead of private to allow exports
  readonly defaultContext?: TBaseContext;
  readonly metadataValidator?: ParseFn<TMetadata>;
  readonly middlewares: Middleware<any, any, TMetadata>[];

  constructor(options?: {
    defaultContext?: TBaseContext;
    metadataValidator?: ParseFn<TMetadata>;
    middlewares?: Middleware<any, any, TMetadata>[];
  }) {
    this.defaultContext = options?.defaultContext;
    this.metadataValidator = options?.metadataValidator;
    this.middlewares = options?.middlewares || [];
  }

  use<TNextCtx extends Context>(
    middleware: Middleware<TBaseContext, TBaseContext & TNextCtx, TMetadata>,
  ): SafeFnBuilder<Prettify<TBaseContext & TNextCtx>, TMetadata> {
    // We create a NEW Builder whose generic is the NEW context type.
    // This is how the type information is preserved and chained.
    return new SafeFnBuilderImpl<Prettify<TBaseContext & TNextCtx>, TMetadata>({
      defaultContext: this.defaultContext as Prettify<TBaseContext & TNextCtx>,
      metadataValidator: this.metadataValidator,
      middlewares: [...this.middlewares, middleware],
    });
  }

  context<TNewBaseContext extends Context = TBaseContext>(
    defaultContext?: TNewBaseContext,
  ): SafeFnBuilder<TNewBaseContext, TMetadata> {
    return new SafeFnBuilderImpl<TNewBaseContext, TMetadata>({
      defaultContext,
      metadataValidator: this.metadataValidator,
      middlewares: this.middlewares,
    });
  }

  metadataSchema<TNewMetadata extends Metadata = TMetadata>(
    schema?: SchemaValidator<TNewMetadata>,
  ): SafeFnBuilder<TBaseContext, TNewMetadata> {
    const newMetadataValidator = schema ? createParseFn(schema) : undefined;
    return new SafeFnBuilderImpl<TBaseContext, TNewMetadata>({
      defaultContext: this.defaultContext,
      metadataValidator: newMetadataValidator,
      middlewares: this.middlewares as unknown as Middleware<any, any, TNewMetadata>[],
    });
  }

  create(): SafeFn<TBaseContext, Context, unknown, unknown, TMetadata> {
    return this.createConfiguredSafeFn();
  }

  // ------------------ PRIVATE METHODS ------------------

  private createConfiguredSafeFn(): SafeFn<TBaseContext, Context, unknown, unknown, TMetadata> {
    const safeFn = createSafeFn<TBaseContext, Context, TMetadata>();

    // Store the builder configuration for use in the SafeFn client
    (safeFn as any)._clientMiddlewares = this.middlewares;
    (safeFn as any)._defaultContext = this.defaultContext;
    (safeFn as any)._metadataValidator = this.metadataValidator;

    return safeFn;
  }
}

// ========================================================================
// FACTORY FUNCTIONS
// ========================================================================

// ------------------ BUILDER FACTORY ------------------

/**
 * Creates a new SafeFnBuilder instance with optional context and metadata types
 *
 * @deprecated Use `createSafeFnClient` instead for a simpler API that directly returns a configured SafeFn client
 */
export function createBuilder<
  TBaseContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
>(): SafeFnBuilder<TBaseContext, TMetadata> {
  return new SafeFnBuilderImpl<TBaseContext, TMetadata>();
}
