import { z } from "zod";

import { createSafeFnClient, createMiddleware } from "@safekit/safe-fn";

// bun run examples/logging.chained.example.ts

// ========================================================================
// DEFINITIONS
// ========================================================================

const loggingMetadataSchema = z.object({
  operationName: z.string(),
  filterInputForLog: z.function().optional(),
  filterOutputForLog: z.function().optional(),
});

// ========================================================================
// CLIENT WITH CHAINED MIDDLEWARE
// ========================================================================

type FnContext = { logger: typeof console };

/**
 * Creates a client with chained middleware - no separate definitions, no generics
 */
const client = createSafeFnClient({
  metadataSchema: loggingMetadataSchema,
})
  .use(
    createMiddleware(async ({ rawArgs, next }) => {
      const [fnCtx] = rawArgs as [FnContext];
      const logger = fnCtx.logger;
      return next({ ctx: { logger } });
    }),
  )
  .use(
    createMiddleware(async ({ ctx, metadata, rawArgs, next }) => {
      // Destructure metadata
      const { operationName, filterInputForLog, filterOutputForLog } = metadata;

      // Define logger and input args
      const [, fnInput] = rawArgs as [FnContext, unknown];
      const logger = ctx.logger; // Use logger from context
      if (!logger) {
        throw new Error("Logger not found in context in createLoggingMiddleware");
      }

      // Transform and sanitize input for logging
      const loggedInput = filterInputForLog ? filterInputForLog(fnInput) : fnInput;

      // Start logging
      logger.info(
        {
          operationName,
          input: loggedInput,
        },
        `Starting ${operationName}`,
      );

      // Call the next middleware
      const result = await next();
      const output = result.output;

      // Transform and sanitize output for logging
      const loggedOutput = filterOutputForLog ? filterOutputForLog(output) : output;

      // Success logging
      logger.info(
        {
          operationName,
          output: loggedOutput,
        },
        `Successfully completed ${operationName}`,
      );

      return result;
    }),
  );

// ========================================================================
// USAGE EXAMPLE
// ========================================================================

const getUser = client
  .metadata({
    operationName: "get_user",
  })
  .args<[FnContext, { id: string }]>(null, z.object({ id: z.string() }))
  .output(z.object({ name: z.string() }))
  .handler(async ({ args, metadata }) => {
    const input = args[1];
    console.log({ input, operationName: metadata.operationName }, "Executing handler");
    return { name: "John" };
  });

const ctx = { logger: console };
getUser(ctx, { id: "123" });
