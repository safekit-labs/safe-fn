import { describe, it, expect } from "vitest";
import { z } from "zod";
import { createClient } from "@/factory";

describe("Coerce Validation", () => {
  // ========================================================================
  // COERCE WITH GENERICS
  // ========================================================================

  describe("Coerce with Generics", () => {
    it("should handle coerce with string | number generic input", async () => {
      const schema = z.object({
        page: z.coerce.number<string | number>(),
      });

      const client = createClient();
      const fn = client
        .input(schema)
        .handler(({ input }) => {
          // TypeScript should infer input.page as number (output type)
          expect(typeof input.page).toBe("number");
          return { receivedPage: input.page, type: typeof input.page };
        });

      // Should accept string input (matches generic)
      const result1 = await fn({ page: "42" }, {});
      expect(result1).toEqual({ receivedPage: 42, type: "number" });

      // Should accept number input (matches generic)
      const result2 = await fn({ page: 42 }, {});
      expect(result2).toEqual({ receivedPage: 42, type: "number" });
    });

    it("should handle coerce with string | boolean generic input", async () => {
      const schema = z.object({
        active: z.coerce.boolean<string | boolean>(),
      });

      const client = createClient();
      const fn = client
        .input(schema)
        .handler(({ input }) => {
          // TypeScript should infer input.active as boolean (output type)
          expect(typeof input.active).toBe("boolean");
          return { receivedActive: input.active, type: typeof input.active };
        });

      // Should accept string input (matches generic)
      const result1 = await fn({ active: "true" }, {});
      expect(result1).toEqual({ receivedActive: true, type: "boolean" });

      // Should accept boolean input (matches generic)
      const result2 = await fn({ active: false }, {});
      expect(result2).toEqual({ receivedActive: false, type: "boolean" });
    });

    it("should handle complex coerce schema with multiple types", async () => {
      const schema = z.object({
        id: z.coerce.number<string | number>(),
        count: z.coerce.number<string>(),
        enabled: z.coerce.boolean<string | boolean>(),
      });

      const client = createClient();
      const fn = client
        .input(schema)
        .handler(({ input }) => ({
          id: input.id,
          count: input.count,
          enabled: input.enabled,
          types: {
            id: typeof input.id,
            count: typeof input.count,
            enabled: typeof input.enabled,
          },
        }));

      const result = await fn(
        {
          id: "123", // string -> number
          count: "456", // string -> number
          enabled: false, // boolean -> boolean
        },
        {}
      );

      expect(result).toEqual({
        id: 123,
        count: 456,
        enabled: false,
        types: {
          id: "number",
          count: "number",
          enabled: "boolean",
        },
      });
    });
  });

  // ========================================================================
  // COERCE WITHOUT GENERICS
  // ========================================================================

  describe("Coerce without Generics", () => {
    it("should handle coerce without generics (unknown input)", async () => {
      const schema = z.object({
        page: z.coerce.number(),
      });

      const client = createClient();
      const fn = client
        .input(schema)
        .handler(({ input }) => {
          // TypeScript should infer input.page as number (output type)
          expect(typeof input.page).toBe("number");
          return { receivedPage: input.page, type: typeof input.page };
        });

      // Should accept various input types and coerce to number
      const result1 = await fn({ page: "42" }, {});
      expect(result1).toEqual({ receivedPage: 42, type: "number" });

      const result2 = await fn({ page: 42 }, {});
      expect(result2).toEqual({ receivedPage: 42, type: "number" });

      const result3 = await fn({ page: true }, {});
      expect(result3).toEqual({ receivedPage: 1, type: "number" });
    });

    it("should handle multiple coerce types without generics", async () => {
      const schema = z.object({
        num: z.coerce.number(),
        str: z.coerce.string(),
        bool: z.coerce.boolean(),
      });

      const client = createClient();
      const fn = client
        .input(schema)
        .handler(({ input }) => ({
          values: {
            num: input.num,
            str: input.str,
            bool: input.bool,
          },
          types: {
            num: typeof input.num,
            str: typeof input.str,
            bool: typeof input.bool,
          },
        }));

      const result = await fn(
        {
          num: "123",
          str: 456,
          bool: false,
        },
        {}
      );

      expect(result).toEqual({
        values: {
          num: 123,
          str: "456",
          bool: false,
        },
        types: {
          num: "number",
          str: "string",
          bool: "boolean",
        },
      });
    });
  });

  // ========================================================================
  // ARGS WITH COERCE
  // ========================================================================

  describe("Args with Coerce", () => {
    it("should handle coerce in args method", async () => {
      const client = createClient();
      const fn = client
        .args(
          z.object({ id: z.coerce.number<string>() }),
          z.object({ active: z.coerce.boolean<string | boolean>() })
        )
        .handler(({ args }) => {
          const [idObj, activeObj] = args;
          return {
            id: idObj.id,
            active: activeObj.active,
            types: {
              id: typeof idObj.id,
              active: typeof activeObj.active,
            },
          };
        });

      const result = await fn({ id: "42" }, { active: "true" });
      expect(result).toEqual({
        id: 42,
        active: true,
        types: {
          id: "number",
          active: "boolean",
        },
      });
    });
  });

  // ========================================================================
  // OUTPUT COERCE
  // ========================================================================

  describe("Output Coerce", () => {
    it("should handle coerce in output validation", async () => {
      const outputSchema = z.object({
        result: z.coerce.string(),
        count: z.coerce.number<string | number>(),
      });

      const client = createClient();
      const fn = client
        .output(outputSchema)
        .handler(() => ({
          result: 42, // number -> string
          count: "100", // string -> number
        }));

      const result = await fn();
      expect(result).toEqual({
        result: "42",
        count: 100,
      });
      expect(typeof result.result).toBe("string");
      expect(typeof result.count).toBe("number");
    });
  });

  // ========================================================================
  // ERROR CASES
  // ========================================================================

  describe("Error Cases", () => {
    it("should handle coerce validation errors", async () => {
      const schema = z.object({
        page: z.coerce.number(),
      });

      const client = createClient();
      const fn = client
        .input(schema)
        .handler(({ input }) => input);

      // Should fail for values that can't be coerced to valid numbers
      await expect(fn({ page: Symbol("test") }, {})).rejects.toThrow();
      await expect(fn({ page: undefined }, {})).rejects.toThrow();
    });
  });

  // ========================================================================
  // TYPE INFERENCE VERIFICATION
  // ========================================================================

  describe("Type Inference", () => {
    it("should properly infer types with coerce generics", async () => {
      const inputSchema = z.object({
        id: z.coerce.number<string | number>(),
        name: z.string(),
      });

      const outputSchema = z.object({
        processedId: z.coerce.string(),
        processedName: z.string(),
      });

      const client = createClient();
      const fn = client
        .input(inputSchema)
        .output(outputSchema)
        .handler(({ input }) => {
          // Verify input types are correctly inferred as output types
          const id: number = input.id; // Should be number (coerced output)
          const name: string = input.name; // Should be string

          return {
            processedId: id, // number -> coerced to string by output schema
            processedName: name,
          };
        });

      const result = await fn({ id: "42", name: "test" }, {});
      expect(result).toEqual({
        processedId: "42", // coerced to string
        processedName: "test",
      });
      expect(typeof result.processedId).toBe("string");
      expect(typeof result.processedName).toBe("string");
    });
  });
});