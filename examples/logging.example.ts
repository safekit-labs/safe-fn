import { z } from "zod";

import { createSafeFnClient, createMiddleware } from "@safekit/safe-fn";

// bun run examples/logging.example.ts

// ========================================================================
// DEFINITIONS
// ========================================================================

const loggingMetadataSchema = z.object({
  operationName: z.string(),
  transformInput: z.function().optional(),
  transformOutput: z.function().optional(),
});

type LoggingMetadata = z.infer<typeof loggingMetadataSchema>;

// ========================================================================
// LOGGING MIDDLEWARE
// ========================================================================

type FnContext = { logger: typeof console };

/**
 * Creates logging middleware that handles input/output logging with configurable levels
 */
const loggingMiddleware = createMiddleware<{}, LoggingMetadata>(
  async ({ metadata, rawArgs, next }) => {
    // Destructure metadata
    const { operationName, transformInput, transformOutput } = metadata;

    // Define logger and input args
    const [fnCtx, fnInput] = rawArgs as [FnContext, unknown];
    const logger = fnCtx.logger;
    if (!logger) {
      throw new Error("Logger not found in context in createLoggingMiddleware");
    }

    // Transform and sanitize input for logging
    const loggedInput = transformInput ? transformInput(fnInput) : fnInput;

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
    const loggedOutput = transformOutput ? transformOutput(output) : output;

    // Success logging
    logger.info(
      {
        operationName,
        output: loggedOutput,
      },
      `Successfully completed ${operationName}`,
    );

    return result;
  },
);

// ========================================================================
// BASE CLIENT
// ========================================================================

/**
 * Creates a base safe-fn client with logging middleware
 */
const baseClient = createSafeFnClient({
  metadataSchema: loggingMetadataSchema,
});

// ========================================================================
// CLIENT FACTORIES
// ========================================================================

export const commandClient = baseClient.use(loggingMiddleware);
export const queryClient = baseClient.use(loggingMiddleware);
export const serviceClient = baseClient.use(loggingMiddleware);

const getUser = queryClient
  .metadata({
    operationName: "get_user",
  })
  .args<[FnContext, { id: string }]>(null, z.object({ id: z.string() }))
  .output(z.object({ name: z.string() }))
  .handler(async ({ args }) => {
    const input = args[1];
    console.log({ input });
    return { name: "John" };
  });

const ctx = { logger: console };
getUser(ctx, { id: "123" });
