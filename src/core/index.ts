// ========================================================================
// SAFEFN CORE - MAIN EXPORTS
// ========================================================================

export { createCoreClient } from './client';
export { createMiddleware } from './middleware';
export { createHandler } from './handler';

// Export types
export type { 
  CoreClient,
  Middleware,
  Handler,
  MiddlewareParams,
  HandlerParams,
  NextFunction 
} from './client';

export type {
  InferRawInput,
  InferValidatedInput,
  InferRawOutput,
  InferValidatedOutput
} from './handler';