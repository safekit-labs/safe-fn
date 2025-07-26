import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createClient } from "@/factory";
import { createSafeFn } from "@/safe-fn";

describe("Synchronous Handlers", () => {
  // ========================================================================
  // BASIC SYNC HANDLERS
  // ========================================================================

  describe("Basic Sync Handlers", () => {
    it("should support basic sync handler with no input", async () => {
      const fn = createSafeFn().handler(() => "sync result");
      
      const result = await fn();
      expect(result).toBe("sync result");
    });

    it("should support sync handler with return computation", async () => {
      const fn = createSafeFn().handler(() => {
        return 2 + 2;
      });
      
      const result = await fn();
      expect(result).toBe(4);
    });

    it("should support sync handler with object return", async () => {
      const fn = createSafeFn().handler(() => ({
        message: "hello",
        count: 42,
        active: true
      }));
      
      const result = await fn();
      expect(result).toEqual({
        message: "hello", 
        count: 42,
        active: true
      });
    });
  });

  // ========================================================================
  // SYNC WITH INPUT VALIDATION
  // ========================================================================

  describe("Sync with Input Validation", () => {
    it("should support sync handler with input validation", async () => {
      const client = createClient();
      const fn = client
        .input(z.string())
        .handler(({ input }) => input.toUpperCase());

      const result = await fn("hello", {});
      expect(result).toBe("HELLO");
    });

    it("should support sync handler with object input validation", async () => {
      const client = createClient();
      const fn = client
        .input(z.object({ name: z.string(), age: z.number() }))
        .handler(({ input }) => `${input.name} is ${input.age} years old`);

      const result = await fn({ name: "Alice", age: 30 }, {});
      expect(result).toBe("Alice is 30 years old");
    });

    it("should support sync handler with complex input transformation", async () => {
      const client = createClient();
      const fn = client
        .input(z.array(z.number()))
        .handler(({ input }) => {
          const sum = input.reduce((acc, num) => acc + num, 0);
          const avg = sum / input.length;
          return { sum, average: avg, count: input.length };
        });

      const result = await fn([1, 2, 3, 4, 5], {});
      expect(result).toEqual({
        sum: 15,
        average: 3,
        count: 5
      });
    });
  });

  // ========================================================================
  // SYNC WITH ARGS
  // ========================================================================

  describe("Sync with Args", () => {
    it("should support sync handler with multiple arguments", async () => {
      const fn = createSafeFn()
        .args(z.string(), z.number())
        .handler(({ args }) => {
          const [name, age] = args;
          return `${name} is ${age} years old`;
        });

      const result = await fn("Bob", 25);
      expect(result).toBe("Bob is 25 years old");
    });

    it("should support sync handler with null markers", async () => {
      const fn = createSafeFn()
        .args<[{ id: string }, { name: string }]>(null, z.object({ name: z.string() }))
        .handler(({ args }) => {
          const [context, validated] = args;
          return {
            contextId: context.id,
            name: validated.name
          };
        });

      const result = await fn({ id: "ctx-123" }, { name: "Charlie" });
      expect(result).toEqual({
        contextId: "ctx-123",
        name: "Charlie"
      });
    });

    it("should support sync handler with computation on args", async () => {
      const fn = createSafeFn()
        .args(z.number(), z.number(), z.number())
        .handler(({ args }) => {
          const [a, b, c] = args;
          return {
            sum: a + b + c,
            product: a * b * c,
            max: Math.max(a, b, c)
          };
        });

      const result = await fn(2, 4, 6);
      expect(result).toEqual({
        sum: 12,
        product: 48,
        max: 6
      });
    });
  });

  // ========================================================================
  // SYNC WITH OUTPUT VALIDATION
  // ========================================================================

  describe("Sync with Output Validation", () => {
    it("should support sync handler with output validation", async () => {
      const client = createClient();
      const fn = client
        .output(z.string())
        .handler(() => "validated output");

      const result = await fn();
      expect(result).toBe("validated output");
    });

    it("should support sync handler with input and output validation", async () => {
      const client = createClient();
      const fn = client
        .input(z.number())
        .output(z.object({ doubled: z.number(), isEven: z.boolean() }))
        .handler(({ input }) => ({
          doubled: input * 2,
          isEven: input % 2 === 0
        }));

      const result = await fn(7, {});
      expect(result).toEqual({
        doubled: 14,
        isEven: false
      });
    });

    it("should validate sync handler output and throw on invalid output", async () => {
      const client = createClient();
      const fn = client
        .output(z.string())
        .handler(() => 123 as any); // Invalid output

      await expect(fn()).rejects.toThrow();
    });
  });

  // ========================================================================
  // SYNC WITH MIDDLEWARE
  // ========================================================================

  describe("Sync with Middleware", () => {
    it("should support sync handler with middleware", async () => {
      const client = createClient();
      const fn = client
        .use(async ({ next }) => {
          return next({ ctx: { timestamp: Date.now() } });
        })
        .handler(({ ctx }) => ({
          message: "sync with middleware",
          hasTimestamp: typeof ctx.timestamp === "number"
        }));

      const result = await fn();
      expect(result.message).toBe("sync with middleware");
      expect(result.hasTimestamp).toBe(true);
    });

    it("should support sync handler with multiple middleware", async () => {
      const client = createClient();
      const fn = client
        .use(async ({ next }) => {
          return next({ ctx: { step1: "middleware1" } });
        })
        .use(async ({ next }) => {
          return next({ ctx: { step2: "middleware2" } });
        })
        .handler(({ ctx }) => ({
          step1: ctx.step1,
          step2: ctx.step2,
          processed: true
        }));

      const result = await fn();
      expect(result).toEqual({
        step1: "middleware1",
        step2: "middleware2", 
        processed: true
      });
    });
  });

  // ========================================================================
  // SYNC WITH CONTEXT
  // ========================================================================

  describe("Sync with Context", () => {
    it("should support sync handler with context", async () => {
      const client = createClient();
      const fn = client
        .context<{ userId: string }>()
        .handler(({ ctx }) => `User: ${ctx.userId}`);

      const boundFn = fn.withContext({ userId: "user123" });
      const result = await boundFn();
      expect(result).toBe("User: user123");
    });

    it("should support sync handler with context and input", async () => {
      const client = createClient();
      const fn = client
        .context<{ role: string }>()
        .input(z.string())
        .handler(({ ctx, input }) => `${ctx.role}: ${input}`);

      const boundFn = fn.withContext({ role: "admin" });
      const result = await boundFn("system message");
      expect(result).toBe("admin: system message");
    });
  });

  // ========================================================================
  // MIXED SYNC/ASYNC
  // ========================================================================

  describe("Mixed Sync/Async", () => {
    it("should support both sync and async handlers in same codebase", async () => {
      const client = createClient();
      
      const syncFn = client
        .input(z.string())
        .handler(({ input }) => input.toUpperCase());
        
      const asyncFn = client
        .input(z.string())
        .handler(async ({ input }) => {
          await new Promise(resolve => globalThis.setTimeout(resolve, 1));
          return input.toLowerCase();
        });

      const syncResult = await syncFn("hello", {});
      const asyncResult = await asyncFn("WORLD", {});
      
      expect(syncResult).toBe("HELLO");
      expect(asyncResult).toBe("world");
    });
  });

  // ========================================================================
  // ERROR HANDLING
  // ========================================================================

  describe("Error Handling", () => {
    it("should propagate sync handler errors", async () => {
      const fn = createSafeFn().handler(() => {
        throw new Error("Sync error");
      });

      await expect(fn()).rejects.toThrow("Sync error");
    });

    it("should handle sync handler errors with error middleware", async () => {
      const client = createClient({
        onError: ({ error }) => ({
          success: false,
          error: new Error(`Caught: ${error.message}`)
        })
      });
      
      const fn = client.handler(() => {
        throw new Error("Sync handler error");
      });

      await expect(fn()).rejects.toThrow("Caught: Sync handler error");
    });

    it("should handle sync handler validation errors", async () => {
      const client = createClient();
      const fn = client
        .input(z.string())
        .handler(({ input }) => input.toUpperCase());

      await expect(fn(123 as any, {})).rejects.toThrow();
    });
  });

  // ========================================================================
  // TYPE INFERENCE VERIFICATION
  // ========================================================================

  describe("Type Inference", () => {
    it("should infer return types correctly for sync handlers", async () => {
      const fn = createSafeFn().handler(() => "string result");
      
      // TypeScript should infer this as string
      const result = await fn();
      expect(typeof result).toBe("string");
      expect(result).toBe("string result");
    });

    it("should infer return types correctly for sync handlers with objects", async () => {
      const fn = createSafeFn().handler(() => ({
        id: 123,
        name: "test",
        active: true
      }));
      
      const result = await fn();
      expect(result.id).toBe(123);
      expect(result.name).toBe("test");
      expect(result.active).toBe(true);
    });
  });
});