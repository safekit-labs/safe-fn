/**
 * Factory Setup Examples
 * Different ways to configure your SafeFn clients
 */
import { createSafeFnClient } from '@/factory';
import { z } from 'zod';

// ========================================================================
// FACTORY SETUP EXAMPLES
// ========================================================================

// ------------------ 1. BASIC CLIENT ------------------

export const basicClient = createSafeFnClient({
  defaultContext: {}
});

// ------------------ 2. WITH DEFAULT CONTEXT ------------------

export const clientWithDefaults = createSafeFnClient({
  defaultContext: {
    requestId: 'default',
    version: '1.0.0',
  }
});

// ------------------ 3. WITH ERROR HANDLING ------------------

export const clientWithErrorHandler = createSafeFnClient({
  defaultContext: { requestId: 'default' },
  onError: (error, context) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Request ${context.requestId || 'unknown'} failed:`, errorMessage);
    // Send to monitoring service
  }
});

// ------------------ 4. WITH METADATA SCHEMA ------------------

const operationMetaSchema = z.object({
  operation: z.string(),
  requiresAuth: z.boolean().optional(),
  version: z.string().optional(),
});

export const clientWithMetadata = createSafeFnClient({
  defaultContext: { 
    userId: undefined as string | undefined 
  },
  metadataSchema: operationMetaSchema
});

// ------------------ 5. FULL CONFIGURATION WITH CONTEXT INFERENCE ------------------

const appMetaSchema = z.object({
  operation: z.string(),
  requiresAuth: z.boolean().optional(),
});

// Context is inferred from defaultContext - no need for generics!
export const fullConfigClient = createSafeFnClient({
  defaultContext: {
    userId: undefined as string | undefined,
    requestId: 'default',
    permissions: [] as string[],
  },
  metadataSchema: appMetaSchema,
  onError: (error, context) => {
    console.error(`Request ${context.requestId} failed:`, error.message);
  }
});

// ------------------ 6. USAGE EXAMPLES WITH MIDDLEWARE ------------------

// Example function using the client with inline middleware
export const exampleFunction = clientWithMetadata
  .input(z.object({ data: z.string() }))
  .metadata({ operation: 'process-data', requiresAuth: true })
  .handler(async ({ parsedInput, ctx }) => {
    return { processed: parsedInput.data, userId: ctx.userId };
  });

// ------------------ 7. MULTIPLE CLIENTS FOR DIFFERENT PURPOSES ------------------

// Client for public API functions
export const publicApiClient = createSafeFnClient({
  defaultContext: { 
    isPublic: true,
    rateLimit: 1000
  },
  onError: (error) => {
    console.error('Public API error:', error.message);
  }
});

// Client for admin functions
export const adminClient = createSafeFnClient({
  defaultContext: {
    userId: undefined as string | undefined,
    role: 'admin' as const,
    permissions: ['read', 'write', 'delete'] as const
  },
  metadataSchema: z.object({
    operation: z.string(),
    requiresAdmin: z.boolean().optional()
  }),
  onError: (error, context) => {
    console.error(`Admin operation failed for user ${context.userId}:`, error.message);
  }
});

// Example usage with different clients
export const publicFunction = publicApiClient
  .input(z.object({ query: z.string() }))
  .handler(async ({ parsedInput, ctx }) => {
    return { results: `Search: ${parsedInput.query}`, isPublic: ctx.isPublic };
  });

export const adminFunction = adminClient
  .input(z.object({ action: z.string() }))
  .metadata({ operation: 'admin-action', requiresAdmin: true })
  .handler(async ({ parsedInput, ctx }) => {
    return { 
      action: parsedInput.action, 
      executedBy: ctx.userId, 
      role: ctx.role 
    };
  });
