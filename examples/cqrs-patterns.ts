/**
 * CQRS Patterns Example
 * Commands vs Queries vs Services
 */

import { createClient, Context } from '@corporationx/procedure-builder';
import { z } from 'zod';

interface UserContext extends Context {
  userId: string;
  requestId: string;
}

const client = createClient<UserContext>();

// Command - modifies state
const createUser = client
  .metadata({ operation: 'create-user' })
  .inputSchema(z.object({
    email: z.string().email(),
    name: z.string()
  }))
  .command(async ({ parsedInput }) => {
    // Create user in database
    return { 
      id: 'user123', 
      email: parsedInput.email, 
      name: parsedInput.name 
    };
  });

// Query - reads data
const getUser = client
  .metadata({ operation: 'get-user' })
  .inputSchema(z.object({ id: z.string() }))
  .query(async ({ parsedInput }) => {
    // Fetch user from database
    return { id: parsedInput.id, name: 'John Doe' };
  });

// Service - general business logic
const sendWelcomeEmail = client
  .metadata({ operation: 'send-welcome-email' })
  .inputSchema(z.object({ 
    userId: z.string(),
    email: z.string().email()
  }))
  .service(async ({ parsedInput }) => {
    // Send email via service
    return { sent: true, messageId: 'msg123' };
  });