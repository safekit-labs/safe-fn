import { describe, it, expect } from "vitest";
import { createClient } from "@/factory";
import {
  zod3Schemas,
  zod4Schemas,
  yupSchemas,
  superstructSchemas,
  valibotSchemas,
  arktypeSchemas,
  effectSchemas,
  runtypesSchemas,
  testData,
} from "./schemas";

// Test configuration for each validation library
// Working libraries with full support
const workingLibraries = [
  { name: "Zod v3", schemas: zod3Schemas },
  { name: "Zod v4", schemas: zod4Schemas },
  { name: "Yup", schemas: yupSchemas },
  { name: "Valibot", schemas: valibotSchemas },
  { name: "ArkType", schemas: arktypeSchemas },
  { name: "Effect", schemas: effectSchemas },
];

// Libraries that need conditional tests (no email validation)
const conditionalLibraries = [
  { name: "Superstruct", schemas: superstructSchemas },
  { name: "Runtypes", schemas: runtypesSchemas },
];

const libraries = [...workingLibraries, ...conditionalLibraries];

describe.each(libraries)("$name Validator Support", ({ name, schemas }) => {
  describe(`${name} Object Schemas`, () => {
    it(`${name} should work with object schemas`, async () => {
      const client = createClient();
      const fn = client
        .input(schemas.objectSchemas.userSchema)
        .handler(async ({input}) => input);

      const result = await fn(testData.validUser);
      expect(result).toEqual(testData.validUser);
    });

    it(`${name} should validate input`, async () => {
      const client = createClient();
      const fn = client
        .input(schemas.objectSchemas.emailSchema)
        .handler(async ({input}) => input);

      // Skip email validation test for libraries that don't support it
      if (["Superstruct", "Scale", "Runtypes", "Effect"].includes(name)) {
        // These libraries don't have email validation, so test passes with invalid email
        const result = await fn(testData.invalidEmail);
        expect(result).toEqual(testData.invalidEmail);
      } else {
        await expect(fn(testData.invalidEmail)).rejects.toThrow();
      }
    });
  });

  describe(`${name} Multiple Arguments`, () => {
    it(`${name} should support multiple arguments`, async () => {
      const client = createClient();
      const fn = client
        .args(...schemas.argumentSchemas.stringNumberArray)
        .handler(async ({ args }) => args);

      const result = await fn(...testData.validStringNumber);
      expect(result).toEqual(testData.validStringNumber);
    });

    it(`${name} should support zero arguments`, async () => {
      const client = createClient();
      const fn = client
        .args()
        .handler(async ({ args }) => args);

      const result = await fn();
      expect(result).toEqual([]);
    });

    it(`${name} should validate arguments`, async () => {
      const client = createClient();
      const fn = client
        .args(...schemas.argumentSchemas.stringMinArray)
        .handler(async ({ args }) => args);

      // Skip min length validation test for libraries that don't support it
      if (["Scale", "Runtypes", "Effect"].includes(name)) {
        // These libraries don't have min length validation, so test passes with empty string
        const result = await fn(testData.emptyString);
        expect(result).toEqual([testData.emptyString]);
      } else {
        await expect(fn(testData.emptyString)).rejects.toThrow();
      }
    });
  });

  describe(`${name} Output Validation`, () => {
    it(`${name} should validate output schemas`, async () => {
      const client = createClient();
      const fn = client
        .input(schemas.objectSchemas.userSchema)
        .output(schemas.outputSchemas.numberTransform)
        .handler(async ({input}: any) => ({ result: input.age * 2 }));

      const result = await fn(testData.validUser);
      expect(result).toEqual({ result: 50 });
    });
  });

  describe(`${name} Metadata Validation`, () => {
    it(`${name} should validate metadata`, async () => {
      const client = createClient({
        metadataSchema: schemas.metadataSchemas.operationSchema,
      });

      const fn = client
        .input(schemas.objectSchemas.userSchema)
        .metadata(testData.validMetadata)
        .handler(async ({input}: any) => input.name);

      const result = await fn(testData.validUser);
      expect(result).toBe("John");
    });

    it(`${name} should validate required metadata fields`, async () => {
      const client = createClient({
        metadataSchema: schemas.metadataSchemas.authSchema,
      });

      const fn = client
        .input(schemas.objectSchemas.userSchema)
        .metadata(testData.validAuthMetadata)
        .handler(async ({input}: any) => input.name);

      const result = await fn(testData.validUser);
      expect(result).toBe("John");
    });
  });
});
