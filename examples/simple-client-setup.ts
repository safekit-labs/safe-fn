/**
 * Simple Chained Client Setup
 * The most common usage pattern - create a client with interceptors
 */
import { createSafeFnClient } from '@corporationx/safe-fn';

export const safeFnClient = createSafeFnClient()
  .use(async ({ next, metadata }) => {
    console.log(`Starting ${metadata.operation}`);
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