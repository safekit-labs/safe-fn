/**
 * Simple Middleware Debug Example
 * Shows middleware stack progression using metadata
 */
import { createSafeFnClient } from "@/index";
import { z } from "zod";

// bun run examples/middleware.debug.example.ts

// Simple metadata schema with just middleware stack
const debugMetadataSchema = z.object({
  middlewareStack: z.array(z.string())
});

// Example showing middleware stack progression
export const metadataDebugExample = createSafeFnClient({
  metadataSchema: debugMetadataSchema
})
  .use(async ({ next, metadata }) => {
    console.log("🔍 Middleware 1:", metadata.middlewareStack);
    return next({
      ctx: { middlewareStack: [...metadata.middlewareStack, "middleware-1"] }
    });
  })
  .use(async ({ next, metadata }) => {
    console.log("🔍 Middleware 2:", metadata.middlewareStack);
    return next({
      ctx: { middlewareStack: [...metadata.middlewareStack, "middleware-2"] }
    });
  })
  .use(async ({ next, metadata }) => {
    console.log("🔍 Middleware 3:", metadata.middlewareStack);
    return next({
      ctx: { middlewareStack: [...metadata.middlewareStack, "middleware-3"] }
    });
  })
  .input<{ action: string }>()
  .metadata({
    middlewareStack: ["initial"]
  })
  .handler(async ({ input, ctx }) => {
    console.log("🎯 Final stack:", ctx.middlewareStack);
    return {
      action: input.action,
      stack: ctx.middlewareStack
    };
  });

// Test
const test = async () => {
  const result = await metadataDebugExample({ action: "test" });
  console.log("\n✅ Stack progression:", result.stack);
};

test().catch(console.error);
