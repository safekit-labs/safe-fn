import { createSafeFnClient } from "@/factory";
import { z } from "zod";

// bun run examples/error.examples.ts

// ========================================================================
// SAFEFN ERROR HANDLING EXAMPLE
// ========================================================================

console.log("=== SafeFn Error Handling Example ===\n");

const runExample = async () => {
  // Middleware that adds authentication context
  const authMiddleware = async ({ next, ctx }: any) => {
    console.log("🔐 Auth middleware adding context");
    return next({
      ctx: {
        ...ctx,
        authTime: new Date().toISOString(),
        traceId: `trace-${Date.now()}`
      }
    });
  };

  const safeFn = createSafeFnClient({
    defaultContext: { userId: "user123", role: "admin" },
    onError: ({ error, ctx, metadata, rawInput, rawArgs, valid }) => {
      console.log("🚨 Error Handler Called:");
      console.log("   Error message:", error.message);
      console.log("   Context:", JSON.stringify(ctx, null, 2));
      console.log("   Metadata:", JSON.stringify(metadata, null, 2));
      console.log("   Raw input:", JSON.stringify(rawInput, null, 2));
      console.log("   Raw args:", rawArgs);
      console.log("   Context includes:");
      console.log("   - Default context (userId, role)");
      console.log("   - Additional context (requestId)");
      console.log("   - Middleware context (authTime, traceId)");

      // Example of using validation helper
      try {
        const validatedInput = valid("input");
        console.log("   Validated input:", validatedInput);
      } catch {
        console.log("   No input validation schema available");
      }

      // Example of error recovery
      if (error.message.includes("recoverable")) {
        return {
          success: true as const,
          data: `Recovered from: ${error.message}`
        };
      }

      // Let other errors pass through
    }
  })
    .use(authMiddleware)
    .metadata({ operation: "demo", version: "1.0" })
    .input(z.object({ action: z.string(), recoverable: z.boolean().optional() }))
    .handler(async ({ input, ctx, metadata }) => {
      console.log("⚡ Handler called with:");
      console.log("   Input:", input);
      console.log("   Metadata:", metadata);
      console.log("   Context keys:", Object.keys(ctx));

      if (input.recoverable) {
        throw new Error("This is a recoverable error");
      } else {
        throw new Error("Critical system failure");
      }
    });

  console.log("--- Test 1: Error Recovery ---");
  try {
    const result = await safeFn(
      { action: "test", recoverable: true },
      { requestId: "req-123" } as any
    );
    console.log("✅ Recovered result:", result);
  } catch (error) {
    console.log("❌ Error:", (error as Error).message);
  }

  console.log("\n--- Test 2: Error Pass-through ---");
  try {
    await safeFn(
      { action: "test", recoverable: false },
      { requestId: "req-456" } as any
    );
  } catch (error) {
    console.log("❌ Error passed through:", (error as Error).message);
  }

  console.log("\n✅ Example completed - context and metadata successfully passed to onError!");
};

runExample().catch(console.error);