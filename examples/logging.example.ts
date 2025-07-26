import { z } from "zod";

import { createClient, createMiddleware } from "@safekit/safe-fn";

// bun run examples/logging.example.ts

// ========================================================================
// DEFINITIONS
// ========================================================================

const loggingMetadataSchema = z.object({
  operationName: z.string(),
  filterInputForLog: z.any().refine(val => typeof val === "function").optional(),
  filterOutputForLog: z.any().refine(val => typeof val === "function").optional(),
});

type LoggingMetadata = z.infer<typeof loggingMetadataSchema>;

// ========================================================================
// LOGGING MIDDLEWARE
// ========================================================================

type FnContext = { logger: typeof console };
type ClientContext = { logger: typeof console };

const extractLoggerMiddleware = createMiddleware<{}, LoggingMetadata, ClientContext>(
  async ({ rawArgs, next }) => {
    const [fnCtx] = rawArgs as [FnContext];
    const logger = fnCtx.logger;
    return next({ ctx: { logger } });
  },
);

/**
 * Creates logging middleware that handles input/output logging with configurable levels
 */
const loggingMiddleware = createMiddleware<ClientContext, LoggingMetadata, ClientContext>(
  async ({ ctx, metadata, rawArgs, next }) => {
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
  },
);

// ========================================================================
// BASE CLIENT
// ========================================================================

/**
 * Creates a base safe-fn client with logging middleware
 */
const baseClient = createClient({
  metadataSchema: loggingMetadataSchema,
}).use(extractLoggerMiddleware);

// ========================================================================
// CLIENT FACTORIES
// ========================================================================

export const commandClient = baseClient.use(loggingMiddleware);
export const queryClient = baseClient.use(loggingMiddleware);
export const serviceClient = baseClient.use(loggingMiddleware);

const getUser = queryClient
  .metadata({
    operationName: "get_user",
    filterOutputForLog: (output: any) => ({ ...output, surname: "Doe" }),
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
