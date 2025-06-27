# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SafeFn (@safekit/safe-fn) is a lightweight TypeScript library that provides a type-safe function builder with interceptors, schema validation, and context management. It uses a client-based approach with the unified `.handler()` method for creating safe functions with middleware support.

## Development Commands

### Building and Type Checking
- `bun run build` - Full build (TypeScript compilation + path resolution)
- `bun run typecheck` - Type checking without output
- `bun run dev` - Development watch mode

### Code Quality
- `bun run lint` - ESLint checking
- `bun run format` - Prettier formatting
- `bun run test` - Run Vitest tests

### Utilities
- `bun run clean` - Remove dist directory

## Architecture

### Core Components
- **src/builder.ts** - Main safe function builder implementation with chainable API
- **src/client.ts** - Client factory for shared interceptor and context management
- **src/types.ts** - Type definitions for safe functions, contexts, and interceptors

### Directory Structure
- `src/` - Core library source code
- `examples/` - Usage examples including CQRS patterns and API integration
- `__tests__/` - Integration tests using Vitest
- `dist/` - Build output (TypeScript compilation)

### Safe Function Pattern
- **handler()** - Unified method for any type of function
- Function types can be differentiated using metadata (e.g., `type: 'mutation'`, `type: 'query'`, `type: 'service'`)

### Key Features
- Standard Schema validation with type inference (supports Zod and other validators)
- Interceptor middleware system for cross-cutting concerns
- Type-safe context passing between interceptors and handlers
- Builder pattern with method chaining
- Unified `.handler()` method for all function types
- ESM module support with dual export configuration

## Testing

Uses Vitest with TypeScript support. Test files in `__tests__/` directory. Path aliases configured as `@/*` → `src/*`.

## Build Configuration

- **Target**: ESNext with modern TypeScript features
- **Module System**: ESM with bundler resolution
- **Path Aliases**: Uses tsc-alias for build-time path resolution
- **Package Manager**: Bun (bun.lock present)
- **Publishing**: Public package on npm registry with dual export support

## Package Information

- **Name**: @safekit/safe-fn
- **Version**: 0.1.0
- **License**: MIT
- **Repository**: https://github.com/safekit-labs/safe-fn
- **Dependencies**: Zod for schema validation, Standard Schema spec compliance