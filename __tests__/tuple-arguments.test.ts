// import { describe, it, expect } from 'vitest';
// import { z } from 'zod';
// import { createSafeFnClient } from '@/index';


// describe('SafeFn - Tuple Arguments Support', () => {
//   it('should handle zero arguments', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(z.tuple([]))
//       .handler(async () => ({ success: true }));

//     const result = await fn();
//     expect(result).toEqual({ success: true });
//   });

//   it('should handle single argument', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(z.tuple([z.string()]))
//       .handler(async ({ args }) => {
//         const [arg] = args;
//         return { received: arg };
//       });

//     const result = await fn('test');
//     expect(result).toEqual({ received: 'test' });
//   });

//   it('should handle two arguments', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(z.tuple([z.string(), z.number()]))
//       .handler(async ({ args }) => {
//         const [str, num] = args;
//         return { str, num };
//       });

//     const result = await fn('hello', 42);
//     expect(result).toEqual({ str: 'hello', num: 42 });
//   });

//   it('should handle three arguments', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(z.tuple([z.string(), z.number(), z.boolean()]))
//       .handler(async ({ args }) => {
//         const [str, num, bool] = args;
//         return { str, num, bool };
//       });

//     const result = await fn('test', 123, true);
//     expect(result).toEqual({ str: 'test', num: 123, bool: true });
//   });

//   it('should validate tuple arguments', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(z.tuple([z.string().min(1), z.number().positive()]))
//       .handler(async ({ args }) => args);

//     // Valid input
//     const result = await fn('valid', 5);
//     expect(result).toEqual(['valid', 5]);

//     // Invalid input
//     await expect(fn('', -1)).rejects.toThrow();
//     await expect((fn as any)('only-one-arg')).rejects.toThrow();
//   });


//   it('should work with interceptors', async () => {
//     const client = createSafeFnClient();
//     let called = false;

//     const fn = client
//       .use(async ({ next, rawInput }) => {
//         called = true;
//         expect(Array.isArray(rawInput)).toBe(true);
//         return next();
//       })
//       .input(z.tuple([z.string()]))
//       .handler(async ({ args }) => args[0]);

//     const result = await fn('test');
//     expect(result).toBe('test');
//     expect(called).toBe(true);
//   });

//   it('should coexist with single object pattern', async () => {
//     const client = createSafeFnClient();

//     const objectFn = client
//       .input(z.object({ msg: z.string() }))
//       .handler(async ({ parsedInput }) => ({ type: 'object', data: parsedInput.msg }));

//     const tupleFn = client
//       .input(z.tuple([z.string()]))
//       .handler(async ({ args }) => ({ type: 'tuple', data: args[0] }));

//     const objResult = await objectFn({ msg: 'hello' }, {});
//     const tupleResult = await tupleFn('hello');

//     expect(objResult).toEqual({ type: 'object', data: 'hello' });
//     expect(tupleResult).toEqual({ type: 'tuple', data: 'hello' });
//   });

//   it('should validate output for tuple functions', async () => {
//     const client = createSafeFnClient();
//     const fn = client
//       .input(z.tuple([z.number(), z.number()]))
//       .output(z.object({ sum: z.number() }))
//       .handler(async ({ args }) => {
//         const [a, b] = args;
//         return { sum: a + b };
//       });

//     const result = await fn(2, 3);
//     expect(result).toEqual({ sum: 5 });

//     // Invalid output
//     const invalidFn = client
//       .input(z.tuple([z.number()]))
//       .output(z.object({ sum: z.number() }))
//       .handler(async () => ({ wrong: 'field' } as any));

//     await expect(invalidFn(1)).rejects.toThrow();
//   });
// });