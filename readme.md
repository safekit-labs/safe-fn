# @safekit/safe-fn

⚠️ **EXPERIMENTAL ALPHA VERSION** ⚠️
This package is an experimental package in active development and **not ready for production use**. Expect breaking changes between versions.

A lightweight type-safe function builder with interceptors, schema validation, and context management for TypeScript applications.

[![npm version](https://badge.fury.io/js/@safekit%2Fsafe-fn.svg)](https://badge.fury.io/js/@safekit%2Fsafe-fn)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔒 **Type-Safe**: Full TypeScript support with automatic type inference and structural typing
- 🔗 **Middleware**: Chainable middleware for cross-cutting concerns with proper context evolution
- ✅ **StandardSchema Support**: Works with StandardSchema V1 compatible validators including Zod, Valibot, ArkType, and Effect Schema
- 🎨 **Context Management**: Type-safe context passing and binding with `.context<T>()` and `.withContext()`
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

import { createClient } from "@safekit/safe-fn";

// 1. Create client
const client = createClient();

// 2. Define function
export const createUser = client
  .input(z.object({ username: z.string() }))
  .output(z.object({ id: z.string() }))
  .handler(async ({ ctx, input }) => {
    // ...
  });
```

## Client Configuration

Clients are created with `createClient()` and support two main configuration options:

- `metadataSchema` - schema for metadata
- `onError` - error handler

Context is provided through middleware for maximum flexibility:

```typescript
import { z } from "zod";

import { createClient } from "@safekit/safe-fn";

// 1. Create client with configuration
const client = createClient({
  metadataSchema: z.object({ traceId: z.string() }),
  onError: ({ error, ctx }) => {
    (ctx as any).logger?.error(`Error: ${error.message}`);
    // Return void to let error pass through
  },
})
// 2. Add context through middleware
.use(async ({ next }) => {
  return next({ ctx: { logger: console } });
});
```

## Middleware

Middleware functions run before your handler and can modify context, validate permissions, log requests, and more. Create specialized clients by chaining `.use()`:

```typescript
import { z } from "zod";
import { createClient } from "@safekit/safe-fn";

// Base client with logging
const publicClient = createClient()
  .use(async ({ next }) => {
    // Base context middleware
    return next({ ctx: { logger: console } });
  })
  .use(async ({ ctx, metadata, next }) => {
    // Database middleware
    const db = getDbConnection();
    return next({ ctx: { db } });
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
  .handler(async ({ input }) => {
    // ...
  });

export const protectedFunction = authedClient
  .metadata({ requiresAuth: true })
  .input(z.object({ postId: z.string() }))
  .handler(async ({ input, ctx }) => {
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

import { createClient } from "@safekit/safe-fn";

const client = createClient();

// Object schemas - use `input` parameter
const zodObjectFn = client
  .input(z.object({ name: z.string(), age: z.number() }))
  .handler(async ({ input }) => {
    const { name, age } = input;
    // ...
  });

// Tuple schemas - use `args` parameter
const zodTupleFn = client
  .args(z.string(), z.number(), z.boolean()) // name, age, active
  .handler(async ({ args }) => {
    const [name, age, active] = args;
    // ...
  });

// Usage examples
const greeting = await zodObjectFn({ name: "Alice", age: 30 });
const person = await zodTupleFn("Bob", 25, true);
```

## Error Handling

Safe-fn provides flexible error handling through the `onError` handler configured on the client. The error handler receives the same parameters as middleware functions: `{ error, ctx, metadata, rawInput, rawArgs, valid }`.

### Basic Error Handling

```typescript
const client = createClient({
  onError: ({ error, ctx, metadata, rawInput, valid }) => {
    // Log error with full context
    console.error(`[${(ctx as any).service}] Error for user ${(ctx as any).userId}:`, error.message);
    console.log("Metadata:", metadata);
    console.log("Raw input:", rawInput);

    // Access validated input if schema exists
    try {
      const validInput = valid("input");
      console.log("Validated:", validInput);
    } catch {
      // No schema available
    }

    // Return void to let error pass through (default behavior)
  },
})
.use(async ({ next }) => {
  // Provide context through middleware
  return next({ ctx: { userId: "user123", service: "api" } });
});
```

### Advanced Error Handling

The `onError` handler supports error recovery, transformation, and comprehensive logging:

```typescript
const client = createClient({
  onError: ({ error, ctx, metadata, rawInput, valid }) => {
    // Log error with full context
    console.error(`[${(ctx as any).service}] Error for user ${(ctx as any).userId}:`, error.message);

    // Access validated input if available
    try {
      const validInput = valid("input");
      console.log("Validated input:", validInput);
    } catch {
      console.log("Raw input:", rawInput);
    }

    // Error recovery for specific cases
    if (error.message.includes("recoverable")) {
      return {
        success: true,
        data: `Recovered: ${error.message}`,
      };
    }

    // Error transformation
    if (error.message.includes("payment")) {
      return new Error(`[PAYMENT_ERROR] ${error.message} (${metadata.operation || "unknown"})`);
    }

    // Let other errors pass through
  },
})
.use(async ({ next }) => {
  // Provide context through middleware
  return next({ ctx: { userId: "user123", service: "api" } });
});
```


### Return Types

The `onError` handler can return:

- `void` - Error passes through unchanged (default)
- `Error` - Replace with new error
- `{ success: true, data: any }` - Recover with data
- `{ success: false, error: Error }` - Replace with new error

See [examples/error.examples.ts](./examples/error.examples.ts) for a complete working example.

## API Reference

### createClient(config?)

Creates a new SafeFn client with optional configuration. See the Client Configuration section above for detailed examples.

### Client Methods

- `.metadata(data)` - Set metadata
- `.use(middleware)` - Add middleware
- `.context<T>()` - Set context type
- `.input(schema)` - Set input validation
- `.args(schema)` - Set tuple input validation
- `.output(schema)` - Set output validation
- `.handler(fn)` - Define the function

### Context API

The context API enables type-safe context binding at call-time. Define context types with `.context<T>()` and bind values with `.withContext()`:

```typescript
import { z } from "zod";
import { createClient } from "@safekit/safe-fn";

type AuthContext = {
  db: Database;
  logger: Console;
};
const ctx = { db: new Database(), logger: console };

// Enable context capabilities
const fn = createClient()
  .context<AuthContext>()
  .handler(async ({ ctx }) => {
    const user = await ctx.db.getUser("user-123");
    ctx.logger.log(user);
    return user;
  });

// Bind context at call-time
const result = await fn.withContext(ctx).execute();
```

Context works with middleware - middleware receives the working context (base + input context):

```typescript
const client = createClient()
  .context<AuthContext>()
  .use(async ({ ctx, next }) => {
    // ctx is properly typed as AuthContext
    ctx.logger.log("hi");
    return next();
  });
```

See [examples/context.example.ts](./examples/context.example.ts) for complete examples.

### Input Variants

`safe-fn` supports three ways to handle input:

- `<omitted>` - No input.
- `.input<T>()` - Typed input WITHOUT runtime validation.
- `.input(schema)` - Typed input WITH runtime validation.

```typescript
// No input - just call the function
client.handler(() => {});

// Type-only input - typed but no validation
client.input<{ name: string }>().handler(({ input }) => input.name);

// Validated input - schema validation + types
client.input(z.object({ name: z.string() })).handler(({ input }) => input.name);
```

### Output Variants

`safe-fn` supports three ways to handle output:

- `<omitted>` - No output.
- `.output(schema)` - Typed output WITH runtime validation.
- `.output<T>()` - Typed output WITHOUT runtime validation.

```typescript
// No output - just call the function
client.handler(() => {});

// Type-only output - typed but no validation
client.output<{ name: string }>().handler(() => ({ name: "John" }));
client.output<void>().handler(() => {}); // void output

// Validated output - schema validation + types
client.output(z.object({ name: z.string() })).handler(() => ({ name: "John" }));
client.output(z.void()).handler(() => {}); // void output
```

### Middleware Type

```typescript
type Middleware<TContext> = (params: {
  next: NextFunction<TContext>;
  rawInput: unknown;
  rawArgs: unknown;
  ctx: TContext;
  metadata: Metadata;
  valid(type: "input"): any; // Get validated input data
  valid(type: "args"): any; // Get validated args data
}) => Promise<MiddlewareOutput>;
```

#### Accessing Validated Data in Middleware

Middleware can access both raw and validated data:

```typescript
const middleware = createMiddleware(async ({ rawInput, rawArgs, valid, next }) => {
  // Raw data is always available
  console.log("Raw input:", rawInput);
  console.log("Raw args:", rawArgs);

  try {
    // Get validated data if schema exists
    const validInput = valid("input");
    console.log("✅ Validated input:", validInput);
  } catch (error) {
    // No input schema defined, use rawInput
    console.log("ℹ️ Using raw input data");
  }

  try {
    // Get validated args if schema exists
    const validArgs = valid("args");
    console.log("✅ Validated args:", validArgs);
  } catch (error) {
    // No args schema defined, use rawArgs
    console.log("ℹ️ Using raw args data");
  }

  return next();
});
```

### Creating Standalone Middleware

You can create reusable middleware functions with `createMiddleware`:

```typescript
import { createMiddleware } from "@safekit/safe-fn";

// Reusable middleware functions
const timingMiddleware = createMiddleware(async ({ next }) => {
  return next({ ctx: { requestTime: Date.now() } });
});

const loggingMiddleware = createMiddleware(async ({ rawInput, next }) => {
  console.log("🚀 Request started with:", rawInput);
  const result = await next();
  console.log("✅ Request completed");
  return result;
});

// Use with any client
const clientWithMiddleware = createClient().use(timingMiddleware).use(loggingMiddleware);
```

## Schema Support

`safe-fn` supports StandardSchema V1 compatible validation libraries with automatic type inference and perfect input/output type distinction. All supported libraries provide both object and tuple schemas with full TypeScript integration.

### Supported Validation Libraries

- **Zod v3/v4**: Native StandardSchema support
- **Valibot**: Native StandardSchema support
- **ArkType**: StandardSchema compatible
- **Effect Schema**: StandardSchema wrapper (`Schema.standardSchemaV1()`)

### Migration from Other Libraries

For libraries that don't natively support StandardSchema V1 (like Yup, Superstruct, Runtypes), you can:
1. Migrate to a supported library, or
2. Create StandardSchema V1 wrappers for your existing schemas

For detailed examples of supported validation libraries, see [examples/validation-libraries.ts](./examples/validation-libraries.ts).

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
