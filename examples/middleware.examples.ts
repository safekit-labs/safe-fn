/**
 * Middleware Examples
 * Demonstrates middleware context chaining and type safety features
 */
import { createSafeFnClient, createMiddleware } from "@/index";


// ========================================================================
// BASIC MIDDLEWARE CONTEXT CHAINING
// ========================================================================

/**
 * Example 1: Basic context chaining that matches next-safe-action behavior
 * Shows how context types evolve through middleware chain
 */
export const contextChainingExample = createSafeFnClient()
  .use(async ({ ctx, next }) => {
    // ctx is {} (empty object) initially
    console.log("Middleware 1 - Initial context:", { ctx });
    const sessionId = "session-123";
    return next({ ctx: { sessionId } });
  })
  .use(async ({ next, ctx }) => {
    // ctx now has { sessionId: string }
    const { sessionId } = ctx;
    console.log("Middleware 2 - Has sessionId:", { sessionId });
    const userId = "user-456";
    return next({ ctx: { userId } });
  })
  .use(async ({ ctx, next }) => {
    // ctx now has { sessionId: string; userId: string }
    console.log("Middleware 3 - Full context:", {
      userId: ctx.userId,
      sessionId: ctx.sessionId
    });
    return next();
  })
  .input<{ name: string }>()
  .handler(async ({ input, ctx }) => {
    // Handler receives fully typed context with both properties
    return {
      message: `Hello ${input.name}!`,
      user: ctx.userId,
      session: ctx.sessionId,
    };
  });

// ========================================================================
// AUTHENTICATION & AUTHORIZATION PATTERN
// ========================================================================

/**
 * Example 2: Authentication and authorization middleware pattern
 * Shows a common real-world use case for middleware chaining
 */
export const authenticationExample = createSafeFnClient()
  .use(async ({ next }) => {
    // Authentication middleware - verify token and add user info
    console.log("Authentication middleware");

    // In real app, you'd extract token from headers/input
    const token = "mock-jwt-token";
    const user = { id: "user-123", role: "admin", email: "admin@example.com" };

    return next({
      ctx: {
        user,
        token,
        isAuthenticated: true
      }
    });
  })
  .use(async ({ ctx, next }) => {
    // Authorization middleware - check permissions based on user role
    console.log("Authorization middleware");

    const { user } = ctx;
    const permissions = user.role === "admin"
      ? ["read", "write", "delete", "admin"]
      : ["read"];

    return next({
      ctx: {
        permissions,
        hasAdminAccess: user.role === "admin",
      }
    });
  })
  .use(async ({ ctx, next }) => {
    // Audit logging middleware
    console.log("Audit middleware");

    const auditLog = {
      userId: ctx.user.id,
      timestamp: new Date().toISOString(),
      permissions: ctx.permissions,
    };

    return next({ ctx: { auditLog } });
  })
  .input<{ resource: string; action: string }>()
  .handler(async ({ input, ctx }) => {
    // Handler has access to full authentication/authorization context
    const { user, permissions, hasAdminAccess, auditLog } = ctx;

    if (!permissions.includes(input.action)) {
      throw new Error(`Insufficient permissions for action: ${input.action}`);
    }

    return {
      success: true,
      message: `${user.email} performed ${input.action} on ${input.resource}`,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
      },
      permissions,
      hasAdminAccess,
      auditLog,
    };
  });

// ========================================================================
// PROGRESSIVE CONTEXT BUILDING
// ========================================================================

/**
 * Example 3: Progressive context building from empty state
 * Demonstrates building complex context step by step
 */
export const progressiveContextExample = createSafeFnClient()
  .use(async ({ next }) => {
    // Step 1: Add environment info
    console.log("Environment setup");

    return next({
      ctx: {
        environment: "development",
        timestamp: new Date().toISOString(),
        requestId: `req-${Math.random().toString(36).substr(2, 9)}`,
      }
    });
  })
  .use(async ({ ctx, next }) => {
    // Step 2: Add database connection info
    console.log("Database setup");

    const dbConfig = {
      host: "localhost",
      database: `app_${ctx.environment}`,
      pool: { min: 2, max: 10 },
    };

    return next({
      ctx: {
        database: dbConfig,
        isDbConnected: true,
      }
    });
  })
  .use(async ({ ctx, next }) => {
    // Step 3: Add caching layer
    console.log("Cache setup");

    const cacheConfig = {
      redis: { host: "localhost", port: 6379 },
      ttl: 3600,
      enabled: ctx.environment === "production",
    };

    return next({
      ctx: {
        cache: cacheConfig,
        cacheEnabled: cacheConfig.enabled,
      }
    });
  })
  .input<{ query: string }>()
  .handler(async ({ input, ctx }) => {
    // Handler receives fully built application context
    return {
      query: input.query,
      processedAt: ctx.timestamp,
      requestId: ctx.requestId,
      environment: ctx.environment,
      database: ctx.database.database,
      cacheEnabled: ctx.cacheEnabled,
      response: `Processed query "${input.query}" successfully`,
    };
  });

// ========================================================================
// TYPE SAFETY DEMONSTRATION
// ========================================================================

/**
 * Example 4: Type safety verification
 * Shows that context types are properly inferred and validated
 */
