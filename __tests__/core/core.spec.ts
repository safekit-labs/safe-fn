import { describe, it, expect } from "vitest";
import { createCoreClient, createMiddleware, createHandler } from "../../src/core";

describe("@safekit/core", () => {
  describe("createCoreClient", () => {
    it("should create core instance", () => {
      const client = createCoreClient();
      expect(client).toBeDefined();
    });
  });

  describe("handlers", () => {
    it("should handle sync functions", () => {
      const client = createCoreClient();
      const handler = createHandler<{
        input: { name: string };
        output: { message: string };
      }>(({ input }) => ({ message: `Hello ${input.name}!` }));

      const fn = client.handler(handler);
      const result = fn({ name: "World" });
      expect(result).toEqual({ message: "Hello World!" });
    });

    it("should handle async functions", async () => {
      const client = createCoreClient();
      const handler = createHandler<{
        input: { name: string };
        output: { message: string };
      }>(async ({ input }) => ({ message: `Hello ${input.name}!` }));

      const fn = client.handler(handler);
      const result = await fn({ name: "World" });
      expect(result).toEqual({ message: "Hello World!" });
    });
  });

  describe("middleware", () => {
    it("should execute middleware in onion pattern", async () => {
      const client = createCoreClient();
      const calls: string[] = [];

      const middleware1 = createMiddleware(async ({ next }) => {
        calls.push("m1-before");
        const result = await next({});
        calls.push("m1-after");
        return result;
      });

      const middleware2 = createMiddleware(async ({ next }) => {
        calls.push("m2-before");
        const result = await next({});
        calls.push("m2-after");
        return result;
      });

      const fn = client
        .use(middleware1)
        .use(middleware2)
        .handler<{
          input: {};
          output: string;
        }>(() => {
          calls.push("handler");
          return "result";
        });
      await fn({});

      expect(calls).toEqual(["m1-before", "m2-before", "handler", "m2-after", "m1-after"]);
    });

    it("should pass context through middleware", async () => {
      const client = createCoreClient();

      const authMiddleware = createMiddleware(async ({ next }) => {
        return next({ userId: "user123" });
      });

      const fn = client.use(authMiddleware).handler<{
        ctx: { userId: string };
        input: {};
        output: { userId: string };
      }>(({ ctx }) => ({ userId: ctx.userId }));
      const result = await fn({});

      expect(result).toEqual({ userId: "user123" });
    });

    it("should accept array of middleware", async () => {
      const client = createCoreClient();
      const calls: string[] = [];

      const middleware1 = createMiddleware(async ({ next }) => {
        calls.push("m1");
        return next({});
      });

      const middleware2 = createMiddleware(async ({ next }) => {
        calls.push("m2");
        return next({});
      });

      const fn = client.use([middleware1, middleware2]).handler<{
        input: {};
        output: string;
      }>(() => "result");
      await fn({});

      expect(calls).toEqual(["m1", "m2"]);
    });
  });

  describe("context merging", () => {
    it("should merge context types from multiple middleware", async () => {
      const client = createCoreClient();

      const userMiddleware = createMiddleware(async ({ next }) => {
        return next({ userId: "user123" });
      });

      const roleMiddleware = createMiddleware(async ({ next }) => {
        return next({ role: "admin" });
      });

      const fn = client
        .use(userMiddleware)
        .use(roleMiddleware)
        .handler<{
          ctx: { userId: string; role: string };
          input: {};
          output: { userId: string; role: string };
        }>(({ ctx }) => ({ userId: ctx.userId, role: ctx.role }));
      const result = await fn({});

      expect(result).toEqual({ userId: "user123", role: "admin" });
    });
  });

  describe("chained usage (primary pattern)", () => {
    it("should work with fully chained syntax - no generics", () => {
      const client = createCoreClient();
      
      const fn = client.handler(({ input }) => `Hello ${input.name}!`);
      const result = fn({ name: "World" });
      
      expect(result).toBe("Hello World!");
    });

    it("should work with middleware chain - no generics", async () => {
      const client = createCoreClient();
      
      const fn = client
        .use(async ({ next }) => {
          const result = await next({ requestId: "req-123" });
          return { ...result, timestamp: Date.now() };
        })
        .handler(({ ctx, input }) => ({
          message: `Hello ${input.name}!`,
          requestId: ctx.requestId
        }));
      
      const result = await fn({ name: "TypeScript" });
      
      expect(result.message).toBe("Hello TypeScript!");
      expect(result.requestId).toBe("req-123");
      expect(typeof result.timestamp).toBe("number");
    });

    it("should work with multiple middleware - no generics", async () => {
      const client = createCoreClient();
      
      const fn = client
        .use(async ({ next }) => next({ userId: "user123" }))
        .use(async ({ next }) => next({ role: "admin" }))
        .use(async ({ ctx, next }) => next({ fullName: `${ctx.userId}-${ctx.role}` }))
        .handler(({ ctx, input }) => ({
          greeting: `Hello ${input.name}!`,
          user: ctx.fullName
        }));
      
      const result = await fn({ name: "Chain" });
      
      expect(result).toEqual({
        greeting: "Hello Chain!",
        user: "user123-admin"
      });
    });

    it("should work with array middleware - no generics", async () => {
      const client = createCoreClient();
      
      const authMiddleware = async ({ next }) => next({ isAuthenticated: true });
      const logMiddleware = async ({ next }) => next({ logged: true });
      
      const fn = client
        .use([authMiddleware, logMiddleware])
        .handler(({ ctx, input }) => ({
          data: input.data,
          auth: ctx.isAuthenticated,
          logged: ctx.logged
        }));
      
      const result = await fn({ data: "test" });
      
      expect(result).toEqual({
        data: "test",
        auth: true,
        logged: true
      });
    });
  });
});
