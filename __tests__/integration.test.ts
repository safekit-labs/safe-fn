import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import type { Context, Interceptor } from '@/index';
import { createSafeFnClient } from '@/index';

interface TestContext extends Context {
  userId?: string;
  requestId: string;
}

describe('SafeFn - Integration Tests', () => {
  it('should handle client with interceptors and validation', async () => {
    const errorHandler = vi.fn();
    const client = createSafeFnClient<TestContext>({
      defaultContext: { requestId: 'default' },
      errorHandler
    });

    const authInterceptor: Interceptor<TestContext> = async ({ next, ctx, meta }) => {
      if (!ctx.userId && meta.requiresAuth) {
        throw new Error('Authentication required');
      }
      return next();
    };

    const fn = client
      .use(authInterceptor)
      .meta({ requiresAuth: true })
      .input(z.object({ name: z.string() }))
      .output(z.object({ id: z.string(), name: z.string() }))
      .handler(async ({ parsedInput }) => ({
        id: 'user-123',
        name: parsedInput.name
      }));

    // Test with auth
    const result = await fn({ name: 'John' }, { userId: 'user-456', requestId: 'req-1' });
    expect(result).toEqual({ id: 'user-123', name: 'John' });

    // Test without auth
    await expect(fn({ name: 'John' }, { requestId: 'req-2' })).rejects.toThrow('Authentication required');
    expect(errorHandler).toHaveBeenCalled();
  });

  it('should handle chained interceptors', async () => {
    const order: string[] = [];

    const first: Interceptor = async ({ next }) => {
      order.push('first-before');
      const result = await next();
      order.push('first-after');
      return result;
    };

    const second: Interceptor = async ({ next }) => {
      order.push('second-before');
      const result = await next();
      order.push('second-after');
      return result;
    };

    const client = createSafeFnClient().use(first).use(second);
    const fn = client.handler(async () => {
      order.push('handler');
      return 'result';
    });

    const result = await fn({}, {});
    expect(result).toBe('result');
    expect(order).toEqual([
      'first-before',
      'second-before', 
      'handler',
      'second-after',
      'first-after'
    ]);
  });

  it('should handle context modification in interceptors', async () => {
    const client = createSafeFnClient<TestContext>();

    const contextModifier: Interceptor<TestContext> = async ({ next, ctx }) => {
      const modifiedCtx = { ...ctx, userId: 'modified-user' };
      return next({ ctx: modifiedCtx });
    };

    const fn = client
      .use(contextModifier)
      .handler(async ({ ctx }) => ({ receivedUserId: ctx.userId }));

    const result = await fn({}, { requestId: 'req-1' });
    expect(result).toEqual({ receivedUserId: 'modified-user' });
  });

  it('should handle context transformation in interceptors', async () => {
    const client = createSafeFnClient();

    const contextTransformer: Interceptor = async ({ next, rawInput, ctx }) => {
      // Interceptors can transform context but not input
      const input = rawInput as Record<string, any>;
      const updatedContext = { ...ctx, source: 'interceptor', originalData: input.data };
      return next({ ctx: updatedContext });
    };

    const fn = client
      .use(contextTransformer)
      .handler(async ({ parsedInput, ctx }) => ({ 
        received: parsedInput, 
        contextInfo: { source: ctx.source, originalData: ctx.originalData }
      }));

    const result = await fn({ data: 'test' }, {});
    expect(result.received).toEqual({ data: 'test' });
    expect(result.contextInfo).toEqual({ source: 'interceptor', originalData: 'test' });
  });

  it('should handle error recovery in interceptors', async () => {
    const client = createSafeFnClient();

    const errorRecovery: Interceptor = async ({ next }) => {
      try {
        return await next();
      } catch (error) {
        if (error instanceof Error && error.message === 'recoverable') {
          return { output: 'recovered', context: {} };
        }
        throw error;
      }
    };

    const fn = client
      .use(errorRecovery)
      .handler(async () => {
        throw new Error('recoverable');
      });

    const result = await fn({}, {});
    expect(result).toBe('recovered');
  });

  it('should validate with complex schemas', async () => {
    const client = createSafeFnClient();

    const fn = client
      .input(z.object({
        user: z.object({
          name: z.string().min(1),
          email: z.string().email()
        }),
        options: z.object({
          sendEmail: z.boolean()
        })
      }))
      .output(z.object({
        success: z.boolean(),
        userId: z.string()
      }))
      .handler(async ({ parsedInput }) => ({
        success: true,
        userId: `user-${parsedInput.user.name}`
      }));

    const result = await fn({
      user: { name: 'John', email: 'john@example.com' },
      options: { sendEmail: true }
    }, {});

    expect(result).toEqual({
      success: true,
      userId: 'user-John'
    });

    // Test validation error
    await expect(fn({
      user: { name: '', email: 'invalid' },
      options: { sendEmail: true }
    }, {})).rejects.toThrow();
  });

  it('should support metadata validation', async () => {
    const client = createSafeFnClient();

    const metadataValidator: Interceptor = async ({ next, meta }) => {
      if (!meta.version) {
        throw new Error('Version required');
      }
      return next();
    };

    const fn = client
      .use(metadataValidator)
      .meta({ version: '1.0.0' })
      .handler(async () => ({ success: true }));

    const result = await fn({}, {});
    expect(result).toEqual({ success: true });

    const invalidFn = client
      .use(metadataValidator)
      .meta({}) // Missing version
      .handler(async () => ({ success: true }));

    await expect(invalidFn({}, {})).rejects.toThrow('Version required');
  });

  it('should combine client and procedure interceptors', async () => {
    const order: string[] = [];

    const clientInterceptor: Interceptor = async ({ next }) => {
      order.push('client');
      return next();
    };

    const procedureInterceptor: Interceptor = async ({ next }) => {
      order.push('procedure');
      return next();
    };

    const client = createSafeFnClient().use(clientInterceptor);
    const fn = client
      .use(procedureInterceptor)
      .handler(async () => {
        order.push('handler');
        return 'done';
      });

    await fn({}, {});
    expect(order).toEqual(['client', 'procedure', 'handler']);
  });
});