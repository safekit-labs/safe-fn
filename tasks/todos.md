- Make sure we accept a metaSchema property in the createSafeFnClient({ metaSchema: z.object({}) }) and that it is used to type the meta object that shows up in the props of the interceptor and the handler
- There should also be the ability to pass in a type when passing the meta properties like `.meta<MetaType>({})`
- Make sure the meta object that shows up in the props of the interceptor is typed correctly based on that meta schema
  
- The ctx should also be typed correctly and include data that was updated from the previous .use() calls. So if you have a .use() that updates the ctx, the next .use() should have the updated ctx.

Add the clarification below about using defaultContext:

> #### 1. `defaultContext` (For Static Dependencies)
>
> Use the `defaultContext` option when creating your client to inject **global, static dependencies** that are created once and shared across all function calls. This is the most performant way to provide dependencies like database clients or loggers in a long-running server environment.
>
> ```typescript
> // In a long-running server, db is created once.
> import { db } from './database';
>
> const safeFnClient = createSafeFnClient({
>   defaultContext: { db }
> });
> ```>
> #### 2. `client.use()` (For Dynamic Context)
>
> Use interceptors to add **dynamic, request-specific context** that must be resolved on every function call. This is perfect for authenticating a user and adding their session data to the context.
>
> ```typescript
> const authedClient = safeFnClient.use(async ({ ctx, next }) => {
>   const user = await getUserFromRequest(ctx.request);
>   return next(undefined, { ...ctx, user });
> });
> ```
