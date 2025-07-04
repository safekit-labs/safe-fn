import { describe, it, expect } from "vitest";
import { createSafeFn } from "@/safe-fn";
import { z } from "zod/v4";

describe("Input Patterns", () => {
  describe("direct execution", () => {
    it("should support no input (omitted .input())", async () => {
      const fn = createSafeFn().handler(async () => "result");
      
      const result = await fn();
      expect(result).toBe("result");
    });

    it("should support no input (explicit .input())", async () => {
      const fn = createSafeFn().input().handler(async () => "result");
      
      const result = await fn();
      expect(result).toBe("result");
    });

    it("should support typed input without validation", async () => {
      const fn = createSafeFn().input<string>().handler(async ({ input }) => input);
      
      const result = await fn("test");
      expect(result).toBe("test");
    });

    it("should not validate typed input without schema", async () => {
      const fn = createSafeFn().input<{ name: string }>().handler(async ({ input }) => input);
      
      const result = await fn({ invalid: "property" } as any);
      expect(result).toEqual({ invalid: "property" });
    });

    it("should support input with validation", async () => {
      const fn = createSafeFn().input(z.string()).handler(async ({ input }) => input);
      
      const result = await fn("test");
      expect(result).toBe("test");
    });
  });

  describe("with context API", () => {
    const ctx = { logger: console };

    it("should support no input (omitted .input())", async () => {
      const fn = createSafeFn().context<typeof ctx>().handler(async () => "result");
      
      const result = await fn.withContext(ctx).execute();
      expect(result).toBe("result");
    });

    it("should support no input (explicit .input())", async () => {
      const fn = createSafeFn().context<typeof ctx>().input().handler(async () => "result");
      
      const result = await fn.withContext(ctx).execute();
      expect(result).toBe("result");
    });

    it("should support typed input without validation", async () => {
      const fn = createSafeFn().context<typeof ctx>().input<string>().handler(async ({ input }) => input);
      
      const result = await fn.withContext(ctx).execute("test");
      expect(result).toBe("test");
    });

    it("should not validate typed input without schema", async () => {
      const fn = createSafeFn().context<typeof ctx>().input<{ name: string }>().handler(async ({ input }) => input);
      
      const result = await fn.withContext(ctx).execute({ invalid: "property" } as any);
      expect(result).toEqual({ invalid: "property" });
    });

    it("should support input with validation", async () => {
      const fn = createSafeFn().context<typeof ctx>().input(z.string()).handler(async ({ input }) => input);
      
      const result = await fn.withContext(ctx).execute("test");
      expect(result).toBe("test");
    });
  });

});