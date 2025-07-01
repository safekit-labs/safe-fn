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
} from "@/types";

// ========================================================================
// BUILDER CLASS IMPLEMENTATION
// ========================================================================

// ------------------ MAIN BUILDER CLASS ------------------

/**
 * Chainable builder that supports .use() for interceptors and creates SafeFn clients
 */
class SafeFnBuilderImpl<TContext extends Context, TMetadata extends Metadata>
  implements SafeFnBuilder<TContext, TMetadata>
{
  // Use readonly public properties instead of private to allow exports
  readonly defaultContext?: TContext;
  readonly metadataParser?: ParseFn<TMetadata>;
  readonly middlewares: Middleware<any, any, TMetadata>[];

  constructor(options?: {
    defaultContext?: TContext;
    metadataParser?: ParseFn<TMetadata>;
    middlewares?: Middleware<any, any, TMetadata>[];
  }) {
    this.defaultContext = options?.defaultContext;
    this.metadataParser = options?.metadataParser;
    this.middlewares = options?.middlewares || [];
  }

  use<TNewContext extends TContext>(
    middleware: Middleware<TContext, TNewContext, TMetadata>,
  ): SafeFnBuilder<TNewContext, TMetadata> {
    // We create a NEW Builder whose generic is the NEW context type.
    // This is how the type information is preserved and chained.
    return new SafeFnBuilderImpl<TNewContext, TMetadata>({
      defaultContext: this.defaultContext as TNewContext,
      metadataParser: this.metadataParser,
      middlewares: [...this.middlewares, middleware],
    });
  }

  context<TNewContext extends Context = TContext>(
    defaultContext?: TNewContext,
  ): SafeFnBuilder<TNewContext, TMetadata> {
    return new SafeFnBuilderImpl<TNewContext, TMetadata>({
      defaultContext,
      metadataParser: this.metadataParser,
      middlewares: this.middlewares,
    });
  }

  metadataSchema<TNewMetadata extends Metadata = TMetadata>(
    schema?: SchemaValidator<TNewMetadata>,
  ): SafeFnBuilder<TContext, TNewMetadata> {
    const newMetadataParser = schema ? createParseFn(schema) : undefined;
    return new SafeFnBuilderImpl<TContext, TNewMetadata>({
      defaultContext: this.defaultContext,
      metadataParser: newMetadataParser,
      middlewares: this.middlewares as unknown as Middleware<any, any, TNewMetadata>[],
    });
  }

  create(): SafeFn<TContext, unknown, unknown, TMetadata> {
    return this.createConfiguredSafeFn();
  }

  // ------------------ PRIVATE METHODS ------------------

  private createConfiguredSafeFn(): SafeFn<TContext, unknown, unknown, TMetadata> {
    const safeFn = createSafeFn<TContext, TMetadata>();

    // Store the builder configuration for use in the SafeFn client
    (safeFn as any)._clientMiddlewares = this.middlewares;
    (safeFn as any)._defaultContext = this.defaultContext;
    (safeFn as any)._metadataParser = this.metadataParser;

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
  TContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
>(): SafeFnBuilder<TContext, TMetadata> {
  return new SafeFnBuilderImpl<TContext, TMetadata>();
}
