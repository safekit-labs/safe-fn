/**
 * Basic Usage Example
 * Simple procedures with validation
 */

import { procedure } from '@corporationx/procedure-builder';
import { z } from 'zod';

// Simple procedure with validation
const addNumbers = procedure()
  .metadata({ operation: 'add' })
  .inputSchema(z.object({
    a: z.number(),
    b: z.number()
  }))
  .service(async ({ parsedInput }) => {
    return parsedInput.a + parsedInput.b;
  });

// Usage
const result = await addNumbers({ a: 5, b: 3 }); // Returns: 8