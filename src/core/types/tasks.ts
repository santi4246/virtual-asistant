export type TaskType = "email" | "calendar" | "social" | "clean" | "backup";

export interface TaskPayload {
  [key: string]: any;
}

export type TaskStatus = "waiting" | "scheduled" | "completed" | "failed" | "canceled";

export interface TaskResult {
  status: TaskStatus;
  [key: string]: any;
}

export interface ITask {
  id: string;
  name: string;
  type: TaskType;
  payload: TaskPayload;
  execute(): Promise<void>;
}

export interface TaskOverrides {
  name: string;
  payload: TaskPayload;
  strategy?: import("./strategy").ExecutionStrategyConfig;
}

export interface ITaskPrototype extends ITask {
  clone(overrides?: Partial<TaskOverrides>): ITaskPrototype;
}