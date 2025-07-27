// ========================================================================
// VALIDATION MIDDLEWARE
// ========================================================================

import { standardValidate } from "../validator";

import type { SchemaValidator } from "../types";
import type { MiddlewareFn, Metadata } from "../types";

// ========================================================================
// INPUT VALIDATION MIDDLEWARE
// ========================================================================

/**
 * Creates middleware that validates input and stores result in context
 * Following middleware-only architecture pattern
 */
export function inputValidationMiddleware<TInput>(
  schema: SchemaValidator<TInput>
): MiddlewareFn<any, any, any> {
  return async (context, next) => {
    let validatedInput: any = context.rawInput;
    
    // Only validate if schema is provided (not null)
    if (schema !== null && schema !== undefined) {
      validatedInput = standardValidate(schema as any, context.rawInput);
    }

    // Continue with validated input in context
    const result = await next({
      ...context,
      input: validatedInput,
      validatedInput,
    });

    return result;
  };
}

// ========================================================================
// ARGS VALIDATION MIDDLEWARE
// ========================================================================

/**
 * Creates middleware that validates multiple arguments and stores result in context
 */
export function argsValidationMiddleware<TArgs extends readonly any[]>(
  schemas: readonly SchemaValidator<TArgs[number]>[]
): MiddlewareFn<any, any, any> {
  return async (context, next) => {
    // Start with raw args or empty array if no args provided
    const rawArgs = Array.isArray(context.rawArgs) ? context.rawArgs : [];
    let validatedArgs: any[] = [...rawArgs];

    // If we have schemas, validate according to them
    if (schemas && schemas.length > 0) {
      validatedArgs = schemas.map((schema, index) => {
        const arg = rawArgs[index];
        
        // Only validate if schema is provided (not null/undefined)
        if (schema !== null && schema !== undefined) {
          return standardValidate(schema as any, arg);
        }
        
        // Return raw arg if no schema (null marker)
        return arg;
      });
    }
    // If no schemas (.args() with no parameters), use raw args as-is

    // Continue with validated args in context
    const result = await next({
      ...context,
      args: validatedArgs,
      validatedArgs,
    });

    return result;
  };
}

// ========================================================================
// OUTPUT VALIDATION MIDDLEWARE
// ========================================================================

/**
 * Creates middleware that validates handler output
 * This runs after the handler and validates the return value
 */
export function outputValidationMiddleware<TOutput>(
  schema: SchemaValidator<TOutput>
): MiddlewareFn<any, any, any> {
  return async (context, next) => {
    // Execute the rest of the middleware chain and handler
    const result = await next(context);

    // Only validate if schema is provided (not null)
    if (schema !== null && schema !== undefined) {
      return standardValidate(schema as any, result);
    }

    return result;
  };
}

// ========================================================================
// METADATA VALIDATION MIDDLEWARE
// ========================================================================

/**
 * Creates middleware that validates metadata
 */
export function metadataValidationMiddleware<TMetadata extends Metadata>(
  schema: SchemaValidator<TMetadata>
): MiddlewareFn<TMetadata, any, any> {
  return async (context, next) => {
    let validatedMetadata: any = context.metadata;

    // Only validate if schema is provided (not null)
    if (schema !== null && schema !== undefined) {
      validatedMetadata = standardValidate(schema as any, context.metadata);
    }

    // Continue with validated metadata in context
    const result = await next({
      ...context,
      metadata: validatedMetadata,
    });

    return result;
  };
}