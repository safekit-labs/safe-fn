# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `bun run dev` - Watch mode TypeScript compilation
- `bun run build` - Production build (TypeScript compilation + alias resolution)
- `bun run typecheck` - Type checking without emitting files
- `bun run test` - Run Vitest test suite
- `bun run lint` - ESLint code linting
- `bun run format` - Prettier code formatting
- `bun run clean` - Remove dist directory

### Testing
- `bun run test` - Run all tests
- `bun run test -- --coverage` - Run tests with coverage report
- `bun run test -- --watch` - Run tests in watch mode

## Architecture Overview

**@corporationx/cqrs-builder** is a type-safe CQRS library for TypeScript with a fluent, tRPC-inspired API.

### Core Components

1. **Client Factory** (`src/client.ts`) - Creates CQRS clients with interceptors and configuration
2. **Procedure Builder** (`src/builder.ts`) - Fluent API for building commands/queries with `.metadata().inputSchema().outputSchema().command()|.query()`
3. **Type System** (`src/types.ts`) - Comprehensive TypeScript interfaces and custom error classes
4. **Interceptor System** (`src/interceptor.ts`) - Chain-of-responsibility middleware pattern
5. **Schema Validation** (`src/schema.ts`) - Generic validation utilities (works with any schema library)

### Key Design Principles

- **Schema-Agnostic**: Works with any validation library (Zod, Yup, Joi) through generic interfaces
- **Type-Safe**: Full TypeScript inference throughout the API chain
- **Context-Driven**: User-defined context type flows through entire execution
- **Interceptor-Based**: Extensible middleware system for cross-cutting concerns

### API Patterns

Two main usage patterns:

**Client-Based:**
```typescript
const client = createClient({ interceptors: [...] });
const proc = client.procedure.metadata().inputSchema().outputSchema().command();
```

**Standalone:**
```typescript
const proc = procedure().metadata().inputSchema().outputSchema().query();
```

## Development Notes

### Module System
- **ESM with `.js` extensions** for Node.js compatibility
- **Path mapping**: `@/*` alias for `src/*` imports
- **Target**: `esnext` with `bundler` module resolution

### Testing Architecture
- **Integration tests** in `__tests__/` directory
- **Mock contexts** with simulated database and user auth
- **End-to-end workflow testing** with interceptor chains

### Code Quality
- **ESLint + Prettier** with 100-character line width
- **Strict TypeScript** with full type checking enabled
- **Bun runtime** for package management and execution

### Current TODOs
See `todos.md` for outstanding work items including API improvements and build optimizations.