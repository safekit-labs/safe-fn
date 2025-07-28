// ========================================================================
// SAFEFN CORE API V3
// ========================================================================

// Core client
export { createCoreClient, type CoreClient } from "./client";

// Type utilities
export { Prettify } from "./types";

// Middleware system
export { createMiddleware } from "./hook-middleware";
export type { Middleware, InferMiddlewareContexts } from "./hook-middleware";

// Handler system
export { createHandler } from "./handler";
export type { Handler } from "./handler";
