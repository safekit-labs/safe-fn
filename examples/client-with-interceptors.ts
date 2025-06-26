/**
 * Client with Interceptors Example
 * Shows how to use clients and interceptors
 */

import { createSafeFnClient, Context, Interceptor } from '@corporationx/safe-fn';
import { z } from 'zod';

interface AppContext extends Context {
  userId?: string;
  requestId: string;
}

// Simple logging interceptor
const loggingInterceptor: Interceptor<AppContext> = async ({ next, metadata, ctx }) => {
  console.log(`[${ctx.requestId}] Starting ${metadata.operation}`);
  const result = await next();
  console.log(`[${ctx.requestId}] Completed ${metadata.operation}`);
  return result;
};

// Create client with interceptor
const client = createSafeFnClient<AppContext>()
  .use(loggingInterceptor);

// Create safe function using client
const getUser = client
  .meta({ operation: 'get-user' })
  .input(z.object({ id: z.string() }))
  .handler(async ({ parsedInput, ctx }) => {
    return { id: parsedInput.id, name: 'John Doe' };
  });

// Usage
const user = await getUser(
  { id: 'user123' }, 
  { userId: 'admin', requestId: 'req-001' }
);