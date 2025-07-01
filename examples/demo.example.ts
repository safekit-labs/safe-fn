// import { createSafeFnClient } from "@/index";
// import { createMiddleware } from "@/middleware";
// import { z } from "zod";

// // bun run examples/demo.example.ts

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
// export const serviceClient = baseClient.use(async ({ metadata, rawInput, next }) => {
//   console.log(
//     {
//       metadata,
//       rawInput,
//     },
//     "middleware",
//   );

//   return next();
// });

// // ========================================================================
// // FUNCTIONS
// // ========================================================================

// // const ctxSchema = z.any();

// export type Context = {
//   db: any;
//   logger: typeof console;
// }

// const inputSchema = z.object({ name: z.string() });
// const outputSchema = z.object({ id: z.string() });

// // Factory function to create a zod validator middleware given an input and output schema
// const zValidator = (schemas: { input: z.ZodSchema; output: z.ZodSchema }) => {
//   return createMiddleware(async ({ ctx, rawInput, next }) => {
//     const inputSchema = schemas.input;
//     const outputSchema = schemas.output;

//     inputSchema.parse(rawInput);
//     await next();

//     outputSchema.parse(rawOutput);

//     return next();
//   });
// };

// const serviceFn = serviceClient
//   .use(zValidator({ input: inputSchema, output: outputSchema }))
//   .output(outputSchema)
//   .handler(async ({ ctx, args }) => {
//     console.log(
//       {
//         ctx,
//         args,
//       },
//       "handler",
//     );

//     return {
//       id: "123",
//     };
//   });

// serviceFn({}, { name: "John" });
