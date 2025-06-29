import { describe, it, expect } from 'vitest';
import { z } from 'zod';
import { createSafeFnClient } from '@/index';

describe('Zod Validator Support', () => {
  describe('Object Schemas', () => {
    it('should work with object schemas', async () => {
      const client = createSafeFnClient();
      const fn = client
        .input(z.object({ name: z.string(), age: z.number() }))
        .handler(async ({ parsedInput }) => ({
          greeting: `Hello ${parsedInput.name}, you are ${parsedInput.age} years old`
        }));

      const result = await fn({ name: 'John', age: 25 }, {});
      expect(result.greeting).toBe('Hello John, you are 25 years old');
    });

    it('should validate object schemas properly', async () => {
      const client = createSafeFnClient();
      const fn = client
        .input(z.object({ 
          email: z.string().email(), 
          count: z.number().min(1) 
        }))
        .handler(async ({ parsedInput }) => parsedInput);

      // Valid input
      const result = await fn({ email: 'test@example.com', count: 5 }, {});
      expect(result).toEqual({ email: 'test@example.com', count: 5 });

      // Invalid input
      await expect(fn({ email: 'invalid-email', count: -1 }, {})).rejects.toThrow();
    });
  });

  describe('Tuple Schemas - Full Support', () => {
    it('should support tuple schemas with args parameter', async () => {
      const client = createSafeFnClient();
      const fn = client
        .input(z.tuple([z.string(), z.number()]))
        .handler(async ({ args }) => {
          const [name, age] = args;
          return { name, age, type: 'tuple' };
        });

      const result = await fn('Alice', 28);
      expect(result).toEqual({ name: 'Alice', age: 28, type: 'tuple' });
    });

    it('should support zero-argument tuples', async () => {
      const client = createSafeFnClient();
      const fn = client
        .input(z.tuple([]))
        .handler(async ({ args }) => {
          expect(args).toEqual([]);
          return { success: true };
        });

      const result = await fn();
      expect(result).toEqual({ success: true });
    });

    it('should support complex tuple schemas', async () => {
      const client = createSafeFnClient();
      const fn = client
        .input(z.tuple([
          z.object({ id: z.string() }),
          z.array(z.string()),
          z.number().optional()
        ]))
        .handler(async ({ args }) => {
          const [user, tags, priority] = args;
          return { user, tags, priority };
        });

      const result = await fn(
        { id: 'user-123' },
        ['admin', 'moderator'],
        5
      );
      expect(result).toEqual({
        user: { id: 'user-123' },
        tags: ['admin', 'moderator'],
        priority: 5
      });
    });

    it('should validate tuple arguments', async () => {
      const client = createSafeFnClient();
      const fn = client
        .input(z.tuple([z.string().min(1), z.number().positive()]))
        .handler(async ({ args }) => args);

      // Valid input
      const result = await fn('valid', 5);
      expect(result).toEqual(['valid', 5]);

      // Invalid input
      await expect(fn('', -1)).rejects.toThrow();
    });


    it('should work with interceptors', async () => {
      const client = createSafeFnClient();
      let called = false;

      const fn = client
        .use(async ({ next, rawInput }) => {
          called = true;
          expect(Array.isArray(rawInput)).toBe(true);
          return next();
        })
        .input(z.tuple([z.string()]))
        .handler(async ({ args }) => args[0]);

      const result = await fn('test');
      expect(result).toBe('test');
      expect(called).toBe(true);
    });
  });

  describe('Mixed Usage', () => {
    it('should coexist with single object pattern', async () => {
      const client = createSafeFnClient();

      const objectFn = client
        .input(z.object({ msg: z.string() }))
        .handler(async ({ parsedInput }) => ({ type: 'object', data: parsedInput.msg }));

      const tupleFn = client
        .input(z.tuple([z.string()]))
        .handler(async ({ args }) => ({ type: 'tuple', data: args[0] }));

      const objResult = await objectFn({ msg: 'hello' }, {});
      const tupleResult = await tupleFn('hello');

      expect(objResult).toEqual({ type: 'object', data: 'hello' });
      expect(tupleResult).toEqual({ type: 'tuple', data: 'hello' });
    });

    it('should validate output for tuple functions', async () => {
      const client = createSafeFnClient();
      const fn = client
        .input(z.tuple([z.number(), z.number()]))
        .output(z.object({ sum: z.number() }))
        .handler(async ({ args }) => {
          const [a, b] = args;
          return { sum: a + b };
        });

      const result = await fn(2, 3);
      expect(result).toEqual({ sum: 5 });

      // Invalid output
      const invalidFn = client
        .input(z.tuple([z.number()]))
        .output(z.object({ sum: z.number() }))
        .handler(async () => ({ wrong: 'field' } as any));

      await expect(invalidFn(1)).rejects.toThrow();
    });
  });
});