import { describe, it, expect } from "vitest";
import { createSafeFn } from "@/safe-fn";
import { z } from "zod/v4";

describe("Output Patterns", () => {
  describe("direct execution", () => {
    it("should support void output", async () => {
      const fn = createSafeFn().output().handler(async () => {
        // side effect only, no return value
      });
      
      const result = await fn();
      expect(result).toBeUndefined();
    });

    it("should support typed output without validation", async () => {
      const fn = createSafeFn().output<string>().handler(async () => "typed");
      
      const result = await fn();
      expect(result).toBe("typed");
    });

    it("should not validate typed output without schema", async () => {
      const fn = createSafeFn().output<{ name: string }>().handler(async () => ({ invalid: "property" } as any));
      
      const result = await fn();
      expect(result).toEqual({ invalid: "property" });
    });

    it("should support output with validation", async () => {
      const fn = createSafeFn().output(z.string()).handler(async () => "validated");
      
      const result = await fn();
      expect(result).toBe("validated");
    });

    it("should throw error when output validation fails", async () => {
      const fn = createSafeFn().output(z.string()).handler(async () => 123 as any);
      
      await expect(fn()).rejects.toThrow();
    });
  });

  describe("with context API", () => {
    const ctx = { logger: console };

    it("should support void output", async () => {
      const fn = createSafeFn().context<typeof ctx>().output().handler(async () => {
        // side effect only, no return value
      });
      
      const result = await fn.withContext(ctx).execute();
      expect(result).toBeUndefined();
    });

    it("should support typed output without validation", async () => {
      const fn = createSafeFn().context<typeof ctx>().output<string>().handler(async () => "typed");
      
      const result = await fn.withContext(ctx).execute();
      expect(result).toBe("typed");
    });

    it("should not validate typed output without schema", async () => {
      const fn = createSafeFn().context<typeof ctx>().output<{ name: string }>().handler(async () => ({ invalid: "property" } as any));
      
      const result = await fn.withContext(ctx).execute();
      expect(result).toEqual({ invalid: "property" });
    });

    it("should support output with validation", async () => {
      const fn = createSafeFn().context<typeof ctx>().output(z.string()).handler(async () => "validated");
      
      const result = await fn.withContext(ctx).execute();
      expect(result).toBe("validated");
    });

    it("should throw error when output validation fails", async () => {
      const fn = createSafeFn().context<typeof ctx>().output(z.string()).handler(async () => 123 as any);
      
      await expect(fn.withContext(ctx).execute()).rejects.toThrow();
    });
  });
});