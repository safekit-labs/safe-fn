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
const coreClient = createCoreClient();
```

### Context Pattern

```typescript
// Middleware with context
const authMiddleware = createMiddleware(async (ctx) => {
  // Return updated context for next middleware/handler
  return await ctx.next({
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
const setUserMiddleware = createMiddleware(async ({ ctx, next }) => {
  return next({
    userId: 'user123'
  });
});

const setRoleMiddleware = createMiddleware(async ({ ctx, next }) => {
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
