# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- Added `TContext` generic to `createSafeFnClient` to allow for context to be passed to the client
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
- Factory pattern to initialize a safeFnClient

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
- Client-only architecture with `createSafeFnClient`
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
