import { createMiddleware, createSafeFnClient } from "../src/index";
import { z } from "zod";

// ========================================================================
// DEFINITIONS
// ========================================================================

type Logger = {
	info: (...args: any[]) => void;
	debug: (...args: any[]) => void;
};

type LogLevel = "debug" | "info";

const loggingMetadataSchema = z.object({
	operationName: z.string(),
});

type LoggingMetadata = z.infer<typeof loggingMetadataSchema>;

// ========================================================================
// MIDDLEWARE
// ========================================================================

export type LoggerContext = {
	logger: Logger;
};

// ========================================================================
// LOGGING MIDDLEWARE
// ========================================================================

/**
 * Creates logging middleware that handles input/output logging with configurable levels
 */
const createLoggingMiddleware = (config: {
	inputLevel: LogLevel;
	outputLevel: LogLevel;
}) =>
	createMiddleware<LoggerContext, LoggingMetadata, LoggerContext>(
		async ({ ctx, metadata, next }) => {
			// Destructure metadata
			const { operationName } = metadata;


			// Define logger and input args
			const logger = ctx.logger; // Use logger from context
			if (!logger) {
				throw new Error(
					"Logger not found in context in createLoggingMiddleware"
				);
			}

			// Start logging
			logger[config.inputLevel]({
				operationName,
			});

			// Call the next middleware
			const result = await next();

			// Success logging
			logger[config.outputLevel]({
				operationName,
			});

			return result;
		}
	);

// ========================================================================
// BASE CLIENT
// ========================================================================

/**
 * Creates a base safe-fn client with logging middleware
 */
const baseClient = createSafeFnClient({
	defaultContext: { logger: {} as Logger },
	metadataSchema: loggingMetadataSchema,
});

// ========================================================================
// MIDDLEWARE
// ========================================================================

const infoLoggingMiddleware = createLoggingMiddleware({
	inputLevel: "info",
	outputLevel: "info",
});
const debugLoggingMiddleware = createLoggingMiddleware({
	inputLevel: "debug",
	outputLevel: "debug",
});

// ========================================================================
// CLIENT FACTORIES
// ========================================================================

// export const commandClient: SafeFnWithoutContext<LoggerContext, {}, unknown, unknown, LoggingMetadata, 'none'> = baseClient.use(infoLoggingMiddleware);
// export const queryClient: SafeFnWithoutContext<LoggerContext, {}, unknown, unknown, LoggingMetadata, 'none'> = baseClient.use(infoLoggingMiddleware);
// export const serviceClient: SafeFnWithoutContext<LoggerContext, {}, unknown, unknown, LoggingMetadata, 'none'> = baseClient.use(debugLoggingMiddleware);

export const commandClient = baseClient.use(infoLoggingMiddleware);
export const queryClient = baseClient.use(infoLoggingMiddleware);
export const serviceClient = baseClient.use(debugLoggingMiddleware);
