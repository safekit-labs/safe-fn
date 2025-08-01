import { describe, it, expect } from "vitest";
import { createClient } from "@/factory";

import type { StandardSchemaV1 } from "@/standard-schema";

// ========================================================================
// MOCK SCHEMA UTILITIES
// ========================================================================

const createMockSchema = <T>(validator: (input: unknown) => T): StandardSchemaV1<T> =>
  ({
    "~standard": {
      version: 1,
      vendor: "mock",
      validate: (input: unknown) => {
        try {
          const value = validator(input);
          return { value, issues: undefined };
        } catch (error) {
          return {
            value: undefined as any,
            issues: [{ message: error instanceof Error ? error.message : String(error) }],
          };
        }
      },
    },
  }) as StandardSchemaV1<T>;

// ========================================================================
// TEST SCHEMAS
// ========================================================================

const stringSchema = createMockSchema<string>((input: unknown) => {
  if (typeof input !== "string") throw new Error("Expected string");
  return input;
});

const numberSchema = createMockSchema<number>((input: unknown) => {
  if (typeof input !== "number") throw new Error("Expected number");
  return input;
});

const objectSchema = createMockSchema<{ name: string; age: number }>((input: unknown) => {
  if (!input || typeof input !== "object") throw new Error("Expected object");
  const obj = input as any;
  if (typeof obj.name !== "string") throw new Error("Expected name to be string");
  if (typeof obj.age !== "number") throw new Error("Expected age to be number");
  return { name: obj.name, age: obj.age };
});

// ========================================================================
// STANDARD SCHEMA V1 TESTS
// ========================================================================

describe("Standard Schema Support", () => {
  // ========================================================================
  // INPUT VALIDATION TESTS
  // ========================================================================

  describe("Input Validation", () => {
    it("should validate input with Standard Schema", async () => {
      const client = createClient();
      const fn = client
        .input(stringSchema)
        .handler(async ({ input }) => `Hello, ${input}!`);

      const result = await fn("World", {});
      expect(result).toBe("Hello, World!");
    });

    it("should throw validation error for invalid input", async () => {
      const client = createClient();
      const fn = client
        .input(numberSchema)
        .handler(async ({ input }) => input * 2);

      await expect(fn("not-a-number" as any, {})).rejects.toThrow("Expected number");
    });

    it("should work with complex Standard Schema objects", async () => {
      const client = createClient();
      const fn = client
        .input(objectSchema)
        .handler(async ({ input }) => `${input.name} is ${input.age} years old`);

      const result = await fn({ name: "Alice", age: 30 }, {});
      expect(result).toBe("Alice is 30 years old");
    });
  });

  // ========================================================================
  // OUTPUT VALIDATION TESTS
  // ========================================================================

  describe("Output Validation", () => {
    it("should validate output with Standard Schema", async () => {
      const client = createClient();
      const fn = client.output(stringSchema).handler(async () => "valid string output");

      const result = await fn();
      expect(result).toBe("valid string output");
    });

    it("should handle output validation errors", async () => {
      const client = createClient();
      const fn = client.output(stringSchema).handler(async () => 123 as any);

      await expect(fn()).rejects.toThrow("Expected string");
    });

    it("should validate both input and output schemas", async () => {
      const client = createClient();
      const fn = client
        .input(objectSchema)
        .output(stringSchema)
        .handler(async ({ input }) => `${input.name} is ${input.age} years old`);

      const result = await fn({ name: "Alice", age: 30 }, {});
      expect(result).toBe("Alice is 30 years old");
    });
  });

  // ========================================================================
  // COMPATIBILITY TESTS
  // ========================================================================
});
