/**
 * Basic Usage Example
 * Simple safe functions with validation
 */

import { createSafeFnClient } from '@corporationx/safe-fn';
import { z } from 'zod';

// Create a simple client
const client = createSafeFnClient();

// Simple safe function with validation
const addNumbers = client
  .meta({ operation: 'add' })
  .input(z.object({
    a: z.number(),
    b: z.number()
  }))
  .handler(async ({ parsedInput }) => {
    return parsedInput.a + parsedInput.b;
  });

// Usage
const result = await addNumbers({ a: 5, b: 3 }); // Returns: 8