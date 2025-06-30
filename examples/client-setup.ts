// /**
//  * Client Setup Examples
//  * Different ways to configure your SafeFn client
//  */
// import { createSafeFnClient } from '@safekit/safe-fn';
// import type { Interceptor } from '@safekit/safe-fn';
// import { z } from 'zod';

// // ========================================================================
// // CLIENT SETUP EXAMPLES
// // ========================================================================

// // ------------------ 1. BASIC CLIENT ------------------

// export const basicClient = createSafeFnClient();

// // ------------------ 2. WITH DEFAULT CONTEXT ------------------

// export const clientWithDefaults = createSafeFnClient({
//   defaultContext: {
//     requestId: 'default',
//     version: '1.0.0',
//   },
// });

// // ------------------ 3. WITH ERROR HANDLER ------------------

// export const clientWithErrorHandler = createSafeFnClient({
//   errorHandler: (error, context) => {
//     console.error(`Request ${context.requestId} failed:`, error.message);
//     // Send to monitoring service
//   },
// });

// // ------------------ 4. WITH GLOBAL INTERCEPTORS ------------------

// const operationMetaSchema = z.object({
//   operation: z.string(),
//   requiresAuth: z.boolean().optional(),
//   version: z.string().optional(),
// });

// export const clientWithInterceptors = createSafeFnClient({
//   metaSchema: operationMetaSchema,
// })
//   .use(async ({ next, rawInput, meta }) => {
//     // meta is now properly typed based on operationMetaSchema
//     console.log(`[${meta.operation}] Input:`, rawInput); // meta.operation is typed as string
//     const result = await next();
//     console.log(`[${meta.operation}] Output:`, result.output);
//     return result;
//   })
//   .use(async ({ next, ctx, meta }) => {
//     // meta.requiresAuth is typed as boolean | undefined
//     if (meta.requiresAuth && !ctx.userId) {
//       throw new Error('Authentication required');
//     }
//     return next();
//   });

// // ------------------ 5. FULL CONFIGURATION WITH CONTEXT INFERENCE ------------------

// const appMetaSchema = z.object({
//   operation: z.string(),
//   requiresAuth: z.boolean().optional(),
// });

// // Context is inferred from defaultContext - no need for generics!
// export const fullConfigClient = createSafeFnClient({
//   defaultContext: {
//     userId: undefined as string | undefined,
//     requestId: 'default',
//     permissions: [] as string[],
//   },
//   metaSchema: appMetaSchema,
// }).use(async ({ next, ctx, meta }) => {
//   // ctx is now typed from defaultContext - hover to see!
//   // meta is typed from appMetaSchema - hover to see!
//   console.log(`Request ${ctx.requestId} for operation ${meta.operation}`);
//   if (meta.requiresAuth && !ctx.userId) {
//     throw new Error('Authentication required');
//   }
//   return next({ ctx });
// });

// // ------------------ 6. CONTEXT CHAINING EXAMPLE ------------------

// export const chainedClient = createSafeFnClient()
//   .use(async ({ next, ctx }) => {
//     // First interceptor - add step1 to context
//     const updated = { ...ctx, step1: 'completed' };
//     return next({ ctx: updated });
//   })
//   .use(async ({ next, ctx }) => {
//     // Second interceptor - add step2 (ctx includes step1 from previous)
//     const updated = { ...ctx, step2: 42 };
//     return next({ ctx: updated });
//   })
//   .use(async ({ next, ctx }) => {
//     // Third interceptor - add step3 (ctx includes step1 & step2)
//     const updated = { ...ctx, step3: true };
//     return next({ ctx: updated });
//   });

// // ------------------ 7. SEPARATE INTERCEPTOR DEFINITIONS ------------------

// // Define interceptors separately for reuse
// const step1Interceptor: Interceptor = async ({ next, ctx }) => {
//   const updated = { ...ctx, step1: 'completed' };
//   return next({ ctx: updated });
// };

// const step2Interceptor: Interceptor = async ({ next, ctx }) => {
//   const updated = { ...ctx, step2: 42 };
//   return next({ ctx: updated });
// };

// const step3Interceptor: Interceptor = async ({ next, ctx }) => {
//   const updated = { ...ctx, step3: true };
//   return next({ ctx: updated });
// };

// // Chain the interceptors
// export const separateInterceptorsClient = createSafeFnClient()
//   .use(step1Interceptor)
//   .use(step2Interceptor)
//   .use(step3Interceptor);

// // ------------------ 8. COMMON SETUP ------------------

// // Basic client with error handling and logging interceptor (used in README examples)
// export const safeFnClient = clientWithErrorHandler.use(async ({ next, rawInput, meta, ctx }) => {
//   console.log(`[${meta.operation || 'unknown'}] Starting with input:`, rawInput);
//   const result = await next({ ctx });
//   console.log(`[${meta.operation || 'unknown'}] Completed`);
//   return result;
// });
