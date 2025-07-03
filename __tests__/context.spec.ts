import { z } from "zod";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { createSafeFnClient } from "../src";

describe("Context API", () => {
  // Test types and schemas
  type AuthContext = {
    userId: string;
    role: "admin" | "user";
  };

  type DatabaseContext = {
    db: { query: (sql: string) => Promise<any> };
    transaction: boolean;
  };

  const authContextSchema = z.object({
    userId: z.string(),
    role: z.enum(["admin", "user"]),
  });

  describe("Context Definition", () => {
    it("should create client without context capabilities", () => {
      const client = createSafeFnClient();

      const simpleFunction = client
        .input(z.object({ name: z.string() }))
        .handler(async ({ input }) => {
          return { greeting: `Hello ${input.name}` };
        });

      // Should be callable directly
      expect(typeof simpleFunction).toBe("function");

      // Should not have withContext method
      expect((simpleFunction as any).withContext).toBeUndefined();
    });

    it("should create client with type-only context", () => {
      const client = createSafeFnClient().context<AuthContext>();

      const contextFunction = client
        .input(z.object({ userId: z.string() }))
        .handler(async ({ input, ctx }) => {
          // ctx should be properly typed as AuthContext
          return {
            message: `User ${input.userId} has role ${ctx.role}`,
            userId: ctx.userId
          };
        });

      // Should not be directly callable
      expect(typeof contextFunction).toBe("object");

      // Should have withContext method
      expect(typeof contextFunction.withContext).toBe("function");
    });

    it("should create client with schema-inferred context", () => {
      const client = createSafeFnClient().context(authContextSchema);

      const contextFunction = client
        .input(z.object({ message: z.string() }))
        .handler(async ({ input, ctx }) => {
          // ctx should be properly typed as inferred from schema
          return {
            response: `${input.message} from ${ctx.userId}`,
            role: ctx.role
          };
        });

      // Should not be directly callable
      expect(typeof contextFunction).toBe("object");

      // Should have withContext method
      expect(typeof contextFunction.withContext).toBe("function");
    });

    it("should create client with explicit type override", () => {
      const client = createSafeFnClient().context<AuthContext>(authContextSchema);

      const contextFunction = client
        .input(z.object({ action: z.string() }))
        .handler(async ({ input, ctx }) => {
          // ctx should be properly typed as AuthContext
          return {
            action: input.action,
            userId: ctx.userId,
            role: ctx.role
          };
        });

      // Should not be directly callable
      expect(typeof contextFunction).toBe("object");

      // Should have withContext method
      expect(typeof contextFunction.withContext).toBe("function");
    });
  });

  describe("Context Binding and Execution", () => {
    let authContext: AuthContext;

    beforeEach(() => {
      authContext = { userId: "123", role: "admin" };
    });

    it("should execute with chained .execute() method", async () => {
      const client = createSafeFnClient().context<AuthContext>();
      const contextFunction = client
        .input(z.object({ name: z.string() }))
        .handler(async ({ input, ctx }) => {
          return {
            greeting: `Hello ${input.name}`,
            userId: ctx.userId,
            role: ctx.role
          };
        });

      const result = await contextFunction
        .withContext!(authContext)
        .execute({ name: "John" });

      expect(result).toEqual({
        greeting: "Hello John",
        userId: "123",
        role: "admin"
      });
    });

    it("should execute with direct function call", async () => {
      const client = createSafeFnClient().context<AuthContext>();
      const contextFunction = client
        .input(z.object({ name: z.string() }))
        .handler(async ({ input, ctx }) => {
          return {
            greeting: `Hello ${input.name}`,
            userId: ctx.userId,
            role: ctx.role
          };
        });

      const result = await contextFunction
        .withContext!(authContext)({ name: "Jane" });

      expect(result).toEqual({
        greeting: "Hello Jane",
        userId: "123",
        role: "admin"
      });
    });

    it("should support reusable handler pattern", async () => {
      const client = createSafeFnClient().context<AuthContext>();
      const contextFunction = client
        .input(z.object({ name: z.string() }))
        .handler(async ({ input, ctx }) => {
          return {
            greeting: `Hello ${input.name}`,
            userId: ctx.userId,
            role: ctx.role
          };
        });

      const boundHandler = contextFunction.withContext!(authContext);

      // Should be callable directly
      const result1 = await boundHandler({ name: "Alice" });
      expect(result1.greeting).toBe("Hello Alice");

      // Should also have execute method
      const result2 = await boundHandler.execute({ name: "Bob" });
      expect(result2.greeting).toBe("Hello Bob");

      // Both should have same context
      expect(result1.userId).toBe("123");
      expect(result2.userId).toBe("123");
    });

    it("should maintain separate context bindings", async () => {
      const client = createSafeFnClient().context<AuthContext>();
      const contextFunction = client
        .input(z.object({ name: z.string() }))
        .handler(async ({ input, ctx }) => {
          return {
            greeting: `Hello ${input.name}`,
            userId: ctx.userId,
            role: ctx.role
          };
        });

      const adminContext = { userId: "admin", role: "admin" as const };
      const userContext = { userId: "user", role: "user" as const };

      const adminHandler = contextFunction.withContext!(adminContext);
      const userHandler = contextFunction.withContext!(userContext);

      const adminResult = await adminHandler({ name: "Admin" });
      const userResult = await userHandler({ name: "User" });

      expect(adminResult.role).toBe("admin");
      expect(userResult.role).toBe("user");
    });
  });

  describe("Context Validation", () => {
    it("should validate context when schema is provided", async () => {
      const client = createSafeFnClient().context(authContextSchema);

      const contextFunction = client
        .input(z.object({ message: z.string() }))
        .handler(async ({ input, ctx }) => {
          return { message: input.message, userId: ctx.userId };
        });

      // Valid context should work
      const validContext = { userId: "123", role: "admin" as const };
      const result = await contextFunction
        .withContext!(validContext)
        .execute({ message: "test" });

      expect(result.userId).toBe("123");

      // Invalid context should throw
      const invalidContext = { userId: 123, role: "invalid" };
      await expect(
        contextFunction.withContext!(invalidContext as any).execute({ message: "test" })
      ).rejects.toThrow();
    });

    it("should not validate context when no schema is provided", async () => {
      const client = createSafeFnClient().context<AuthContext>();

      const contextFunction = client
        .input(z.object({ message: z.string() }))
        .handler(async ({ input, ctx }) => {
          return { message: input.message, userId: ctx.userId };
        });

      // Any context should work (no runtime validation)
      const anyContext = { userId: "123", role: "admin", extra: "field" };
      const result = await contextFunction
        .withContext!(anyContext as any)
        .execute({ message: "test" });

      expect(result.userId).toBe("123");
    });
  });

  describe("Integration with Middleware", () => {
    it("should work with middleware that modifies context", async () => {
      const client = createSafeFnClient()
        .context<AuthContext>()
        .use(async ({ ctx, next }) => {
          // Middleware can access and modify context
          const enhancedContext = { ...ctx, enhanced: true };
          return next({ ctx: enhancedContext });
        });

      const contextFunction = client
        .input(z.object({ action: z.string() }))
        .handler(async ({ input, ctx }) => {
          return {
            action: input.action,
            userId: ctx.userId,
            enhanced: (ctx as any).enhanced
          };
        });

      const result = await contextFunction
        .withContext!({ userId: "123", role: "admin" })
        .execute({ action: "test" });

      expect(result.enhanced).toBe(true);
    });

    it("should work with multiple middleware layers", async () => {
      const client = createSafeFnClient()
        .context<AuthContext>()
        .use(async ({ ctx, next }) => {
          return next({ ctx: { ...ctx, layer1: true } });
        })
        .use(async ({ ctx, next }) => {
          return next({ ctx: { ...ctx, layer2: true } });
        });

      const contextFunction = client
        .input(z.object({ test: z.string() }))
        .handler(async ({ input, ctx }) => {
          return {
            test: input.test,
            layer1: (ctx as any).layer1,
            layer2: (ctx as any).layer2
          };
        });

      const result = await contextFunction
        .withContext!({ userId: "123", role: "admin" })
        .execute({ test: "middleware" });

      expect(result.layer1).toBe(true);
      expect(result.layer2).toBe(true);
    });
  });

  describe("Error Handling", () => {
    it("should provide clear error when calling context function without withContext", () => {
      const client = createSafeFnClient().context<AuthContext>();

      const contextFunction = client
        .input(z.object({ test: z.string() }))
        .handler(async ({ input }) => {
          return { test: input.test };
        });

      // Should throw clear error when trying to call directly
      expect(() => {
        (contextFunction as any)({ test: "fail" });
      }).toThrow(/context/i);
    });

    it("should handle errors in context-bound functions", async () => {
      const client = createSafeFnClient().context<AuthContext>();

      const contextFunction = client
        .input(z.object({ shouldFail: z.boolean() }))
        .handler(async ({ input }) => {
          if (input.shouldFail) {
            throw new Error("Handler error");
          }
          return { success: true };
        });

      await expect(
        contextFunction
          .withContext!({ userId: "123", role: "admin" })
          .execute({ shouldFail: true })
      ).rejects.toThrow("Handler error");
    });
  });

  describe("Type Safety", () => {
    it("should enforce context type in handler", () => {
      const client = createSafeFnClient().context<AuthContext>();

      // This should compile without errors
      const validFunction = client
        .input(z.object({ test: z.string() }))
        .handler(async ({ ctx }) => {
          // ctx should be typed as AuthContext
          const userId: string = ctx.userId;
          const role: "admin" | "user" = ctx.role;
          return { userId, role };
        });

      expect(validFunction).toBeDefined();
    });

    it("should enforce context type in withContext", () => {
      const client = createSafeFnClient().context<AuthContext>();

      const contextFunction = client
        .input(z.object({ test: z.string() }))
        .handler(async ({ input }) => {
          return { test: input.test };
        });

      // This should work with valid context
      const validContext = { userId: "123", role: "admin" as const };
      const boundFunction = contextFunction.withContext!(validContext);
      expect(boundFunction).toBeDefined();
    });
  });

  describe("Args Pattern with Context", () => {
    it("should work with .args() pattern", async () => {
      const client = createSafeFnClient().context<AuthContext>();

      const contextFunction = client
        .args(z.string(), z.number())
        .handler(async ({ args, ctx }) => {
          const [name, age] = args;
          return {
            greeting: `Hello ${name}, age ${age}`,
            userId: ctx.userId,
            role: ctx.role
          };
        });

      const result = await contextFunction
        .withContext!({ userId: "123", role: "admin" })
        .execute("John", 25);

      expect(result).toEqual({
        greeting: "Hello John, age 25",
        userId: "123",
        role: "admin"
      });
    });

    it("should support reusable handler with args pattern", async () => {
      const client = createSafeFnClient().context<AuthContext>();

      const contextFunction = client
        .args(z.string())
        .handler(async ({ args, ctx }) => {
          const [message] = args;
          return { message, userId: ctx.userId };
        });

      const boundHandler = contextFunction.withContext!({ userId: "123", role: "admin" });

      // Both patterns should work
      const result1 = await boundHandler("Hello");
      const result2 = await boundHandler.execute("World");

      expect(result1.message).toBe("Hello");
      expect(result2.message).toBe("World");
      expect(result1.userId).toBe("123");
      expect(result2.userId).toBe("123");
    });
  });

  describe("Complex Context Types", () => {
    it("should handle complex nested context types", async () => {
      const client = createSafeFnClient().context<DatabaseContext>();

      const mockDb = {
        query: vi.fn().mockResolvedValue({ rows: [{ id: 1, name: "test" }] })
      };

      const contextFunction = client
        .input(z.object({ sql: z.string() }))
        .handler(async ({ input, ctx }) => {
          const result = await ctx.db.query(input.sql);
          return {
            data: result,
            transaction: ctx.transaction
          };
        });

      const result = await contextFunction
        .withContext!({ db: mockDb, transaction: true })
        .execute({ sql: "SELECT * FROM users" });

      expect(mockDb.query).toHaveBeenCalledWith("SELECT * FROM users");
      expect(result.transaction).toBe(true);
    });
  });
});