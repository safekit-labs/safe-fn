# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.7.1] - 2025-07-28

- Fixed validation to infer input and output correctly

## [0.7.0-alpha.1] - 2025-07-26

### 🎯 **BREAKING CHANGES**
This is a major release that simplifies the validation system by only supporting StandardSchema V1 compatible validators.

### Added
- **StandardSchema V1 Only**: Simplified validation system supporting only StandardSchema V1 compatible validators
- **Perfect Type Inference**: Native input/output type distinction using `StandardSchemaV1.InferInput<T>` and `InferOutput<T>`
- **Migration Guide**: Added documentation for migrating from unsupported libraries

### Changed
- **Validation System**: Renamed `src/parser.ts` to `src/validator.ts` following reference implementation pattern
- **Type System**: Simplified `SchemaValidator<T>` to only accept `StandardSchemaV1<T> | null`
- **Library Support**: Now only supports Zod, Valibot, ArkType, and Effect Schema (with StandardSchema wrappers)

### Removed
- **⚠️ BREAKING**: Removed support for Yup, Runtypes, Superstruct, and custom function validators
- **⚠️ BREAKING**: Removed Scale codec support and function validator patterns
- **Parser Complexity**: Eliminated 85% of parser complexity by removing multi-library detection logic

### Fixed
- **Type Inference**: Coerce validation now works perfectly with proper input/output type distinction
- **Consistency**: All validation behavior is now consistent across supported libraries

### Migration Notes
- **Yup → Zod/Valibot**: Migrate schemas to supported libraries
- **Runtypes → ArkType**: ArkType provides similar TypeScript-first validation
- **Superstruct**: Migrate to Zod or create StandardSchema V1 wrapper
- **Custom Functions**: Implement StandardSchema V1 interface or migrate to supported library

## [0.6.0] - 2025-07-26

### Added
- **Synchronous Handler Support**: Handlers can now be either synchronous or asynchronous, providing better performance for simple operations
- **Comprehensive Sync Handler Tests**: Added 22 new test cases covering all sync handler patterns

### Changed
- **Zod Upgrade**: Upgraded from Zod v3.25.68-beta.0 to v4.0.10 for latest features and stability
- **File Organization**: Moved standard schema and parser files to src root for cleaner structure
  - `src/libs/standard-schema-v1/` → `src/standard-schema.ts`
  - `src/libs/parser.ts` → `src/parser.ts`
- **Validation System**: Made validation synchronous by default, prioritizing `parse()` over `parseAsync()` for better performance
- **Type System**: Updated all handler types to support both `Promise<T> | T` return types

### Migration Guide
**No breaking changes** - all existing async handlers continue to work unchanged.

**New features:**
- Handlers can now be either synchronous or asynchronous
- Zod v4 introduces new function validation syntax for metadata schemas

### Technical
- **Performance**: Sync handlers avoid Promise overhead for simple computations
- **Error Handling**: Synchronous handlers properly propagate errors through the middleware chain
- **Type Safety**: Full TypeScript inference for both sync and async patterns
- **Standard Schema**: Added `standardValidate()` function for sync-only Standard Schema validation
- **Zod v4 Compatibility**: Updated example files to use new function validation syntax (`z.any().refine()` for function properties)

## [0.5.0] - 2025-07-26

### BREAKING CHANGES
- **Removed defaultContext**: The `defaultContext` configuration option has been removed from `createClient()`. Use middleware instead for context injection.

### Changed
- **Context Management**: Context is now provided exclusively through middleware using `.use()` for more consistent and flexible patterns
- **API Simplification**: `createClient()` now only accepts `metadataSchema` and `onError` configuration options
- **Type System**: Simplified type parameters by removing defaultContext-related generics

### Migration Guide
Replace `defaultContext` with middleware:

**Before:**
```typescript
const client = createClient({
  defaultContext: { userId: "anonymous", logger: console }
});
```

