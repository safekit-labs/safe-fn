import { describe, it, expect } from "vitest";
import { z } from "zod/v4";
import { createSafeFnClient } from "@/factory";

// ========================================================================
// OUTPUT FUNCTIONALITY TESTS
// ========================================================================

describe("Output Functionality", () => {
  // ========================================================================
  // TYPE-ONLY OUTPUT TESTS
  // ========================================================================

  describe("Type-only output definitions", () => {
    it("should allow type-only output definition with .output<OutputType>()", async () => {
      interface UserResponse {
        id: number;
        name: string;
        email: string;
      }

      const safeFnClient = createSafeFnClient();
      
      const fn = safeFnClient
        .input(z.object({ userId: z.number() }))
        .output<UserResponse>()
        .handler(async ({ input }) => {
          return {
            id: input.userId,
            name: "John Doe",
            email: "john@example.com",
          };
        });

      const result = await fn({ userId: 123 });
      
      expect(result).toEqual({
        id: 123,
        name: "John Doe",
        email: "john@example.com",
      });
    });

    it("should not validate output when using type-only definition", async () => {
      interface UserResponse {
        id: number;
        name: string;
        email: string;
      }

      const safeFnClient = createSafeFnClient();
      
      const fn = safeFnClient
        .input(z.object({ userId: z.number() }))
        .output<UserResponse>()
        .handler(async ({ input }) => {
          // Return data that doesn't match the type (should not be validated)
          return {
            id: input.userId,
            name: "John Doe",
            // Missing email field, but no validation should occur
          } as UserResponse;
        });

      const result = await fn({ userId: 123 });
      
      expect(result).toEqual({
        id: 123,
        name: "John Doe",
      });
    });

    it("should work with no input and type-only output", async () => {
      interface SystemInfo {
        version: string;
        uptime: number;
      }

      const safeFnClient = createSafeFnClient();
      
      const fn = safeFnClient
        .output<SystemInfo>()
        .handler(async () => {
          return {
            version: "1.0.0",
            uptime: 3600,
          };
        });

      const result = await fn();
      
      expect(result).toEqual({
        version: "1.0.0",
        uptime: 3600,
      });
    });
  });

  // ========================================================================
  // SCHEMA-BASED OUTPUT TESTS
  // ========================================================================

  describe("Schema-based output definitions", () => {
    it("should validate output when schema is provided", async () => {
      const outputSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      const safeFnClient = createSafeFnClient();
      
      const fn = safeFnClient
        .input(z.object({ userId: z.number() }))
        .output(outputSchema)
        .handler(async ({ input }) => {
          return {
            id: input.userId,
            name: "John Doe",
            email: "john@example.com",
          };
        });

      const result = await fn({ userId: 123 });
      
      expect(result).toEqual({
        id: 123,
        name: "John Doe",
        email: "john@example.com",
      });
    });

    it("should throw error when output validation fails", async () => {
      const outputSchema = z.object({
        id: z.number(),
        name: z.string(),
        email: z.string().email(),
      });

      const safeFnClient = createSafeFnClient();
      
      const fn = safeFnClient
        .input(z.object({ userId: z.number() }))
        .output(outputSchema)
        .handler(async ({ input }) => {
          return {
            id: input.userId,
            name: "John Doe",
            email: "invalid-email", // This should cause validation to fail
          };
        });

      await expect(fn({ userId: 123 })).rejects.toThrow();
    });

    it("should work with primitive output schema", async () => {
      const safeFnClient = createSafeFnClient();
      
      const fn = safeFnClient
        .input(z.object({ value: z.number() }))
        .output(z.string())
        .handler(async ({ input }) => {
          return input.value.toString();
        });

      const result = await fn({ value: 42 });
      
      expect(result).toBe("42");
    });
  });

  // ========================================================================
  // COMBINED FUNCTIONALITY TESTS
  // ========================================================================

  describe("Combined functionality", () => {
    it("should work with args input and type-only output", async () => {
      interface CalculationResult {
        sum: number;
        product: number;
      }

      const safeFnClient = createSafeFnClient();
      
      const fn = safeFnClient
        .args(z.number(), z.number())
        .output<CalculationResult>()
        .handler(async ({ args }) => {
          const [a, b] = args;
          return {
            sum: a + b,
            product: a * b,
          };
        });

      const result = await fn(5, 10);
      
      expect(result).toEqual({
        sum: 15,
        product: 50,
      });
    });

    it("should work with context and type-only output", async () => {
      interface UserData {
        id: number;
        name: string;
        contextUserId: string;
      }

      const safeFnClient = createSafeFnClient({
        defaultContext: { userId: "default-user" },
      });
      
      const fn = safeFnClient
        .input(z.object({ id: z.number(), name: z.string() }))
        .output<UserData>()
        .handler(async ({ input, ctx }) => {
          return {
            id: input.id,
            name: input.name,
            contextUserId: ctx.userId,
          };
        });

      const result = await fn({ id: 1, name: "Alice" });
      
      expect(result).toEqual({
        id: 1,
        name: "Alice",
        contextUserId: "default-user",
      });
    });

    it("should work with middleware and type-only output", async () => {
      interface ProcessedData {
        originalValue: string;
        processedValue: string;
        hasMiddleware: boolean;
      }

      const safeFnClient = createSafeFnClient();
      
      const fn = safeFnClient
        .input(z.object({ value: z.string() }))
        .output<ProcessedData>()
        .handler(async ({ input }) => {
          return {
            originalValue: input.value,
            processedValue: input.value.toUpperCase(),
            hasMiddleware: true,
          };
        });

      const result = await fn({ value: "hello" });
      
      expect(result).toEqual({
        originalValue: "hello",
        processedValue: "HELLO",
        hasMiddleware: true,
      });
    });
  });
});