/**
 * Basic Function Patterns
 * Examples showing different input/output patterns
 */
import { z } from "zod";
import { createSafeFnClient } from "@/factory";

// Create a SafeFn client with default context
const safeFnClient = createSafeFnClient({
  defaultContext: { userId: "anonymous" },
});

// 1. Single Object Pattern
export const getUser = safeFnClient
  .input(z.object({ id: z.string() }))
  .handler(async ({ parsedInput }) => {
    return { id: parsedInput.id, name: "John" };
  });

// 2. Multiple Arguments Pattern
export const addUser = safeFnClient
  .input([z.string(), z.number()]) // name, age
  .handler(async ({ args }) => {
    const [name, age] = args;
    return { id: "123", name, age };
  });

// 3. Zero Arguments Pattern
export const healthCheck = safeFnClient.input([]).handler(async () => ({ status: "ok" }));

// 4. Without Schema Validation
type Input = { a: number; b: number };

export const add = safeFnClient.handler<Input, number>(async ({ parsedInput }) => {
  return parsedInput.a + parsedInput.b;
});

// Usage examples
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function examples() {
  // Object pattern usage
  const user = await getUser({ id: "123" }, { userId: "user-1" });

  // Multiple arguments pattern usage
  const newUser = await addUser("John", 25);

  // Zero args usage
  const health = await healthCheck();

  // Without validation usage
  const result = await add({ a: 5, b: 3 });

  return { user, newUser, health, result };
}
