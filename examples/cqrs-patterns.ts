/**
 * Function Patterns Example
 * Different types of safe functions
 */

import { createSafeFnClient, Context } from '@corporationx/safe-fn';
import { z } from 'zod';

interface UserContext extends Context {
  userId: string;
  requestId: string;
}

const client = createSafeFnClient<UserContext>();

// Safe function - modifies state
const createUser = client
  .meta({ operation: 'create-user', type: 'mutation' })
  .input(z.object({
    email: z.string().email(),
    name: z.string()
  }))
  .handler(async ({ parsedInput }) => {
    // Create user in database
    return { 
      id: 'user123', 
      email: parsedInput.email, 
      name: parsedInput.name 
    };
  });

// Safe function - reads data
const getUser = client
  .meta({ operation: 'get-user', type: 'query' })
  .input(z.object({ id: z.string() }))
  .handler(async ({ parsedInput }) => {
    // Fetch user from database
    return { id: parsedInput.id, name: 'John Doe' };
  });

// Safe function - general business logic
const sendWelcomeEmail = client
  .meta({ operation: 'send-welcome-email', type: 'service' })
  .input(z.object({ 
    userId: z.string(),
    email: z.string().email()
  }))
  .handler(async ({ parsedInput }) => {
    // Send email via service
    return { sent: true, messageId: 'msg123' };
  });