**After:**
```typescript
const client = createClient()
  .use(async ({ next }) => {
    return next({ ctx: { userId: "anonymous", logger: console } });
  });
```

### Documentation
- Updated README.md to show middleware-based context patterns
- Removed all defaultContext examples and replaced with middleware examples
- Updated API reference to reflect new configuration options

## [0.4.1] - 2025-07-26
- refactor: Changed from createSafeFnClient to createClient

## [0.4.1-alpha.1] - 2025-07-16
- fix: Remove default logging in error handler.

## [0.4.0-alpha.2] - 2025-07-04
- fix: No input functions now work with context
- fix: .output() means void output
- test: Simplified input and output tests
- test: Added with context tests in input and output specs


## [0.4.0-alpha.1] - 2025-07-04
- Refactored types into separate files
- Added output type-only support
- Added context-bound no-input functions

### Added
- **Schema-less Input**: Added `.input<T>()` overload for type-only input without runtime validation
- **API Consistency**: Input methods now follow same pattern as args (`.input<T>()` vs `.input(schema)`)

### Fixed
- **Metadata Chain Bug**: Fixed issue where functions with `.metadata()` but no input incorrectly required input parameters
- **Type Safety**: Proper distinction between no-input functions and type-only input functions
- fix: Fixed issue where metadata wasn't passing through when using .context()
- fix: Metadata type can be passed properly as second argument in createClient

## [0.3.0-alpha.8] - 2025-07-03
- Fix: Exporting all types from types.ts

## [0.3.0-alpha.7] - 2025-07-03

### Fixed
- **Middleware Context Types**: Fixed middleware receiving working context (`TBaseContext & TInputContext`) instead of just `TBaseContext`
- **withContext TypeScript Errors**: Resolved "possibly undefined" errors by refactoring SafeFn interface with better conditional types
- **Type Inference**: Improved TypeScript inference for context-enabled SafeFn functions

### Added
- **Context API**: Full context support with type-safe `.context<T>()` method for defining input context types
- **withContext Method**: Bind context at call-time with full type safety for both single input and args patterns

## [0.3.0-alpha.6] - 2025-07-02

- onError is called when handler throws
- onError can recover by returning success object
- onError can transform errors
- Middleware can catch and rethrow errors (and onError receives the rethrown error)
- Validation errors are not wrapped (original Zod error structure preserved)

  The error handling system is working correctly:
  - Errors bubble up through middleware without wrapping
  - onError handlers are properly called
  - Error handlers can recover, transform, or pass through errors
  - Middleware can intercept and modify errors
  - Original error structures are preserved

- Added JS doc comments to major functions and types

## [0.3.0-alpha.5] - 2025-07-02

- Updated import paths in index.ts to use relative paths instead of @/
- Updated tsc-alias to build files with .js extension

## [0.3.0-alpha.4] - 2025-07-02

- Successfully added metadata access to handlers - Handlers now receive metadata alongside ctx, input/args
- Improved type display - Added Unwrap utility type to show `{ output, context, success }` instead of `MiddlewareResult<unknown, {}>`
- Clean parameter names - Replaced `args_0`, `args_1` with `arg1`, `arg2` for better readability
- Consistent type parameter ordering - Used logical progression: `TInput`, `TContext`, `TMetadata`
- Comprehensive implementation - Updated all relevant interfaces:
  - `HandlerInput<TInput, TContext, TMetadata>`
  - `ArgsHandlerInput<TArgs, TContext, TMetadata>`
  - `SafeFnHandler<TInput, TOutput, TContext, TMetadata>`
  - Updated middleware execution to pass metadata through
  - Updated safe-fn handler calls to include metadata
- Added `TContext` generic to `createClient` to allow for context to be passed to the client
- Fixed Metadata Validation - The `.metadata()` method now properly enforces the metadata schema type

## [0.3.0-alpha.3] - 2025-07-01

