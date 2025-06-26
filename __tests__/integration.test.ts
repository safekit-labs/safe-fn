import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import {
  createClient,
  createSafeFn,
  Context,
  Interceptor
} from '@/index';

// Test types
interface UserContext extends Context {
  userId?: string;
  requestId: string;
  timestamp?: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
}

// Mock database
const mockUsers: Map<string, User> = new Map();

// Zod schemas
const createUserInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Must be a valid email')
});

const getUserInputSchema = z.object({
  id: z.string().min(1, 'ID is required')
});

const userOutputSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  createdAt: z.date()
});

const calculatorInputSchema = z.object({
  a: z.number(),
  b: z.number()
});

const calculatorOutputSchema = z.number();

type CreateUserInput = z.infer<typeof createUserInputSchema>;
type GetUserInput = z.infer<typeof getUserInputSchema>;

describe('SafeFn - Complete Integration Test', () => {
  it('should demonstrate full safe function pattern with all features', async () => {
    // Setup interceptors
    const auditInterceptor: Interceptor<UserContext> = async ({ next }) => {
      // console.log(`[AUDIT] ${metadata.operation} - User: ${ctx.userId}`);
      const result = await next();
      // console.log(`[AUDIT] ${metadata.operation} completed`);
      return result;
    };

    const loggingInterceptor: Interceptor<UserContext> = async ({ next }) => {
      // console.log(`[LOG] Starting ${metadata.operation} with input:`, clientInput);

      try {
        const result = await next();
        // console.log(`[LOG] ${metadata.operation} completed`);
        return result;
      } catch (_error) {
        // console.log(`[LOG] ${metadata.operation} failed:`, error);
        throw _error;
      }
    };

    const authInterceptor: Interceptor<UserContext> = async ({ next, ctx, metadata }) => {
      if (!ctx.userId && metadata.requiresAuth) {
        throw new Error('Authentication required');
      }
      return next();
    };

    // Create error handler
    const errorHandler = vi.fn((error: Error, _context: UserContext) => {
      // console.error(`[ERROR] Request ${context.requestId}:`, error.message);
    });

    // Create client with default configuration
    const client = createClient<UserContext>({
      defaultContext: { requestId: 'default' },
      errorHandler
    });

    // Create procedures using client with Zod schemas and chained .use()
    const createUser = client
      .meta({
        operationName: 'USER.CREATE',
        auditLevel: 'high',
        requiresAuth: true,
        version: '1.0.0'
      })
      .use(auditInterceptor)
      .use(loggingInterceptor)
      .use(authInterceptor)
      .input(createUserInputSchema)
      .output(userOutputSchema)
      .handler(async ({ parsedInput }) => {
        const input = parsedInput;
        const user: User = {
          id: `user_${Date.now()}`,
          name: input.name,
          email: input.email,
          createdAt: new Date()
        };

        mockUsers.set(user.id, user);
        return user;
      });

    const getUser = client
      .meta({
        operationName: 'USER.GET',
        auditLevel: 'low',
        requiresAuth: false,
        version: '1.0.0'
      })
      .use(auditInterceptor)
      .use(loggingInterceptor)
      .input(getUserInputSchema)
      .output(userOutputSchema)
      .handler(async ({ parsedInput }) => {
        const input = parsedInput;
        const user = mockUsers.get(input.id);
        if (!user) {
          throw new Error('User not found');
        }
        return user;
      });

    // Test successful command execution
    const createResult = await createUser(
      { name: 'John Doe', email: 'john@example.com' },
      { userId: 'admin', requestId: 'req-001' }
    );

    expect(createResult).toMatchObject({
      name: 'John Doe',
      email: 'john@example.com'
    });
    expect(createResult.id).toBeDefined();
    expect(createResult.createdAt).toBeInstanceOf(Date);

    // Test successful query execution
    const getResult = await getUser(
      { id: createResult.id },
      { requestId: 'req-002' }
    );

    expect(getResult).toEqual(createResult);

    // Test validation errors - should throw Zod validation error
    await expect(
      createUser(
        { name: '', email: 'invalid' },
        { userId: 'admin', requestId: 'req-003' }
      )
    ).rejects.toThrow();

    // Test authentication error
    await expect(
      createUser(
        { name: 'Jane Doe', email: 'jane@example.com' },
        { requestId: 'req-004' } // No userId
      )
    ).rejects.toThrow('Authentication required');

    // Test not found error
    await expect(
      getUser(
        { id: 'non-existent' },
        { requestId: 'req-005' }
      )
    ).rejects.toThrow('User not found');

    // Verify error handler was called
    expect(errorHandler).toHaveBeenCalled();
  });

  it('should work with standalone safe functions (without client)', async () => {
    // Test standalone safe function creation with Zod schemas
    const simpleCalculator = createSafeFn()
      .meta({ operation: 'calculate' })
      .input(calculatorInputSchema)
      .output(calculatorOutputSchema)
      .handler(async ({ parsedInput }) => {
        const input = parsedInput;
        return input.a + input.b;
      });

    const result = await simpleCalculator({ a: 5, b: 3 });
    expect(result).toBe(8);

    // Test validation - should throw Zod validation error
    await expect(
      simpleCalculator({ a: '5', b: 3 } as any)
    ).rejects.toThrow();
  });

  it('should handle complex interceptor chains and context manipulation', async () => {
    const contextModifyingInterceptor: Interceptor<UserContext> = async ({ next, clientInput, ctx, metadata }) => {
      // Modify context
      const modifiedContext: UserContext = {
        ...ctx,
        userId: ctx.userId || 'anonymous',
        timestamp: Date.now()
      } as UserContext;

      // Pass the modified context to the next interceptor
      const result = await next(clientInput, modifiedContext);

      return {
        output: result.output,
        context: modifiedContext
      };
    };

    const dataTransformInterceptor: Interceptor<UserContext> = async ({ next, clientInput, ctx, metadata }) => {
      // Transform input
      const transformedInput = {
        ...clientInput,
        source: 'api'
      };

      // Pass the transformed input to the next interceptor
      const result = await next(transformedInput, ctx);

      // Transform output
      const transformedOutput = {
        ...result.output,
        processed: true
      };

      return {
        output: transformedOutput,
        context: result.context
      };
    };

    const client = createClient<UserContext>()
      .use(contextModifyingInterceptor)
      .use(dataTransformInterceptor);

    const testProcedure = client
      .meta({ operation: 'test' })
      .handler(async ({ ctx, parsedInput }) => {
        const input = parsedInput;
        return {
          receivedInput: input,
          contextUserId: ctx.userId,
          timestamp: ctx.timestamp
        };
      });

    const result = await testProcedure(
      { message: 'hello' },
      { requestId: 'test-001' }
    );

    expect(result).toMatchObject({
      receivedInput: {
        message: 'hello',
        source: 'api'
      },
      contextUserId: 'anonymous',
      processed: true
    });
    expect(result.timestamp).toBeDefined();
  });

  it('should handle metadata validation and usage', async () => {
    const metadataValidatingInterceptor: Interceptor = async ({ next, clientInput, ctx, metadata }) => {
      if (!metadata.version) {
        throw new Error('Version is required in metadata');
      }

      if (metadata.deprecated) {
        // console.warn(`[DEPRECATED] ${metadata.operation} is deprecated`);
      }

      return next();
    };

    const client = createClient()
      .use(metadataValidatingInterceptor);

    // Test with valid metadata
    const validProcedure = client
      .meta({
        operation: 'test',
        version: '1.0.0',
        description: 'Test procedure'
      })
      .handler(async () => ({ success: true }));

    const result = await validProcedure({});
    expect(result).toEqual({ success: true });

    // Test with missing metadata
    const invalidProcedure = client
      .meta({ operation: 'test' }) // Missing version
      .handler(async () => ({ success: true }));

    await expect(invalidProcedure({})).rejects.toThrow('Version is required in metadata');

    // Test with deprecated flag
    const deprecatedProcedure = client
      .meta({
        operation: 'old-test',
        version: '1.0.0',
        deprecated: true
      })
      .handler(async () => ({ success: true }));

    const deprecatedResult = await deprecatedProcedure({});
    expect(deprecatedResult).toEqual({ success: true });
  });

  it('should support chained .use() for interceptors', async () => {
    let executionOrder: string[] = [];

    const firstInterceptor: Interceptor = async ({ next }) => {
      executionOrder.push('first-before');
      const result = await next();
      executionOrder.push('first-after');
      return result;
    };

    const secondInterceptor: Interceptor = async ({ next }) => {
      executionOrder.push('second-before');
      const result = await next();
      executionOrder.push('second-after');
      return result;
    };

    const thirdInterceptor: Interceptor = async ({ next }) => {
      executionOrder.push('third-before');
      const result = await next();
      executionOrder.push('third-after');
      return result;
    };

    // Test chained .use() method
    const chainedProcedure = createSafeFn()
      .meta({ operation: 'chained-test' })
      .use(firstInterceptor)
      .use(secondInterceptor)
      .use(thirdInterceptor)
      .handler(async () => {
        executionOrder.push('handler');
        return { success: true };
      });

    const result = await chainedProcedure({});

    expect(result).toEqual({ success: true });
    expect(executionOrder).toEqual([
      'first-before',
      'second-before',
      'third-before',
      'handler',
      'third-after',
      'second-after',
      'first-after'
    ]);
  });

  it('should combine client-level interceptors with .use() chained interceptors', async () => {
    let executionOrder: string[] = [];

    const clientInterceptor: Interceptor = async ({ next }) => {
      executionOrder.push('client-before');
      const result = await next();
      executionOrder.push('client-after');
      return result;
    };

    const procedureInterceptor: Interceptor = async ({ next }) => {
      executionOrder.push('procedure-before');
      const result = await next();
      executionOrder.push('procedure-after');
      return result;
    };

    const client = createClient()
      .use(clientInterceptor);

    const combinedProcedure = client
      .meta({ operation: 'combined-test' })
      .use(procedureInterceptor)
      .handler(async () => {
        executionOrder.push('handler');
        return { success: true };
      });

    const result = await combinedProcedure({});

    expect(result).toEqual({ success: true });
    // Client interceptors run first, then procedure interceptors
    expect(executionOrder).toEqual([
      'client-before',
      'procedure-before',
      'handler',
      'procedure-after',
      'client-after'
    ]);
  });

  it('should properly handle error propagation and recovery', async () => {
    let errorRecoveryAttempted = false;

    const errorRecoveryInterceptor: Interceptor = async ({ next, ctx }) => {
      try {
        return await next();
      } catch (error) {
        if (error instanceof Error && error.message === 'Something went wrong') {
          errorRecoveryAttempted = true;
          return {
            output: { recovered: true, originalError: error.message },
            context: ctx
          };
        }
        throw error;
      }
    };

    const client = createClient()
      .use(errorRecoveryInterceptor);

    // Test recoverable error
    const recoverableProcedure = client
      .handler(async () => {
        throw new Error('Something went wrong');
      });

    const result = await recoverableProcedure({});
    expect(result).toEqual({
      recovered: true,
      originalError: 'Something went wrong'
    });
    expect(errorRecoveryAttempted).toBe(true);

    // Test non-recoverable error
    const nonRecoverableProcedure = client
      .handler(async () => {
        throw new Error('Critical error');
      });

    await expect(nonRecoverableProcedure({})).rejects.toThrow('Critical error');
  });

  it('should support context type accumulation through .use() chaining', async () => {
    // Define specific context types
    interface DatabaseContext extends Context {
      dbConnection: string;
    }

    interface AuthContext extends Context {
      authToken: string;
      userId: string;
    }

    // Combined context type for client
    type CombinedContext = DatabaseContext & AuthContext;

    // Create interceptors with specific context types
    const dbInterceptor: Interceptor<DatabaseContext> = async ({ next, ctx }) => {
      // We know ctx has dbConnection here
      expect(ctx.dbConnection).toBeDefined();
      return next();
    };

    const authInterceptor: Interceptor<AuthContext> = async ({ next, ctx }) => {
      // We know ctx has authToken and userId here
      expect(ctx.authToken).toBeDefined();
      expect(ctx.userId).toBeDefined();
      return next();
    };

    // Create client with explicit combined context type
    const client = createClient<CombinedContext>()
      .use(dbInterceptor)    // Add DatabaseContext interceptor
      .use(authInterceptor); // Add AuthContext interceptor

    const testProcedure = client.handler(async ({ ctx }) => {
      // TypeScript should know that ctx has both dbConnection and authToken/userId
      // This demonstrates that the intersection type is working

      // These properties should be available without any casting if types work correctly
      const dbConn: string = ctx.dbConnection; // Should not error
      const token: string = ctx.authToken; // Should not error
      const userId: string = ctx.userId; // Should not error

      return {
        hasDbConnection: !!dbConn,
        hasAuthToken: !!token,
        hasUserId: !!userId
      };
    });

    const result = await testProcedure({}, {
      dbConnection: 'postgresql://localhost:5432',
      authToken: 'jwt-token-123',
      userId: 'user456'
    });

    expect(result).toEqual({
      hasDbConnection: true,
      hasAuthToken: true,
      hasUserId: true
    });
  });
});