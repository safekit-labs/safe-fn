// ========================================================================
// SAFEFN BUILDER FACTORY AND IMPLEMENTATION
// ========================================================================

import { createSafeFn } from '@/client/client';
import { createParseFn, type ParseFn } from '@/libs/parser';

import type { SafeBuilder, Context, Interceptor, SafeFn, SchemaValidator, Metadata } from '@/types';

// ========================================================================
// BUILDER CLASS IMPLEMENTATION
// ========================================================================

// ------------------ MAIN BUILDER CLASS ------------------

/**
 * Chainable builder that supports .use() for interceptors and creates SafeFn clients
 */
class SafeBuilderKlass<TContext extends Context, TMetadata extends Metadata>
  implements SafeBuilder<TContext, TMetadata>
{
  // Use readonly public properties instead of private to allow exports
  readonly defaultContext?: TContext;
  readonly metadataParser?: ParseFn<TMetadata>;
  readonly interceptors: Interceptor<any, any, TMetadata>[];

  constructor(options?: {
    defaultContext?: TContext;
    metadataParser?: ParseFn<TMetadata>;
    interceptors?: Interceptor<any, any, TMetadata>[];
  }) {
    this.defaultContext = options?.defaultContext;
    this.metadataParser = options?.metadataParser;
    this.interceptors = options?.interceptors || [];
  }

  use<TNewContext extends TContext>(
    interceptor: Interceptor<TContext, TNewContext, TMetadata>,
  ): SafeBuilder<TNewContext, TMetadata> {
    // We create a NEW Builder whose generic is the NEW context type.
    // This is how the type information is preserved and chained.
    return new SafeBuilderKlass<TNewContext, TMetadata>({
      defaultContext: this.defaultContext as TNewContext,
      metadataParser: this.metadataParser,
      interceptors: [...this.interceptors, interceptor],
    });
  }

  context<TNewContext extends Context = TContext>(
    defaultContext?: TNewContext,
  ): SafeBuilder<TNewContext, TMetadata> {
    return new SafeBuilderKlass<TNewContext, TMetadata>({
      defaultContext,
      metadataParser: this.metadataParser,
      interceptors: this.interceptors,
    });
  }

  metadataSchema<TNewMetadata extends Metadata = TMetadata>(
    schema?: SchemaValidator<TNewMetadata>,
  ): SafeBuilder<TContext, TNewMetadata> {
    const newMetadataParser = schema ? createParseFn(schema) : undefined;
    return new SafeBuilderKlass<TContext, TNewMetadata>({
      defaultContext: this.defaultContext,
      metadataParser: newMetadataParser,
      interceptors: this.interceptors as unknown as Interceptor<any, any, TNewMetadata>[],
    });
  }

  create(): SafeFn<TContext, unknown, unknown, TMetadata> {
    return this.createConfiguredSafeFn();
  }

  // ------------------ PRIVATE METHODS ------------------

  private createConfiguredSafeFn(): SafeFn<TContext, unknown, unknown, TMetadata> {
    const safeFn = createSafeFn<TContext, TMetadata>();

    // Store the builder configuration for use in the SafeFn client
    (safeFn as any)._clientInterceptors = this.interceptors;
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
 * Creates a new SafeBuilder instance with optional context and metadata types
 */
export function createSafeBuilder<
  TContext extends Context = Context,
  TMetadata extends Metadata = Metadata,
>(): SafeBuilder<TContext, TMetadata> {
  return new SafeBuilderKlass<TContext, TMetadata>();
}
