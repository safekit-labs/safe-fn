/**
 * Simple Client Setup
 * The most common usage pattern - create a client with interceptors
 */
import { createSafeFnClient } from '@safekit/safe-fn';

export const client = createSafeFnClient()
  .use(async ({ next, metadata, rawInput }) => {
    console.log(`Starting ${metadata.operation} with input:`, rawInput);
    const result = await next();
    console.log(`Completed ${metadata.operation}`);
    return result;
  })
  .use(async ({ next, ctx, metadata }) => {
    if (metadata.requiresAuth && !ctx.userId) {
      throw new Error('Authentication required');
    }
    return next();
  });