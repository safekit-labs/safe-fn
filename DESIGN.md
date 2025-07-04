# Design Decisions

This document outlines key design decisions and rationale for @safekit/safe-fn.

## API Naming

### `input()` and `output()` vs `inputSchema()` and `outputSchema()`

**Decision: Use `input()` and `output()`**

| Option                             | Pros                                                                                                                                                      | Cons                                                                          |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `input()` / `output()`             | • Concise and clean<br>• Familiar to tRPC users (850k weekly downloads as of 2025-06-28)<br>• Lower cognitive load<br>• Follows Jacob's Law               | • Less explicit about purpose<br>• Potential confusion with actual input data |
| `inputSchema()` / `outputSchema()` | • Explicitly clear about purpose<br>• Better for AI/tooling understanding<br>• Familiar to next-safe-action users (60k weekly downloads as of 2025-06-28) | • More verbose<br>• Higher cognitive load<br>• Smaller ecosystem reference    |

**Recommendation:** Use `input()` and `output()`

**Summary:** The ecosystem alignment with tRPC's larger user base, combined with the conciseness benefits, outweighs the explicitness advantage. The confusion risk is minimal due to TypeScript context and method chaining patterns.

### `.meta()` vs `.metadata()`

**Decision: Use `.meta()`**

| Option        | Pros                                                                                                                     | Cons                                                      |
| ------------- | ------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `.meta()`     | • Concise and clean<br>• Familiar to tRPC users<br>• Consistent with our API design philosophy<br>• Lower cognitive load | • Less explicit about purpose                             |
| `.metadata()` | • Explicitly clear about purpose<br>• Familiar to next-safe-action users                                                 | • More verbose<br>• Inconsistent with established pattern |

**Recommendation:** Use `.meta()`

**Summary:** Maintains consistency with our tRPC alignment strategy and overall conciseness philosophy. The explicitness benefit is minimal given TypeScript context and documentation.

### `.handler()` vs `.fn()` vs Purpose-Specific Methods

**Decision: Use `.handler()`**

| Option                                                    | Pros                                                                                                                                                                                             | Cons                                                                                                                       |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| `.handler()`                                              | • Clear intent (defines function logic)<br>• Familiar to ecosystem (Express, AWS Lambda)<br>• Consistent with interceptor terminology<br>• One method to learn<br>• Purpose-agnostic flexibility | • Slightly more verbose than `.fn()`                                                                                       |
| `.fn()`                                                   | • Very concise<br>• Generic and flexible                                                                                                                                                         | • Too generic, unclear intent<br>• Doesn't convey "handling" concept                                                       |
| Purpose-specific (`.command()`, `.query()`, `.service()`) | • Explicit about function purpose<br>• Self-documenting method names                                                                                                                             | • Multiple methods to learn<br>• Same underlying logic<br>• Package should be purpose-agnostic<br>• Unnecessary complexity |

**Recommendation:** Use `.handler()`

**Summary:** The unified `.handler()` approach provides clearer intent than `.fn()` while maintaining purpose-agnostic flexibility. Purpose-specific methods would add complexity without functional benefit since they execute identical logic. Function purposes are better expressed through metadata.

### Schema-less Input: `.input<T>()` vs Handler Generics vs Pass-through Schema

**Decision: Use `.input<T>()` overload**

| Option | Pros | Cons |
|--------|------|------|
| `.input<T>()` | • Consistent with `.args()` pattern<br>• Explicit intent declaration<br>• Natural TypeScript ergonomics<br>• Maintains orthogonal API design | • Two overloads might confuse users |
| `.handler<TInput, TOutput>()` | • Minimal syntax<br>• Type where you need it | • Breaks explicitness principle<br>• Complex type inference<br>• Inconsistent with `.args()` pattern |
| Pass-through schema `.input((x: any) => x as T)` | • Single API surface<br>• Flexible for minimal validation | • Verbose boilerplate<br>• Unintuitive syntax |

**Recommendation:** Use `.input<T>()` overload

**Summary:** Maintains consistency with the existing `.args()` vs `.args(schemas)` pattern while providing explicit intent declaration. Type placement feels natural where input is declared rather than hidden in handler generics.

### Support for other validators

**Joi**

- No build in tuple schema. Runtime detection of tuples is not possible.
- Cannot infer type from schema unless using third party library
  **Yup**
- Has tuples but no direct property to check if a schema is a tuple at runtime. Cannot support tuples
- Can infer type from schema via `yup.InferType`
  **Zod**
- Has runtime tuple detection via `zodSchema._def?.typeName === 'ZodTuple'`
- Can infer type from schema
