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

### Basic Usage

```typescript
import { createSafeFnClient, Context, Interceptor } from '@corporationx/safe-fn';
import { z } from 'zod';

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

const client = createSafeFnClient<AppContext>().use(loggingInterceptor);

const getUser = client
  .meta({ operation: 'get-user' })
  .input(z.object({ userId: z.string() }))
  .handler(async ({ parsedInput, ctx }) => {
    return { id: parsedInput.userId, name: 'John Doe' };
  });

const result = await getUser({ userId: '123' }, { requestId: 'req-001' });
```

### Simple Functions

```typescript
import { createSafeFnClient } from '@corporationx/safe-fn';
import { z } from 'zod';

// Simple client for basic use cases
const client = createSafeFnClient();

const addNumbers = client
  .meta({ operation: 'add-numbers' })
  .input(z.object({ a: z.number(), b: z.number() }))
  .handler(async ({ parsedInput }) => {
    return parsedInput.a + parsedInput.b;
  });

const result = await addNumbers({ a: 5, b: 3 }); // Returns: 8
```

## Safe Function Types

SafeFn provides a unified `.handler()` method that can handle any type of function. You can differentiate function types using metadata:

```typescript
const client = createSafeFnClient();

// State-modifying function
const createUser = client
  .meta({ operation: 'create-user', type: 'mutation' })
  .handler(async ({ parsedInput }) => { /* ... */ });

// Read-only function  
const getUser = client
  .meta({ operation: 'get-user', type: 'query' })
  .handler(async ({ parsedInput }) => { /* ... */ });

// General business logic
const processData = client
  .meta({ operation: 'process-data', type: 'service' })
  .handler(async ({ parsedInput }) => { /* ... */ });
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