/**
 * Basic Usage Example
 * Simple safe functions with validation
 */

import { createSafeFn } from '@corporationx/safe-fn';
import { z } from 'zod';

// Simple safe function with validation
const addNumbers = createSafeFn()
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