export const typeSafetyExample = createSafeFnClient()
  .use(async ({ ctx, next }) => {
    // ctx is {} initially - can assign to empty object type
    const emptyCheck: object = ctx;
    console.log("Empty context check:", emptyCheck);

    return next({ ctx: { step1: "first-value" } });
  })
  .use(async ({ ctx, next }) => {
    // ctx is { step1: string } - TypeScript enforces this
    const step1Value: string = ctx.step1; // Type-safe access

    return next({ ctx: { step2: step1Value.toUpperCase() } });
  })
  .use(async ({ ctx, next }) => {
    // ctx is { step1: string; step2: string } - clean object type, not intersection
    const verification: { step1: string; step2: string } = ctx; //  Assignable

    return next({ ctx: { step3: verification.step1 + verification.step2 } });
  })
  .handler(async ({ ctx }) => {
    // Final context has all properties with proper types
    return {
      step1: ctx.step1,  // string
      step2: ctx.step2,  // string
      step3: ctx.step3,  // string
      allSteps: [ctx.step1, ctx.step2, ctx.step3],
    };
  });

// ========================================================================
// MIDDLEWARE WITHOUT CONTEXT MODIFICATION
// ========================================================================


/**
 * Example 5: Middleware that doesn't modify context
 * Shows that middleware can be used for side effects without changing context
 */
export const sideEffectMiddlewareExample = createSafeFnClient({
  defaultContext: { service: "example-api" },
})
  .use(async ({ next }) => {
    // Add some initial context
    return next({ ctx: { startTime: Date.now() } });
  })
  .use(async ({ ctx, next }) => {
    // Logging middleware - doesn't modify context
    console.log(`Starting request for service: ${ctx.service}`);
    console.log(`Request started at: ${new Date(ctx.startTime).toISOString()}`);

    return next(); // No context modification
  })
  .use(async ({ next }) => {
    // Metrics middleware - also doesn't modify context
    const processingStart = Date.now();

    // Call next middleware/handler
    const result = await next();

    const processingTime = Date.now() - processingStart;
    console.log(`Processing time: ${processingTime}ms`);

    return result;
  })
  .input<{ task: string }>()
  .handler(async ({ input, ctx }) => {
    // Simulate some work
    await new Promise(resolve => {
      const timer = globalThis.setTimeout(() => resolve(undefined), 100);
      return timer;
    });

    return {
      task: input.task,
      service: ctx.service,
      startTime: ctx.startTime,
      completed: true,
    };
  });

// ========================================================================
// STANDALONE MIDDLEWARE FUNCTIONS
// ========================================================================

/**
 * Example 6: Create standalone middleware functions using createMiddleware
 * Shows how to create reusable middleware that can work with any client
 */

// Basic standalone middleware that works with any client
const loggingMiddleware = createMiddleware(async ({ next, rawInput }) => {
  console.log("🚀 Request started with input:", rawInput);
  const startTime = Date.now();

  const result = await next();

  const duration = Date.now() - startTime;
  console.log(`✅ Request completed in ${duration}ms`);

  return result;
});

// Simple middleware that adds timing info
const timingMiddleware = createMiddleware(async ({ next }) => {
  return next({ ctx: { requestTime: Date.now() } });
});

// Simple middleware that adds environment info
const envMiddleware = createMiddleware(async ({ next }) => {
  return next({ ctx: { environment: "development" } });
});

// Example middleware that uses validation
export const validationMiddleware = createMiddleware(async ({ rawInput, rawArgs, valid, next }) => {
  console.log("Raw input:", rawInput);
  console.log("Raw args:", rawArgs);

  try {
    // Try to get validated input if schema exists
    const validInput = valid("input");
    console.log("✅ Validated input:", validInput);
  } catch (error: any) {
    console.log("ℹ️ No input schema, using raw data", error);
  }

  try {
    // Try to get validated args if schema exists
    const validArgs = valid("args");
    console.log("✅ Validated args:", validArgs);
  } catch (error: any) {
    console.log("ℹ️ No args schema, using raw data", error);
  }

  return next();
});

// Example clients that use standalone middleware
const clientWithTiming = createSafeFnClient()
  .use(timingMiddleware);

const clientWithLogging = createSafeFnClient()
  .use(loggingMiddleware)
  .use(envMiddleware);

// Example functions using standalone middleware
export const standaloneMiddlewareExample1 = clientWithTiming
  .input<{ username: string }>()
  .handler(async ({ input, ctx }) => {
    // ctx has: requestTime (from timingMiddleware)
    return {
      message: `Welcome ${input.username}!`,
      requestTime: ctx.requestTime,
    };
  });

export const standaloneMiddlewareExample2 = clientWithLogging
  .input<{ task: string }>()
  .handler(async ({ input, ctx }) => {
    // ctx has: environment (from envMiddleware)
    return {
      message: `Task ${input.task} executed`,
      environment: ctx.environment,
    };
  });

// ========================================================================
// USAGE EXAMPLES
// ========================================================================

// Uncomment these to test the examples:

/*
// Basic context chaining
const result1 = await contextChainingExample({ name: "Alice" });
console.log("Context chaining result:", result1);

// Authentication example
const result2 = await authenticationExample({
  resource: "user-data",
  action: "read"
});
console.log("Auth result:", result2);

// Progressive context building
const result3 = await progressiveContextExample({ query: "SELECT * FROM users" });
console.log("Progressive context result:", result3);

// Type safety verification
const result4 = await typeSafetyExample();
console.log("Type safety result:", result4);

// Side effect middleware
const result5 = await sideEffectMiddlewareExample({ task: "process-data" });
console.log("Side effect result:", result5);
*/