/**
 * Without Schema Validation
 * For simple functions that don't need input validation
 */
import { safeFnClient } from './simple-client-setup';

type AddInput = { a: number; b: number };
type AddOutput = number;

export const addNumbers = safeFnClient
  .meta({ operation: 'add-numbers' })
  .handler<AddInput, AddOutput>(async ({ parsedInput }) => {
    return parsedInput.a + parsedInput.b;
  });

// Usage
async function example() {
  const result = await addNumbers({ a: 5, b: 3 }); // Returns: 8
  console.log(result);
}