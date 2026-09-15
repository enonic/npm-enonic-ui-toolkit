import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { AppError, RequestAbortedError, RequestError } from './errors';
import { requestJson, requestOptionalJson } from './request';

const mockFetch = vi.fn<typeof fetch>();

const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

const sentInit = (): RequestInit => mockFetch.mock.calls[0]?.[1] ?? {};

beforeEach(() => {
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  mockFetch.mockReset();
});

describe('requestJson', () => {
  it('resolves with the parsed body', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 'one' }));

    const result = await requestJson<{ id: string }>('/api/items');

    expect(result._unsafeUnwrap()).toEqual({ id: 'one' });
  });

  it('defaults to GET and sends no body or content type', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await requestJson('/api/items');

    const init = sentInit();
    expect(init.method).toBe('GET');
    expect(init.body).toBeUndefined();
    expect(new Headers(init.headers).get('Content-Type')).toBeNull();
  });

  it('serializes the body and sets the JSON content type', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await requestJson('/api/items', { method: 'POST', body: { key: 'a' } });

    const init = sentInit();
    expect(init.method).toBe('POST');
    expect(init.body).toBe('{"key":"a"}');
    expect(new Headers(init.headers).get('Content-Type')).toBe('application/json');
  });

  it('sends the given headers and lets them override the content type', async () => {
    mockFetch.mockResolvedValue(jsonResponse({}));

    await requestJson('/api/items', {
      method: 'POST',
      body: { key: 'a' },
      headers: { Authorization: 'Bearer t', 'Content-Type': 'application/vnd.api+json' },
    });

    const headers = new Headers(sentInit().headers);
    expect(headers.get('Authorization')).toBe('Bearer t');
    expect(headers.get('Content-Type')).toBe('application/vnd.api+json');
  });

  it('fails with a RequestError carrying the status and the server-supplied message', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ message: 'Not authorized' }, { status: 403 }));

    const error = (await requestJson('/api/items'))._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(RequestError);
    expect(error).toBeInstanceOf(AppError);
    expect((error as RequestError).status).toBe(403);
    expect(error.message).toBe('Not authorized');
    expect(error.name).toBe('RequestError');
  });

  it('falls back to the status text when the error body carries no message', async () => {
    mockFetch.mockResolvedValue(
      new Response('nope', { status: 500, statusText: 'Internal Server Error' }),
    );

    const error = (await requestJson('/api/items'))._unsafeUnwrapErr();

    expect(error.message).toBe('Internal Server Error');
    expect((error as RequestError).status).toBe(500);
  });

  it('wraps a rejected fetch instead of throwing, keeping the cause', async () => {
    const cause = new TypeError('network down');
    mockFetch.mockRejectedValue(cause);

    const error = (await requestJson('/api/items'))._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(AppError);
    expect(error.name).toBe('AppError');
    expect(error.cause).toBe(cause);
  });

  it('reports an abort as a RequestAbortedError', async () => {
    const controller = new AbortController();
    mockFetch.mockImplementation(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () =>
            reject(new DOMException('The operation was aborted.', 'AbortError')),
          );
        }),
    );

    const pending = requestJson('/api/items', { signal: controller.signal });
    controller.abort();

    expect((await pending)._unsafeUnwrapErr()).toBeInstanceOf(RequestAbortedError);
  });

  it('reports a signal aborted with a custom reason as a RequestAbortedError too', async () => {
    const controller = new AbortController();
    controller.abort('superseded');
    mockFetch.mockRejectedValue('superseded');

    const error = (
      await requestJson('/api/items', { signal: controller.signal })
    )._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(RequestAbortedError);
    expect(error.cause).toBe('superseded');
  });
});

describe('requestOptionalJson', () => {
  it('resolves with the parsed body when there is one', async () => {
    mockFetch.mockResolvedValue(jsonResponse({ id: 'one' }));

    expect((await requestOptionalJson('/api/items/one'))._unsafeUnwrap()).toEqual({ id: 'one' });
  });

  it('resolves to undefined on 204', async () => {
    mockFetch.mockResolvedValue(new Response(null, { status: 204 }));

    expect((await requestOptionalJson('/api/items/one'))._unsafeUnwrap()).toBeUndefined();
  });

  it('resolves to undefined on an empty or null body', async () => {
    mockFetch.mockResolvedValueOnce(new Response('', { status: 200 }));
    expect((await requestOptionalJson('/api/items/one'))._unsafeUnwrap()).toBeUndefined();

    mockFetch.mockResolvedValueOnce(jsonResponse(null));
    expect((await requestOptionalJson('/api/items/one'))._unsafeUnwrap()).toBeUndefined();
  });

  it('fails on an error status like requestJson', async () => {
    mockFetch.mockResolvedValue(new Response('', { status: 404, statusText: 'Not Found' }));

    const error = (await requestOptionalJson('/api/items/one'))._unsafeUnwrapErr();

    expect(error).toBeInstanceOf(RequestError);
    expect((error as RequestError).status).toBe(404);
  });
});
