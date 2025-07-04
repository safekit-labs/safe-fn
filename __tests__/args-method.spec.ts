import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createSafeFn } from "@/safe-fn";

describe("Args Method with Null Markers", () => {
  it("should support null markers for unvalidated arguments", async () => {
    const fn = createSafeFn()
      .args<[{ userId: string }, { name: string }]>(null, z.object({ name: z.string() }))
      .handler(async ({ args }) => {
        const [userCtx, validatedInput] = args;
        return {
          userId: userCtx.userId,
          name: validatedInput.name,
        };
      });

    const result = await fn({ userId: "123" }, { name: "John" });
    expect(result).toEqual({
      userId: "123",
      name: "John",
    });
  });

  it("should validate only non-null schemas", async () => {
    const fn = createSafeFn()
      .args<[string, { email: string }, number]>(
        null,
        z.object({ email: z.string().email() }),
        null,
      )
      .handler(async ({ args }) => {
        const [unvalidatedStr, validatedObj, unvalidatedNum] = args;
        return {
          str: unvalidatedStr,
          email: validatedObj.email,
          num: unvalidatedNum,
        };
      });

    const result = await fn("test", { email: "john@example.com" }, 42);
    expect(result).toEqual({
      str: "test",
      email: "john@example.com",
      num: 42,
    });
  });

  it("should reject invalid validated arguments", async () => {
    const fn = createSafeFn()
      .args(null, z.string())
      .handler(async ({ args }) => args);

    // @ts-expect-error - This should throw an error
    await expect(fn({ any: "object" }, 123)).rejects.toThrow();
  });

  it("should work with zero arguments", async () => {
    const fn = createSafeFn()
      .args()
      .handler(async ({ args }) => ({ argsLength: args.length }));

    const result = await fn();
    expect(result).toEqual({ argsLength: 0 });
  });

  it("should work with all validated arguments", async () => {
    const fn = createSafeFn()
      .args(z.string(), z.number(), z.boolean())
      .handler(async ({ args }) => {
        const [str, num, bool] = args;
        return { str, num, bool };
      });

    const result = await fn("hello", 42, true);
    expect(result).toEqual({
      str: "hello",
      num: 42,
      bool: true,
    });
  });
});

describe("Mutual Exclusivity", () => {
  it("should allow input() method when no args() is used", () => {
    const fn = createSafeFn()
      .input(z.string())
      .handler(async ({ input }) => input);

    // This should compile without errors
    expect(fn).toBeDefined();
  });

  it("should allow args() method when no input() is used", () => {
    const fn = createSafeFn()
      .args(z.string(), z.number())
      .handler(async ({ args }) => args);

    // This should compile without errors
    expect(fn).toBeDefined();
  });

  // Note: Type-level mutual exclusivity is tested by TypeScript compilation
  // If you try to use both .input() and .args(), you get compile-time errors
});

describe("Type-only Variants", () => {
  it("should support type-only signatures with .input<T>()", async () => {
    const fn = createSafeFn()
      .input<{ name: string; age: number }>()
      .handler(async ({ input }) => {
        // input is typed as { name: string; age: number } but unvalidated
        return `${input.name} is ${input.age} years old`;
      });

    // No validation occurs - any object structure is accepted
    const result1 = await fn({ name: "John", age: 25 });
    expect(result1).toBe("John is 25 years old");

    // Even invalid data passes through (type-only, no runtime validation)
    const result2 = await fn({ name: "Jane", age: "invalid" } as any);
    expect(result2).toBe("Jane is invalid years old");
  });

  it("should support schema-less .args<T>() for type-only signatures", async () => {
    const fn = createSafeFn()
      .args<[{ userId: string }, string, number]>()
      .handler(async ({ args }) => {
        const [user, name, age] = args;
        // All arguments are typed but unvalidated
        return `User ${user.userId}: ${name} is ${age} years old`;
      });

    const result1 = await fn({ userId: "123" }, "John", 25);
    expect(result1).toBe("User 123: John is 25 years old");

    // No validation occurs
    const result2 = await fn({ userId: "456" }, "Jane", "invalid" as any);
    expect(result2).toBe("User 456: Jane is invalid years old");
  });

  it("should support zero-argument schema-less variant", async () => {
    const fn = createSafeFn()
      .args<[]>()
      .handler(async ({ args }) => {
        return { called: true, argsLength: args.length };
      });

    const result = await fn();
    expect(result).toEqual({ called: true, argsLength: 0 });
  });

  it("should work with generic priority - input method types override handler types", async () => {
    const fn = createSafeFn()
      .args<[string, number]>() // These types should take priority
      .handler(async ({ args }) => {
        // args should be typed as [string, number] from .args<>, not from handler generics
        const [str, num] = args; // Should be [string, number]
        return `${str}: ${num}`;
      });

    const result = await fn("test", 42);
    expect(result).toBe("test: 42");
    
    // This would be a TypeScript error if handler generics took priority:
    // fn(true, "wrong-types") // Would fail if handler<[boolean, string]> took priority
  });
});

describe("Three Validation Patterns", () => {
  it("should demonstrate type-only pattern", async () => {
    const fn = createSafeFn()
      .args<[{ id: string }, { data: string }]>()
      .handler(async ({ args }) => {
        const [context, payload] = args;
        return { contextId: context.id, data: payload.data };
      });

    const result = await fn({ id: "ctx-1" }, { data: "test" });
    expect(result).toEqual({ contextId: "ctx-1", data: "test" });
  });

  it("should demonstrate mixed validation pattern", async () => {
    const fn = createSafeFn()
      .args<[{ id: string }, { data: string }]>(
        null, // Type-only for context
        z.object({ data: z.string().min(1) }) // Validation for payload
      )
      .handler(async ({ args }) => {
        const [context, payload] = args;
        return { contextId: context.id, data: payload.data };
      });

    const result = await fn({ id: "ctx-1" }, { data: "test" });
    expect(result).toEqual({ contextId: "ctx-1", data: "test" });

    // Should reject invalid validated data
    await expect(fn({ id: "ctx-1" }, { data: "" })).rejects.toThrow();
  });

  it("should demonstrate full validation pattern", async () => {
    const fn = createSafeFn()
      .args(
        z.object({ id: z.string().min(1) }),
        z.object({ data: z.string().min(1) })
      )
      .handler(async ({ args }) => {
        const [context, payload] = args;
        return { contextId: context.id, data: payload.data };
      });

    const result = await fn({ id: "ctx-1" }, { data: "test" });
    expect(result).toEqual({ contextId: "ctx-1", data: "test" });

    // Should reject invalid data in any position
    await expect(fn({ id: "" }, { data: "test" })).rejects.toThrow();
    await expect(fn({ id: "ctx-1" }, { data: "" })).rejects.toThrow();
  });
});
