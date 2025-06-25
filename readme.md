# Procedure Builder

A type-safe procedure builder with interceptors, schema validation, and context management for TypeScript applications.

[![npm version](https://badge.fury.io/js/@corporationx%2Fprocedure-builder.svg)](https://badge.fury.io/js/@corporationx%2Fprocedure-builder)
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
npm install @corporationx/procedure-builder
```

## Quick Start

### Basic Procedure

```typescript
import { procedure } from '@corporationx/procedure-builder';
import { z } from 'zod';

const addNumbers = procedure()
  .metadata({ operation: 'add-numbers' })
  .inputSchema(z.object({ a: z.number(), b: z.number() }))
  .service(async ({ parsedInput }) => {
    return parsedInput.a + parsedInput.b;
  });

const result = await addNumbers({ a: 5, b: 3 }); // Returns: 8
```

### Client with Interceptors

```typescript
import { createClient, Context, Interceptor } from '@corporationx/procedure-builder';

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
  .query(async ({ parsedInput, ctx }) => {
    return { id: parsedInput.userId, name: 'John Doe' };
  });
```

## Procedure Types

- **`command()`** - For operations that modify state (CQRS commands)
- **`query()`** - For read-only operations (CQRS queries)  
- **`service()`** - For general business logic

## Examples

See the [examples](./examples/) directory:

- [basic-usage.ts](./examples/basic-usage.ts) - Simple procedures with validation
- [client-with-interceptors.ts](./examples/client-with-interceptors.ts) - Using clients and interceptors  
- [cqrs-patterns.ts](./examples/cqrs-patterns.ts) - Commands, queries, and services
- [api-endpoint.ts](./examples/api-endpoint.ts) - REST API endpoint handlers

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [CorporationX](https://github.com/corporationx)