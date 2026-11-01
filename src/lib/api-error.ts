/** Expected business conflicts may be shown to the caller; internal errors may not. */
export class ConflictError extends Error {
  readonly status = 409;
}
