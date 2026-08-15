/**
 * Base class for all workflow-related exceptions.
 */
export class WorkflowError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'WorkflowError';
  }
}

/**
 * Thrown when an optimistic concurrency check fails (e.g. KV CAS operation).
 * The caller should typically reload the entity and retry the operation.
 */
export class VersionConflictError extends WorkflowError {
  constructor(entityId: string, expectedVersion: number) {
    super(`Version conflict for entity ${entityId}. Expected version ${expectedVersion}.`);
    this.name = 'VersionConflictError';
  }
}

/**
 * Thrown when attempting to execute an operation that has already been claimed or executed.
 * Indicates that the current execution is a duplicate and should be safely aborted.
 */
export class IdempotencyConflictError extends WorkflowError {
  constructor(idempotencyKey: string) {
    super(`Idempotency conflict for key ${idempotencyKey}. Operation already claimed or resolved.`);
    this.name = 'IdempotencyConflictError';
  }
}

/**
 * Thrown when a business logic rule or state precondition prevents the workflow transition.
 * For example: trying to collect a Task that is not DONE, or refunding a Sale that is already voided.
 * These are terminal errors and should not be retried automatically.
 */
export class PreconditionFailedError extends WorkflowError {
  constructor(message: string) {
    super(message);
    this.name = 'PreconditionFailedError';
  }
}
