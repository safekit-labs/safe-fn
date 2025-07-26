import { createClient } from "@safekit/safe-fn";
import z from "zod";

const fnClient = createClient();

export const tupleFn = fnClient
  .input(z.tuple([z.string(), z.boolean()]))
  .handler(async ({ input }) => {
    console.log({ input });
    return input;
  });

// const res = tupleFn(["hello", true]);
// const res = tupleFn("hello", true);


export const coerceFn = fnClient
  .input(z.object({
    page: z.coerce.number(),
  }))
  .handler(async ({ input }) => {
    console.log({ input });
    return input;
  });
