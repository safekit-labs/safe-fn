import { describe, it, expect } from 'vitest';
import * as yup from 'yup';
import { createSafeFnClient } from '@/index';

describe('Yup Validator Support', () => {
  describe('Object Schemas - Full Support', () => {
    it('should work with object schemas', async () => {
      const client = createSafeFnClient();
      const schema = yup.object({
        name: yup.string().required(),
        age: yup.number().required().positive()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { name: string; age: number };
          return {
            greeting: `Hello ${input.name}, you are ${input.age} years old`
          };
        });

      const result = await fn({ name: 'Jane', age: 30 }, {});
      expect(result.greeting).toBe('Hello Jane, you are 30 years old');
    });

    it('should validate object schemas properly', async () => {
      const client = createSafeFnClient();
      const schema = yup.object({
        email: yup.string().email().required(),
        count: yup.number().min(1).required()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => parsedInput);

      // Valid input
      const result = await fn({ email: 'test@example.com', count: 5 }, {});
      expect(result).toEqual({ email: 'test@example.com', count: 5 });

      // Invalid input
      await expect(fn({ email: 'invalid-email', count: -1 }, {})).rejects.toThrow();
    });

    it('should work with complex object validation', async () => {
      const client = createSafeFnClient();
      const schema = yup.object({
        user: yup.object({
          firstName: yup.string().min(2).required(),
          lastName: yup.string().min(2).required(),
          age: yup.number().min(13).max(120).required()
        }).required(),
        preferences: yup.object({
          newsletter: yup.boolean(),
          theme: yup.string().oneOf(['light', 'dark'])
        })
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as {
            user: { firstName: string; lastName: string; age: number };
            preferences: { newsletter?: boolean; theme?: string };
          };
          return {
            fullName: `${input.user.firstName} ${input.user.lastName}`,
            age: input.user.age,
            wantsNewsletter: input.preferences.newsletter
          };
        });

      const result = await fn({
        user: { firstName: 'John', lastName: 'Doe', age: 25 },
        preferences: { newsletter: true, theme: 'dark' }
      }, {});
      
      expect(result).toEqual({
        fullName: 'John Doe',
        age: 25,
        wantsNewsletter: true
      });
    });

    it('should handle transformations', async () => {
      const client = createSafeFnClient();
      const schema = yup.object({
        name: yup.string().trim().lowercase().required(),
        count: yup.number().integer().positive().required()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => parsedInput);

      const result = await fn({
        name: '  JOHN DOE  ',
        count: '42' // Will be transformed to number
      }, {});

      expect(result).toEqual({
        name: 'john doe',
        count: 42
      });
    });
  });

  describe('Array Schemas - Limited Support (uses parsedInput)', () => {
    it('should treat Yup arrays as standard arrays, not tuples', async () => {
      const client = createSafeFnClient();
      const schema = yup.array().of(yup.string()).min(2).required();

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          // Yup arrays are treated as regular arrays, not tuples
          // So they use parsedInput, not args
          const input = parsedInput as string[];
          expect(Array.isArray(input)).toBe(true);
          return { items: input, type: 'array', count: input.length };
        });

      const result = await fn(['item1', 'item2', 'item3'], {});
      expect(result).toEqual({
        items: ['item1', 'item2', 'item3'],
        type: 'array',
        count: 3
      });
    });

    it('should validate Yup array schemas', async () => {
      const client = createSafeFnClient();
      const schema = yup.array().of(yup.number().positive()).min(1).required();

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as number[];
          return { 
            sum: input.reduce((a: number, b: number) => a + b, 0),
            count: input.length
          };
        });

      // Valid input
      const result = await fn([1, 2, 3, 4], {});
      expect(result).toEqual({ sum: 10, count: 4 });

      // Invalid input (negative number)
      await expect(fn([1, -2, 3], {})).rejects.toThrow();
    });

    it('should work with array of objects', async () => {
      const client = createSafeFnClient();
      const schema = yup.array().of(
        yup.object({
          id: yup.number().required(),
          name: yup.string().required(),
          active: yup.boolean().default(true)
        })
      ).min(1).required();

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as Array<{ id: number; name: string; active: boolean }>;
          return {
            total: input.length,
            activeCount: input.filter((item: { id: number; name: string; active: boolean }) => item.active).length,
            names: input.map((item: { id: number; name: string; active: boolean }) => item.name)
          };
        });

      const result = await fn([
        { id: 1, name: 'Alice', active: true },
        { id: 2, name: 'Bob', active: false },
        { id: 3, name: 'Charlie' } // active defaults to true
      ], {});

      expect(result).toEqual({
        total: 3,
        activeCount: 2,
        names: ['Alice', 'Bob', 'Charlie']
      });
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
        .input(yup.object({ message: yup.string().required() }))
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { message: string };
          return { echo: input.message };
        });

      const result = await fn({ message: 'Hello Yup!' }, {});
      expect(result).toEqual({ echo: 'Hello Yup!' });
      expect(interceptorCalled).toBe(true);
    });

    it('should work with output validation', async () => {
      const client = createSafeFnClient();
      const inputSchema = yup.object({
        x: yup.number().required(),
        y: yup.number().required()
      });
      const outputSchema = yup.object({
        sum: yup.number().required(),
        product: yup.number().required()
      });

      const fn = client
        .input(inputSchema)
        .output(outputSchema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { x: number; y: number };
          return {
            sum: input.x + input.y,
            product: input.x * input.y
          };
        });

      const result = await fn({ x: 4, y: 6 }, {});
      expect(result).toEqual({ sum: 10, product: 24 });

      // Test output validation failure
      const invalidFn = client
        .input(inputSchema)
        .output(outputSchema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { x: number; y: number };
          return {
            wrong: input.x + input.y // Missing required fields
          } as any;
        });

      await expect(invalidFn({ x: 1, y: 2 }, {})).rejects.toThrow();
    });

    it('should work with context and metadata', async () => {
      const client = createSafeFnClient();
      
      const fn = client
        .use(async ({ next, ctx, metadata }) => {
          if (metadata.requiresPermission && !(ctx.permissions as string[])?.includes(metadata.requiredPermission as string)) {
            throw new Error(`Permission required: ${metadata.requiredPermission}`);
          }
          return next();
        })
        .meta({ requiresPermission: true, requiredPermission: 'admin' })
        .input(yup.object({ 
          action: yup.string().oneOf(['create', 'update', 'delete']).required() 
        }))
        .handler(async ({ parsedInput, ctx }) => {
          const input = parsedInput as { action: string };
          return {
            action: input.action,
            performedBy: ctx.userId
          };
        });

      // Valid with permission
      const result = await fn(
        { action: 'create' }, 
        { userId: 'user-123', permissions: ['admin', 'user'] }
      );
      expect(result).toEqual({
        action: 'create',
        performedBy: 'user-123'
      });

      // Invalid without permission
      await expect(fn(
        { action: 'delete' }, 
        { userId: 'user-456', permissions: ['user'] }
      )).rejects.toThrow('Permission required: admin');
    });
  });

  describe('Error Handling', () => {
    it('should provide meaningful validation errors', async () => {
      const client = createSafeFnClient();
      const schema = yup.object({
        username: yup.string().min(3).max(20).required(),
        password: yup.string().min(8).matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain uppercase, lowercase, and number').required()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => parsedInput);

      // Test various validation errors
      await expect(fn({ username: 'ab', password: 'weakpass' }, {})).rejects.toThrow();
      await expect(fn({ username: 'validuser', password: '12345' }, {})).rejects.toThrow();
      await expect(fn({ username: 'validuser' }, {})).rejects.toThrow(); // Missing password
    });

    it('should handle async validation errors', async () => {
      const client = createSafeFnClient();
      const schema = yup.object({
        email: yup.string().email().required()
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => parsedInput);

      await expect(fn({ email: 'not-an-email' }, {})).rejects.toThrow();
    });
  });

  describe('Special Yup Features', () => {
    it('should work with conditional validation', async () => {
      const client = createSafeFnClient();
      const schema = yup.object({
        hasAddress: yup.boolean().required(),
        address: yup.string().when('hasAddress', {
          is: true,
          then: (schema) => schema.required().min(10),
          otherwise: (schema) => schema.optional()
        })
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => parsedInput);

      // Valid with address
      const result1 = await fn({ 
        hasAddress: true, 
        address: '123 Main Street, City' 
      }, {});
      const typedResult1 = result1 as { hasAddress: boolean; address: string };
      expect(typedResult1.hasAddress).toBe(true);
      expect(typedResult1.address).toBe('123 Main Street, City');

      // Valid without address
      const result2 = await fn({ hasAddress: false }, {});
      const typedResult2 = result2 as { hasAddress: boolean };
      expect(typedResult2.hasAddress).toBe(false);

      // Invalid - has address but no address provided
      await expect(fn({ hasAddress: true }, {})).rejects.toThrow();
    });

    it('should work with custom validation', async () => {
      const client = createSafeFnClient();
      const schema = yup.object({
        code: yup.string()
          .required()
          .test('is-valid-code', 'Code must start with ABC and have 6 digits', (value) => {
            return /^ABC\d{6}$/.test(value || '');
          })
      });

      const fn = client
        .input(schema)
        .handler(async ({ parsedInput }) => {
          const input = parsedInput as { code: string };
          return { 
            code: input.code, 
            isValid: true 
          };
        });

      // Valid code
      const result = await fn({ code: 'ABC123456' }, {});
      expect(result).toEqual({ code: 'ABC123456', isValid: true });

      // Invalid code
      await expect(fn({ code: 'XYZ123456' }, {})).rejects.toThrow();
      await expect(fn({ code: 'ABC12' }, {})).rejects.toThrow();
    });
  });
});