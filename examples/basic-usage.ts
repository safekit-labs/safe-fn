/**
 * Basic Usage Examples
 * Demonstrates both object and tuple patterns with different validators
 */
import { z } from 'zod';
import * as yup from 'yup';
import Joi from 'joi';
import { client } from './simple-client-setup';

// Object pattern with Zod - uses parsedInput
export const getUser = client
  .meta({ operation: 'get-user', requiresAuth: true })
  .input(z.object({ id: z.string() }))
  .handler(async ({ parsedInput }) => {
    return { id: parsedInput.id, name: 'John Doe', email: 'john@example.com' };
  });

// Tuple pattern with Zod - uses args
export const createUser = client
  .meta({ operation: 'create-user', requiresAuth: true })
  .input(z.tuple([z.string(), z.string().email()]))
  .handler(async ({ args }) => {
    const [name, email] = args;
    return { id: '123', name, email, createdAt: new Date() };
  });

// Zero arguments with Zod - uses args (empty)
export const healthCheck = client
  .meta({ operation: 'health-check' })
  .input(z.tuple([]))
  .handler(async ({ args }) => {
    return { status: 'ok', timestamp: new Date() };
  });

// Object pattern with Yup - clean TypeScript (no 'as any' needed!)
const yupSchema = yup.object({ 
  username: yup.string().min(3).required(),
  age: yup.number().positive().required()
});

export const updateProfile = client
  .meta({ operation: 'update-profile' })
  .input(yupSchema)
  .handler(async ({ parsedInput }) => {
    return { message: `Updated ${parsedInput.username}, age ${parsedInput.age}` };
  });

// Object pattern with Joi - clean TypeScript (no 'as any' needed!)
const joiSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('admin', 'user').required()
});

export const assignRole = client
  .meta({ operation: 'assign-role', requiresAuth: true })
  .input(joiSchema)
  .handler(async ({ parsedInput }) => {
    return { email: parsedInput.email, role: parsedInput.role, assignedAt: new Date() };
  });

// Usage examples (commented out to avoid unused function warnings)
// async function examples() {
//   // Object pattern usage
//   const user = await getUser({ id: '123' }, { userId: 'current-user' });
//   
//   // Tuple pattern usage (context via builder chain only)
//   const newUser = await createUser('Jane Doe', 'jane@example.com');
//   
//   // Zero args usage
//   const health = await healthCheck();
//   
//   // Yup schema usage
//   const profile = await updateProfile({ username: 'john_doe', age: 25 }, {});
//   
//   // Joi schema usage  
//   const role = await assignRole({ email: 'admin@example.com', role: 'admin' }, {});
// }