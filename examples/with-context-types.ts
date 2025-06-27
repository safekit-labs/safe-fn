/**
 * With Context Types
 * Advanced client setup with typed context
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

const auditInterceptor: Interceptor<AppContext> = async ({ next, metadata, ctx }) => {
  console.log(`[${ctx.requestId}] ${ctx.userId} -> ${metadata.operation}`);
  return next();
};

export const safeFnClient = createSafeFnClient<AppContext>()
  .use(authInterceptor)
  .use(auditInterceptor);

export const deleteUser = safeFnClient
  .meta({ operation: 'delete-user', requiresAuth: true, level: 'admin' })
  .input(z.object({ userId: z.string().uuid() }))
  .output(z.object({ success: z.boolean(), deletedAt: z.date() }))
  .handler(async ({ parsedInput }) => {
    // Delete user logic here - parsedInput.userId contains the user to delete
    console.log(`Deleting user: ${parsedInput.userId}`);
    return { success: true, deletedAt: new Date() };
  });