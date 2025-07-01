// import { createSafeFnClient } from "@/index";
// import { z } from "zod";

// // ========================================================================
// // TYPES
// // ========================================================================

// // Define metadata schema for logging operations
// const loggingMetadataSchema = z.object({
//   operationName: z.string(),
//   baseProps: z.record(z.unknown()).optional().default({}),
//   transformInput: z.function().optional(),
//   transformOutput: z.function().optional(),
// });

// const baseClient = createSafeFnClient({
//   metadataSchema: loggingMetadataSchema,
// });

// // ========================================================================
// // CLIENT FACTORIES
// // ========================================================================

// /**
//  * Creates a command client with logging middleware
//  */
// export const createCommandClient = baseClient.use(async ({ metadata, rawInput, next }) => {
//   const { operationName, baseProps = {} } = metadata;

//   return next();
// });

// // ========================================================================
// // FUNCTIONS
// // ========================================================================
