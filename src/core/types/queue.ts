import type { ITaskPrototype } from "./tasks";
import type { ExecutionStrategyConfig } from "./strategy";

export interface ITaskQueueRepository {
  add(task: ITaskPrototype, strategy?: ExecutionStrategyConfig): void;
  list(): { task: ITaskPrototype; strategy?: ExecutionStrategyConfig }[];
  removeById(taskId: string): void;
  findById(taskId: string): { task: ITaskPrototype; strategy?: ExecutionStrategyConfig } | undefined;
  clear(): void;
}