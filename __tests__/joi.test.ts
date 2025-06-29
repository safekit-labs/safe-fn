import { describe, it, expect } from 'vitest';
import Joi from 'joi';
import { createSafeFnClient } from '@/index';

describe('Joi Validator Support', () => {
  describe('Object Schemas - Full Support', () => {
    it('should work with object schemas', async () => {
      const client = createSafeFnClient();
      const schema = Joi.object({
        name: Joi.string().required(),
        age: Joi.number().positive().required()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { name: string; age: number };
          return {
            greeting: `Hello ${input.name}, you are ${input.age} years old`
          };
        });

      const result = await fn({ name: 'Bob', age: 35 }, {});
      expect(result.greeting).toBe('Hello Bob, you are 35 years old');
    });

    it('should validate object schemas properly', async () => {
      const client = createSafeFnClient();
      const schema = Joi.object({
        username: Joi.string().alphanum().min(3).max(30).required(),
        password: Joi.string().min(6).required()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => parsedInput as { username: string; password: string });

      // Valid input
      const result = await fn({ username: 'user123', password: 'secret123' }, {});
      expect(result).toEqual({ username: 'user123', password: 'secret123' });

      // Invalid input
      await expect(fn({ username: 'u', password: '123' }, {})).rejects.toThrow();
    });

    it('should work with complex object validation', async () => {
      const client = createSafeFnClient();
      const schema = Joi.object({
        user: Joi.object({
          id: Joi.string().uuid().required(),
          name: Joi.string().min(2).required()
        }).required(),
        settings: Joi.object({
          theme: Joi.string().valid('light', 'dark').default('light'),
          notifications: Joi.boolean().default(true)
        }).default()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as {
            user: { id: string; name: string };
            settings: { theme: string; notifications: boolean };
          };
          return {
            userId: input.user.id,
            userName: input.user.name,
            theme: input.settings.theme
          };
        });

      const result = await fn({
        user: { id: '550e8400-e29b-41d4-a716-446655440000', name: 'John' },
        settings: { theme: 'dark' }
      }, {});
      
      expect(result).toEqual({
        userId: '550e8400-e29b-41d4-a716-446655440000',
        userName: 'John',
        theme: 'dark'
      });
    });
  });

  describe('Array Schemas - Limited Support (uses parsedInput)', () => {
    it('should treat Joi arrays as standard arrays, not tuples', async () => {
      const client = createSafeFnClient();
      const schema = Joi.array().items(Joi.string()).min(1).required();

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          // Joi arrays are treated as regular arrays, not tuples
          // So they use parsedInput, not args
          const input = parsedInput as string[];
          expect(Array.isArray(input)).toBe(true);
          return { items: input, type: 'array', count: input.length };
        });

      const result = await fn(['hello', 'world'], {});
      expect(result).toEqual({
        items: ['hello', 'world'],
        type: 'array',
        count: 2
      });
    });

    it('should validate Joi array schemas', async () => {
      const client = createSafeFnClient();
      const schema = Joi.array().items(
        Joi.object({
          name: Joi.string().required(),
          active: Joi.boolean().required()
        })
      ).min(1).required();

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as Array<{ name: string; active: boolean }>;
          return {
            count: input.length,
            activeCount: input.filter((item: { name: string; active: boolean }) => item.active).length
          };
        });

      // Valid input
      const result = await fn([
        { name: 'User1', active: true },
        { name: 'User2', active: false },
        { name: 'User3', active: true }
      ], {});
      expect(result).toEqual({ count: 3, activeCount: 2 });

      // Invalid input (missing required field)
      await expect(fn([{ name: 'User1' }], {})).rejects.toThrow();
    });

    it('should work with array of primitives', async () => {
      const client = createSafeFnClient();
      const schema = Joi.array().items(Joi.number().positive()).min(2).required();

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as number[];
          return {
            numbers: input,
            sum: input.reduce((a: number, b: number) => a + b, 0),
            average: input.reduce((a: number, b: number) => a + b, 0) / input.length
          };
        });

      const result = await fn([1, 2, 3, 4, 5], {});
      expect(result).toEqual({
        numbers: [1, 2, 3, 4, 5],
        sum: 15,
        average: 3
      });

      // Invalid input (negative number)
      await expect(fn([1, -2, 3], {})).rejects.toThrow();
    });
  });

  describe('Integration with SafeFn Features', () => {
    it('should work with interceptors', async () => {
      const client = createSafeFnClient();
      let interceptorCalled = false;

      const fn = client
        .use(async ({ next, rawInput }) => {
          interceptorCalled = true;
          expect(typeof rawInput).toBe('object');
          return next();
        })
        .input(Joi.object({ message: Joi.string().required() }))
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { message: string };
          return { echo: input.message };
        });

      const result = await fn({ message: 'Hello Joi!' }, {});
      expect(result).toEqual({ echo: 'Hello Joi!' });
      expect(interceptorCalled).toBe(true);
    });

    it('should work with output validation', async () => {
      const client = createSafeFnClient();
      const inputSchema = Joi.object({
        a: Joi.number().required(),
        b: Joi.number().required()
      });
      const outputSchema = Joi.object({
        result: Joi.number().required(),
        operation: Joi.string().required()
      });

      const fn = client
        .input(inputSchema)
        .output(outputSchema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { a: number; b: number };
          return {
            result: input.a + input.b,
            operation: 'addition'
          };
        });

      const result = await fn({ a: 5, b: 3 }, {});
      expect(result).toEqual({ result: 8, operation: 'addition' });

      // Test output validation failure
      const invalidFn = client
        .input(inputSchema)
        .output(outputSchema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { a: number; b: number };
          return {
            wrong: input.a + input.b // Missing required fields
          } as any;
        });

      await expect(invalidFn({ a: 1, b: 2 }, {})).rejects.toThrow();
    });

    it('should work with context and metadata', async () => {
      const client = createSafeFnClient();
      
      const fn = client
        .use(async ({ next, ctx, metadata }) => {
          if (metadata.requiresAuth && !ctx.authenticated) {
            throw new Error('Authentication required');
          }
          return next();
        })
        .meta({ requiresAuth: true, operation: 'secure-operation' })
        .input(Joi.object({ data: Joi.string().required() }))
        .handler(async ({ parsedInput, ctx }) => {
          const input = parsedInput as { data: string };
          return {
            processedData: input.data.toUpperCase(),
            user: ctx.userId
          };
        });

      // Valid with auth
      const result = await fn(
        { data: 'secret' }, 
        { authenticated: true, userId: 'user-123' }
      );
      expect(result).toEqual({
        processedData: 'SECRET',
        user: 'user-123'
      });

      // Invalid without auth
      await expect(fn(
        { data: 'secret' }, 
        { authenticated: false }
      )).rejects.toThrow('Authentication required');
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful validation errors', async () => {
      const client = createSafeFnClient();
      const schema = Joi.object({
        email: Joi.string().email().required(),
        age: Joi.number().min(18).max(100).required()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => parsedInput);

      // Test various validation errors
      await expect(fn({ email: 'not-an-email', age: 15 }, {})).rejects.toThrow();
      await expect(fn({ email: 'valid@email.com', age: 150 }, {})).rejects.toThrow();
      await expect(fn({ email: 'valid@email.com' }, {})).rejects.toThrow(); // Missing age
    });
  });
});