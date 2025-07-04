import z from "zod";
import { createSafeFnClient } from "../../src/index";

export const safeFnClient = createSafeFnClient({
  metadataSchema: z.object({
    operationName: z.string(),
  }),
});

export const contextSchema = z.object({
  userId: z.string(),
});
export type Context = z.infer<typeof contextSchema>;

const getUser = safeFnClient
  .context<Context>()
  .metadata({
    operationName: "getUser",
  })
  .handler(async () => {
    return {};
  });

getUser
  .withContext({
    userId: "123",
  })
  .execute();

const getUserId = safeFnClient
  .handler(async () => {
    return {};
  });

getUserId();
