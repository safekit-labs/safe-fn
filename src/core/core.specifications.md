# SafeFn Core Specifications

## Overview

A minimal, middleware-focused core that handles execution flow through an onion-like middleware pattern. The core provides a simple foundation that can be extended with sugar wrappers for specific functionality.

## Core Principles

1. **Middleware-Only**: Everything is middleware - validation, error handling, metadata, etc.
2. **Onion Pattern**: Middleware executes in order, then unwraps in reverse order
3. **Context Sharing**: Middleware can modify and pass context that persists through the execution chain
4. **Async/Sync Support**: Handlers can be either async or synchronous functions
5. **Type Safety**: Full TypeScript support with generic inference

## API Design

### Core Client Creation

```typescript
import { createCoreClient } from '@/core';

// Basic core with no optional properties
const core = createCoreClient();
```

### Context Pattern

Following industry-standard destructured context pattern:

```typescript
// Middleware with context
const authMiddleware = createMiddleware<{
  ctx: {
    userId: string;
    role: 'admin' | 'user';
  }
}>(async ({ ctx, next }) => {
  // Return updated context for next middleware/handler
  return next({
    userId: 'user123',
    role: 'admin'
  });
});

// Handler accessing context and input
const handler = createHandler<{
  ctx: {
    userId: string;
    role: string;
  };
  input: { name: string };
  output: { greeting: string };
}>(async ({ input, ctx }) => {
  return {
    greeting: `Hello ${input.name}, you are ${ctx.role} with ID ${ctx.userId}`
  };
});
```

### Onion Middleware Execution

```typescript
const middleware1 = createMiddleware(async ({ ctx, next }) => {
  console.log('Middleware 1 - Before');
  const result = await next({});
  console.log('Middleware 1 - After');
  return result;
});

const middleware2 = createMiddleware(async ({ ctx, next }) => {
  console.log('Middleware 2 - Before');
  const result = await next({});
  console.log('Middleware 2 - After');
  return result;
});

// Method 1: Chain with individual .use() calls
const fn1 = core
  .use(middleware1)
  .use(middleware2)
  .handler(handler);

// Method 2: Chain with array
const fn2 = core
  .use([middleware1, middleware2])
  .handler(handler);

// Both methods have the same execution order:
// Middleware 1 - Before
// Middleware 2 - Before
// Handler
// Middleware 2 - After  
// Middleware 1 - After
```

### Context Inheritance and Type Merging

```typescript
const setUserMiddleware = createMiddleware<{
  ctx: { userId: string }
}>(async ({ ctx, next }) => {
  return next({
    userId: 'user123'
  });
});

const setRoleMiddleware = createMiddleware<{
  ctx: { role: string }
}>(async ({ ctx, next }) => {
  return next({
    role: 'admin'
  });
});

// Method 1: Individual chaining - types automatically merge
const fn1 = core
  .use(setUserMiddleware)    // ctx: { userId: string }
  .use(setRoleMiddleware)    // ctx: { userId: string, role: string }
  .handler(handler);         // Can access both userId and role

// Method 2: Array chaining - types automatically merge
const fn2 = core
  .use([setUserMiddleware, setRoleMiddleware])  // ctx: { userId: string, role: string }
  .handler(handler);                           // Can access both userId and role
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
interface CoreClient<TContext extends Record<string, any> = {}> {
  // Single middleware
  use<TNewContext extends Record<string, any>>(
    middleware: Middleware<TContext>
  ): CoreClient<TContext & TNewContext>;
  
  // Multiple middleware array
  use<TNewContext extends Record<string, any>>(
    middleware: Middleware<TContext>[]
  ): CoreClient<TContext & TNewContext>;
  
  handler<TInput, TOutput>(
    handler: Handler<TContext, TInput, TOutput>
  ): (input: TInput) => TOutput | Promise<TOutput>;
}
```

### `createMiddleware<TContext>()`

Creates typed middleware with context.

```typescript
function createMiddleware<TContext extends { ctx?: Record<string, any> }>(
  middleware: ({ ctx, next }: { ctx: TContext['ctx'], next: NextFunction }) => Promise<any>
): Middleware<TContext['ctx'], TContext['ctx']>
```

