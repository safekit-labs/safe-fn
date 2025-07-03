import { z } from "zod";
import { createSafeFnClient } from "@safekit/safe-fn";

// bun run examples/context.example.ts

// ========================================================================
// CONTEXT TYPE DEFINITIONS
// ========================================================================

type AuthContext = {
  userId: string;
  role: "admin" | "user";
  permissions: string[];
};

type DatabaseContext = {
  db: {
    query: (sql: string) => Promise<any>;
  };
  transaction: boolean;
};

// ========================================================================
// CONTEXT SCHEMAS FOR VALIDATION
// ========================================================================

const authContextSchema = z.object({
  userId: z.string(),
  role: z.enum(["admin", "user"]),
  permissions: z.array(z.string()),
});


// ========================================================================
// EXAMPLE 1: TYPE-ONLY CONTEXT (NO RUNTIME VALIDATION)
// ========================================================================

console.log("=== Example 1: Type-only Context ===");

const client1 = createSafeFnClient().context<AuthContext>();

const getUserProfile = client1
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input, ctx }) => {
    // ctx is fully typed as AuthContext
    console.log(`Getting profile for user ${input.userId} by ${ctx.role} ${ctx.userId}`);
    return {
      id: input.userId,
      name: "John Doe",
      accessLevel: ctx.role,
      requestedBy: ctx.userId,
    };
  });

// Usage examples
const authContext: AuthContext = {
  userId: "admin-123",
  role: "admin",
  permissions: ["read", "write", "delete"],
};

// Method 1: Chained .execute()
const profile1 = await getUserProfile
  .withContext(authContext)
  .execute({ userId: "user-456" });

console.log("Profile 1:", profile1);

// Method 2: Direct function call
const profile2 = await getUserProfile
  .withContext(authContext)({ userId: "user-789" });

console.log("Profile 2:", profile2);

// Method 3: Reusable handler pattern
const boundGetUserProfile = getUserProfile.withContext(authContext);
const profile3 = await boundGetUserProfile({ userId: "user-101" });
const profile4 = await boundGetUserProfile.execute({ userId: "user-102" });

console.log("Profile 3:", profile3);
console.log("Profile 4:", profile4);

// ========================================================================
// EXAMPLE 2: SCHEMA-VALIDATED CONTEXT
// ========================================================================

console.log("\n=== Example 2: Schema-validated Context ===");

const client2 = createSafeFnClient().context(authContextSchema);

const deleteUser = client2
  .input(z.object({ userId: z.string() }))
  .handler(async ({ input, ctx }) => {
    if (ctx.role !== "admin") {
      throw new Error("Insufficient permissions");
    }

    console.log(`Admin ${ctx.userId} deleting user ${input.userId}`);
    return { deleted: true, deletedBy: ctx.userId };
  });

// Valid context - will work
try {
  const result = await deleteUser
    .withContext({
      userId: "admin-123",
      role: "admin",
      permissions: ["delete"],
    })
    .execute({ userId: "user-to-delete" });

  console.log("Delete result:", result);
} catch (error: any) {
  console.error("Delete error:", error.message);
}

// Invalid context - will throw validation error
try {
  await deleteUser
    .withContext({
      userId: "admin-123",
      role: "invalid-role", // This will fail validation
      permissions: ["delete"],
    } as any)
    .execute({ userId: "user-to-delete" });
} catch (error: any) {
  console.error("Validation error:", error.message);
}

// ========================================================================
// EXAMPLE 3: ARGS PATTERN WITH CONTEXT
// ========================================================================

console.log("\n=== Example 3: Args Pattern with Context ===");

const client3 = createSafeFnClient().context<AuthContext>();

const updateUserRole = client3
  .args(z.string(), z.enum(["admin", "user"]))
  .handler(async ({ args, ctx }) => {
    const [userId, newRole] = args;

    if (ctx.role !== "admin") {
      throw new Error("Only admins can update roles");
    }

    console.log(`Admin ${ctx.userId} updating user ${userId} to role ${newRole}`);
    return {
      userId,
      oldRole: "user",
      newRole,
      updatedBy: ctx.userId,
    };
  });

