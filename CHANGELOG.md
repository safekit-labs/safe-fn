# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2024-01-21

### Added
- Initial release of Procedure Builder
- Type-safe procedure builder with full TypeScript support
- Three procedure types: `command()`, `query()`, and `service()`
- Chainable client builder with `.use()` interceptor support
- Schema validation support with Zod integration
- Context management with automatic type inference
- Interceptor system for cross-cutting concerns
- Zero runtime dependencies
- Comprehensive examples and documentation

### Features
- **Procedures**: Create type-safe procedures with metadata, validation, and handlers
- **Clients**: Build reusable clients with shared interceptors and configuration
- **Interceptors**: Chain middleware for logging, authentication, caching, etc.
- **Validation**: Built-in support for Zod schemas and custom validators
- **Context**: Type-safe context passing through procedure execution chains
- **CQRS**: Support for Command Query Responsibility Segregation patterns
- **API Integration**: Use procedures as REST API endpoint handlers
- **Service Logic**: General business logic with interceptor support

### Documentation
- Comprehensive README with examples
- TypeScript definitions for all public APIs
- Example files demonstrating common patterns
- Contributing guidelines for developers

## [Unreleased]

### Planned
- Performance optimizations for large interceptor chains
- Additional built-in interceptors (rate limiting, caching, etc.)
- Plugin system for third-party extensions
- Enhanced error handling and debugging tools
- Metrics and observability features