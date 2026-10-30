import { expectTypeOf } from 'vitest';

import type { TaskInfo, TaskProgress, TaskState } from './task';

// Publishing freezes the shape, so every exported type is pinned against its literal.

expectTypeOf<TaskState>().toEqualTypeOf<'WAITING' | 'RUNNING' | 'FINISHED' | 'FAILED'>();

expectTypeOf<TaskProgress>().toEqualTypeOf<{
  readonly info: string;
  readonly current: number;
  readonly total: number;
}>();

expectTypeOf<TaskInfo>().toEqualTypeOf<{
  readonly id: string;
  readonly description: string;
  readonly state: TaskState;
  readonly progress: TaskProgress;
  readonly name?: string;
  readonly application?: string;
  readonly user?: `user:${string}:${string}`;
  readonly startTime?: string;
  readonly node?: string;
}>();

// What `@enonic-types/lib-task` declares as `TaskInfo` is assignable here. Copied rather than
// imported: this package has no dependencies.
type LibTaskInfo = {
  description: string;
  id: string;
  name: string;
  state: 'WAITING' | 'RUNNING' | 'FINISHED' | 'FAILED';
  application: string;
  user: `user:${string}:${string}`;
  startTime: string;
  progress: { info: string; current: number; total: number };
  node?: string;
};
expectTypeOf<LibTaskInfo>().toExtend<TaskInfo>();
