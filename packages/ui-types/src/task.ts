/**
 * A task as XP reports it — `TaskInfo` in `@enonic-types/lib-task`, the JSON XP's and Content
 * Studio's task resources answer, and the `data` of a `task.*` server event — copied rather than
 * imported (`docs/architecture.md`, "XP's
 * shapes are copied, not imported") and pinned by `task.test-d.ts` so that a value typed there is
 * assignable here. The fields a summary may omit are optional.
 */

import type { UserKey } from './principal';

export type TaskState = 'WAITING' | 'RUNNING' | 'FINISHED' | 'FAILED';

/** `current` of `total` steps; `info` is whatever the task reports, its result once it is done. */
export type TaskProgress = {
  readonly info: string;
  readonly current: number;
  readonly total: number;
};

export type TaskInfo = {
  readonly id: string;
  readonly description: string;
  readonly state: TaskState;
  readonly progress: TaskProgress;
  readonly name?: string;
  readonly application?: string;
  readonly user?: UserKey;
  readonly startTime?: string;
  readonly node?: string;
};
