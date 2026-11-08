/**
 * Error class safe to surface through the API. Internal stacks and provider
 * messages must never be sent to the browser.
 */
export class AppError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}
