## Validation Options:

### Option 1:

```ts
const myFn = client
  .use(
    zValidator({
      input: z.object({ name: z.string() }),
      output: z.object({ name: z.string() }),
    }),
  )
  .handler(async ({ ctx, parsedInput, metadata }) => {});
```

PROS:

- Can write validation libraries for multiple validation libraries in the future
- Generic .use() method works for anything. Core logic is focused
- CONS:
- Validation is not first class supported.

### ✅ Option 2:

```ts
const myFn = client
  .input(zValidator(z.object({ name: z.string() })))
  .output(zValidator(z.object({ name: z.string() })))
  .handler(async ({ ctx, parsedInput, metadata }) => {});
```

PROS:

- Can write validation libraries for multiple validation libraries in the future
- More intuitive for users

CONS:

- The input method in this case is the same as a use() method but accepts a validator function
- A specific validation library is not first class supported.

### Option 3:

```ts
const myFn = client
  .input(z.object({ name: z.string() }))
  .output(z.object({ name: z.string() }))
  .handler(async ({ ctx, parsedInput, metadata }) => {});
```

PROS:

- First class support for zod
- Most intuitive for zod users

CONS:

- Would not support other validation libraries to start as hard to infer types from other validation libraries or use tuples for multiple arguments
- Any updates to adapters would require updating the core library
- Adding new validation libraries would require updating the core library


Recommendation:
- Option 1 is too generic. .use() could be anything, making the API less discoverable and harder to understand at a glance.