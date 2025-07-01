# Research

## Data Flow

### NestJS

#### Data Flow

1. Middleware (logging, authentication, CORS)
2. Guards (authorization)
3. Pipes (validation/transformation. raw -> validated)
4. Route Handler (your controller logic)
5. Interceptors (before/after handler, can manipulate validated input/ outgoing response)
6. Exception Filters (error handling)

Middy provides hooks into it's core to allow for monitoring, setup, and cleaning that may not be possible within a middleware.

In order of execution

beforePrefetch(): Triggered once before middlewares are attached and prefetches are executed.
requestStart(): Triggered on every request before the first middleware.
beforeMiddleware/afterMiddleware(fctName): Triggered before/after every before, after, and onError middleware function. The function name is passed in, this is why all middlewares use a verbose naming pattern.
beforeHandler/afterHandler(): Triggered before/after the handler.
requestEnd(request): Triggered right before the response is returned, including thrown errors.

### Middy

1. beforePrefetch(): Triggered once before middleware attached
2. requestStart(): Triggered on every request before the first middleware.
3. beforeMiddleware
4. beforeHandler
5. handler
6. afterHandler
7. afterMiddleware
8. requestEnd(request): Triggered right before the response is returned, including thrown errors.

METHODS:

- use() - function or array of functions
- before()
- after()
- .handler()
- onError()

#### Code Examples:

Array of middleware

```ts
export const handler = middy()
  .use([middleware1(), middleware2(), middleware3()])
  .handler(lambdaHandler);
```

Chaining use()

```ts
export const handler = middy(memoryPlugin())
  .use(eventLogger())
  .use(errorLogger())
  .use(httpEventNormalizer())
  .use(httpHeaderNormalizer())
  .use(httpUrlencodePathParametersParser())
  .use(httpUrlencodeBodyParser())
  .use(httpJsonBodyParser())
  .use(httpCors())
  .use(httpSecurityHeaders())
  .use(validator({ eventSchema }))
  .handler(() => {});
```

Custom middleware

```ts
middleware(): {
  before: (request: any) => Promise<void>
  after: (request: any) => Promise<void>
  onError: (request: any) => Promise<void>
}
```

References:

- [Getting Started](https://middy.js.org/docs/intro/getting-started)
- [Hooks](https://middy.js.org/docs/intro/hooks)

### HonoJS

- use(async (c, next) => {})
- createMiddleware(async (c, next) => {})

```ts
import { zValidator } from "@hono/zod-validator";

const route = app.post(
  "/posts",
  zValidator(
    "form",
    z.object({
      body: z.string(),
    }),
  ),
  (c) => {
    const validated = c.req.valid("form");
    // ... use your validated data
  },
);
```

## Next Safe Action

```ts
export const actionClient = createSafeActionClient({
  handleServerError(e) => string,
  defineMetadataSchema: (schema) => schema,
  defaultValidationErrorsShape: string,
  throwValidationErrors: boolean,
})
.use(middleware)
.metadata()
.inputSchema()
.bindArgsSchema()
.outputSchema()
.action()
.stateAction()

```

## TRPC

```ts
export const t = initTRPC.create();
const publicProcedure = t.procedure;

export const appRouter = t.router({
  hello: publicProcedure.input(z.object({})).output(z.object({})).query(),
});
```

## Drizzle-ORM

```ts
import { drizzle } from "drizzle-orm/..."; // driver specific

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const db = drizzle({ logger: true, client: pool });

const result = await db.select().from(users).where();
```
