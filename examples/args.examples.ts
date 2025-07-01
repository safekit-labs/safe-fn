/**
 * Args Method Examples
 * Demonstrates the new .args() method with three validation patterns
 */
import { z } from "zod";
import { createSafeFn } from "@/safe-fn";

// ========================================================================
// THREE VALIDATION PATTERNS
// ========================================================================

// 1. TYPE-ONLY: No validation, just TypeScript types
export const typeOnlyExample = createSafeFn()
  .args<[{ userId: string }, { data: any }]>() // No schemas = no validation
  .handler(async ({ args }) => {
    const [auth, payload] = args; // Typed but unvalidated
    return { userId: auth.userId, data: payload.data };
  });

// 2. MIXED: Some validated, some type-only
export const mixedExample = createSafeFn()
  .args<[{ userId: string }, { data: string }]>(
    null,                                    // Type-only for auth
    z.object({ data: z.string().min(1) })   // Validated for payload
  )
  .handler(async ({ args }) => {
    const [auth, payload] = args;
    return { userId: auth.userId, data: payload.data };
  });

// 3. FULL VALIDATION: All arguments validated
export const fullValidationExample = createSafeFn()
  .args(
    z.object({ userId: z.string().uuid() }),
    z.object({ data: z.string().min(1) })
  )
  .handler(async ({ args }) => {
    const [auth, payload] = args;
    return { userId: auth.userId, data: payload.data };
  });

// ========================================================================
// SINGLE INPUT PATTERNS
// ========================================================================

// Schema-less single input (type-only)
export const typeOnlySingleInput = createSafeFn()
  .input<{ name: string; age: number }>()
  .handler(async ({ input }) => {
    return `${input.name} is ${input.age} years old`; // Typed but unvalidated
  });

// Validated single input
export const validatedSingleInput = createSafeFn()
  .input(z.object({ name: z.string(), age: z.number() }))
  .handler(async ({ input }) => {
    return `${input.name} is ${input.age} years old`; // Typed and validated
  });

// ========================================================================
// 1. All validated arguments
// ========================================================================

export const addNumbers = createSafeFn()
  .args(z.number(), z.number())
  .handler(async ({ args }) => {
    const [a, b] = args; // Both are number (validated)
    return a + b;
  });

// ========================================================================
// 2. Null markers with explicit generics (recommended)
// ========================================================================

export const userOperation = createSafeFn()
  .args<[{ userId: string }, { email: string }]>(
    null,                                    // Skip validation for auth context
    z.object({ email: z.string().email() }) // Validate email input
  )
  .handler(async ({ args }) => {
    const [authCtx, input] = args;
    // authCtx: { userId: string } (unvalidated but typed)
    // input: { email: string } (validated)
    
    return `User ${authCtx.userId} updated email to ${input.email}`;
  });

// ========================================================================
// 3. Null markers without generics (infers as unknown)
// ========================================================================

export const mixedValidation = createSafeFn()
  .args(null, z.string(), null)
  .handler(async ({ args }) => {
    const [first, validated, third] = args;
    // first: unknown (null marker without generic)
    // validated: string (validated)
    // third: unknown (null marker without generic)
    
    return {
      first: first,           // Type: unknown
      validated: validated,   // Type: string
      third: third           // Type: unknown
    };
  });

// ========================================================================
// 4. Zero arguments
// ========================================================================

export const healthCheck = createSafeFn()
  .args()
  .handler(async ({ args }) => {
    return {
      status: "ok",
      argsCount: args.length // Will be 0
    };
  });

// ========================================================================
// 5. Comparison: .input() vs .args()
// ========================================================================

// Single object input (use .input())
export const singleInput = createSafeFn()
  .input(z.object({ name: z.string() }))
  .handler(async ({ input }) => {
    return `Hello ${input.name}`;
  });

// Multiple arguments (use .args())
export const multipleArgs = createSafeFn()
  .args(z.string(), z.number())
  .handler(async ({ args }) => {
    const [name, age] = args;
    return `${name} is ${age} years old`;
  });

// ========================================================================
// Usage examples
// ========================================================================

export async function demonstrateUsage() {
  // ===== THREE VALIDATION PATTERNS =====
  
  // 1. Type-only (no validation)
  console.log("Type-only pattern:");
  const typeResult = await typeOnlyExample(
    { userId: "123" }, 
    { data: "anything" } // No validation!
  );
  console.log(typeResult);

  // 2. Mixed validation
  console.log("\nMixed validation pattern:");
  const mixedResult = await mixedExample(
    { userId: "123" },    // Unvalidated
    { data: "validated" } // Must pass validation
  );
  console.log(mixedResult);

  // 3. Full validation
  console.log("\nFull validation pattern:");
  const fullResult = await fullValidationExample(
    { userId: "550e8400-e29b-41d4-a716-446655440000" }, // Must be valid UUID
    { data: "validated" } // Must pass validation
  );
  console.log(fullResult);

  // ===== SINGLE INPUT PATTERNS =====
  
  // Type-only single input
  console.log("\nType-only single input:");
  console.log(await typeOnlySingleInput({ name: "John", age: 25 }));

  // Validated single input
  console.log("\nValidated single input:");
  console.log(await validatedSingleInput({ name: "Jane", age: 30 }));

  // ===== OTHER EXAMPLES =====
  
  // Basic validated args
  console.log("\nBasic validated args:");
  console.log(await addNumbers(5, 3)); // 8

  // Mixed validation with generics  
  const userResult = await userOperation(
    { userId: "123" },
    { email: "new@example.com" }
  );
  console.log(userResult);

  // Unknown types without generics
  const unknownResult = await mixedValidation("any-value", "validated-string", 42);
  console.log(unknownResult);

  // Health check
  console.log(await healthCheck());
}