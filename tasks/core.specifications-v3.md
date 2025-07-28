# SafeFn Core Specifications v3

## Overview

A minimal, middleware-focused core that handles execution flow through lifecycle hooks (before, after, onError). The core provides a simple foundation that can be extended with sugar wrappers for specific functionality.

## Core Principles

1. **Lifecycle-Based**: Middleware uses `before`, `after`, and `onError` hooks for clean separation of concerns
2. **Context Merging**: Each hook can return data that gets automatically merged into the context
3. **Context Flow**: Context built by previous middleware is available to subsequent middleware
4. **Async/Sync Support**: Handlers can be either async or synchronous functions
5. **Type Safety**: Full TypeScript support with generic inference
6. **Flexible Hooks**: Middleware must define at least one of `before`, `after`, or `onError`

## API Design

### Core Client Creation

```typescript
import { createCoreClient } from '@/core';

// Basic core with no optional properties
const coreClient = createCoreClient();
```

### Middleware Pattern

```typescript
// Complete example showing all lifecycle hooks and context merging
const authMiddleware = (): MiddlewareLifecycle<{
  inputCtx: { input: string };
  outputCtx: { user: User; isAuthenticated: boolean };
  result: { greeting: string };
}> => ({
  before: async (ctx) => {
    const user = await getUser();
    return { user, isAuthenticated: true }; 
  },
  
  after: async (ctx, result) => {
    console.log(`Request completed for ${ctx.user.name}`);
    return { completedAt: Date.now() };
  },
  
  onError: async (ctx, error) => {
    // ctx.user might be undefined if before() failed (TRPC pattern)
    const userId = ctx.user?.id || 'unknown';
    console.error(`Error for user ${userId}:`, error);
    return { errorHandled: true };
  }
});

// Usage
const fn = createCoreClient()
  .use(authMiddleware())
  .handler(createHandler<{
    ctx: { user: User; isAuthenticated: boolean };
    input: { name: string };
    output: { greeting: string };
  }>(({ input, ctx }) => ({
    greeting: `Hello ${input.name}!`
  })));
```

### Execution Order

```typescript
// before hooks: middleware registration order
// after hooks: reverse order  
// onError hooks: reverse order

const fn = coreClient
  .use([middleware1(), middleware2()])  // Array or individual .use() calls
  .handler(handler);

// Execution: middleware1.before → middleware2.before → handler → middleware2.after → middleware1.after
```

### Context Merging

```typescript
// Context automatically merges through middleware chain
const fn = coreClient
  .use(middleware1())  // adds: { userId: string }
  .use(middleware2())  // adds: { role: string }, can access ctx.userId
  .handler(handler);   // receives: { userId: string, role: string }
```

## Core API Specification

### `createCoreClient()`

Creates a new core instance with no configuration.

```typescript
function createCoreClient(): CoreClient<{}>
```

### `CoreClient<TContext>`

The main client interface for building middleware chains.

```typescript
interface CoreClient<TContext extends Record<string, unknown> = {}> {
  // Single middleware
  use<TNewContext extends Record<string, unknown>>(
    middleware: MiddlewareLifecycle<{ inputCtx: TContext; outputCtx?: TNewContext }>
  ): CoreClient<TContext & TNewContext>;

  // Multiple middleware array
  use<TMiddlewares extends readonly MiddlewareLifecycle<{ inputCtx: TContext; outputCtx?: unknown }>[]>(
    middleware: TMiddlewares
  ): CoreClient<TContext & InferMiddlewareContexts<TMiddlewares>>;

  handler<TInput, TOutput>(
    handler: Handler<TContext, TInput, TOutput>
  ): (input: TInput) => TOutput | Promise<TOutput>;
}
```

### `createMiddleware<TContext>()`

Creates typed middleware with lifecycle hooks.

```typescript
function createMiddleware<TInputContext extends Record<string, unknown> = {}>(): {
  <TOutputContext extends Record<string, unknown> = {}, TResult = unknown>(
    lifecycle: MiddlewareLifecycle<{ 
      inputCtx: TInputContext; 
      outputCtx?: TOutputContext;
      result?: TResult;
    }>
  ): Middleware<TInputContext, TOutputContext>;
}
```

