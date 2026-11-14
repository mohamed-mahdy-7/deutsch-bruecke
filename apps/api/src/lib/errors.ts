/**
 * Error class safe to surface through the API. Internal stacks and provider
 * messages must never be sent to the browser.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;
  /** Optional structured fields safe to expose (quota limits, reset time...). */
  readonly details?: Record<string, unknown>;

  constructor(
    status: number,
    code: string,
    message: string,
    details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}
