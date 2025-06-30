You've hit the final, crucial implementation detail. Your concerns are valid: "How do I distinguish them?" and "How do I make this type-safe?"

The good news is that TypeScript is designed for exactly this kind of problem. The solution is elegant, type-safe, and surprisingly straightforward.

### The Solution: Method Overloading and Type Guards

You will define your `.use()` method with **multiple signatures (overloads)**. Then, inside the implementation, you'll use a **type guard** to check which version was called.

Let's see it in action.

---

#### 1. Defining the Types

First, let's create clear types for our two middleware patterns.

```ts
// The request object passed to sequential middleware.
// It has a `next` function.
type SequentialMiddlewareRequest = { /* ... ctx, rawInput, ... */ };
type NextFunction = (updates?: { ctx?: any }) => Promise<any>;

// Pattern 1: The Sequential Middleware Function
type SequentialMiddleware =
  (req: SequentialMiddlewareRequest, next: NextFunction) => Promise<any>;

// Pattern 2: The Lifecycle Middleware Object
type LifecycleMiddleware = {
  onBeforeInput?: (req: { /* ... */ }) => Promise<void> | void;
  onAfterInput?:  (req: { /* ... */ }) => Promise<void> | void;
  // ... and so on for other hooks
};

// A union type representing either kind of middleware
type AnyMiddleware = SequentialMiddleware | LifecycleMiddleware;
```

---

#### 2. Overloading the `.use()` Method

Now, in your builder class, you define the public-facing signatures for `.use()`. This is what the user's IDE will see.

```ts
class SafeFnBuilder {
  private middlewareStack: AnyMiddleware[] = [];

  // Overload 1: For Sequential Middleware
  use(middleware: SequentialMiddleware): this;

  // Overload 2: For Lifecycle Middleware
  use(middleware: LifecycleMiddleware): this;

  // This is the SINGLE, internal implementation of the method.
  // It takes the union type.
  use(middleware: AnyMiddleware): this {
    // We'll add the logic to distinguish them here.
    // For now, just add it to a stack.
    this.middlewareStack.push(middleware);
    return this;
  }

  // ... other builder methods like .input(), .handler()
}
```

With this in place, TypeScript already provides an excellent developer experience. If a user passes a function, it's checked against the `SequentialMiddleware` type. If they pass an object, it's checked against the `LifecycleMiddleware` type.

---

#### 3. Distinguishing Them with a Type Guard

Now for the magic. Inside your final execution logic (likely when the handler is called), you'll iterate through your `middlewareStack`. How do you know which one is which? With a type guard.

A type guard is a simple function that checks the "shape" of an object at runtime and tells the TypeScript compiler about its type.

```ts
// This is our type guard function.
// It returns `true` if the middleware is the Lifecycle object pattern.
function isLifecycleMiddleware(
  middleware: AnyMiddleware
): middleware is LifecycleMiddleware {
  // A simple check: if it's an object and NOT a function, it must be
  // our lifecycle object.
  // We can even check for specific keys like 'onBeforeInput'.
  return typeof middleware === 'object' && middleware !== null && !isFunction(middleware);
  // A more robust check:
  // return typeof middleware === 'object' && ('onBeforeInput' in middleware || 'onError' in middleware ...);
}

// Helper function just for clarity
function isFunction(value: any): value is Function {
  return typeof value === 'function';
}


// --- Inside your execution logic ---
async function execute(stack: AnyMiddleware[]) {
  const sequentialSteps: SequentialMiddleware[] = [];
  const lifecycleHooks: { onAfterInput: Function[], onError: Function[] /* ... */ } = {
    onAfterInput: [],
    onError: [],
    // ... initialize all hook arrays
  };

  // 1. Distribute middleware into appropriate buckets
  for (const mw of stack) {
    if (isLifecycleMiddleware(mw)) {
      // It's a lifecycle object! Add its hooks to our hook runner.
      if (mw.onAfterInput) lifecycleHooks.onAfterInput.push(mw.onAfterInput);
      if (mw.onError) lifecycleHooks.onError.push(mw.onError);
      // ... and so on
    } else {
      // It must be a sequential function.
      sequentialSteps.push(mw);
    }
  }

  // 2. Now you have two clean lists to work with!
  //    - Run the `sequentialSteps` in a chain with `next()`.
  //    - At the appropriate time, run all functions in `lifecycleHooks.onAfterInput`.
  //    - ... and so on.
}
```

### Summary: It's Not Complicated, It's a Standard TS Pattern

This might look complex at first, but it's a standard and robust way to handle this kind of polymorphism in TypeScript.

*   **You make it type-safe** with **method overloading**. This gives your users a great experience with autocompletion and error checking.
*   **You distinguish them at runtime** with a simple **type guard** (a function that checks `typeof` or if a property exists).

This approach gives you the best of all worlds: a single, clean `.use()` method for your users, and a perfectly type-safe, easy-to-manage system on the inside. You are not sacrificing safety for ergonomics; you are achieving both.