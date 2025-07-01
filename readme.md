# @safekit/safe-fn

⚠️ **EXPERIMENTAL ALPHA VERSION** ⚠️
This package is in active development and **not ready for production use**. Expect breaking changes between versions. Use at your own risk.

A lightweight type-safe function builder with interceptors, schema validation, and context management for TypeScript applications.

[![npm version](https://badge.fury.io/js/@safekit%2Fsafe-fn.svg)](https://badge.fury.io/js/@safekit%2Fsafe-fn)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔒 **Type-Safe**: Full TypeScript support with automatic type inference and structural typing
- 🔗 **Middleware**: Chainable middleware for cross-cutting concerns
- ✅ **Multi-Library Support**: Works with Zod, Yup, Valibot, ArkType, Effect Schema, Superstruct, Scale Codec, Runtypes, and custom validators
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

Here's a complete example showing `safe-fn` in action with client setup, middleware, and various function patterns:

```typescript
import { z } from "zod";

import { createSafeFnClient } from "@safekit/safe-fn";

// 1. Create client
const safeFnClient = createSafeFnClient({
  defaultContext: { logger: console },
  metadataSchema: z.object({ traceId: z.string() }),
  onError: (error, ctx) => ctx.logger.error(`Error:`, error.message),
}).use(async ({ ctx, metadata, next }) => {
  // Logger middleware
  ctx.logger.info(metadata, `Attempting to ${metadata.operation}`);
  return next();
});

// 2. Define function
export const createUser = safeFnClient
  .metadata({ operation: "create_user" })
  .input(z.object({ username: z.string() }))
  .output(z.object({ id: z.string() }))
  .handler(async ({ ctx, parsedInput }) => {
    // Create user logic here
    return { id: "123" };
  });
```

## Client Configuration

Clients are created with `createSafeFnClient()` and support three main configuration options:

- `defaultContext` - default context for all functions
- `metadataSchema` - schema for metadata
- `onError` - error handler

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

- `.use(middleware)` - Add middleware
- `.input(schema)` - Set input validation
- `.output(schema)` - Set output validation
- `.metadata(data)` - Set metadata
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

| Library             | Status             | Notes                                      |
| ------------------- | ------------------ | ------------------------------------------ |
| **Zod v3**          | ✅ Full Support    | Most popular TypeScript validation library |
| **Zod v4**          | ✅ Full Support    | Latest Zod with improved performance       |
| **Yup**             | ✅ Full Support    | Popular form validation library            |
| **Valibot**         | ✅ Full Support    | Modern, fast, and lightweight              |
| **ArkType**         | ✅ Full Support    | TypeScript-first with excellent inference  |
| **Effect Schema**   | ✅ Full Support    | Part of the Effect ecosystem               |
| **Superstruct**     | ✅ Full Support    | Structural validation library              |
| **Runtypes**        | ✅ Full Support    | Runtime type checking                      |
| **Custom Function** | ✅ Partial Support | Objects only, no tuple support             |

For detailed examples of all supported validation libraries, see [examples/validation-libraries.ts](./examples/validation-libraries.ts).

## Keeping `safe-fn` Simple: What’s Not Included

`safe-fn` is purposefully kept lean and focused as a function wrapper. To preserve its simplicity and flexibility, it **does not** include the following features:

- **Custom Error Classes:** Errors thrown by your functions are passed through untouched—`safe-fn` won’t wrap or modify them.
- **Response Serialization:** The output from your function is returned as-is; `safe-fn` doesn’t alter or serialize responses.
- **Request/Response Objects:** `safe-fn` operates on plain data. Handling HTTP-specific concerns remains the responsibility of your web framework.
- **Built-in Logging:** Logging is left up to you—integrate your favorite logging solution via middleware if needed.

**Design Philosophy:**
`safe-fn` aims to add type safety and middleware support to your functions, while letting you keep full control over the rest of your stack. It’s designed to complement, not replace, your existing tools and workflows.

## Inspiration

This package was inspired by:

- [next-safe-action](https://github.com/TheEdoRan/next-safe-action) - Type-safe Server Actions in Next.js
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [safekit](https://github.com/safekit-labs)
