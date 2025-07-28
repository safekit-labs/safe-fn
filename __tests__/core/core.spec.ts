import { describe, test, expect, expectTypeOf } from "vitest";
import { z } from "zod";
import { createCoreClient, createMiddleware, createHandler } from "@safekit/safe-fn";

import type { Handler } from "../../src/core";

describe("SafeFn Core", () => {
  test("basic handler execution", async () => {
    const handler = createHandler<{ name: string }, { greeting: string }, {}>(({ input }) => ({
      greeting: `Hello ${input.name}!`,
    }));

    const fn = createCoreClient().handler(handler);
    const result = await fn({ name: "World" });

    expect(result).toEqual({ greeting: "Hello World!" });
  });

  test("middleware lifecycle hooks", async () => {
    const order: string[] = [];

    const middleware = createMiddleware({
      before: async ({ ctx }) => {
        order.push("before");
        return { userId: "user123" };
      },
      after: async ({ ctx, result }) => {
        order.push("after");
      },
    });

    const handler = createHandler<{}, string, { userId: string }>(({ ctx }) => {
      order.push("handler");
      return `Hello ${ctx.userId}`;
    });

    const fn = createCoreClient().use(middleware).handler(handler);
    const result = await fn({});

    expect(result).toBe("Hello user123");
    expect(order).toEqual(["before", "handler", "after"]);
  });

  test("error handling with onError hook", async () => {
    const order: string[] = [];

    const middleware = createMiddleware<{}, { userId: string }>({
      before: async ({ ctx }) => {
        order.push("before");
        return { userId: "user123" };
      },
      onError: async ({ ctx, error }) => {
        order.push("onError");
        // ctx.userId available since before() succeeded
        expect(ctx.userId).toBe("user123");
        expect(error.message).toBe("Test error");
      },
    });

    const handler = createHandler<{}, string, { userId: string }>(() => {
      order.push("handler");
      throw new Error("Test error");
    });

    const fn = createCoreClient().use(middleware).handler(handler);

    await expect(fn({})).rejects.toThrow("Test error");
    expect(order).toEqual(["before", "handler", "onError"]);
  });

  test("context merging through middleware chain", async () => {
    const middleware1 = createMiddleware<{}, { step1: string }>({
      before: async ({ ctx }) => ({ step1: "done" }),
    });

    const middleware2 = createMiddleware<{ step1: string }, { step2: string }>({
      before: async ({ ctx }) => ({ step2: ctx.step1 + "-step2" }),
    });

    const handler = createHandler<
      {},
      { step1: string; step2: string },
      { step1: string; step2: string }
    >(({ ctx }) => ctx);

    const fn = createCoreClient().use(middleware1).use(middleware2).handler(handler);

    const result = await fn({});

    expect(result).toEqual({
      step1: "done",
      step2: "done-step2",
    });
  });

  test("context merging through chained middleware execution", async () => {
    const fn = createCoreClient()
      .use({
        before: async ({ ctx }) => ({ step1: "done" }),
      })
      .use({
        before: async ({ ctx }) => ({ step2: ctx.step1 + "-step2" }),
      });

    expect(fn).toBeDefined();
  });

  test("single middleware output context type inference", () => {
    const middleware1 = createMiddleware({
      before: async ({ ctx }) => ({ step1: "done" }),
    });

    // TypeScript should infer the middleware type
    expect(middleware1).toBeDefined();
    expect(typeof middleware1.before).toBe("function");
  });

  test("middleware execution order (before forward, after reverse)", async () => {
    const order: string[] = [];

    const middleware1 = createMiddleware({
      before: async ({ ctx }) => {
        order.push("m1-before");
        return {};
      },
      after: async ({ ctx, result }) => {
        order.push("m1-after");
      },
    });

    const middleware2 = createMiddleware({
      before: async ({ ctx }) => {
        order.push("m2-before");
        return {};
      },
      after: async ({ ctx, result }) => {
        order.push("m2-after");
      },
    });

    const handler = createHandler<{}, string, {}>(() => {
      order.push("handler");
      return "done";
    });

    const fn = createCoreClient().use(middleware1).use(middleware2).handler(handler);

    await fn({});

    expect(order).toEqual(["m1-before", "m2-before", "handler", "m2-after", "m1-after"]);
  });

  test("TRPC-style error context (partial outputCtx)", async () => {
    const middleware = createMiddleware<unknown, { someData: string }>({
      before: async ({ ctx }) => {
        throw new Error("Before failed");
      },
      onError: async ({ ctx, error }) => {
        // outputCtx properties should be undefined since before() failed
        expect(ctx).toEqual({});
      },
    });

    const handler = createHandler<{}, string, { someData: string }>(() => "never reached");

    const fn = createCoreClient().use(middleware).handler(handler);

    await expect(fn({})).rejects.toThrow("Before failed");
  });

  test("validation: at least one hook required", () => {
    expect(() => {
      createMiddleware({
        // No hooks defined
      });
    }).toThrow("Middleware must define at least one of: before, after, or onError");
  });

  test("handler with positional generics", async () => {
    const handler1 = createHandler<{ name: string }, { greeting: string }, { userId: string }>(
      ({ input, ctx }) => ({ greeting: `Hello ${input.name}, user ${ctx.userId}!` }),
    );

    const handler2 = createHandler<{ name: string }, { greeting: string }, { userId: string }>(
      ({ input, ctx }) => ({ greeting: `Hello ${input.name}, user ${ctx.userId}!` }),
    );

    const middleware = createMiddleware({
      before: async ({ ctx }) => ({ userId: "test123" }),
    });

    const fn1 = createCoreClient().use(middleware).handler(handler1);
    const fn2 = createCoreClient().use(middleware).handler(handler2);

    const result1 = await fn1({ name: "Alice" });
    const result2 = await fn2({ name: "Bob" });

    expect(result1).toEqual({ greeting: "Hello Alice, user test123!" });
    expect(result2).toEqual({ greeting: "Hello Bob, user test123!" });
  });

  test("handler with Zod schema inference", () => {
    const inputSchema = z.object({ page: z.coerce.number<string>() });
    const outputSchema = z.object({ total: z.coerce.number<string>() });

    const handler = createHandler<typeof inputSchema, typeof outputSchema>(({ input }) => {
      // input.page should be number (validated)
      expect(typeof input.page).toBe("number");
      return { total: "42" }; // raw number, will be coerced to string
    });

    expect(handler).toBeDefined();

    // Type test - verify handler has the expected type
    expectTypeOf(handler).toEqualTypeOf<
      Handler<{
        input: {
          page: string;
        };
        output: {
          total: number;
        };
        context: Record<string, unknown>;
      }>
    >();
  });

  test("chained middleware and handler execution", async () => {
    const result = await createCoreClient()
      .use({
        before: async ({ ctx }) => ({ userId: "user123" }),
      })
      .use({
        before: async ({ ctx }) => {
          // expectTypeOf(ctx).toEqualTypeOf<{userId: string}>();
          return { sessionId: ctx.userId + "-session" }
        },
      })
      .handler<{ name: string }, { greeting: string }>(({ input, ctx }) => ({
        greeting: `Hello ${input.name}! User: ${ctx.userId}, Session: ${ctx.sessionId}`,
      }))({ name: "World" });

    expect(result).toEqual({
      greeting: "Hello World! User: user123, Session: user123-session",
    });
  });
});
