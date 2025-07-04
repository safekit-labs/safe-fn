import z from "zod";
import { createSafeFnClient } from "../../src";

// export const contextSchema = z.object({
// 	env: z.object({
// 		NODE_ENV: z.string(),
// 	}),
// });
// export type Context = z.infer<typeof contextSchema>;

export const metadataSchema = z.object({
  operationName: z.string(),
});
export type Metadata = z.infer<typeof metadataSchema>;

export const safeFnClient = createSafeFnClient<{}, Metadata>({
  metadataSchema: z.object({
    operationName: z.string(),
  }),
});


export const inputSchema = z.object({
  userId: z.string(),
});
export type Input = z.infer<typeof inputSchema>;

const getUser = safeFnClient
  .input<Input>(inputSchema)
  .handler(async ({ input }) => {
    return {
      userId: input.userId,
    };
  });

getUser({ userId: "123" });
