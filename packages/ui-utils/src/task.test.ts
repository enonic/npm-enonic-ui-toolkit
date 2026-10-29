import type { TaskInfo } from '@enonic/ui-types';
import { err, ok, type Result } from 'neverthrow';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { type AppError, RequestAbortedError, RequestError } from './errors';
import { pollTask, TaskFailedError, taskProgressPercent } from './task';

const mockFetch = vi.fn<typeof fetch>();

const task = (state: TaskInfo['state'], info = '', current = 0): TaskInfo => ({
  id: 'task-1',
  description: 'Publish',
  state,
  progress: { info, current, total: 2 },
});

const jsonResponse = (body: unknown, init: ResponseInit = {}): Response =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
    ...init,
  });

beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('fetch', mockFetch);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
  mockFetch.mockReset();
});

describe('pollTask', () => {
  it('reads the task under the tasks url at once and resolves with the finished info', async () => {
    mockFetch.mockResolvedValue(jsonResponse(task('FINISHED', 'done', 2)));

    const result = await pollTask('/rest-v2/cs/tasks/', 'task-1');

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockFetch.mock.calls[0]?.[0]).toBe('/rest-v2/cs/tasks/task-1');
    expect(result._unsafeUnwrap()).toEqual(task('FINISHED', 'done', 2));
  });

  it('escapes the id', async () => {
    mockFetch.mockResolvedValue(jsonResponse(task('FINISHED')));

    await pollTask('/rest-v2/cs/tasks', 'a/b');

    expect(mockFetch.mock.calls[0]?.[0]).toBe('/rest-v2/cs/tasks/a%2Fb');
  });

  it('reads again after the interval while the task runs, reporting each read', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(task('WAITING')))
      .mockResolvedValueOnce(jsonResponse(task('RUNNING', 'half', 1)))
      .mockResolvedValueOnce(jsonResponse(task('FINISHED', 'done', 2)));
    const onProgress = vi.fn();

    const pending = pollTask('/rest-v2/cs/tasks', 'task-1', { intervalMs: 200, onProgress });
    await vi.advanceTimersByTimeAsync(0);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(199);
    expect(mockFetch).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1);
    expect(mockFetch).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(200);

    const result = await pending;
    expect(mockFetch).toHaveBeenCalledTimes(3);
    expect(result._unsafeUnwrap().state).toBe('FINISHED');
    expect(onProgress.mock.calls.map(([t]) => (t as TaskInfo).state)).toEqual([
      'WAITING',
      'RUNNING',
    ]);
  });

  it('fails with what the task reported when it failed', async () => {
    mockFetch.mockResolvedValue(jsonResponse(task('FAILED', 'Out of space')));

    const result = await pollTask('/rest-v2/cs/tasks', 'task-1');

    const error = result._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(TaskFailedError);
    expect(error.message).toBe('Out of space');
    expect((error as TaskFailedError).task.state).toBe('FAILED');
  });

  it('names the task when it failed without a word', async () => {
    mockFetch.mockResolvedValue(jsonResponse(task('FAILED')));

    const result = await pollTask('/rest-v2/cs/tasks', 'task-1');

    expect(result._unsafeUnwrapErr().message).toBe('Task task-1 failed');
  });

  it('ends with the read error when a read fails', async () => {
    mockFetch
      .mockResolvedValueOnce(jsonResponse(task('RUNNING')))
      .mockResolvedValueOnce(jsonResponse({ message: 'Task not found' }, { status: 404 }));

    const pending = pollTask('/rest-v2/cs/tasks', 'task-1', { intervalMs: 10 });
    await vi.advanceTimersByTimeAsync(10);

    const error = (await pending)._unsafeUnwrapErr();
    expect(error).toBeInstanceOf(RequestError);
    expect(error.message).toBe('Task not found');
  });

  it('stops on abort between two reads', async () => {
    mockFetch.mockResolvedValue(jsonResponse(task('RUNNING')));
    const controller = new AbortController();

    const pending = pollTask('/rest-v2/cs/tasks', 'task-1', {
      intervalMs: 1000,
      signal: controller.signal,
    });
    await vi.advanceTimersByTimeAsync(0);
    controller.abort();
    await vi.advanceTimersByTimeAsync(1000);

    expect((await pending)._unsafeUnwrapErr()).toBeInstanceOf(RequestAbortedError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('settles as aborted when the signal already is, after the one read fetch refuses', async () => {
    mockFetch.mockImplementation((_, init) =>
      Promise.reject(
        Object.assign(new Error('aborted'), { name: 'AbortError', signal: init?.signal }),
      ),
    );
    const controller = new AbortController();
    controller.abort();

    const result = await pollTask('/rest-v2/cs/tasks', 'task-1', { signal: controller.signal });

    expect(result._unsafeUnwrapErr()).toBeInstanceOf(RequestAbortedError);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  it('settles with the error when a progress callback throws, whatever it throws', async () => {
    mockFetch.mockResolvedValue(jsonResponse(task('RUNNING')));

    const result = await pollTask('/rest-v2/cs/tasks', 'task-1', {
      onProgress: () => {
        throw Object.create(null) as Error;
      },
    });

    expect(result._unsafeUnwrapErr().message).toBe('Task failed');
  });

  describe('readResult', () => {
    const readResult = (info: TaskInfo): Result<TaskInfo, AppError> =>
      info.progress.info.startsWith('{"state":"ERROR"')
        ? err(new TaskFailedError(info, 'Publish failed'))
        : ok(info);

    it('ends a finished task with the error it reads from the result', async () => {
      mockFetch.mockResolvedValue(jsonResponse(task('FINISHED', '{"state":"ERROR"}')));

      const result = await pollTask('/rest-v2/cs/tasks', 'task-1', { readResult });

      const error = result._unsafeUnwrapErr();
      expect(error).toBeInstanceOf(TaskFailedError);
      expect(error.message).toBe('Publish failed');
      expect((error as TaskFailedError).task.state).toBe('FINISHED');
    });

    it('resolves with the task when the result reads as ok', async () => {
      mockFetch.mockResolvedValue(jsonResponse(task('FINISHED', '{"state":"SUCCESS"}')));

      const result = await pollTask('/rest-v2/cs/tasks', 'task-1', { readResult });

      expect(result._unsafeUnwrap().state).toBe('FINISHED');
    });

    it('is not asked about a task that failed', async () => {
      mockFetch.mockResolvedValue(jsonResponse(task('FAILED', 'Out of space')));
      const spy = vi.fn(readResult);

      const result = await pollTask('/rest-v2/cs/tasks', 'task-1', { readResult: spy });

      expect(result._unsafeUnwrapErr().message).toBe('Out of space');
      expect(spy).not.toHaveBeenCalled();
    });
  });
});

describe('taskProgressPercent', () => {
  it('is current of total, rounded', () => {
    expect(taskProgressPercent(task('RUNNING', '', 1))).toBe(50);
    expect(
      taskProgressPercent({ ...task('RUNNING'), progress: { info: '', current: 1, total: 3 } }),
    ).toBe(33);
  });

  it('is 0 while the total is unknown and never above 100', () => {
    expect(taskProgressPercent(task('WAITING'))).toBe(0);
    expect(
      taskProgressPercent({ ...task('RUNNING'), progress: { info: '', current: 5, total: 2 } }),
    ).toBe(100);
    expect(
      taskProgressPercent({ ...task('RUNNING'), progress: { info: '', current: 1, total: -1 } }),
    ).toBe(0);
  });
});
