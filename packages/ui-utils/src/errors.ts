// ! `name` is a literal: `constructor.name` is whatever the consumer's minifier left of it.
export class AppError extends Error {
  override readonly name: string = 'AppError';

  constructor(message: string, cause?: unknown) {
    super(message, cause === undefined ? undefined : { cause });
  }
}

/** An error status. `message` is the body's `message` when it has one, else the status text. */
export class RequestError extends AppError {
  override readonly name: string = 'RequestError';
  readonly status: number;

  constructor(message: string, status: number, cause?: unknown) {
    super(message, cause);
    this.status = status;
  }
}

export class RequestAbortedError extends AppError {
  override readonly name: string = 'RequestAbortedError';

  constructor(message = 'Request was aborted', cause?: unknown) {
    super(message, cause);
  }
}
