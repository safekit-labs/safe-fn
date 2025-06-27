# SafeFn

A lightweight type-safe function builder with interceptors, schema validation, and context management for TypeScript applications.

[![npm version](https://badge.fury.io/js/@safekit%2Fsafe-fn.svg)](https://badge.fury.io/js/@safekit%2Fsafe-fn)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🔒 **Type-Safe**: Full TypeScript support with automatic type inference
- 🔗 **Interceptors**: Chainable middleware for cross-cutting concerns
- ✅ **Universal Validation**: Built-in support for Zod, Yup, Joi, and Standard Schema
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

### Simple Chained Client Setup

The most common usage pattern - create a client with interceptors:

```typescript
// lib/safe-fn.ts
import { createSafeFnClient } from '@safekit/safe-fn';

export const safeFnClient = createSafeFnClient()
  .use(async ({ next, metadata }) => {
    console.log(`Starting ${metadata.operation}`);
    const result = await next();
    console.log(`Completed ${metadata.operation}`);
    return result;
  })
  .use(async ({ next, ctx, metadata }) => {
    if (metadata.requiresAuth && !ctx.userId) {
      throw new Error('Authentication required');
    }
    return next();
  });
```

```typescript
// api/users.ts
import { z } from 'zod';
import { safeFnClient } from '../lib/safe-fn';

export const getUser = safeFnClient
  .meta({ operation: 'get-user', requiresAuth: true })
  .input(z.object({ id: z.string() }))
  .handler(async ({ parsedInput, ctx }) => {
    const { id } = parsedInput;
    // parsedInput is fully typed as { id: string }
    return { id, name: 'John Doe', email: 'john@example.com' };
  });

// Usage
const user = await getUser({ id: '123' }, { userId: 'current-user' });
```

### Without Schema Validation

For simple functions that don't need input validation:

```typescript
// services/calculator.ts
import { safeFnClient } from '../lib/safe-fn';

type AddInput = { a: number; b: number };
type AddOutput = number;

export const addNumbers = safeFnClient
  .meta({ operation: 'add-numbers' })
  .handler<AddInput, AddOutput>(async ({ parsedInput }) => {
    const { a, b } = parsedInput;
    return a + b;
  });

// Usage
const result = await addNumbers({ a: 5, b: 3 }); // Returns: 8
```

## Advanced Examples

### With Context Types

```typescript
// lib/safe-fn.ts
import type { Context, Interceptor } from '@safekit/safe-fn';

import { createSafeFnClient } from '@safekit/safe-fn';

interface AppContext extends Context {
  userId?: string;
  requestId: string;
  permissions: string[];
}

const authInterceptor: Interceptor<AppContext> = async ({ next, ctx, metadata }) => {
  if (metadata.requiresAuth && !ctx.userId) {
    throw new Error('Authentication required');
  }
  return next();
};

const auditInterceptor: Interceptor<AppContext> = async ({ next, metadata, ctx }) => {
  console.log(`[${ctx.requestId}] ${ctx.userId} -> ${metadata.operation}`);
  return next();
};

export const safeFnClient = createSafeFnClient<AppContext>()
  .use(authInterceptor)
  .use(auditInterceptor);
```

```typescript
// api/admin.ts
import { z } from 'zod';
import { safeFnClient } from '../lib/safe-fn';

export const deleteUser = safeFnClient
  .meta({ operation: 'delete-user', requiresAuth: true, level: 'admin' })
  .input(z.object({ userId: z.string().uuid() }))
  .output(z.object({ success: z.boolean(), deletedAt: z.date() }))
  .handler(async ({ parsedInput, ctx }) => {
    // Delete user logic here
    return { success: true, deletedAt: new Date() };
  });
```

### Universal Schema Support

SafeFn works with any schema validator that implements the Standard Schema spec:

#### Using Zod

```typescript
// services/user-validation.ts
import { z } from 'zod';
import { safeFnClient } from '../lib/safe-fn';

export const validateUser = safeFnClient
  .input(z.object({
    name: z.string().min(1),
    email: z.string().email()
  }))
  .handler(async ({ parsedInput }) => {
    return `User: ${parsedInput.name} (${parsedInput.email})`;
  });
```

#### Using Yup

```typescript
// services/product-validation.ts
import * as yup from 'yup';
import { safeFnClient } from '../lib/safe-fn';

const productSchema = yup.object({
  name: yup.string().required(),
  price: yup.number().positive().required()
});

export const validateProduct = safeFnClient
  .input(productSchema)
  .handler(async ({ parsedInput }) => {
    return { ...parsedInput, id: 'prod_123' };
  });
```

#### Using Joi

```typescript
// services/auth-validation.ts
import Joi from 'joi';
import { safeFnClient } from '../lib/safe-fn';

const loginSchema = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required(),
  password: Joi.string().min(6).required()
});

export const validateLogin = safeFnClient
  .input(loginSchema)
  .handler(async ({ parsedInput }) => {
    return { valid: true, user: parsedInput.username };
  });
```

#### Using Custom Validators

```typescript
// services/custom-validation.ts
import { safeFnClient } from '../lib/safe-fn';

// Simple function validator
const stringValidator = (input: unknown): string => {
  if (typeof input !== 'string') {
    throw new Error('Expected string');
  }
  return input;
};

// Complex object validator
const userValidator = (input: unknown): { id: string; active: boolean } => {
  if (!input || typeof input !== 'object') {
    throw new Error('Expected object');
  }
  const obj = input as any;
  if (typeof obj.id !== 'string' || typeof obj.active !== 'boolean') {
    throw new Error('Invalid user object');
  }
  return { id: obj.id, active: obj.active };
};

export const validateString = safeFnClient
  .input(stringValidator)
  .handler(async ({ parsedInput }) => parsedInput.toUpperCase());

export const validateUser = safeFnClient
  .input(userValidator)
  .handler(async ({ parsedInput }) => ({
    ...parsedInput,
    lastSeen: new Date()
  }));
```

### Different Function Types

Organize your functions by type using metadata:

```typescript
// services/user-service.ts
import { z } from 'zod';
import { safeFnClient } from '../lib/safe-fn';

// Commands (mutations)
export const createUser = safeFnClient
  .meta({ operation: 'create-user', type: 'mutation' })
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .handler(async ({ parsedInput }) => {
    // Create user in database
    return { id: 'user_123', ...parsedInput };
  });

// Queries (reads)
export const getUser = safeFnClient
  .meta({ operation: 'get-user', type: 'query' })
  .input(z.object({ id: z.string() }))
  .handler(async ({ parsedInput }) => {
    // Fetch user from database
    return { id: parsedInput.id, name: 'John', email: 'john@example.com' };
  });

// Services (business logic)
export const sendWelcomeEmail = safeFnClient
  .meta({ operation: 'send-welcome-email', type: 'service' })
  .input(z.object({ userId: z.string(), email: z.string().email() }))
  .handler(async ({ parsedInput }) => {
    // Send email via service
    return { sent: true, messageId: 'msg_123' };
  });
```

### API Endpoint Integration

Usage with REST API handlers:

```typescript
// api/endpoints.ts
import { z } from 'zod';
import { safeFnClient } from '../lib/safe-fn';

const apiClient = safeFnClient.use(async ({ next, ctx, metadata }) => {
  if (metadata.requiresAuth && !ctx.apiKey) {
    throw new Error('API key required');
  }
  return next();
});

export const createUserEndpoint = apiClient
  .meta({ method: 'POST', endpoint: '/api/users', requiresAuth: true })
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .handler(async ({ parsedInput, ctx }) => {
    return {
      id: 'user_123',
      ...parsedInput,
      createdAt: new Date()
    };
  });

// Usage in your API framework
export async function POST(request: Request) {
  const body = await request.json();
  const headers = Object.fromEntries(request.headers.entries());

  const context = {
    apiKey: headers['x-api-key'],
    requestId: crypto.randomUUID()
  };

  return await createUserEndpoint(body, context);
}
```

## API Reference

### createSafeFnClient(config?)

Creates a new SafeFn client.

```typescript
const safeFnClient = createSafeFnClient({
  defaultContext: { requestId: 'default' },
  errorHandler: (error, context) => console.error(error)
});
```

### Client Methods

- `.use(interceptor)` - Add an interceptor to the client
- `.meta(metadata)` - Add metadata to the function
- `.input(schema)` - Set input validation schema
- `.output(schema)` - Set output validation schema
- `.handler(fn)` - Define the function handler

### Interceptor

```typescript
type Interceptor<TContext> = (params: {
  next: (modifiedInput?, modifiedContext?) => Promise<InterceptorOutput>;
  clientInput: any;
  ctx: TContext;
  metadata: Metadata;
}) => Promise<InterceptorOutput>;
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