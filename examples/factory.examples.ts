/**
 * Factory Setup Examples
 * Different ways to configure your SafeFn clients
 */
import { createClient } from "@/factory";
import { z } from "zod";

// ========================================================================
// FACTORY SETUP EXAMPLES
// ========================================================================

// ------------------ 1. BASIC CLIENT ------------------

export const basicClient = createClient();

// ------------------ 2. WITH MIDDLEWARE CONTEXT ------------------

export const clientWithDefaults = createClient()
  .use(async ({ next }) => {
    return next({ ctx: {
      requestId: "default",
      version: "1.0.0",
    } });
  });

// ------------------ 3. WITH ERROR HANDLING ------------------

export const clientWithErrorHandler = createClient({
  onError: ({ error, ctx }) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Request ${(ctx as any).requestId || "unknown"} failed:`, errorMessage);
    // Send to monitoring service
  },
})
  .use(async ({ next }) => {
    return next({ ctx: { requestId: "default" } });
  });

// ------------------ 4. WITH METADATA SCHEMA ------------------

const operationMetaSchema = z.object({
  operation: z.string(),
  requiresAuth: z.boolean().optional(),
  version: z.string().optional(),
});

export const clientWithMetadata = createClient({
  metadataSchema: operationMetaSchema,
})
  .use(async ({ next }) => {
    return next({ ctx: {
      userId: undefined as string | undefined,
    } });
  });

// ------------------ 5. FULL CONFIGURATION WITH CONTEXT INFERENCE ------------------

const appMetaSchema = z.object({
  operation: z.string(),
  requiresAuth: z.boolean().optional(),
});

// Context is inferred from middleware - with type safety!
export const fullConfigClient = createClient({
  metadataSchema: appMetaSchema,
  onError: ({ error, ctx }) => {
    console.error(`Request ${(ctx as any).requestId} failed:`, error.message);
  },
})
  .use(async ({ next }) => {
    return next({ ctx: {
      userId: undefined as string | undefined,
      requestId: "default",
      permissions: [] as string[],
    } });
  });

// ------------------ 6. USAGE EXAMPLES WITH MIDDLEWARE ------------------

// Example function using the client with inline middleware
export const exampleFunction = clientWithMetadata
  .input(z.object({ data: z.string() }))
  .metadata({ operation: "process-data", requiresAuth: true })
  .handler(async ({ input, ctx }) => {
    return { processed: input.data, userId: ctx.userId };
  });

// ------------------ 7. MULTIPLE CLIENTS FOR DIFFERENT PURPOSES ------------------

// Client for public API functions
export const publicApiClient = createClient({
  onError: ({ error }) => {
    console.error("Public API error:", error.message);
  },
})
  .use(async ({ next }) => {
    return next({ ctx: {
      isPublic: true,
      rateLimit: 1000,
    } });
  });

// Admin metadata schema
const adminMetaSchema = z.object({
  operation: z.string(),
  requiresAdmin: z.boolean().optional(),
});

// Client for admin functions
export const adminClient = createClient({
  metadataSchema: adminMetaSchema,
  onError: ({ error, ctx }) => {
    console.error(`Admin operation failed for user ${(ctx as any).userId}:`, error.message);
  },
})
  .use(async ({ next }) => {
    return next({ ctx: {
      userId: undefined as string | undefined,
      role: "admin" as const,
      permissions: ["read", "write", "delete"] as const,
    } });
  });

// Example usage with different clients
export const publicFunction = publicApiClient
  .input(z.object({ query: z.string() }))
  .handler(async ({ input, ctx }) => {
    return { results: `Search: ${input.query}`, isPublic: ctx.isPublic };
  });

export const adminFunction = adminClient
  .input(z.object({ action: z.string() }))
  .metadata({ operation: "admin-action", requiresAdmin: true })
  .handler(async ({ input, ctx }) => {
    return {
      action: input.action,
      executedBy: ctx.userId,
      role: ctx.role,
    };
  });