- Fixing metadata schema inference
- Changed .input() back to single object input
- Added .args() to accept multiple arguments
- Fixed middleware types inferring properly based on previous `.use()` calls
- Middleware now stacks and is stateful. No need to spread previous middleware into the next one.
- Cleaner types for middleware `ctx` and `next` properties
- Added `valid()` to middleware to access validated input and args. Otherwise use `rawInput` and `rawArgs`

## [0.3.0-alpha.2] - 2025-07-01

- Cleaned up docs to remove schema examples and moved it to examples folder

## [0.3.0-alpha.1] - 2025-07-01

- Removed `@standard-schema/spec` dependency
- Factory pattern to initialize a client

## [0.2.0-alpha.1] - 2025-06-29

### Added

- **Tuple Arguments Support**: Multiple argument patterns using `z.tuple([...])` for service-layer functions
- **Universal API**: Support for both single object (`fn(input, context)`) and tuple (`fn(...args)`) patterns
- **Context Binding**: New `.context()` method for explicit context binding in tuple functions
- **Standard Schema Detection**: Reliable tuple detection using Standard Schema spec
- **Zero/Multiple Arguments**: Support for 0, 1, 2+ argument functions
- **Type Safety**: Full TypeScript inference for tuple argument and return types
- **Multi-Validator Support**: Added support for Yup and Joi validators with graceful degradation
- **Structural Typing**: Clean TypeScript support for all validation libraries without `as any` assertions
- **Compatibility Matrix**: Clear documentation of validator support levels

### Changed

- **Version**: Reset to `0.2.0-alpha.1` to signal experimental status
- **Package**: Added experimental warnings and alpha keywords
- **Function Signatures**: Tuple functions return `(...args) => Promise<Output>`
- **Interceptor API**: Renamed `clientInput` to `rawInput` for clarity
- **Handler API**: Tuple functions use `args` parameter instead of `parsedInput` for better clarity
- **Type System**: Implemented structural typing approach for maximum validator compatibility
- **Schema Detection**: Enhanced Joi/Yup detection logic using method signature patterns

### Documentation

- **README**: Added comprehensive examples for 0, 1, 2+ argument patterns
- **README**: Added validator compatibility matrix and graceful degradation explanation
- **DESIGN.md**: Added API design rationale and trade-off analysis
- **CONTRIBUTING**: Added reference to design philosophy
- **Tests**: Added comprehensive validator-specific test suites (Zod, Yup, Joi)

### Technical

- **Architecture**: Simplified handler logic with clean tuple/object pattern separation
- **Detection**: Uses `~standard.meta().type === 'array'` instead of runtime probing
- **Context**: Clear hierarchy: default → client → builder → runtime
- **Compatibility**: All existing single object pattern code works unchanged
- **Type Safety**: Eliminated all `as any` assertions using structural typing principles
- **Maintainability**: Removed vendor-specific type imports for cleaner, version-independent code

---

## [0.1.1] - 2025-06-27

### Fixed

- Updated ESLint config to v9 format and disabled noImplicitAny
- Updated TypeScript config without strict mode
- Fixed package dependencies

### Documentation

- Updated README title
- Added proper @types/node dependency

---

## [0.1.0] - 2024-12-26

### Added

- Type-safe function builder with full TypeScript support
- Client-only architecture with `createClient`
- Chainable interceptor system with `.use()` support
- Standard Schema support for universal validation
- Generic handler types: `.handler<TInput, TOutput>()`
- Context management with automatic type inference
- Comprehensive documentation and examples

### Features

- **Client**: Build reusable clients with shared interceptors and configuration
- **Interceptors**: Chain middleware for logging, authentication, etc.
- **Validation**: Built-in support for any Standard Schema validator
- **Context**: Type-safe context passing through function execution
- **Lightweight**: Single runtime dependency (@standard-schema/spec)

## [Unreleased]

### Added

- GitHub Actions CI/CD workflows
- @types/node dependency

### Changed

- Vitest config to TypeScript (.mjs → .ts)

### Planned

- Performance optimizations for large interceptor chains
- Enhanced error handling and debugging tools
