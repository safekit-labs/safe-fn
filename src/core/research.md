## Better Call

```ts
import { createMiddleware, createEndpoint } from "better-call";

const middleware = createMiddleware(async (ctx) => {
    return {
        name: "hello"
    }
})

const endpoint = createEndpoint("/", {
    method: "GET",
    use: [middleware],
}, async (ctx) => {
   //this will be the context object returned by the middleware with the name property
   ctx.context
})

```

## Next Safe Action

```ts
"use server";

import { authActionClient } from "@/lib/safe-action";
import { z } from "zod";

const editProfile = authActionClient
  // We can pass the action name inside `metadata()`.
  .metadata({ actionName: "editProfile" })
  // Here we pass the input schema.
  .inputSchema(z.object({ newUsername: z.string() }))
  // Here we get `userId` from the middleware defined in `authActionClient`.
  .action(async ({ parsedInput: { newUsername }, ctx: { userId } }) => {
    await saveNewUsernameInDb(userId, newUsername);

    return {
      updated: true,
    };
  });
```

## Middy

```ts
// sample usage
const lambdaHandler = (event, context) => {
  /* ... */
}
export const handler = middy()
  .use(
    cacheMiddleware({
      calculateCacheId,
      storage
    })
  )
  .handler(lambdaHandler)
```

## trpc

```ts
import { experimental_standaloneMiddleware, initTRPC } from '@trpc/server';
import * as z from 'zod';

const t = initTRPC.create();
const schemaA = z.object({ valueA: z.string() });
const schemaB = z.object({ valueB: z.string() });

const valueAUppercaserMiddleware = experimental_standaloneMiddleware<{
  input: z.infer<typeof schemaA>;
}>().create((opts) => {
  return opts.next({
    ctx: { valueAUppercase: opts.input.valueA.toUpperCase() },
  });
});

const valueBUppercaserMiddleware = experimental_standaloneMiddleware<{
  input: z.infer<typeof schemaB>;
}>().create((opts) => {
  return opts.next({
    ctx: { valueBUppercase: opts.input.valueB.toUpperCase() },
  });
});

const combinedInputThatSatisfiesBothMiddlewares = z.object({
  valueA: z.string(),
  valueB: z.string(),
  extraProp: z.string(),
});

t.procedure
  .input(combinedInputThatSatisfiesBothMiddlewares)
  .use(valueAUppercaserMiddleware)
  .use(valueBUppercaserMiddleware)
  .query(
    ({
      input: { valueA, valueB, extraProp },
      ctx: { valueAUppercase, valueBUppercase },
    }) =>
      `valueA: ${valueA}, valueB: ${valueB}, extraProp: ${extraProp}, valueAUppercase: ${valueAUppercase}, valueBUppercase: ${valueBUppercase}`,
  );
```