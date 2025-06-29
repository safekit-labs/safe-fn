/**
 * Advanced Features
 * Examples showing meta, output schemas, and middleware
 */
import { z } from 'zod';
import { safeFnClient } from './client-setup';

// 1. With Meta and Output Schema
export const createUser = safeFnClient
  .meta({ operation: 'create-user', requiresAuth: true })
  .input(z.object({ name: z.string(), email: z.string().email() }))
  .output(z.object({ id: z.string(), name: z.string(), email: z.string() }))
  .handler(async ({ parsedInput }) => {
    return {
      id: 'user_123',
      name: parsedInput.name,
      email: parsedInput.email
    };
  });

// 2. With Builder-Level Middleware
export const updatePost = safeFnClient
  .meta({ operation: 'update-post', requiresAuth: true })
  .input(z.object({ postId: z.string(), title: z.string() }))
  .use(async ({ next, parsedInput, ctx, meta }) => {
    // Post-validation middleware - parsedInput is fully typed!
    // In a real app, you'd check the database
    console.log(`${meta.operation}: User ${ctx.userId} updating post ${parsedInput.postId}`);

    // Simulate ownership check
    if (!ctx.userId) {
      throw new Error('Forbidden: User not authenticated');
    }

    return next(parsedInput);
  })
  .handler(async ({ parsedInput }) => {
    // Simulate database update
    return {
      id: parsedInput.postId,
      title: parsedInput.title,
      updatedAt: new Date()
    };
  });

// 3. Tuple with Middleware
export const calculateTax = safeFnClient
  .meta({ operation: 'calculate-tax' })
  .input(z.tuple([z.number().positive(), z.string()])) // amount, region
  .use(async ({ next, parsedInput, meta }) => {
    const [amount, region] = parsedInput;
    console.log(`${meta.operation}: Calculating tax for $${amount} in ${region}`);
    return next(parsedInput);
  })
  .handler(async ({ args }) => {
    const [amount, region] = args;
    const rate = region === 'CA' ? 0.08 : 0.05;
    return { amount, region, tax: amount * rate, total: amount * (1 + rate) };
  });

// Usage examples
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function examples() {
  // Meta and output schema
  const user = await createUser({ name: 'John', email: 'john@example.com' }, { userId: 'user-1' });

  // Builder-level middleware
  const post = await updatePost({ postId: 'post-123', title: 'New Title' }, { userId: 'user-1' });

  // Tuple with middleware
  const tax = await calculateTax(100, 'CA');

  return { user, post, tax };
}