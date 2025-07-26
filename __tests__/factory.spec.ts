import { describe, it, expect, vi } from "vitest";
import { z } from "zod/v4";
import { createClient } from "@/factory";

// ========================================================================
// FACTORY CONFIGURATION TESTS
// ========================================================================

describe("Factory Configuration", () => {
  // ========================================================================
  // MIDDLEWARE CONTEXT TESTS
  // ========================================================================

  describe("middleware context", () => {
    it("should use context provided by middleware in handlers", async () => {
      const client = createClient();

      const fn = client
        .use(async ({ next }) => next({ ctx: { userId: "test-user", role: "admin" } }))
        .handler(async ({ ctx }) => ctx);
      const result = await fn();

      expect(result).toEqual({ userId: "test-user", role: "admin" });
    });

    it("should use middleware context when no input is defined", async () => {
      const client = createClient();

      const fn = client
        .use(async ({ next }) => next({ ctx: { userId: "default", role: "user" } }))
        .handler(async ({ ctx }) => ctx);
      const result = await fn();

      expect(result).toEqual({ userId: "default", role: "user" });
    });

    it("should use middleware context when input is defined", async () => {
      const client = createClient();

      const fn = client
        .use(async ({ next }) => next({ ctx: { userId: "default", role: "user" } }))
        .input(z.object({ data: z.string() }))
        .handler(async ({ input, ctx }) => ({ data: input.data, ...ctx }));

      const result = await fn({ data: "test" });

      expect(result).toEqual({ data: "test", userId: "default", role: "user" });
    });

    it("should work without any middleware context", async () => {
      const client = createClient();

      const fn = client.handler(async ({ ctx }) => ctx);
      const result = await fn();

      expect(result).toEqual({});
    });
  });

  // ========================================================================
  // METADATA SCHEMA TESTS
  // ========================================================================

  describe("metadataSchema", () => {
    it("should validate metadata with provided schema", async () => {
      const client = createClient({
        metadataSchema: z.object({ op: z.string(), version: z.number() }),
      });

      const fn = client.metadata({ op: "test", version: 1 }).handler(async () => "success");

      const result = await fn();
      expect(result).toBe("success");
    });

    it("should work without metadata schema", async () => {
      const client = createClient();

      const fn = client.metadata({ anything: "goes" }).handler(async () => "success");

      const result = await fn();
      expect(result).toBe("success");
    });
  });

  // ========================================================================
  // ERROR HANDLER TESTS
  // ========================================================================

  describe("onError", () => {
    it("should call onError when handler throws", async () => {
      const errorHandler = vi.fn();
      const client = createClient({
        onError: errorHandler,
      });

      const fn = client
        .use(async ({ next }) => next({ ctx: { userId: "test" } }))
        .handler(async () => {
          throw new Error("test error");
        });

      await expect(fn()).rejects.toThrow("test error");
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({ message: "test error" }),
          ctx: expect.objectContaining({ userId: "test" }),
          metadata: expect.any(Object),
          rawInput: undefined,
          valid: expect.any(Function),
        }),
      );
    });

    it("should call onError with middleware context", async () => {
      const errorHandler = vi.fn();
      const client = createClient({
        onError: errorHandler,
      });

      const fn = client
        .use(async ({ next }) => next({ ctx: { userId: "default" } }))
        .handler(async () => {
          throw new Error("test error");
        });

      await expect(fn()).rejects.toThrow();
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.any(Error),
          ctx: expect.objectContaining({ userId: "default" }),
          metadata: expect.any(Object),
          rawInput: undefined,
          valid: expect.any(Function),
        }),
      );
    });
  });

  // ========================================================================
  // OPTIONAL CONFIG TESTS
  // ========================================================================

  describe("optional configuration", () => {
    it("should work with no configuration", async () => {
      const client = createClient();

      const fn = client.handler(async ({ ctx }) => ctx);
      const result = await fn();

      expect(result).toEqual({});
    });

    it("should work with empty configuration", async () => {
      const client = createClient({});

      const fn = client.handler(async () => "empty config");
      const result = await fn();

      expect(result).toBe("empty config");
    });
  });
});

// ========================================================================
// TYPE CHECKING TESTS
// ========================================================================

