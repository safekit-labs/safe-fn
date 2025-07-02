import { describe, it, expect, vi } from "vitest";
import { createSafeFnClient } from "@/factory";
import { z } from "zod";

describe("Error Handling", () => {
  it("should call onError when handler throws", async () => {
    const onError = vi.fn();
    const safeFn = createSafeFnClient({ onError })
      .input(z.object({ name: z.string() }))
      .handler(async () => {
        throw new Error("Handler error");
      });

    await expect(safeFn({ name: "test" })).rejects.toThrow("Handler error");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Handler error" }),
      expect.any(Object)
    );
  });

  it("should allow onError to recover by returning success object", async () => {
    const onError = vi.fn().mockReturnValue({ success: true, data: "recovered" });
    const safeFn = createSafeFnClient({ onError })
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
    const safeFn = createSafeFnClient({ onError })
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

    const safeFn = createSafeFnClient({ onError })
      .use(middleware)
      .input(z.object({ name: z.string() }))
      .handler(async () => {
        throw new Error("Original error");
      });

    await expect(safeFn({ name: "test" })).rejects.toThrow("Middleware caught error");
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Middleware caught error" }),
      expect.any(Object)
    );
  });

  it("should not wrap validation errors", async () => {
    const onError = vi.fn();
    const safeFn = createSafeFnClient({ onError })
      .input(z.object({ age: z.number() }))
      .handler(async () => "success");

    await expect(safeFn({ age: "invalid" as any })).rejects.toThrow();
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ 
        issues: expect.arrayContaining([
          expect.objectContaining({ code: "invalid_type" })
        ])
      }),
      expect.any(Object)
    );
  });
});