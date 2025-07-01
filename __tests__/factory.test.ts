import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod/v4';
import { createSafeFnClient } from '@/factory';

// ========================================================================
// FACTORY CONFIGURATION TESTS
// ========================================================================

describe('Factory Configuration', () => {
  // ========================================================================
  // DEFAULT CONTEXT TESTS
  // ========================================================================

  describe('defaultContext', () => {
    it('should use provided defaultContext in handlers', async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { userId: 'test-user', role: 'admin' }
      });

      const fn = safeFnClient.handler(async ({ ctx }) => ctx);
      const result = await fn({}, {});

      expect(result).toEqual({ userId: 'test-user', role: 'admin' });
    });

    it('should merge runtime context with defaultContext', async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { userId: 'default', role: 'user' }
      });

      const fn = safeFnClient.handler(async ({ ctx }) => ctx);
      const result = await fn({}, { requestId: 'req-123' } as any);

      expect(result).toEqual({ userId: 'default', role: 'user', requestId: 'req-123' });
    });

    it('should allow runtime context to override defaultContext', async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { userId: 'default', role: 'user' }
      });

      const fn = safeFnClient.handler(async ({ ctx }) => ctx);
      const result = await fn({}, { userId: 'override' } as any);

      expect(result).toEqual({ userId: 'override', role: 'user' });
    });

    it('should work without defaultContext', async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient.handler(async ({ ctx }) => ctx);
      const result = await fn({}, { custom: 'data' } as any);

      expect(result).toEqual({ custom: 'data' });
    });
  });

  // ========================================================================
  // METADATA SCHEMA TESTS
  // ========================================================================

  describe('metadataSchema', () => {
    it('should validate metadata with provided schema', async () => {
      const safeFnClient = createSafeFnClient({
        metadataSchema: z.object({ op: z.string(), version: z.number() })
      });

      const fn = safeFnClient
        .metadata({ op: 'test', version: 1 })
        .handler(async () => 'success');

      const result = await fn({}, {});
      expect(result).toBe('success');
    });

    it('should work without metadata schema', async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient
        .metadata({ anything: 'goes' })
        .handler(async () => 'success');

      const result = await fn({}, {});
      expect(result).toBe('success');
    });
  });

  // ========================================================================
  // ERROR HANDLER TESTS
  // ========================================================================

  describe('onError', () => {
    it('should call onError when handler throws', async () => {
      const errorHandler = vi.fn();
      const safeFnClient = createSafeFnClient({
        defaultContext: { userId: 'test' },
        onError: errorHandler
      });

      const fn = safeFnClient.handler(async () => {
        throw new Error('test error');
      });

      await expect(fn({}, {})).rejects.toThrow('test error');
      expect(errorHandler).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'test error' }),
        expect.objectContaining({ userId: 'test' })
      );
    });

    it('should call onError with merged context', async () => {
      const errorHandler = vi.fn();
      const safeFnClient = createSafeFnClient({
        defaultContext: { userId: 'default' },
        onError: errorHandler
      });

      const fn = safeFnClient.handler(async () => {
        throw new Error('test error');
      });

      await expect(fn({}, { requestId: 'req-123' } as any)).rejects.toThrow();
      expect(errorHandler).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 'default', requestId: 'req-123' })
      );
    });
  });

  // ========================================================================
  // OPTIONAL CONFIG TESTS
  // ========================================================================

  describe('optional configuration', () => {
    it('should work with no configuration', async () => {
      const safeFnClient = createSafeFnClient();

      const fn = safeFnClient.handler(async ({ ctx }) => ctx);
      const result = await fn({}, {});

      expect(result).toEqual({});
    });

    it('should work with empty configuration', async () => {
      const safeFnClient = createSafeFnClient({});

      const fn = safeFnClient.handler(async () => 'empty config');
      const result = await fn({}, {});

      expect(result).toBe('empty config');
    });
  });
});

// ========================================================================
// INTEGRATION TESTS
// ========================================================================

describe('Factory Integration', () => {
  describe('input and output validation', () => {
    it('should work with input validation', async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { service: 'test' }
      });

      const fn = safeFnClient
        .input(z.object({ name: z.string() }))
        .handler(async ({ parsedInput, ctx }) => ({ 
          greeting: `Hello ${parsedInput.name}`,
          service: ctx.service 
        }));

      const result = await fn({ name: 'World' }, {});
      expect(result).toEqual({ greeting: 'Hello World', service: 'test' });
    });

    it('should work with output validation', async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { env: 'test' }
      });

      const fn = safeFnClient
        .output(z.object({ result: z.string() }))
        .handler(async ({ ctx }) => ({ result: `Environment: ${ctx.env}` }));

      const result = await fn({}, {});
      expect(result).toEqual({ result: 'Environment: test' });
    });

    it('should work with both input and output validation', async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { multiplier: 2 }
      });

      const fn = safeFnClient
        .input(z.object({ value: z.number() }))
        .output(z.object({ doubled: z.number() }))
        .handler(async ({ parsedInput, ctx }) => ({ 
          doubled: parsedInput.value * ctx.multiplier 
        }));

      const result = await fn({ value: 5 }, {});
      expect(result).toEqual({ doubled: 10 });
    });
  });

  describe('middleware support', () => {
    it('should support basic middleware', async () => {
      const safeFnClient = createSafeFnClient({
        defaultContext: { userId: 'default-user' }
      });

      const fn = safeFnClient
        .use(async ({ next }) => {
          return next();
        })
        .handler(async ({ ctx }) => `Hello from ${ctx.userId}`);

      const result = await fn({}, {});
      expect(result).toBe('Hello from default-user');
    });

    it('should support metadata configuration', async () => {
      const safeFnClient = createSafeFnClient({
        metadataSchema: z.object({ operation: z.string() })
      });

      const fn = safeFnClient
        .metadata({ operation: 'test-op' })
        .handler(async () => 'completed');

      const result = await fn({}, {});
      expect(result).toBe('completed');
    });
  });
});