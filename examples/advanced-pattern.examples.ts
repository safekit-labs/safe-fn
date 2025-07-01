/**
 * Advanced Features
 * Examples showing metadata, output schemas, and context chaining
 */
import { z } from "zod";
import { createSafeFnClient } from "@/factory";

// Create a SafeFn client with default context
const safeFnClient = createSafeFnClient({
  defaultContext: {
    requestId: "default",
    userId: undefined as string | undefined,
  },
});

// Create a SafeFn client with metadata schema for advanced examples
const advancedClient = createSafeFnClient({
  defaultContext: {
    requestId: "default",
    userId: undefined as string | undefined,
    role: undefined as string | undefined,
    permissions: undefined as string[] | undefined,
    timestamp: undefined as string | undefined,
  },
  metadataSchema: z.object({ operationName: z.string() }),
});

// 1. With Metadata
export const createUser = safeFnClient
  .metadata({ operation: "create-user", requiresAuth: true })
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .handler(async ({ parsedInput }) => {
    return { id: "user_123", name: parsedInput.name, email: parsedInput.email };
  });

// 2. With Output Schema
export const validateResponse = safeFnClient
  .input(z.object({ value: z.number() }))
  .output(z.object({ result: z.number(), isValid: z.boolean() }))
  .handler(async ({ parsedInput }) => {
    return { result: parsedInput.value * 2, isValid: true };
  });

// 3. With Function-Level Middleware
export const protectedAction = safeFnClient
  .input(z.object({ action: z.string() }))
  .use(async ({ ctx, next }) => {
    if (!ctx.userId) throw new Error("Unauthorized");
    return next({ ctx });
  })
  .handler(async ({ parsedInput }) => {
    return { message: `Executed: ${parsedInput.action}` };
  });

// 4. Context Chaining - Multiple .use() with Context Type Evolution
export const contextChainExample = advancedClient
  .input(z.object({ data: z.string() }))
  .use(async ({ ctx, metadata, next }) => {
    console.log(`Operation: ${metadata.operationName}`);
    return next({ ctx: { ...ctx, userId: "user-123", role: "admin" } });
  })
  .use(async ({ ctx, next }) => {
    // ctx should be typed with userId and role from previous middleware
    const permissions = ctx.role === "admin" ? ["read", "write", "delete"] : ["read"];
    return next({ ctx: { ...ctx, permissions } });
  })
  .use(async ({ ctx, next }) => {
    // ctx should be typed with userId, role, and permissions from previous middlewares
    const permissions = Array.isArray(ctx.permissions) ? ctx.permissions : [];
    console.log(`User ${ctx.userId} with permissions: ${permissions.join(", ")}`);
    return next({ ctx: { ...ctx, timestamp: new Date().toISOString() } });
  })
  .handler(async ({ parsedInput, ctx }) => {
    // ctx should have all properties: userId, role, permissions, timestamp
    return {
      data: parsedInput.data,
      processedBy: ctx.userId,
      role: ctx.role,
      permissions: ctx.permissions,
      processedAt: ctx.timestamp,
    };
  });

// 5. Context Building from Empty - Starting with no default context
// Note: TypeScript has limitations with complex context inference from inline middleware
// For now, this example shows the structure but may require type assertions
const emptyContextClient = createSafeFnClient({
  defaultContext: {} as Record<string, any>, // Start with flexible context
});

export const contextBuildingExample = emptyContextClient
  .input(z.object({ username: z.string() }))
  .use(async ({ ctx, parsedInput, next }) => {
    // First middleware - add authentication info
    console.log("Step 1: Adding authentication");
    return next({
      ctx: {
        ...ctx,
        userId: `user-${parsedInput?.username}`,
        isAuthenticated: true,
      },
    });
  })
  .use(async ({ ctx, next }) => {
    // Second middleware - add role based on userId (ctx now has userId)
    console.log("Step 2: Adding role for user:", ctx.userId);
    const role = ctx.userId.includes("admin") ? "admin" : "user";
    return next({
      ctx: {
        ...ctx,
        role,
        roleAssignedAt: new Date().toISOString(),
      },
    });
  })
  .use(async ({ ctx, next }) => {
    // Third middleware - add permissions based on role (ctx now has userId, role)
    console.log("Step 3: Adding permissions for role:", ctx.role);
    const permissions = ctx.role === "admin" ? ["read", "write", "delete", "admin"] : ["read"];
    return next({
      ctx: {
        ...ctx,
        permissions,
        permissionsGranted: true,
      },
    });
  })
  .use(async ({ ctx, next }) => {
    // Fourth middleware - add session info (ctx now has all previous properties)
    console.log("Step 4: Creating session for user:", ctx.userId);
    return next({
      ctx: {
        ...ctx,
        sessionId: `session-${Date.now()}`,
        sessionStarted: new Date().toISOString(),
        sessionExpires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      },
    });
  })
  .handler(async ({ parsedInput, ctx }) => {
    // Handler receives fully built context with all properties from middleware chain
    return {
      message: `Welcome ${parsedInput.username}!`,
      // Context should have all these properties typed correctly:
      userId: ctx.userId,
      role: ctx.role,
      permissions: ctx.permissions,
      isAuthenticated: ctx.isAuthenticated,
      sessionId: ctx.sessionId,
      sessionStarted: ctx.sessionStarted,
      sessionExpires: ctx.sessionExpires,
      roleAssignedAt: ctx.roleAssignedAt,
      permissionsGranted: ctx.permissionsGranted,
    };
  });

// Usage examples
// const user = await createUser({ name: 'John', email: 'john@example.com' });
// const validated = await validateResponse({ value: 42 });
// const action = await protectedAction({ action: 'deploy' }, { userId: 'user-1' });
// const chained = await contextChainExample({ data: 'test' });
// const built = await contextBuildingExample({ username: 'admin-alice' });
