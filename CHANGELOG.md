# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
- GitHub Actions CI/CD workflows for automated testing and npm publishing
- Continuous Integration workflow that runs tests, type checking, and linting on PRs and pushes
- Automated npm publishing workflow triggered by GitHub releases

### Planned
- Performance optimizations for large interceptor chains
- Enhanced error handling and debugging tools