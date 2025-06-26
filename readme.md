# SafeFn

A type-safe function builder with interceptors, schema validation, and context management for TypeScript applications.

[![npm version](https://badge.fury.io/js/@corporationx%2Fsafe-fn.svg)](https://badge.fury.io/js/@corporationx%2Fsafe-fn)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔒 **Type-Safe**: Full TypeScript support with automatic type inference
- 🔗 **Interceptors**: Chainable middleware for cross-cutting concerns
- ✅ **Validation**: Built-in schema validation with Zod integration
- 🎨 **Context Management**: Type-safe context passing through procedure chains
- 🚀 **Zero Dependencies**: Lightweight with no runtime dependencies

## Installation

```bash
npm install @corporationx/safe-fn
```

## Quick Start

### Basic Safe Function

```typescript
import { createSafeFn } from '@corporationx/safe-fn';
import { z } from 'zod';

const addNumbers = createSafeFn()
  .metadata({ operation: 'add-numbers' })
  .inputSchema(z.object({ a: z.number(), b: z.number() }))
  .fn(async ({ parsedInput }) => {
    return parsedInput.a + parsedInput.b;
  });

const result = await addNumbers({ a: 5, b: 3 }); // Returns: 8
```

### Client with Interceptors

```typescript
import { createClient, Context, Interceptor } from '@corporationx/safe-fn';

interface AppContext extends Context {
  userId?: string;
  requestId: string;
}

const loggingInterceptor: Interceptor<AppContext> = async ({ next, metadata, ctx }) => {
  console.log(`Starting ${metadata.operation}`);
  const result = await next();
  console.log(`Completed ${metadata.operation}`);
  return result;
};

const client = createClient<AppContext>().use(loggingInterceptor);

const getUser = client
  .metadata({ operation: 'get-user' })
  .inputSchema(z.object({ userId: z.string() }))
  .fn(async ({ parsedInput, ctx }) => {
    return { id: parsedInput.userId, name: 'John Doe' };
  });
```

## Safe Function Types

SafeFn provides a unified `.fn()` method that can handle any type of function. You can differentiate function types using metadata:

```typescript
// State-modifying function
const createUser = createSafeFn()
  .metadata({ operation: 'create-user', type: 'mutation' })
  .fn(async ({ parsedInput }) => { /* ... */ });

// Read-only function  
const getUser = createSafeFn()
  .metadata({ operation: 'get-user', type: 'query' })
  .fn(async ({ parsedInput }) => { /* ... */ });

// General business logic
const processData = createSafeFn()
  .metadata({ operation: 'process-data', type: 'service' })
  .fn(async ({ parsedInput }) => { /* ... */ });
```

## Examples

See the [examples](./examples/) directory:

- [basic-usage.ts](./examples/basic-usage.ts) - Simple safe functions with validation
- [client-with-interceptors.ts](./examples/client-with-interceptors.ts) - Using clients and interceptors  
- [cqrs-patterns.ts](./examples/cqrs-patterns.ts) - Different function patterns
- [api-endpoint.ts](./examples/api-endpoint.ts) - REST API endpoint handlers

## Inspiration

This package was inspired by:
- [next-safe-action](https://github.com/TheEdoRan/next-safe-action) - Type-safe Server Actions in Next.js
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [CorporationX](https://github.com/corporationx)