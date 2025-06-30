## Full Options:

### Option 1 - Pure Middleware Chain:

```ts
const safeFn = createSafeFn().use(tracingMiddleware).use(authenticationMiddleware);

const myFn = safeFn
  .use(loggingMiddleware({ operationName: 'myFn' }))
  .input(zValidator(z.object({ name: z.string() })))
  .output(zValidator(z.object({ name: z.string() })))
  .handler(async ({ ctx, parsedInput, metadata }) => {});
```

PROS:

- Can create middleware for anything needed. Highly expandable
- Consumers can browse through the catalog of middleware for what they need
  CONS:
- Slightly more verbose

### Option 2 - First Class Properties:

```ts
const safeFn = createSafeFn({
  metadataSchema: z.object({
    operationName: z.string(),
  }),
  defaultContext: {
    traceId: ulid(),
  },
});

const myFn = safeFn
  .metadata({ operationName: 'myFn' })
  .use(loggingMiddleware())
  .input(zValidator(z.object({ name: z.string() })))
  .output(zValidator(z.object({ name: z.string() })))
  .handler(async ({ ctx, parsedInput, metadata }) => {});
```

PROS:

- Has first class support for certain properties like metadata and context
- More intuitive for users
- Can create middleware for anything needed as well
  CONS:
- Increases complexity of the core library.
- When to stop adding properties to the core library?

### ✅ Option 3 (Builder Pattern):

```ts
const safeFn = initSafeFn
  .context({
    traceId: ulid(),
  })
  .create();

const myFn = safeFn.procedure
  .metadata({ operationName: 'myFn' })
  .use(loggingMiddleware())
  .input(zValidator(z.object({ name: z.string() })))
  .output(zValidator(z.object({ name: z.string() })))
  .handler(async ({ ctx, parsedInput, metadata }) => {});
```


### Option 4: Builder Pattern Refined

```ts
const safeFn = initSafeFn
  .context({
    traceId: ulid(),
  })
  .metadataSchema(z.object({}))
  .use(loggingMiddleware())
  // Need a way to target after inputValidation, before outputValidation
  .create();

const myFn = safeFn
  .metadata({ operationName: 'myFn' })
  .use(loggingMiddleware())
  .input(z.object({ name: z.string() }))
  .output(z.object({ name: z.string() }))
  .handler(async ({ ctx, parsedInput, metadata }) => {});
```


### Questions

- Q: Should the order of the .use() in relation to the .input() property allow for receiving either rawInput (before .input()) or parsedInput (after .input())?
- Answer: Yes

- Q: `create` or `build`?
- A: Use `create`. It's more technically accurate ✅

## API Terminology

Option 1:

```ts
import { initSafeClient } from '@safekit/safe-fn';

const s = initSafeClient()
  .context()
  .metadataSchema()
  .use()
  .hook({
    onBeforeInput: ({ rawInput }) => {},
    onAfterInput: ({ parsedInput }) => {},
    onBeforeOutput: ({ rawOutput }) => {},
    onAfterOutput: ({ parsedOutput }) => {},
    onError: ({ error }) => {},
  })
  .create();

const getUser = s.fn.metadata().use().input().output().use().handler();
```

Option 2:

```ts
import { initSafeClient } from '@safekit/safe-fn';

const s = initSafeClient()
  .context()
  .metadataSchema()
  // Sequential middleware object
  .use(({ ctx, rawInput, next }) => {
    return next({ ctx: { ...ctx, traceId: ulid() } });
  })
  // Lifecycle middleware object
  .use({
    onBeforeInput: ({ rawInput }) => {},
    onAfterInput: ({ parsedInput }) => {},
    onBeforeOutput: ({ rawOutput }) => {},
    onAfterOutput: ({ parsedOutput }) => {},
    onError: ({ error }) => {},
  })
  .create();

const getUser = s.fn.metadata().use().input().output().use().handler();
```
