// ========================================================================
// OUTPUT HANDLING AND VALIDATION UTILITIES
// ========================================================================

import { createParseFn } from "@/parser";

import type { SchemaValidator } from "@/types";
import type { ParseFn } from "@/parser";

// ========================================================================
// OUTPUT VALIDATION UTILITIES
// ========================================================================

/**
 * Output validation options for execution handlers
 */
export interface OutputValidationOptions<TOutput> {
  outputValidator?: ParseFn<TOutput>;
  result: unknown;
}

/**
 * Validates output if validator is provided
 * @param options - Output validation options
 * @returns Validated output or original result if no validator
 */
export function validateOutput<TOutput>(
  options: OutputValidationOptions<TOutput>,
): TOutput {
  const { outputValidator, result } = options;

  if (outputValidator) {
    return outputValidator(result);
  }

  return result as TOutput;
}

/**
 * Creates an output validation helper for middleware and handlers
 * @param outputValidator - Optional output validator function
 * @returns Function that validates output when called
 */
export function createOutputValidator<TOutput>(
  outputValidator?: ParseFn<TOutput>,
): (result: unknown) => TOutput {
  return (result: unknown) => {
    return validateOutput<TOutput>({ outputValidator, result });
  };
}

// ========================================================================
// OUTPUT HANDLING UTILITIES
// ========================================================================

/**
 * Result wrapper for output validation errors
 */
export interface OutputValidationResult<TOutput> {
  success: boolean;
  data?: TOutput;
  error?: Error;
}

/**
 * Safely validates output with error handling
 * @param options - Output validation options
 * @returns Result object with success/error information
 */
export function safeValidateOutput<TOutput>(
  options: OutputValidationOptions<TOutput>,
): OutputValidationResult<TOutput> {
  try {
    const validatedOutput = validateOutput(options);
    return {
      success: true,
      data: validatedOutput,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error(String(error)),
    };
  }
}

/**
 * Type-only output definition helper
 * Used when output type is defined without runtime validation
 */
export function createTypeOnlyOutput<TOutput>(): {
  validate: (result: unknown) => TOutput;
  hasValidation: false;
} {
  return {
    validate: (result: unknown) => result as TOutput,
    hasValidation: false,
  };
}

/**
 * Schema-based output definition helper
 * Used when output type is defined with runtime validation
 */
export function createSchemaBasedOutput<TOutput>(schema: SchemaValidator<TOutput>): {
  validate: (result: unknown) => TOutput;
  hasValidation: true;
} {
  const parseFn = createParseFn(schema);
  const outputValidator = createOutputValidator<TOutput>(parseFn);

  return {
    validate: outputValidator,
    hasValidation: true,
  };
}
