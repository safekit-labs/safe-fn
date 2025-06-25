/**
 * API Endpoint Example
 * Using procedures for REST API handlers
 */

import { createClient, Context, Interceptor } from '@corporationx/procedure-builder';
import { z } from 'zod';

interface ApiContext extends Context {
  requestId: string;
  apiKey?: string;
  userId?: string;
}

// Auth interceptor
const authInterceptor: Interceptor<ApiContext> = async ({ next, ctx, metadata }) => {
  if (metadata.requiresAuth && !ctx.apiKey) {
    throw new Error('API key required');
  }
  return next();
};

const apiClient = createClient<ApiContext>()
  .use(authInterceptor);

// POST /api/users endpoint
const createUserEndpoint = apiClient
  .metadata({ 
    method: 'POST', 
    endpoint: '/api/users',
    requiresAuth: true 
  })
  .inputSchema(z.object({
    email: z.string().email(),
    name: z.string()
  }))
  .service(async ({ parsedInput, ctx }) => {
    // Create user logic
    return {
      id: 'user123',
      email: parsedInput.email,
      name: parsedInput.name,
      createdAt: new Date()
    };
  });

// Usage in API handler
async function handleRequest(body: any, headers: any) {
  const context: ApiContext = {
    requestId: 'req-001',
    apiKey: headers['x-api-key'],
  };
  
  return await createUserEndpoint(body, context);
}