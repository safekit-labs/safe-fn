/**
 * Advanced Context Types & Tuple Functions
 * Demonstrates typed context with both object and tuple patterns
 */
import type { Context, Interceptor } from '@safekit/safe-fn';
import { z } from 'zod';
import { createSafeFnClient } from '@safekit/safe-fn';

interface AppContext extends Context {
  userId?: string;
  requestId: string;
  permissions: string[];
}

const authInterceptor: Interceptor<AppContext> = async ({ next, ctx, metadata }) => {
  if (metadata.requiresAuth && !ctx.userId) {
    throw new Error('Authentication required');
  }
  return next();
};

const auditInterceptor: Interceptor<AppContext> = async ({ next, metadata, ctx, rawInput }) => {
  console.log(`[${ctx.requestId}] ${ctx.userId} -> ${metadata.operation}`, rawInput);
  return next();
};

export const client = createSafeFnClient<AppContext>()
  .use(authInterceptor)
  .use(auditInterceptor);

// Object pattern with context
export const deleteUser = client
  .meta({ operation: 'delete-user', requiresAuth: true, level: 'admin' })
  .input(z.object({ userId: z.string().uuid() }))
  .output(z.object({ success: z.boolean(), deletedAt: z.date() }))
  .handler(async ({ parsedInput }) => {
    console.log(`Deleting user: ${parsedInput.userId}`);
    return { success: true, deletedAt: new Date() };
  });

// Tuple pattern with context binding
export const transferFunds = client
  .context({ requestId: 'transfer-op', permissions: ['finance'] })
  .meta({ operation: 'transfer-funds', requiresAuth: true })
  .input(z.tuple([z.string().uuid(), z.string().uuid(), z.number().positive()]))
  .handler(async ({ args, ctx }) => {
    const [fromId, toId, amount] = args;
    console.log(`Transfer ${amount} from ${fromId} to ${toId} by ${ctx.userId}`);
    return { 
      transactionId: 'tx_123',
      fromId, 
      toId, 
      amount,
      processedBy: ctx.userId,
      timestamp: new Date()
    };
  });

// Zero arguments with context
export const getCurrentUserStats = client
  .context({ permissions: ['stats'] })
  .meta({ operation: 'get-user-stats', requiresAuth: true })
  .input(z.tuple([]))
  .handler(async ({ ctx }) => {
    return {
      userId: ctx.userId,
      requestId: ctx.requestId,
      permissions: ctx.permissions,
      loginCount: 42,
      lastSeen: new Date()
    };
  });

// Usage examples (commented out to avoid unused function warnings)
// async function examples() {
//   const context: AppContext = { 
//     userId: 'user-123', 
//     requestId: 'req-456', 
//     permissions: ['admin', 'finance'] 
//   };
//   
//   // Object pattern with context
//   const deletion = await deleteUser({ userId: 'user-to-delete' }, context);
//   
//   // Tuple pattern - context comes from .context() binding
//   const transfer = await transferFunds('from-user', 'to-user', 100);
//   
//   // Zero args with context binding
//   const stats = await getCurrentUserStats();
// }