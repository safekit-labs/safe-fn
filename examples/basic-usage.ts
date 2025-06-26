/**
 * Basic Usage Example
 * Using the client to create a simple function with validation
 */
import { z } from 'zod';

import { safeFnClient } from './simple-client-setup';

export const getUser = safeFnClient
  .meta({ operation: 'get-user', requiresAuth: true })
  .input(z.object({ id: z.string() }))
  .handler(async ({ parsedInput, ctx }) => {
    // parsedInput is fully typed as { id: string }
    return { id: parsedInput.id, name: 'John Doe', email: 'john@example.com' };
  });

// Usage
async function example() {
  const user = await getUser({ id: '123' }, { userId: 'current-user' });
  console.log(user);
}