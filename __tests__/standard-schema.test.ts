// import { describe, it, expect } from 'vitest';
// import type { StandardSchemaV1 } from '@standard-schema/spec';
// import { createSafeFnClient } from '@/index';

// const createMockSchema = <T>(validator: (input: unknown) => T): StandardSchemaV1<T> => ({
//   '~standard': {
//     version: 1,
//     vendor: 'mock',
//     validate: (input: unknown) => {
//       try {
//         const value = validator(input);
//         return { value, issues: undefined };
//       } catch (error) {
//         return {
//           value: undefined as any,
//           issues: [{ message: error instanceof Error ? error.message : String(error) }]
//         };
//       }
//     }
//   }
// } as StandardSchemaV1<T>);

// const stringSchema = createMockSchema<string>((input: unknown) => {
//   if (typeof input !== 'string') throw new Error('Expected string');
//   return input;
// });

// const numberSchema = createMockSchema<number>((input: unknown) => {
//   if (typeof input !== 'number') throw new Error('Expected number');
//   return input;
// });

// const objectSchema = createMockSchema<{ name: string; age: number }>((input: unknown) => {
//   if (!input || typeof input !== 'object') throw new Error('Expected object');
//   const obj = input as any;
//   if (typeof obj.name !== 'string') throw new Error('Expected name to be string');
//   if (typeof obj.age !== 'number') throw new Error('Expected age to be number');
//   return { name: obj.name, age: obj.age };
// });

// describe('Standard Schema Support', () => {
//   it('should validate input with Standard Schema', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(stringSchema)
//       .handler(async ({ parsedInput }) => `Hello, ${parsedInput}!`);

//     const result = await fn('World', {});
//     expect(result).toBe('Hello, World!');
//   });

//   it('should throw validation error for invalid input', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(numberSchema)
//       .handler(async ({ parsedInput }) => parsedInput * 2);

//     await expect(fn('not-a-number' as any, {})).rejects.toThrow('Expected number');
//   });

//   it('should validate output with Standard Schema', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .output(stringSchema)
//       .handler(async () => 'valid string output');

//     const result = await fn({}, {});
//     expect(result).toBe('valid string output');
//   });

//   it('should work with complex Standard Schema objects', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(objectSchema)
//       .output(stringSchema)
//       .handler(async ({ parsedInput }) => `${parsedInput.name} is ${parsedInput.age} years old`);

//     const result = await fn({ name: 'Alice', age: 30 }, {});
//     expect(result).toBe('Alice is 30 years old');
//   });

//   it('should handle output validation errors', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .output(stringSchema)
//       .handler(async () => 123 as any);

//     await expect(fn({}, {})).rejects.toThrow('Expected string');
//   });

//   it('should work with function validators', async () => {
//     const client = createSafeFnClient();

//     const legacyFn = client
//       .input((input: unknown) => {
//         if (typeof input !== 'string') throw new Error('Expected string');
//         return input;
//       })
//       .handler(async ({ parsedInput }) => parsedInput.toUpperCase());

//     const standardFn = client
//       .input(stringSchema)
//       .handler(async ({ parsedInput }) => parsedInput.toLowerCase());

//     const legacyResult = await legacyFn('hello', {});
//     const standardResult = await standardFn('WORLD', {});

//     expect(legacyResult).toBe('HELLO');
//     expect(standardResult).toBe('world');
//   });
// });