/**
 * Client with Interceptors Example
 * Shows how to use clients and interceptors
 */

import { createClient, Context, Interceptor } from '@corporationx/procedure-builder';
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
const client = createClient<AppContext>()
  .use(loggingInterceptor);

// Create procedure using client
const getUser = client
  .metadata({ operation: 'get-user' })
  .inputSchema(z.object({ id: z.string() }))
  .query(async ({ parsedInput, ctx }) => {
    return { id: parsedInput.id, name: 'John Doe' };
  });

// Usage
const user = await getUser(
  { id: 'user123' }, 
  { userId: 'admin', requestId: 'req-001' }
);