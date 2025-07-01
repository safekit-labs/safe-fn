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

## 📚 Quick Navigation

**Quick Start Examples:**

- [Common Setup](#common-setup)
- [Single Object Pattern](#1-single-object-pattern)
- [Multiple Arguments Pattern](#2-multiple-arguments-pattern)
- [Zero Arguments Pattern](#3-zero-arguments-pattern)
- [Without Schema Validation](#4-without-schema-validation)

**Client Configuration:**

- [Basic Client](#1-basic-client)
- [With Default Context](#2-with-default-context)
- [With Error Handler](#3-with-error-handler)
- [With Global Middleware](#4-with-global-middleware)
- [Full Configuration](#5-full-configuration)

**Advanced Features:**

- [Metadata and Output Schema](#1-with-metadata-and-output-schema)
- [Function-Level Middleware](#2-with-function-level-middleware)
- [Tuple with Middleware](#3-tuple-with-middleware)
- [Separate Middleware Definitions](#with-separate-middleware-definitions)

## Quick Start

Here's a complete example showing SafeFn in action with client setup, middleware, and various function patterns:

```typescript
import { z } from "zod";
import { createSafeFnClient } from "@safekit/safe-fn";

// 1. Create a SafeFn client with configuration
const safeFnClient = createSafeFnClient({
  defaultContext: {
    userId: undefined as string | undefined,
    requestId: "default",
  },
  onError: (error, context) => {
    console.error(`[${context.requestId}] Error:`, error.message);
  },
}).use(async ({ next, rawInput, metadata }) => {
  // Global middleware for logging
  console.log(`[${metadata?.operation || "unknown"}] Starting with input:`, rawInput);
  const result = await next();
  console.log(`[${metadata?.operation || "unknown"}] Completed`);
  return result;
});

// 2. Input validation schema
const userSchema = z.object({
  username: z.string().min(3).max(10),
  email: z.string().email(),
  age: z.number().min(18).max(100),
});

// 3. Create a safe function with validation and metadata
export const createUser = safeFnClient
  .metadata({ operation: "create-user", requiresAuth: true })
  .input(userSchema)
  .output(
    z.object({
      id: z.string(),
      username: z.string(),
      success: z.boolean(),
    }),
  )
  .handler(async ({ parsedInput, ctx }) => {
    // Simulate user creation logic
    if (parsedInput.username === "admin" && !ctx.userId) {
      throw new Error("Admin creation requires authentication");
    }

    // Your business logic here
    const newUser = {
      id: `user_${Date.now()}`,
      username: parsedInput.username,
      success: true,
    };

    return newUser;
  });

// 4. Multiple arguments pattern (service-style functions)
export const calculateTotal = safeFnClient
  .input([z.number().positive(), z.number().min(0), z.string()]) // price, tax, currency
  .handler(async ({ args }) => {
    const [price, tax, currency] = args;
    return {
      subtotal: price,
      tax: tax,
      total: price + tax,
      currency,
    };
  });

// 5. Zero arguments pattern
export const getServerTime = safeFnClient.input([]).handler(async () => ({
  timestamp: new Date().toISOString(),
  timezone: "UTC",
}));

// 6. Usage examples
async function examples() {
  // Object input with context
  const user = await createUser(
    { username: "johndoe", email: "john@example.com", age: 25 },
    { userId: "admin-123", requestId: "req-456" },
  );

  // Multiple arguments
  const total = await calculateTotal(100, 8.5, "USD");

  // Zero arguments
  const time = await getServerTime();

  return { user, total, time };
}
```

## Client Configuration

SafeFn clients are created with `createSafeFnClient()` and support three main configuration options:

```typescript
import { z } from "zod";
import { createSafeFnClient } from "@safekit/safe-fn";

const safeFnClient = createSafeFnClient({
  // Default context available in all functions
  defaultContext: {
    userId: undefined as string | undefined,
    requestId: "default",
    service: "api",
  },

  // Schema validation for metadata
  metadataSchema: z.object({
    operation: z.string(),
    requiresAuth: z.boolean().optional(),
  }),

  // Global error handler
  onError: (error, context) => {
    console.error(`[${context.requestId}] ${context.service}:`, error.message);
    // Send to monitoring service
  },
});
```

Each property is optional:

```typescript
// Minimal setup
const basicClient = createSafeFnClient();

// Just default context
const contextClient = createSafeFnClient({
  defaultContext: { env: "production" },
});

// Just error handling
const errorClient = createSafeFnClient({
  onError: (error, context) => console.error("Function failed:", error.message),
});
```

## Middleware

Middleware functions run before your handler and can modify context, validate permissions, log requests, and more. Create specialized clients by chaining `.use()`:

```typescript
import { z } from "zod";
import { createSafeFnClient } from "@safekit/safe-fn";

// Base client
const safeFnClient = createSafeFnClient({
  defaultContext: {
    userId: undefined as string | undefined,
    role: undefined as string | undefined,
  },
});

// Authenticated client with middleware
const authedSafeFnClient = safeFnClient
  .use(async ({ next, ctx, metadata }) => {
    // Authentication middleware
    if (metadata?.requiresAuth && !ctx.userId) {
      throw new Error("Authentication required");
    }
    return next();
  })
  .use(async ({ next, ctx, metadata }) => {
    // Authorization middleware
    if (metadata?.requiresAdmin && ctx.role !== "admin") {
      throw new Error("Admin access required");
    }
    return next();
  });

// Usage examples
export const publicFunction = safeFnClient
  .input(z.object({ query: z.string() }))
  .handler(async ({ parsedInput }) => {
    return { results: `Search: ${parsedInput.query}` };
  });

export const protectedFunction = authedSafeFnClient
  .metadata({ requiresAuth: true })
  .input(z.object({ postId: z.string() }))
  .handler(async ({ parsedInput, ctx }) => {
    return { message: `User ${ctx.userId} accessed post ${parsedInput.postId}` };
  });

export const adminFunction = authedSafeFnClient
  .metadata({ requiresAuth: true, requiresAdmin: true })
  .input(z.object({ action: z.string() }))
  .handler(async ({ parsedInput, ctx }) => {
    return { message: `Admin ${ctx.userId} performed: ${parsedInput.action}` };
  });

// Function calls
const search = await publicFunction({ query: "hello" });

const post = await protectedFunction({ postId: "123" }, { userId: "user-456", role: "user" });

const admin = await adminFunction(
  { action: "delete-user" },
  { userId: "admin-789", role: "admin" },
);
```

## Validation

SafeFn supports 10 popular validation libraries, giving you flexibility to use your preferred validation approach. All libraries support both object schemas and tuple schemas (multiple arguments):

```typescript
import { z } from "zod";
import * as yup from "yup";
import * as v from "valibot";
import { type } from "arktype";
import { createSafeFnClient } from "@safekit/safe-fn";

const safeFnClient = createSafeFnClient();

// Object schemas - use `parsedInput` parameter
const zodObjectFn = safeFnClient
  .input(z.object({ name: z.string(), age: z.number() }))
  .handler(async ({ parsedInput }) => {
    return `${parsedInput.name} is ${parsedInput.age} years old`;
  });

const yupObjectFn = safeFnClient
  .input(yup.object({ email: yup.string().email().required() }))
  .handler(async ({ parsedInput }) => parsedInput.email);

// Tuple schemas - use `args` parameter
const zodTupleFn = safeFnClient
  .input([z.string(), z.number(), z.boolean()]) // name, age, active
  .handler(async ({ args }) => {
    const [name, age, active] = args;
    return { name, age, active };
  });

const yupTupleFn = safeFnClient
  .input([yup.string().required(), yup.number().positive().required()])
  .handler(async ({ args }) => {
    const [product, price] = args;
    return { product, price, total: price * 1.1 };
  });

// Custom validators (objects only)
const customFn = safeFnClient
  .input((input: unknown) => {
    if (typeof input !== "object" || !input || !("message" in input)) {
      throw new Error("Expected object with message property");
    }
    return input as { message: string };
  })
  .handler(async ({ parsedInput }) => {
    return parsedInput.message.toUpperCase();
  });

// Output validation
const outputValidatedFn = safeFnClient
  .input(z.object({ value: z.number() }))
  .output(z.object({ result: z.number(), doubled: z.boolean() }))
  .handler(async ({ parsedInput }) => {
    const doubled = parsedInput.value * 2;
    return {
      result: doubled,
      doubled: doubled > parsedInput.value,
    };
  });

// Usage examples
const greeting = await zodObjectFn({ name: "Alice", age: 30 });
const email = await yupObjectFn({ email: "user@example.com" });
const person = await zodTupleFn("Bob", 25, true);
const product = await yupTupleFn("Widget", 19.99);
const message = await customFn({ message: "hello world" });
const calculation = await outputValidatedFn({ value: 21 });
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

SafeFn provides comprehensive support for multiple validation libraries with automatic type inference. All libraries support both object and tuple schemas, with full TypeScript integration.

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
| **Scale Codec**     | ✅ Full Support    | Codec-based validation                     |
| **Runtypes**        | ✅ Full Support    | Runtime type checking                      |
| **Custom Function** | ✅ Partial Support | Objects only, no tuple support             |

### Library-Specific Examples

#### Zod (v3 & v4)

```typescript
import { z } from "zod"; // or 'zod/v3', 'zod/v4'

const userFn = safeFnClient
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .handler(async ({ parsedInput }) => parsedInput);

const tupleFn = safeFnClient
  .input([z.string(), z.number().positive()])
  .handler(async ({ args }) => args);
```

#### Yup

```typescript
import * as yup from "yup";

const userFn = safeFnClient
  .input(yup.object({ name: yup.string().required(), age: yup.number().required() }))
  .handler(async ({ parsedInput }) => parsedInput);

const tupleFn = safeFnClient
  .input([yup.string().required(), yup.number().positive().required()])
  .handler(async ({ args }) => args);
```

#### Valibot

```typescript
import * as v from "valibot";

const userFn = safeFnClient
  .input(v.object({ name: v.string(), email: v.pipe(v.string(), v.email()) }))
  .handler(async ({ parsedInput }) => parsedInput);

const tupleFn = safeFnClient
  .input([v.string(), v.pipe(v.number(), v.minValue(0))])
  .handler(async ({ args }) => args);
```

#### ArkType

```typescript
import { type } from "arktype";

const userFn = safeFnClient
  .input(type({ name: "string", email: "string.email" }))
  .handler(async ({ parsedInput }) => parsedInput);

const tupleFn = safeFnClient
  .input([type("string"), type("number>0")])
  .handler(async ({ args }) => args);
```

#### Effect Schema

```typescript
import { Schema } from "effect";

const userFn = safeFnClient
  .input(
    Schema.standardSchemaV1(
      Schema.Struct({
        name: Schema.String,
        age: Schema.Number,
      }),
    ),
  )
  .handler(async ({ parsedInput }) => parsedInput);

const tupleFn = safeFnClient
  .input([Schema.standardSchemaV1(Schema.String), Schema.standardSchemaV1(Schema.Number)])
  .handler(async ({ args }) => args);
```

#### Superstruct

```typescript
import * as st from "superstruct";

const userFn = safeFnClient
  .input(st.object({ name: st.string(), age: st.number() }))
  .handler(async ({ parsedInput }) => parsedInput);

const tupleFn = safeFnClient.input([st.string(), st.number()]).handler(async ({ args }) => args);
```

#### Scale Codec

```typescript
import * as $ from "scale-codec";

const userFn = safeFnClient
  .input($.object($.field("name", $.str), $.field("age", $.i32)))
  .handler(async ({ parsedInput }) => parsedInput);

const tupleFn = safeFnClient.input([$.str, $.i32]).handler(async ({ args }) => args);
```

#### Runtypes

```typescript
import * as T from "runtypes";

const userFn = safeFnClient
  .input(T.Object({ name: T.String, age: T.Number }))
  .handler(async ({ parsedInput }) => parsedInput);

const tupleFn = safeFnClient.input([T.String, T.Number]).handler(async ({ args }) => args);
```

### Tuple Detection Strategy

SafeFn uses smart detection to determine when to provide the `args` parameter (for tuple functions) vs the `parsedInput` parameter (for object functions).

**Tuple Detection Rules:**

- **Arrays of schemas** (like `[z.string(), z.number()]`) are detected as tuples → use `args` parameter
- **Object schemas** (like `z.object({...})`) are detected as objects → use `parsedInput` parameter
- **Custom validators** always use `parsedInput`, even for array types → conservative approach

**All Libraries Support Tuples:**

Every supported validation library can use tuple syntax by passing an array of schemas:

```typescript
// All of these use the `args` parameter:
[z.string(), z.number()][(yup.string().required(), yup.number())][(v.string(), v.number())][ // Zod // Yup // Valibot
  (type("string"), type("number"))
][(st.string(), st.number())]; // ArkType // Superstruct
// ... and so on for all libraries
```

**Examples:**

```typescript
// Tuple detection - uses args parameter ✅
const tupleFn = safeFnClient.input([z.string(), z.number()]).handler(async ({ args }) => {
  const [name, age] = args; // Type-safe tuple destructuring
  return { name, age };
});

// Object detection - uses parsedInput ✅
const objectFn = safeFnClient
  .input(z.object({ name: z.string(), age: z.number() }))
  .handler(async ({ parsedInput }) => {
    return { name: parsedInput.name, age: parsedInput.age };
  });

// Custom validator - always uses parsedInput ✅
const customFn = safeFnClient
  .input((input: unknown) => {
    if (!Array.isArray(input)) throw new Error("Expected array");
    return input as string[];
  })
  .handler(async ({ parsedInput }) => {
    return { items: parsedInput }; // Regular array, not tuple
  });
```

## What SafeFn Will NOT Have

SafeFn is intentionally designed as a lightweight wrapper around functions. The following features are explicitly **not included** to maintain simplicity:

- **Custom Error Classes**: Errors from your functions pass through unchanged - SafeFn doesn't wrap or transform them
- **Response Serialization**: SafeFn returns your function's output directly
- **Request/Response Objects**: Works with plain data - HTTP concerns are handled by your web framework
- **Built-in Logging**: Add logging through middleware using your preferred logging library

**Philosophy**: SafeFn enhances your functions with type safety and middleware, but doesn't replace your existing tools and patterns.

## Inspiration

This package was inspired by:

- [next-safe-action](https://github.com/TheEdoRan/next-safe-action) - Type-safe Server Actions in Next.js
- [tRPC](https://trpc.io/) - End-to-end typesafe APIs

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

## License

MIT © [safekit](https://github.com/safekit-labs)
