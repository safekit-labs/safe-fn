import { createSafeFnClient } from "@/index";

export const fnClient = createSafeFnClient()
  .use(async ({ ctx, next }) => {
    console.log({ ctx });
    const sessionId = "123";
    return next({ ctx: { sessionId } });
  })
  .use(async ({ next, ctx }) => {
    const { sessionId } = ctx; // Context contains `sessionId`
    console.log({ sessionId });
    const userId = "456";
    return next({ ctx: { userId } });
  })
  .use(async ({ ctx, next }) => {
    // You can also define a middleware function that doesn't extend or modify the context.
    console.log({ userId: ctx.userId, sessionId: ctx.sessionId });
    return next();
  });
