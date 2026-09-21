import { ResultAsync } from 'neverthrow';

import { AppError, RequestAbortedError, RequestError } from './errors';

export type RequestMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export type RequestOptions = {
  method?: RequestMethod;
  /** JSON-serialized into the request body; sets `Content-Type: application/json` unless `headers` carries one. */
  body?: unknown;
  headers?: HeadersInit;
  /** Aborting settles the result with a `RequestAbortedError`. */
  signal?: AbortSignal;
};

/**
 * Fetches a JSON body. An error status is a `RequestError`, an abort a `RequestAbortedError`,
 * anything else an `AppError` wrapping the cause; nothing throws.
 */
export function requestJson<T>(
  url: string,
  options: RequestOptions = {},
): ResultAsync<T, AppError> {
  return ResultAsync.fromPromise(
    requestRaw(url, options).then((response) => response.json() as Promise<T>),
    (error) => toAppError(error, options.signal),
  );
}

/** As `requestJson`, but a 204 or an empty or `null` body resolves to `undefined`. */
export function requestOptionalJson<T>(
  url: string,
  options: RequestOptions = {},
): ResultAsync<T | undefined, AppError> {
  return ResultAsync.fromPromise(
    requestRaw(url, options).then(async (response) => {
      if (response.status === 204) {
        return undefined;
      }
      const text = await response.text();
      if (text === '') {
        return undefined;
      }
      return (JSON.parse(text) as T | null) ?? undefined;
    }),
    (error) => toAppError(error, options.signal),
  );
}

//
// * Internal
//

async function requestRaw(url: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, signal } = options;
  const headers = new Headers(options.headers);
  if (body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    method,
    signal,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  if (!response.ok) {
    const fallback = response.statusText || `Request failed with status ${response.status}`;
    throw new RequestError((await readErrorMessage(response)) ?? fallback, response.status);
  }

  return response;
}

async function readErrorMessage(response: Response): Promise<string | undefined> {
  try {
    const body: unknown = await response.json();
    if (body != null && typeof body === 'object' && 'message' in body) {
      const { message } = body as { message?: unknown };
      return typeof message === 'string' && message.length > 0 ? message : undefined;
    }
  } catch {}
  return undefined;
}

function toAppError(error: unknown, signal: AbortSignal | undefined): AppError {
  if (error instanceof RequestAbortedError) {
    return error;
  }
  // ! Before the `AppError` check: an abort reason may itself be an `AppError`, and an abort is an
  // ! abort whatever the caller passed as its reason.
  if (signal?.aborted === true || isAbortError(error)) {
    return new RequestAbortedError(undefined, error);
  }
  if (error instanceof AppError) {
    return error;
  }
  return new AppError(describe(error), error);
}

/** `String(x)` itself throws on a value with no way to a primitive; this never does. */
function describe(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  try {
    return String(error);
  } catch {
    return 'Request failed';
  }
}

function isAbortError(error: unknown): boolean {
  return (
    error != null &&
    typeof error === 'object' &&
    'name' in error &&
    (error as { name?: unknown }).name === 'AbortError'
  );
}