describe("Type Checking", () => {
  describe("metadata type generics", () => {
    it("should accept metadata type as generic parameter", async () => {
      // Define metadata type and schema
      const metadataSchema = z.object({
        operationName: z.string(),
        priority: z.number(),
      });
      type Metadata = z.infer<typeof metadataSchema>;

      // This should work with the new overload
      const client = createClient<Metadata>({
        metadataSchema,
      });

      const fn = client
        .metadata({ operationName: "test-op", priority: 1 })
        .handler(async () => "success");

      const result = await fn();
      expect(result).toBe("success");
    });

    it("should work with both context and metadata types", async () => {
      // Define types and schemas
      type Context = { userId: string; role: string };
      const metadataSchema = z.object({ action: z.string() });
      type Metadata = z.infer<typeof metadataSchema>;

      const client = createClient<Metadata>({
        metadataSchema,
      });

      const fn = client
        .use(async ({ next }) => next({ ctx: { userId: "test", role: "admin" } }))
        .metadata({ action: "create" })
        .handler(async ({ ctx }) => ({
          user: ctx.userId,
          role: ctx.role,
        }));

      const result = await fn();
      expect(result).toEqual({ user: "test", role: "admin" });
    });

    it("should preserve types through method chaining without explicit generics", async () => {
      // This simulates the exact issue from the user's file
      const client = createClient({
        metadataSchema: z.object({
          operationName: z.string(),
        }),
      });

      // Test with .input() chaining first (this should work)
      const getUserId = client
        .input(
          z.object({
            userId: z.string(),
          }),
        )
        .handler(async ({ input }) => {
          return {
            userId: input.userId,
          };
        });

      // Verify input works
      const inputResult = await getUserId({ userId: "456" });
      expect(inputResult).toEqual({ userId: "456" });

      // Test metadata method works
      const withMetadata = client
        .metadata({
          operationName: "test",
        })
        .handler(async () => "success");

      const metadataResult = await withMetadata();
      expect(metadataResult).toBe("success");
    });

    it("should not require input parameter when no input is defined", async () => {
      const client = createClient();

      // Handler without input should be callable without parameters
      const noInputFn = client.handler(async () => ({ result: "no input needed" }));

      // This should work without any arguments
      const result = await (noInputFn as any)();
      expect(result).toEqual({ result: "no input needed" });
    });
  });
});

// ========================================================================
// INTEGRATION TESTS
// ========================================================================

describe("Factory Integration", () => {
  describe("input and output validation", () => {
    it("should work with input validation", async () => {
      const client = createClient();

      const fn = client
        .use(async ({ next }) => next({ ctx: { service: "test" } }))
        .input(z.object({ name: z.string() }))
        .handler(async ({ input, ctx }) => ({
          greeting: `Hello ${input.name}`,
          service: ctx.service,
        }));

      const result = await fn({ name: "World" });
      expect(result).toEqual({ greeting: "Hello World", service: "test" });
    });

    it("should work with output validation", async () => {
      const client = createClient();

      const fn = client
        .use(async ({ next }) => next({ ctx: { env: "test" } }))
        .output(z.object({ result: z.string() }))
        .handler(async ({ ctx }) => ({ result: `Environment: ${ctx.env}` }));

      const result = await fn();
      expect(result).toEqual({ result: "Environment: test" });
    });

    it("should work with both input and output validation", async () => {
      const client = createClient();

      const fn = client
        .use(async ({ next }) => next({ ctx: { multiplier: 2 } }))
        .input(z.object({ value: z.number() }))
        .output(z.object({ doubled: z.number() }))
        .handler(async ({ input, ctx }) => ({
          doubled: input.value * ctx.multiplier,
        }));

      const result = await fn({ value: 5 });
      expect(result).toEqual({ doubled: 10 });
    });
  });

  describe("middleware support", () => {
    it("should support basic middleware", async () => {
      const client = createClient();

      const fn = client
        .use(async ({ next }) => next({ ctx: { userId: "default-user" } }))
        .use(async ({ next }) => {
          return next();
        })
        .handler(async ({ ctx }) => `Hello from ${ctx.userId}`);

      const result = await fn();
      expect(result).toBe("Hello from default-user");
    });

    it("should support metadata configuration", async () => {
      const client = createClient({
        metadataSchema: z.object({ operation: z.string() }),
      });

      const fn = client.metadata({ operation: "test-op" }).handler(async () => "completed");

      const result = await fn();
      expect(result).toBe("completed");
    });
  });
});
