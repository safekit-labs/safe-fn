import z from "zod";
import { createSafeFnClient } from "../../src";

export const metadataSchema = z.object({
  operationName: z.string(),
});
export type Metadata = z.infer<typeof metadataSchema>;

export const safeFnClient = createSafeFnClient();

export const inputSchema = z.object({
  userId: z.string(),
});
export type Input = z.infer<typeof inputSchema>;

export const outputSchema = z.object({
  userId: z.string(),
});
export type Output = z.infer<typeof outputSchema>;

const getUser = safeFnClient
  .input<Input>()
  .output<Output>()
  .handler(async ({ input }) => {
    return {
      userId: input.userId,
    };
  });

getUser({ userId: "123" });
