import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import { createSafeFnClient } from "@/factory";

// ========================================================================
// BASIC MIDDLEWARE FUNCTIONALITY TESTS
// ========================================================================

describe("Middleware Support", () => {
  describe("basic middleware usage", () => {
    it("should support .use() chaining", async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { userId: "test" },
      });

      // Test that .use() doesn't break the chain
      const fn = safeFnClient
        .use(async ({ next }) => next())
        .handler(async ({ ctx }) => `Hello ${ctx.userId}`);

      const result = await fn({}, {});
      expect(result).toBe("Hello test");
    });

    it("should support multiple .use() calls", async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { service: "api" },
      });

      // Test that multiple .use() calls work
      const fn = safeFnClient
        .use(async ({ next }) => next())
        .use(async ({ next }) => next())
        .use(async ({ next }) => next())
        .handler(async ({ ctx }) => `Service: ${ctx.service}`);

      const result = await fn({}, {});
      expect(result).toBe("Service: api");
    });

    it("should work with middleware and input validation", async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { prefix: "Mr." },
      });

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .input(z.object({ name: z.string() }))
        .handler(async ({ parsedInput, ctx }) => `${ctx.prefix} ${parsedInput.name}`);

      const result = await fn({ name: "Smith" }, {});
      expect(result).toBe("Mr. Smith");
    });

    it("should work with middleware and output validation", async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .output(z.object({ greeting: z.string() }))
        .handler(async () => ({ greeting: "Hello World" }));

      const result = await fn({}, {});
      expect(result).toEqual({ greeting: "Hello World" });
    });
  });

  describe("middleware with context", () => {
    it("should provide context from factory to middleware and handlers", async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { apiKey: "secret", version: "v1" },
      });

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .handler(async ({ ctx }) => ({
          authenticated: !!ctx.apiKey,
          version: ctx.version,
        }));

      const result = await fn({}, {});
      expect(result).toEqual({ authenticated: true, version: "v1" });
    });

    it("should merge runtime context properly", async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { service: "auth", env: "prod" },
      });

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .handler(async ({ ctx }) => ({
          service: ctx.service,
          env: ctx.env,
          requestId: (ctx as any).requestId,
        }));

      const result = await fn({}, { requestId: "req-123" } as any);
      expect(result).toEqual({
        service: "auth",
        env: "prod",
        requestId: "req-123",
      });
    });
  });

  describe("middleware with metadata", () => {
    it("should work with metadata validation", async () => {
      const safeFnClient = createSafeFnClient({
        metadataSchema: z.object({ operation: z.string(), priority: z.number() }),
      });

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .metadata({ operation: "create-user", priority: 1 })
        .handler(async () => "operation completed");

      const result = await fn({}, {});
      expect(result).toBe("operation completed");
    });

    it("should work with unvalidated metadata", async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .metadata({ custom: "value", tags: ["important"] })
        .handler(async () => "metadata accepted");

      const result = await fn({}, {});
      expect(result).toBe("metadata accepted");
    });
  });

  describe("middleware with different input types", () => {
    it("should work with object input", async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .input(z.object({ message: z.string() }))
        .handler(async ({ parsedInput }) => `Received: ${parsedInput.message}`);

      const result = await fn({ message: "hello" }, {});
      expect(result).toBe("Received: hello");
    });

    it("should work with tuple arguments", async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .input([z.string(), z.number()])
        .handler(async ({ args }) => `${args[0]}: ${args[1]}`);

      const result = await fn("count", 42);
      expect(result).toBe("count: 42");
    });

    it("should work with empty arguments", async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .input([])
        .handler(async ({ args }) => `Args length: ${args.length}`);

      const result = await fn();
      expect(result).toBe("Args length: 0");
    });
  });

  describe("middleware error scenarios", () => {
    it("should handle input validation errors", async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .input(z.object({ age: z.number() }))
        .handler(async ({ parsedInput }) => `Age: ${parsedInput.age}`);

      await expect(fn({ age: "not-a-number" as any }, {})).rejects.toThrow();
    });

    it("should handle output validation errors", async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .output(z.object({ result: z.string() }))
        .handler(async () => ({ result: 123 as any }));

      await expect(fn({}, {})).rejects.toThrow();
    });

    it("should work with metadata schema validation", async () => {
      const safeFnClient = createSafeFnClient({
        metadataSchema: z.object({ operation: z.string().min(1) }),
      });

      const fn = safeFnClient
        .metadata({ operation: "valid-operation" })
        .handler(async () => "validation passed");

      const result = await fn({}, {});
      expect(result).toBe("validation passed");
    });
  });
});

