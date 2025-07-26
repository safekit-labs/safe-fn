import { createClient } from "@/factory";
import { z } from "zod";

// Custom Error class for testing
class CustomTestError extends Error {
  constructor(
    message: string,
    public code: string,
  ) {
    super(message);
    this.name = "CustomTestError";
  }
}

// bun run examples/error.examples.ts

// ========================================================================
// SAFEFN ERROR HANDLING EXAMPLE
// ========================================================================

// Middleware that adds authentication context
const authMiddleware = async ({ next, ctx }: any) => {
  console.log("🔐 Auth middleware adding context");
  return next({
    ctx: {
      ...ctx,
      authTime: new Date().toISOString(),
      traceId: `trace-${Date.now()}`,
    },
  });
};

const safeFn = createClient({
  defaultContext: { userId: "user123", role: "admin" },
  onError: ({ error, ctx, metadata, rawInput, rawArgs, valid }) => {
    console.log({ error, ctx, metadata, rawInput, rawArgs, valid }, "onError");

    // Example of error recovery
    if (error.message.includes("recoverable")) {
      return {
        success: true as const,
        data: `Recovered from: ${error.message}`,
      };
    }

    // Let other errors pass through
  },
})
  .use(authMiddleware)
  .metadata({ operation: "demo", version: "1.0" })
  .input(
    z.object({
      action: z.string(),
      recoverable: z.boolean().optional(),
      customError: z.boolean().optional(),
    }),
  )
  .handler(async ({ input, ctx, metadata }) => {
    console.log({ input, ctx, metadata }, "handler");

    if (input.customError) {
      throw new CustomTestError("Custom error occurred", "ERR_CUSTOM_001");
    } else if (input.recoverable) {
      throw new Error("This is a recoverable error");
    } else {
      throw new Error("Critical system failure");
    }
  });

// ========================================================================
// TEST 1
// ========================================================================

export async function test1() {
  try {
    const result = await safeFn({ action: "test", recoverable: true }, {
      requestId: "req-123",
    } as any);
    console.log("✅ Recovered result:", result);
  } catch (error) {
    console.log("❌ Error:", (error as Error).message);
  }
}

// ========================================================================
// TEST 2
// ========================================================================

export async function test2() {
  try {
    await safeFn({ action: "test", recoverable: false }, { requestId: "req-456" } as any);
  } catch (error) {
    console.log("❌ Error passed through:", (error as Error).message);
  }
}

// ========================================================================
// TEST 3 - Custom Error with instanceof check
// ========================================================================

const safeFn3 = createClient({
  defaultContext: { userId: "user123", role: "admin" },
  onError: ({ error }) => {
    throw new CustomTestError(error.message, "ERR_HANDLER_001");
  },
})
  .use(authMiddleware)
  .input(z.object({ action: z.string() }))
  .handler(async () => {
    throw new Error("Initial error that triggers onError");
  });

export async function test3() {
  try {
    const result = await safeFn3({ action: "test" }, {
      requestId: "req-789",
    } as any);
    console.log("✅ Unexpected success:", result);
  } catch (error) {
    if (error instanceof CustomTestError) {
      console.log("✅ Custom error caught via instanceof:", error.message, "code:", error.code);
    } else {
      console.log("❌ Different error type:", (error as Error).message);
    }
  }
}

test1();
test2();
test3();
