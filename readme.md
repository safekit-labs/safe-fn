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
- ✅ **Universal Validation**: Clean support for Zod, Yup, Joi, and Standard Schema (no `as any` needed)
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

## Quick Start

SafeFn supports both **single object** patterns (for API-style functions) and **tuple** patterns (for service-layer functions with multiple arguments).

### Simple Setup

```typescript
import { createSafeFnClient } from '@safekit/safe-fn';

export const client = createSafeFnClient()
  .use(async ({ next, metadata, ctx }) => {
    if (metadata.requiresAuth && !ctx.userId) {
      throw new Error('Authentication required');
    }
    return next();
  });
```

### 1. Single Object Pattern

```typescript
import { z } from 'zod';
import { client } from './client';

export const getUser = client
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
import { client } from './client';

export const addUser = client
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
import { client } from './client';

export const healthCheck = client
  .input(z.tuple([]))
  .handler(async () => ({ status: 'ok' }));

// Usage: fn()
const health = await healthCheck();
```

### 4. Context Binding

```typescript
import { z } from 'zod';
import { client } from './client';

export const deleteUser = client
  .context({ adminId: 'admin-1' })
  .input(z.tuple([z.string()])) // userId
  .handler(async ({ args, ctx }) => {
    const [userId] = args;
    return { deleted: userId, by: ctx.adminId };
  });

// Usage: fn(userId)
const result = await deleteUser('user-123');
```

### 5. Without Schema Validation

```typescript
import { client } from './client';

type Input = { a: number; b: number };

export const add = client
  .handler<Input, number>(async ({ parsedInput }) => {
    return parsedInput.a + parsedInput.b;
  });

// Usage
const result = await add({ a: 5, b: 3 }, {});
```

## Advanced Examples

### With Context Types

```typescript
import type { Context, Interceptor } from '@safekit/safe-fn';
import { createSafeFnClient } from '@safekit/safe-fn';

interface AppContext extends Context {
  userId?: string;
}

const auth: Interceptor<AppContext> = async ({ next, ctx, metadata }) => {
  if (metadata.requiresAuth && !ctx.userId) {
    throw new Error('Authentication required');
  }
  return next();
};

export const client = createSafeFnClient<AppContext>().use(auth);
```

### Schema Support

Works with Zod, Yup, Joi, and custom validators:

```typescript
import { z } from 'zod';
import * as yup from 'yup';
import Joi from 'joi';
import { client } from './client';

// Zod - clean TypeScript support
const zodFn = client
  .input(z.object({ name: z.string() }))
  .handler(async ({ parsedInput }) => parsedInput.name);

// Yup - clean TypeScript support (no 'as any' needed!)
const yupSchema = yup.object({ age: yup.number().required() });
const yupFn = client
  .input(yupSchema)
  .handler(async ({ parsedInput }) => parsedInput.age);

// Joi - clean TypeScript support (no 'as any' needed!)
const joiSchema = Joi.object({ email: Joi.string().email() });
const joiFn = client
  .input(joiSchema)
  .handler(async ({ parsedInput }) => parsedInput.email);

// Custom validator
const customFn = client
  .input((input: unknown) => {
    if (typeof input !== 'string') throw new Error('Expected string');
    return input;
  })
  .handler(async ({ parsedInput }) => parsedInput.toUpperCase());
```

### API Integration

```typescript
import { z } from 'zod';
import { client } from './client';

const createUser = client
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .handler(async ({ parsedInput }) => ({
    id: 'user_123',
    ...parsedInput
  }));

// In your API handler
export async function POST(request: Request) {
  const body = await request.json();
  return await createUser(body, { requestId: crypto.randomUUID() });
}
```

## API Reference

### createSafeFnClient(config?)

```typescript
const client = createSafeFnClient({
  defaultContext: { requestId: 'default' },
  errorHandler: (error, context) => console.error(error)
});  
```

### Methods

- `.use(interceptor)` - Add middleware
- `.input(schema)` - Set input validation  
- `.output(schema)` - Set output validation
- `.context(data)` - Bind context for tuple functions
- `.handler(fn)` - Define the function

### Interceptor Type

```typescript
type Interceptor<TContext> = (params: {
  next: (modifiedInput?, modifiedContext?) => Promise<InterceptorOutput>;
  rawInput: any;
  ctx: TContext;
  metadata: Metadata;
}) => Promise<InterceptorOutput>;
```

## Validator Compatibility Matrix

SafeFn provides different levels of support depending on the validation library:

| Validator | Object Schemas | Tuple Schemas (args signature) | Handler Parameter | TypeScript Support |
|-----------|----------------|--------------------------------|-------------------|-------------------|
| **Zod** | ✅ Full Support | ✅ Full Support | `args` for tuples, `parsedInput` for objects | ✅ Excellent |
| **Yup** | ✅ Full Support | ⚠️ Limited (treated as array) | `parsedInput` (always) | ✅ Clean (no `as any` needed) |
| **Joi** | ✅ Full Support | ⚠️ Limited (treated as array) | `parsedInput` (always) | ✅ Clean (no `as any` needed) |
| **Custom Function** | ✅ Full Support | ❌ Not Supported | `parsedInput` (always) | ✅ Full Support |

### Graceful Degradation Strategy

SafeFn follows a **conservative detection approach**: if we cannot be 100% certain that a schema represents a tuple, we gracefully fall back to the standard `parsedInput` signature to ensure safety and predictability.

**What this means:**
- **Zod tuples** (`z.tuple([...])`) are properly detected and use the `args` parameter
- **Yup/Joi arrays** are treated as regular arrays and use `parsedInput`
- **Custom validators** always use `parsedInput`, even for array types

**Why this approach:**
- **Safety**: No runtime surprises or unexpected behavior
- **Predictability**: Clear documentation of what to expect
- **Universal compatibility**: All validators work reliably for object schemas
- **Clean TypeScript**: Uses structural typing - no `as any` assertions needed for any validator

**Example:**
```typescript
// Zod tuple - uses args parameter ✅
const zodTupleFn = client
  .input(z.tuple([z.string(), z.number()]))
  .handler(async ({ args }) => {
    const [name, age] = args; // Type-safe tuple destructuring
    return { name, age };
  });

// Yup array - uses parsedInput ✅  
const yupArrayFn = client
  .input(yup.array().of(yup.string()))
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