# @safekit/safe-fn

⚠️ **EXPERIMENTAL ALPHA VERSION** ⚠️
This package is in active development and **not ready for production use**. Expect breaking changes between versions. Use at your own risk.

A lightweight type-safe function builder with interceptors, schema validation, and context management for TypeScript applications.

[![npm version](https://badge.fury.io/js/@safekit%2Fsafe-fn.svg)](https://badge.fury.io/js/@safekit%2Fsafe-fn)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔒 **Type-Safe**: Full TypeScript support with automatic type inference and structural typing
- 🔗 **Interceptors**: Chainable middleware for cross-cutting concerns
- ✅ **Zod Integration**: First-class support for Zod schemas with automatic type inference
- 🎨 **Context Management**: Type-safe context passing through procedure chains
- 🚀 **Lightweight**: Single runtime dependency (@standard-schema/spec)

## Installation

```bash
# npm
npm install @safekit/safe-fn

# yarn
yarn add @safekit/safe-fn

# bun
bun add @safekit/safe-fn
```

## 📚 Quick Navigation

**Quick Start Examples:**
- [Common Setup](#common-setup) - Basic client with error handling and interceptors
- [Single Object Pattern](#1-single-object-pattern) - API-style functions with object input
- [Multiple Arguments Pattern](#2-multiple-arguments-pattern) - Service functions with tuple arguments
- [Zero Arguments Pattern](#3-zero-arguments-pattern) - Functions with no input
- [Without Schema Validation](#4-without-schema-validation) - Type-safe functions without runtime validation

**Client Configuration:**
- [Basic Client](#1-basic-client) - Minimal setup
- [With Default Context](#2-with-default-context) - Adding default context values
- [With Error Handler](#3-with-error-handler) - Custom error handling
- [With Global Interceptors](#4-with-global-interceptors) - Pre-validation middleware
- [Full Configuration](#5-full-configuration) - Complete setup with typed context

**Advanced Features:**
- [Meta and Output Schema](#1-with-meta-and-output-schema) - Adding metadata and response validation
- [Function-Level Middleware](#2-with-function-level-middleware) - Post-validation, typed middleware
- [Tuple with Middleware](#3-tuple-with-middleware) - Middleware with tuple functions
- [Separate Interceptor Definitions](#with-separate-interceptor-definitions) - Reusable interceptor patterns

## Quick Start

SafeFn supports both **single object** patterns (for API-style functions) and **tuple** patterns (for service-layer functions with multiple arguments).

### Common Setup

```typescript
import { createSafeFnClient } from '@safekit/safe-fn';

export const safeFnClient = createSafeFnClient({
  defaultContext: { requestId: 'default' },
  errorHandler: (error, context) => {
    console.error(`[${context.requestId}] Error:`, error.message);
  },
}).use(async ({ next, rawInput, meta }) => {
  console.log(`[${meta.operation || 'unknown'}] Starting with input:`, rawInput);
  const result = await next();
  console.log(`[${meta.operation || 'unknown'}] Completed`);
  return result;
});
```

### 1. Single Object Pattern

```typescript
import { z } from 'zod';
import { safeFnClient } from './client';

export const getUser = safeFnClient
  .input(z.object({ id: z.string() }))
  .handler(async ({ parsedInput }) => {
    return { id: parsedInput.id, name: 'John' };
  });

// Usage: fn(input, context)
const user = await getUser({ id: '123' }, { userId: 'user-1' });
```

### 2. Multiple Arguments Pattern

```typescript
import { z } from 'zod';
import { safeFnClient } from './client';

export const addUser = safeFnClient
  .input(z.tuple([z.string(), z.number()])) // name, age
  .handler(async ({ args }) => {
    const [name, age] = args;
    return { id: '123', name, age };
  });

// Usage: fn(...args)
const user = await addUser('John', 25);
```

### 3. Zero Arguments Pattern

```typescript
import { z } from 'zod';
import { safeFnClient } from './client';

export const healthCheck = safeFnClient.handler(async () => ({ status: 'ok' }));

// Usage: fn()
const health = await healthCheck();
```

### 4. Without Schema Validation

```typescript
import { safeFnClient } from './client';

type Input = { a: number; b: number };

export const add = safeFnClient.handler<Input, number>(async ({ parsedInput }) => {
  return parsedInput.a + parsedInput.b;
});

// Usage
const result = await add({ a: 5, b: 3 });
```

## Client Setup Options

Different ways to configure your SafeFn client:

### 1. Basic Client

```typescript
import { createSafeFnClient } from '@safekit/safe-fn';

const safeFnClient = createSafeFnClient();
```

### 2. With Default Context

```typescript
const safeFnClient = createSafeFnClient({
  defaultContext: {
    requestId: 'default',
    version: '1.0.0'
  }
});
```

### 3. With Error Handler

```typescript
const safeFnClient = createSafeFnClient({
  errorHandler: (error, context) => {
    console.error(`Request ${context.requestId} failed:`, error.message);
    // Send to monitoring service
  }
});
```

### 4. With Global Interceptors

```typescript
const safeFnClient = createSafeFnClient()
  .use(async ({ next, rawInput, ctx, meta }) => {
    console.log(`[${meta.operation}] Input:`, rawInput);
    const result = await next();
    console.log(`[${meta.operation}] Output:`, result.output);
    return result;
  })
  .use(async ({ next, ctx, meta }) => {
    if (meta.requiresAuth && !ctx.userId) {
      throw new Error('Authentication required');
    }
    return next();
  });
```

### 5. Full Configuration

```typescript
interface AppContext extends Context {
  userId?: string;
  requestId: string;
  permissions: string[];
}

const safeFnClient = createSafeFnClient<AppContext>({
  defaultContext: {
    requestId: 'default',
    permissions: []
  },
  errorHandler: (error, context) => {
    console.error(`[${context.requestId}] ${context.userId}:`, error.message);
  }
})
  .use(async ({ next, ctx, meta }) => {
    if (meta.requiresAuth && !ctx.userId) {
      throw new Error('Authentication required');
    }
    return next();
  });
```

## API Showcase

Additional examples showing more API features:

### 1. With Meta and Output Schema

```typescript
import { z } from 'zod';
import { safeFnClient } from './client';

export const createUser = safeFnClient
  .meta({ operation: 'create-user', requiresAuth: true })
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .output(z.object({ id: z.string(), name: z.string(), email: z.string() }))
  .handler(async ({ parsedInput }) => {
    return {
      id: 'user_123',
      name: parsedInput.name,
      email: parsedInput.email
    };
  });
```

### 2. With Function-Level Middleware

```typescript
import { z } from 'zod';
import { safeFnClient } from './client';

export const updatePost = safeFnClient
  .meta({ operation: 'update-post', requiresAuth: true })
  .input(z.object({ postId: z.string(), title: z.string() }))
  .use(async ({ next, parsedInput, ctx, meta }) => {
    // Post-validation middleware - parsedInput is fully typed!
    const post = await db.post.findUnique({ where: { id: parsedInput.postId } });

    if (post?.authorId !== ctx.userId) {
      throw new Error('Forbidden: You do not own this post');
    }

    console.log(`${meta.operation}: User ${ctx.userId} updating post ${parsedInput.postId}`);
    return next(parsedInput);
  })
  .handler(async ({ parsedInput }) => {
    return await db.post.update({
      where: { id: parsedInput.postId },
      data: { title: parsedInput.title }
    });
  });
```

### 3. Tuple with Middleware

```typescript
import { z } from 'zod';
import { safeFnClient } from './client';

export const calculateTax = safeFnClient
  .meta({ operation: 'calculate-tax' })
  .input(z.tuple([z.number().positive(), z.string()])) // amount, region
  .use(async ({ next, parsedInput, meta }) => {
    const [amount, region] = parsedInput;
    console.log(`${meta.operation}: Calculating tax for $${amount} in ${region}`);
    return next(parsedInput);
  })
  .handler(async ({ args }) => {
    const [amount, region] = args;
    const rate = region === 'CA' ? 0.08 : 0.05;
    return { amount, region, tax: amount * rate, total: amount * (1 + rate) };
  });

// Usage: fn(amount, region)
const result = await calculateTax(100, 'CA');
```

## Advanced Examples

### With Separate Interceptor Definitions

Define interceptors separately for reusability and better organization:

```typescript
import type { Context, Interceptor } from '@safekit/safe-fn';
import { createSafeFnClient } from '@safekit/safe-fn';

interface AppContext extends Context {
  userId?: string;
}

// Define interceptors separately for reuse
const authInterceptor: Interceptor<AppContext> = async ({ next, ctx, meta }) => {
  if (meta.requiresAuth && !ctx.userId) {
    throw new Error('Authentication required');
  }
  return next();
};

const loggingInterceptor: Interceptor<AppContext> = async ({ next, rawInput, meta }) => {
  console.log(`[${meta.operation}] Starting with input:`, rawInput);
  const result = await next();
  console.log(`[${meta.operation}] Completed`);
  return result;
};

// Use the defined interceptors
export const safeFnClient = createSafeFnClient<AppContext>()
  .use(authInterceptor)
  .use(loggingInterceptor);
```

### Schema Support

Works with Zod schemas and custom validators:

```typescript
import { z } from 'zod';
import { safeFnClient } from './client';

// Zod - automatic type inference
const zodFn = safeFnClient
  .input(z.object({ name: z.string() }))
  .handler(async ({ parsedInput }) => parsedInput.name);

// Zod tuples for multiple arguments
const tupleFn = safeFnClient.input(z.tuple([z.string(), z.number()])).handler(async ({ args }) => {
  const [name, age] = args;
  return { name, age };
});

// Custom validator
const customFn = safeFnClient
  .input((input: unknown) => {
    if (typeof input !== 'string') throw new Error('Expected string');
    return input;
  })
  .handler(async ({ parsedInput }) => parsedInput.toUpperCase());
```

## Real-World Usage Patterns

```typescript
// Domain-specific clients
export const commandClient = createSafeFnClient({
  defaultContext: { operation: 'command' },
  // command-specific config
});

export const queryClient = createSafeFnClient({
  defaultContext: { operation: 'query', readOnly: true },
  // query-specific config
});

export const serviceClient = createSafeFnClient({
  defaultContext: { service: 'user-service' },
  // service-specific config
});
```

## API Reference

### createSafeFnClient(config?)

```typescript
const safeFnClient = createSafeFnClient({
  defaultContext: { requestId: 'default' },
  errorHandler: (error, context) => console.error(error),
});
```

### Methods

- `.use(interceptor)` - Add middleware
- `.input(schema)` - Set input validation
- `.output(schema)` - Set output validation
- `.handler(fn)` - Define the function

### Interceptor Type

```typescript
type Interceptor<TContext> = (params: {
  next: (modifiedInput?, modifiedContext?) => Promise<InterceptorOutput>;
  rawInput: unknown;
  ctx: TContext;
  meta: Meta;
}) => Promise<InterceptorOutput>;
```

## Schema Support

SafeFn provides first-class support for Zod schemas with automatic type inference:

| Schema Type         | Object Schemas  | Tuple Schemas (args signature) | Handler Parameter                            | TypeScript Support           |
| ------------------- | --------------- | ------------------------------ | -------------------------------------------- | ---------------------------- |
| **Zod**             | ✅ Full Support | ✅ Full Support                | `args` for tuples, `parsedInput` for objects | ✅ Automatic Type Inference  |
| **Custom Function** | ✅ Full Support | ❌ Not Supported               | `parsedInput` (always)                       | ✅ Manual Type Specification |

### Graceful Degradation Strategy

SafeFn follows a **conservative detection approach**: if we cannot be 100% certain that a schema represents a tuple, we gracefully fall back to the standard `parsedInput` signature to ensure safety and predictability.

**What this means:**

- **Zod tuples** (`z.tuple([...])`) are properly detected and use the `args` parameter
- **Custom validators** always use `parsedInput`, even for array types

**Why this approach:**

- **Safety**: No runtime surprises or unexpected behavior
- **Predictability**: Clear documentation of what to expect
- **Type Safety**: Zod provides excellent TypeScript integration with automatic inference
- **Simplicity**: Focus on one validation library reduces complexity and improves reliability

**Example:**

```typescript
// Zod tuple - uses args parameter ✅
const zodTupleFn = safeFnClient.input(z.tuple([z.string(), z.number()])).handler(async ({ args }) => {
  const [name, age] = args; // Type-safe tuple destructuring
  return { name, age };
});

// Custom validator - uses parsedInput ✅
const customArrayFn = safeFnClient
  .input((input: unknown) => {
    if (!Array.isArray(input)) throw new Error('Expected array');
    return input as string[];
  })
  .handler(async ({ parsedInput }) => {
    return { items: parsedInput }; // Regular array
  });
```

## What SafeFn Will NOT Have

SafeFn is intentionally designed as a lightweight wrapper around functions. The following features are explicitly **not included** to maintain simplicity:

- **Custom Error Classes**: Errors from your functions pass through unchanged - SafeFn doesn't wrap or transform them
- **Response Serialization**: SafeFn returns your function's output directly
- **Request/Response Objects**: Works with plain data - HTTP concerns are handled by your web framework
- **Plugin System**: Use interceptors instead
- **Built-in Logging**: Add logging through interceptors using your preferred logging library

**Philosophy**: SafeFn enhances your functions with type safety and middleware, but doesn't replace your existing tools and patterns.

## Inspiration

This package was inspired by:

- [next-safe-action](https://github.com/TheEdoRan/next-safe-action) - Type-safe Server Actions in Next.js
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [safekit](https://github.com/safekit-labs)