// ========================================================================
// INTEGRATION TESTS
// ========================================================================

describe("Middleware Integration", () => {
  describe("full feature integration", () => {
    it("should work with all features combined", async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { service: "user-service", version: "1.0" },
        metadataSchema: z.object({ operation: z.string(), userId: z.string() }),
      });

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .use(async ({ next }) => next())
        .metadata({ operation: "create-user", userId: "admin" })
        .input(z.object({ name: z.string(), email: z.string() }))
        .output(z.object({ id: z.string(), name: z.string(), created: z.boolean() }))
        .handler(async ({ parsedInput, ctx }) => ({
          id: `${ctx.service}-${Date.now()}`,
          name: parsedInput.name,
          created: true,
        }));

      const result = await fn({ name: "John Doe", email: "john@example.com" }, {
        requestId: "req-456",
      } as any);

      expect(result).toMatchObject({
        name: "John Doe",
        created: true,
      });
      expect(result.id).toMatch(/^user-service-\d+$/);
    });

    it("should work with factory config and runtime overrides", async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { env: "dev", debug: true },
      });

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .handler(async ({ ctx }) => ({
          environment: ctx.env,
          debugMode: ctx.debug,
          requestId: (ctx as any).requestId,
          overridden: ctx.env !== "dev",
        }));

      const result = await fn({}, {
        env: "production",
        requestId: "prod-123",
      } as any);

      expect(result).toEqual({
        environment: "production",
        debugMode: true,
        requestId: "prod-123",
        overridden: true,
      });
    });
  });

  describe("middleware method chaining", () => {
    it("should support chaining in different orders", async () => {
      const safeFnClient = createSafeFnClient();

      // Test different chaining orders
      const fn1 = safeFnClient
        .input(z.string())
        .use(async ({ next }) => next())
        .handler(async ({ parsedInput }) => `Order 1: ${parsedInput}`);

      const fn2 = safeFnClient
        .use(async ({ next }) => next())
        .input(z.string())
        .handler(async ({ parsedInput }) => `Order 2: ${parsedInput}`);

      const fn3 = safeFnClient
        .metadata({ test: true })
        .use(async ({ next }) => next())
        .input(z.string())
        .handler(async ({ parsedInput }) => `Order 3: ${parsedInput}`);

      const result1 = await fn1("test1", {});
      const result2 = await fn2("test2", {});
      const result3 = await fn3("test3", {});

      expect(result1).toBe("Order 1: test1");
      expect(result2).toBe("Order 2: test2");
      expect(result3).toBe("Order 3: test3");
    });

    it("should handle complex chaining scenarios", async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { base: "value" },
      });

      const fn = safeFnClient
        .use(async ({ next }) => next())
        .metadata({ step: 1 })
        .use(async ({ next }) => next())
        .input(z.object({ data: z.string() }))
        .use(async ({ next }) => next())
        .output(z.object({ processed: z.string() }))
        .handler(async ({ parsedInput, ctx }) => ({
          processed: `${ctx.base}-${parsedInput.data}`,
        }));

      const result = await fn({ data: "input" }, {});
      expect(result).toEqual({ processed: "value-input" });
    });
  });
});
