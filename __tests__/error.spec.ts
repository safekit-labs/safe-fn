import { describe, it, expect, vi } from "vitest";
import { createClient } from "@/factory";
import { z } from "zod";

describe("Error Handling", () => {
  it("should call onError when handler throws", async () => {
    const onError = vi.fn();
    const safeFn = createClient({ onError })
      .input(z.object({ name: z.string() }))
      .handler(async () => {
        throw new Error("Handler error");
      });

    await expect(safeFn({ name: "test" })).rejects.toThrow("Handler error");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: "Handler error" }),
        ctx: expect.any(Object),
        metadata: expect.any(Object),
        rawInput: { name: "test" },
        rawArgs: undefined,
        valid: expect.any(Function)
      })
    );
  });

  it("should allow onError to recover by returning success object", async () => {
    const onError = vi.fn().mockReturnValue({ success: true, data: "recovered" });
    const safeFn = createClient({ onError })
      .input(z.object({ name: z.string() }))
      .handler(async () => {
        throw new Error("Handler error");
      });

    const result = await safeFn({ name: "test" });
    expect(result).toBe("recovered");
    expect(onError).toHaveBeenCalled();
  });

  it("should allow onError to transform error", async () => {
    const onError = vi.fn().mockReturnValue(new Error("Transformed error"));
    const safeFn = createClient({ onError })
      .input(z.object({ name: z.string() }))
      .handler(async () => {
        throw new Error("Original error");
      });

    await expect(safeFn({ name: "test" })).rejects.toThrow("Transformed error");
  });

  it("should allow middleware to catch and rethrow errors", async () => {
    const onError = vi.fn();
    const middleware = vi.fn(async ({ next }) => {
      try {
        return await next();
      } catch {
        throw new Error("Middleware caught error");
      }
    });

    const safeFn = createClient({ onError })
      .use(middleware)
      .input(z.object({ name: z.string() }))
      .handler(async () => {
        throw new Error("Original error");
      });

    await expect(safeFn({ name: "test" })).rejects.toThrow("Middleware caught error");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: "Middleware caught error" }),
        ctx: expect.any(Object),
        metadata: expect.any(Object),
        rawInput: { name: "test" },
        valid: expect.any(Function)
      })
    );
  });

  it("should not wrap validation errors", async () => {
    const onError = vi.fn();
    const safeFn = createClient({ onError })
      .input(z.object({ age: z.number() }))
      .handler(async () => "success");

    await expect(safeFn({ age: "invalid" as any })).rejects.toThrow();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          issues: expect.arrayContaining([
            expect.objectContaining({ code: "invalid_type" })
          ])
        }),
        ctx: expect.any(Object),
        metadata: expect.any(Object),
        rawInput: { age: "invalid" },
        valid: expect.any(Function)
      })
    );
  });

  it("should pass correct context and metadata to onError", async () => {
    const onError = vi.fn();
    const defaultContext = { userId: "test-user", role: "admin" };
    const metadata = { operation: "test", version: "1.0" };

    const safeFn = createClient({
      onError,
      defaultContext
    })
      .metadata(metadata)
      .input(z.object({ name: z.string() }))
      .handler(async () => {
        throw new Error("Handler error");
      });

    const additionalContext = { requestId: "req-123" } as any;
    await expect(safeFn({ name: "test" }, additionalContext)).rejects.toThrow("Handler error");

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: "Handler error" }),
        ctx: expect.objectContaining({
          userId: "test-user",
          role: "admin",
          requestId: "req-123"
        }),
        metadata: expect.objectContaining({
          operation: "test",
          version: "1.0"
        }),
        rawInput: { name: "test" },
        valid: expect.any(Function)
      })
    );
  });

  it("should pass metadata context from middleware to onError", async () => {
    const onError = vi.fn();
    const middleware = vi.fn(async ({ next }) => {
      return next({ ctx: { middlewareData: "added-by-middleware" } });
    });

    const safeFn = createClient({ onError })
      .use(middleware)
      .input(z.object({ name: z.string() }))
      .handler(async () => {
        throw new Error("Handler error");
      });

    await expect(safeFn({ name: "test" })).rejects.toThrow("Handler error");

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({ message: "Handler error" }),
        ctx: expect.objectContaining({
          middlewareData: "added-by-middleware"
        }),
        metadata: expect.any(Object),
        rawInput: { name: "test" },
        valid: expect.any(Function)
      })
    );
  });
});