### `createHandler<TContext>()`

Creates typed handler with input/output requirements.

```typescript
function createHandler<TContext extends { 
  ctx?: Record<string, any>;
  input: any;
  output: any;
}>(
  handler: ({ ctx, input }: { ctx: TContext['ctx'], input: TContext['input'] }) => Promise<TContext['output']> | TContext['output']
): Handler<TContext['ctx'], TContext['input'], TContext['output']>
```

### Parameter Objects

The destructured parameter objects passed to middleware and handlers.

```typescript
// Middleware parameter object
interface MiddlewareParams<TContext = {}> {
  ctx: TContext;
  next: (contextUpdates?: Record<string, any>) => Promise<any>;
}

// Handler parameter object  
interface HandlerParams<TContext = {}, TInput = unknown> {
  ctx: TContext;
  input: TInput;
}
```

## Usage Examples

### Basic Example

```typescript
const core = createCoreClient();

// Async handler
const asyncHandler = createHandler<{
  ctx: {};
  input: { name: string };
  output: { message: string };
}>(async ({ input, ctx }) => {
  return { message: `Hello ${input.name}!` };
});

// Sync handler
const syncHandler = createHandler<{
  ctx: {};
  input: { name: string };
  output: { message: string };
}>(({ input, ctx }) => {
  return { message: `Hello ${input.name}!` };
});

// Async handlers return Promises, sync handlers return values directly
const asyncFn = core.handler(asyncHandler);
const syncFn = core.handler(syncHandler);

const asyncResult = await asyncFn({ name: 'World' }); // { message: 'Hello World!' }
const syncResult = syncFn({ name: 'World' });         // { message: 'Hello World!' }
```

### Complex Middleware Chain

```typescript
const authMiddleware = createMiddleware<{
  ctx: { userId: string; isAuthenticated: boolean }
}>(async ({ ctx, next }) => {
  // Authentication logic before
  console.log('Auth middleware - before');
  
  const result = await next({
    userId: 'user123',
    isAuthenticated: true
  });
  
  // Cleanup logic after
  console.log('Auth middleware cleanup');
  return result;
});

const loggingMiddleware = createMiddleware<{
  ctx: { requestId: string }
}>(async ({ ctx, next }) => {
  const requestId = `req-${Date.now()}`;
  console.log('Request started');
  
  const result = await next({
    requestId
  });
  
  console.log('Request completed');
  return result;
});

const handler = createHandler<{
  ctx: {
    userId: string;
    isAuthenticated: boolean;
    requestId: string;
  };
  input: { action: string };
  output: { result: string; userId: string };
}>(async ({ input, ctx }) => {
  if (!ctx.isAuthenticated) throw new Error('Unauthorized');
  
  return {
    result: `Executed ${input.action}`,
    userId: ctx.userId
  };
});

// Method 1: Individual chaining
const fn1 = core
  .use(authMiddleware)
  .use(loggingMiddleware)
  .handler(handler);

// Method 2: Array chaining  
const fn2 = core
  .use([authMiddleware, loggingMiddleware])
  .handler(handler);

const result = await fn1({ action: 'test' });
```

## Implementation Notes

1. **No Optional Configuration**: `createCoreClient()` takes no parameters
2. **Type Inference**: Variable types should be automatically inferred and merged
3. **Execution Order**: Middleware executes in registration order (onion pattern)
4. **Error Handling**: Errors bubble up through the middleware chain
5. **Context Flow**: Context modified in middleware flows to subsequent middleware and handlers
6. **Immutable Chains**: Each `.use()` call returns a new client instance
7. **Array Support**: `.use()` accepts both single middleware and arrays of middleware
8. **Array Execution**: Middleware in arrays execute in array order (same as individual chaining)
9. **Handler Flexibility**: Handlers can be async (returns Promise) or sync (returns value directly)

## Future Extensions

This core will be extended with sugar wrappers:
- Input/output validation middleware
- Error handling middleware  
- Metadata middleware
- Schema validation helpers
- Legacy compatibility layer

The goal is to keep the core minimal while providing a powerful foundation for building more complex functionality through middleware composition.