const roleUpdateResult = await updateUserRole
  .withContext(authContext)
  .execute("user-123", "admin");

console.log("Role update result:", roleUpdateResult);

// ========================================================================
// EXAMPLE 4: MIDDLEWARE INTEGRATION
// ========================================================================

console.log("\n=== Example 4: Middleware Integration ===");

const client4 = createSafeFnClient()
  .context<AuthContext>()
  .use(async ({ ctx, next }) => {
    // Middleware can access and modify context
    console.log(`Middleware: Request from ${ctx.role} ${ctx.userId}`);

    // Add request timestamp
    const enhancedContext = {
      ...ctx,
      requestTime: new Date().toISOString(),
      enhanced: true
    };

    return next({ ctx: enhancedContext });
  })
  .use(async ({ ctx, next }) => {
    // Second middleware layer
    const result = await next({
      ctx: {
        ...ctx,
        processed: true
      }
    });

    console.log(`Middleware: Request completed for ${ctx.userId}`);
    return result;
  });

const auditLog = client4
  .input(z.object({ action: z.string() }))
  .handler(async ({ input, ctx }) => {
    return {
      action: input.action,
      userId: ctx.userId,
      role: ctx.role,
      timestamp: ctx.requestTime,
      enhanced: ctx.enhanced,
      processed: ctx.processed,
    };
  });

const auditResult = await auditLog
  .withContext(authContext)
  .execute({ action: "user_login" });

console.log("Audit result:", auditResult);

// ========================================================================
// EXAMPLE 5: COMPLEX CONTEXT TYPES
// ========================================================================

console.log("\n=== Example 5: Complex Context Types ===");

// Mock database
const mockDb = {
  query: async (sql: string) => {
    console.log(`Executing query: ${sql}`);
    return { rows: [{ id: 1, name: "Test User" }] };
  },
};

const client5 = createSafeFnClient().context<DatabaseContext>();

const queryUsers = client5
  .input(z.object({ filter: z.string() }))
  .handler(async ({ input, ctx }) => {
    const sql = `SELECT * FROM users WHERE name LIKE '%${input.filter}%'`;
    const result = await ctx.db.query(sql);

    return {
      users: result.rows,
      inTransaction: ctx.transaction,
      queryExecuted: sql,
    };
  });

const queryResult = await queryUsers
  .withContext({
    db: mockDb,
    transaction: true,
  })
  .execute({ filter: "John" });

console.log("Query result:", queryResult);

// ========================================================================
// EXAMPLE 6: ERROR HANDLING WITH CONTEXT
// ========================================================================

console.log("\n=== Example 6: Error Handling with Context ===");

const client6 = createSafeFnClient()
  .context<AuthContext>()
  .use(async ({ ctx, next }) => {
    try {
      return await next();
    } catch (error: any) {
      console.error(`Error for user ${ctx.userId} with role ${ctx.role}:`, error.message);
      throw error;
    }
  });

const riskyOperation = client6
  .input(z.object({ shouldFail: z.boolean() }))
  .handler(async ({ input, ctx }) => {
    if (input.shouldFail) {
      throw new Error(`Operation failed for user ${ctx.userId}`);
    }

    return { success: true, userId: ctx.userId };
  });

// This will succeed
try {
  const successResult = await riskyOperation
    .withContext(authContext)
    .execute({ shouldFail: false });

  console.log("Success result:", successResult);
} catch (error: any) {
  console.error("Unexpected error:", error.message);
}

// This will fail and be caught by middleware
try {
  await riskyOperation
    .withContext(authContext)
    .execute({ shouldFail: true });
} catch (error: any) {
  console.log("Expected error caught:", error.message);
}

console.log("\n=== Context API Examples Complete ===");