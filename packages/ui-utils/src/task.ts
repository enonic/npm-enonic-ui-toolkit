/**
 * `@enonic/ui-utils/task` — a task XP runs, followed to its end over its info resource. Its own
 * entry because it answers with the transport's `ResultAsync`, which needs `neverthrow`.
 */

import type { TaskInfo } from '@enonic/ui-types';
import { ResultAsync } from 'neverthrow';

import { AppError, RequestAbortedError } from './errors';
import { requestJson } from './request';

export type PollTaskOptions = {
  /** How long to wait between two reads; the first read is immediate. */
  intervalMs?: number;
  /** Aborting settles the result with a `RequestAbortedError`. */
  signal?: AbortSignal;
  /** Every read while the task is still going. */
  onProgress?: (task: TaskInfo) => void;
};

/** A task that ended in `FAILED`; `message` is what the task reported in its progress. */
export class TaskFailedError extends AppError {
  override readonly name: string = 'TaskFailedError';
  readonly task: TaskInfo;

  constructor(task: TaskInfo) {
    super(task.progress.info || `Task ${task.id} failed`);
    this.task = task;
  }
}

const DEFAULT_INTERVAL_MS = 500;

/** `current` of `total` as a whole percentage, 0 while the total is unknown. */
export function taskProgressPercent(task: TaskInfo): number {
  const total = Math.max(0, task.progress.total);
  if (total === 0) {
    return 0;
  }
  const current = Math.min(task.progress.current, total);
  return Math.round((current / total) * 100);
}

/**
 * Reads `<tasksUrl>/<taskId>` until the task is `FINISHED`, which resolves with its final info, or
 * `FAILED`, which is a `TaskFailedError`. A read that fails, a task the server no longer knows
 * included, ends the polling with that read's error; nothing throws.
 */
export function pollTask(
  tasksUrl: string,
  taskId: string,
  options: PollTaskOptions = {},
): ResultAsync<TaskInfo, AppError> {
  const { intervalMs = DEFAULT_INTERVAL_MS, signal, onProgress } = options;
  const url = `${tasksUrl.replace(/\/+$/, '')}/${encodeURIComponent(taskId)}`;

  const poll = async (): Promise<TaskInfo> => {
    for (;;) {
      const read = await requestJson<TaskInfo>(url, { signal });
      if (read.isErr()) {
        throw read.error;
      }
      const task = read.value;
      if (task.state === 'FINISHED') {
        return task;
      }
      if (task.state === 'FAILED') {
        throw new TaskFailedError(task);
      }
      onProgress?.(task);
      await wait(intervalMs, signal);
    }
  };

  return ResultAsync.fromPromise(poll(), toAppError);
}

//
// * Internal
//

function wait(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted === true) {
      reject(new RequestAbortedError(undefined, signal.reason));
      return;
    }
    let timer: ReturnType<typeof setTimeout>;
    const onAbort = (): void => {
      clearTimeout(timer);
      reject(new RequestAbortedError(undefined, signal?.reason));
    };
    timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

function toAppError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }
  return new AppError(error instanceof Error ? error.message : String(error), error);
}