### `createHandler<TContext>()`

Creates typed handler with input/output requirements.

```typescript
function createHandler<TConfig extends {
  ctx?: Record<string, unknown>;
  input: unknown;
  output: unknown;
}>(
  handler: ({ ctx, input }: { ctx: TConfig['ctx'], input: TConfig['input'] }) => Promise<TConfig['output']> | TConfig['output']
): Handler<TConfig['ctx'], TConfig['input'], TConfig['output']>
```

### Middleware Lifecycle Hooks

The lifecycle object passed to middleware with automatic context merging.

```typescript
interface MiddlewareLifecycle<TConfig extends {
  inputCtx?: unknown;
  outputCtx?: unknown;
  result?: unknown;
} = { inputCtx: {}; outputCtx: {}; result: unknown }> {
  /**
   * Runs before the handler/next middleware
   * @param ctx - Current context built by previous middleware
   * @returns New context data to merge (optional)
   */
  before?: (ctx: TConfig['inputCtx']) => Promise<TConfig['outputCtx']> | TConfig['outputCtx'] | void;
  
  /**
   * Runs after the handler/next middleware completes successfully
   * @param ctx - Final context including handler additions
   * @param result - The result returned by the handler
   * @returns Additional context data to merge (optional)
   */
  after?: (ctx: TConfig['inputCtx'] & TConfig['outputCtx'], result: TConfig['result']) => Promise<Partial<TConfig['outputCtx']>> | Partial<TConfig['outputCtx']> | void;
  
  /**
   * Runs when an error occurs in the handler/next middleware
   * @param ctx - Input context (always available) plus partial output context (only if before() succeeded)
   * @param error - The error that occurred
   * @returns Context data to merge during error handling (optional)
   */
  onError?: (ctx: TConfig['inputCtx'] & Partial<TConfig['outputCtx']>, error: Error) => Promise<Partial<TConfig['outputCtx']>> | Partial<TConfig['outputCtx']> | void;
}
```

**Note**: At least one of `before`, `after`, or `onError` must be defined.


## Usage Examples

```typescript
// Basic usage
const fn = createCoreClient()
  .use(authMiddleware())
  .handler(createHandler<{
    ctx: { user: User };
    input: { name: string };
    output: { greeting: string };
  }>(({ input, ctx }) => ({
    greeting: `Hello ${input.name}!`
  })));

const result = await fn({ name: 'World' });
```

## Implementation Notes

1. **No Optional Configuration**: `createCoreClient()` takes no parameters
2. **Type Inference**: Context types should be automatically inferred and merged
3. **Execution Order**: `before` hooks execute in middleware registration order, `after` hooks in reverse order
4. **Error Handling**: `onError` hooks execute in reverse registration order when errors occur
5. **TRPC-Style Error Context**: `onError` follows TRPC's pattern of honest context typing - properties from `before()` may be undefined
6. **Context Flow**: Context modified in hooks flows to subsequent middleware and handlers
7. **Immutable Chains**: Each `.use()` call returns a new client instance
8. **Array Support**: `.use()` accepts both single middleware and arrays of middleware
9. **Array Execution**: Middleware in arrays execute in array order (same as individual chaining)
10. **Handler Flexibility**: Handlers can be async (returns Promise) or sync (returns value directly)
11. **Hook Requirements**: Middleware must define at least one of `before`, `after`, or `onError`
12. **Context Merging**: Any data returned from hooks is automatically merged into the context
13. **Hook Parameters**: `before` receives current context, `after` receives context + result, `onError` receives partial context (following TRPC pattern)
14. **Error Context Safety**: `onError` receives `TInputContext & Partial<TOutputContext>` - output context properties may be undefined if `before()` failed
15. **Return Flexibility**: Hooks can return undefined/null (no context changes), object (merge into context), or void

## Future Extensions

This core will be extended with sugar wrappers:
- Input/output validation middleware
- Error handling middleware
- Metadata middleware
- Schema validation helpers
- Legacy compatibility layer

The goal is to keep the core minimal while providing a powerful foundation for building more complex functionality through middleware composition.