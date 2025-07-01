# @safekit/safe-fn

⚠️ **EXPERIMENTAL ALPHA VERSION** ⚠️
This package is in active development and **not ready for production use**. Expect breaking changes between versions.

A lightweight type-safe function builder with interceptors, schema validation, and context management for TypeScript applications.

[![npm version](https://badge.fury.io/js/@safekit%2Fsafe-fn.svg)](https://badge.fury.io/js/@safekit%2Fsafe-fn)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔒 **Type-Safe**: Full TypeScript support with automatic type inference and structural typing
- 🔗 **Middleware**: Chainable middleware for cross-cutting concerns
- ✅ **Multi-Library Support**: Works with Zod, Yup, Valibot, ArkType, Effect Schema, Superstruct, Runtypes, and custom validators
- 🎨 **Context Management**: Type-safe context passing through procedure chains
- 🚀 **Lightweight**: Zero runtime dependencies

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

Here's a simple example showing how to create a client and define a function:

```typescript
import { z } from "zod";

import { createSafeFnClient } from "@safekit/safe-fn";

// 1. Create client
const safeFnClient = createSafeFnClient();

// 2. Define function
export const createUser = safeFnClient
  .input(z.object({ username: z.string() }))
  .output(z.object({ id: z.string() }))
  .handler(async ({ ctx, parsedInput }) => {
    // ...
  });
```

## Client Configuration

Clients are created with `createSafeFnClient()` and support three main configuration options:

- `defaultContext` - default context for all functions
- `metadataSchema` - schema for metadata
- `onError` - error handler

```typescript
import { z } from "zod";

import { createSafeFnClient } from "@safekit/safe-fn";

// 1. Create client
const safeFnClient = createSafeFnClient({
  defaultContext: { logger: console },
  metadataSchema: z.object({ traceId: z.string() }),
  onError: (error, ctx) => ctx.logger.error(`Error:`, error.message),
});
```

## Middleware

Middleware functions run before your handler and can modify context, validate permissions, log requests, and more. Create specialized clients by chaining `.use()`:

```typescript
import { z } from "zod";
import { createSafeFnClient } from "@safekit/safe-fn";

// Base client with logging
const publicClient = createSafeFnClient({
  defaultContext: {
    logger: console,
    db: any,
  },
})
  .use(async ({ ctx, metadata, next }) => {
    // Context middleware
    const db = getDbConnection();
    return next({ ctx: { ...ctx, db } });
  })
  .use(async ({ ctx, metadata, next }) => {
    // Logger middleware
    ctx.logger.info(metadata, `Attempting to ${metadata.operation}`);
    return next();
  });

// Authenticated client
const authedClient = publicClient.use(async ({ ctx, metadata, next }) => {
  const sessionToken = getCookie("sessionToken");
  const { user, session } = await getUserAndSession(ctx, sessionToken);
  return next({ ctx: { ...ctx, user, session } });
});

// Usage examples
export const publicFunction = publicClient
  .input(z.object({ query: z.string() }))
  .handler(async ({ parsedInput }) => {
    // ...
  });

export const protectedFunction = authedClient
  .metadata({ requiresAuth: true })
  .input(z.object({ postId: z.string() }))
  .handler(async ({ parsedInput, ctx }) => {
    // ...
  });

// Function calls
const search = await publicFunction({ query: "hello" });

const post = await protectedFunction({ postId: "123" });
```

## Validation

`safe-fn` supports multiple popular validation libraries, giving you flexibility to use your preferred validation approach. All libraries support both object schemas and tuple schemas (multiple arguments):

```typescript
import { z } from "zod";

import { createSafeFnClient } from "@safekit/safe-fn";

const safeFnClient = createSafeFnClient();

// Object schemas - use `parsedInput` parameter
const zodObjectFn = safeFnClient
  .input(z.object({ name: z.string(), age: z.number() }))
  .handler(async ({ parsedInput }) => {
    const { name, age } = parsedInput;
    // ...
  });

// Tuple schemas - use `args` parameter
const zodTupleFn = safeFnClient
  .input([z.string(), z.number(), z.boolean()]) // name, age, active
  .handler(async ({ args }) => {
    const [name, age, active] = args;
    // ...
  });

// Usage examples
const greeting = await zodObjectFn({ name: "Alice", age: 30 });
const person = await zodTupleFn("Bob", 25, true);
```

## API Reference

### createSafeFnClient(config?)

```typescript
const safeFnClient = createSafeFnClient({
  defaultContext: { requestId: "default" },
  onError: (error, context) => console.error(error),
});
```

### Methods

- `.metadata(data)` - Set metadata
- `.use(middleware)` - Add middleware
- `.input(schema)` - Set input validation
- `.output(schema)` - Set output validation
- `.handler(fn)` - Define the function

### Middleware Type

```typescript
type Middleware<TContext> = (params: {
  next: (params?: { ctx?: TContext }) => Promise<MiddlewareOutput>;
  rawInput: unknown;
  parsedInput?: any;
  args?: any;
  ctx: TContext;
  metadata: Metadata;
}) => Promise<MiddlewareOutput>;
```

## Schema Support

`safe-fn` provides comprehensive support for multiple validation libraries with automatic type inference. All libraries support both object and tuple schemas, with full TypeScript integration.

### Supported Validation Libraries

- Zodv3
- Zodv4
- Yup
- Valibot
- ArkType
- Effect Schema
- Superstruct
- Runtypes

For detailed examples of all supported validation libraries, see [examples/validation-libraries.ts](./examples/validation-libraries.ts).

## What’s _Not_ Included in `safe-fn`

To keep things simple and flexible, `safe-fn` leaves out a few features by design:

- **Custom Error Classes:** Errors pass through just as your function throws them.
- **Response Serialization:** Outputs are returned directly, unmodified.
- **Logging:** Integrate your favorite logging solution via middleware if needed.

**Philosophy:**
`safe-fn` brings type safety and middleware support to your functions, while letting you stay in control of the rest of your stack. It’s here to complement, not replace, your existing setup.

## Inspiration

This package was inspired by:

- [next-safe-action](https://github.com/TheEdoRan/next-safe-action) - Type-safe Server Actions in Next.js
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [safekit](https://github.com/safekit-labs)
