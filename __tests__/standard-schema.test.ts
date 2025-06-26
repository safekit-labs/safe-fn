import { describe, it, expect } from 'vitest';
import type { StandardSchemaV1 } from '@standard-schema/spec';

import { createSafeFnClient } from '@/index';

// Mock Standard Schema implementation for testing
const createMockStandardSchema = <T>(validator: (input: unknown) => T): StandardSchemaV1<T> => {
  return {
    '~standard': {
      version: 1,
      vendor: 'mock',
      validate: (input: unknown) => {
        try {
          const value = validator(input);
          return { value, issues: undefined };
        } catch (error) {
          return {
            value: undefined as any,
            issues: [{ message: error instanceof Error ? error.message : String(error) }]
          };
        }
      }
    }
  } as StandardSchemaV1<T>;
};

// Simple validators for testing
const stringSchema = createMockStandardSchema<string>((input: unknown) => {
  if (typeof input !== 'string') {
    throw new Error('Expected string');
  }
  return input;
});

const numberSchema = createMockStandardSchema<number>((input: unknown) => {
  if (typeof input !== 'number') {
    throw new Error('Expected number');
  }
  return input;
});

const objectSchema = createMockStandardSchema<{ name: string; age: number }>((input: unknown) => {
  if (!input || typeof input !== 'object') {
    throw new Error('Expected object');
  }
  const obj = input as any;
  if (typeof obj.name !== 'string') {
    throw new Error('Expected name to be string');
  }
  if (typeof obj.age !== 'number') {
    throw new Error('Expected age to be number');
  }
  return { name: obj.name, age: obj.age };
});

describe('Standard Schema Support', () => {
  it('should work with Standard Schema input validation', async () => {
    const client = createSafeFnClient();

    const testFunction = client
      .meta({ operation: 'test-standard-schema' })
      .input(stringSchema)
      .handler(async ({ parsedInput }) => {
        return `Hello, ${parsedInput}!`;
      });

    const result = await testFunction('World');
    expect(result).toBe('Hello, World!');
  });

  it('should throw validation error for invalid Standard Schema input', async () => {
    const client = createSafeFnClient();

    const testFunction = client
      .meta({ operation: 'test-validation-error' })
      .input(numberSchema)
      .handler(async ({ parsedInput }) => {
        return parsedInput * 2;
      });

    await expect(testFunction('not-a-number' as any)).rejects.toThrow('Expected number');
  });

  it('should work with Standard Schema output validation', async () => {
    const client = createSafeFnClient();

    const testFunction = client
      .meta({ operation: 'test-output-validation' })
      .output(stringSchema)
      .handler(async () => {
        return 'valid string output';
      });

    const result = await testFunction({});
    expect(result).toBe('valid string output');
  });

  it('should work with complex Standard Schema objects', async () => {
    const client = createSafeFnClient();

    const testFunction = client
      .meta({ operation: 'test-complex-schema' })
      .input(objectSchema)
      .output(stringSchema)
      .handler(async ({ parsedInput }) => {
        return `${parsedInput.name} is ${parsedInput.age} years old`;
      });

    const result = await testFunction({ name: 'Alice', age: 30 });
    expect(result).toBe('Alice is 30 years old');
  });

  it('should handle validation errors in output schema', async () => {
    const client = createSafeFnClient();

    const testFunction = client
      .meta({ operation: 'test-output-error' })
      .output(stringSchema)
      .handler(async () => {
        return 123 as any; // Invalid output type
      });

    await expect(testFunction({})).rejects.toThrow('Expected string');
  });

  it('should work alongside legacy function validators', async () => {
    const client = createSafeFnClient();

    // Test function validator (legacy style)
    const legacyFunction = client
      .meta({ operation: 'test-legacy' })
      .input((input: unknown) => {
        if (typeof input !== 'string') throw new Error('Expected string');
        return input;
      })
      .handler(async ({ parsedInput }) => {
        return parsedInput.toUpperCase();
      });

    // Test Standard Schema (new style)
    const standardFunction = client
      .meta({ operation: 'test-standard' })
      .input(stringSchema)
      .handler(async ({ parsedInput }) => {
        return parsedInput.toLowerCase();
      });

    const legacyResult = await legacyFunction('hello');
    const standardResult = await standardFunction('WORLD');

    expect(legacyResult).toBe('HELLO');
    expect(standardResult).toBe('world');
  });
});