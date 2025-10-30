import type { ITask, TaskResult } from "./tasks";

export type StrategyType = "immediate" | "scheduled" | "conditional";

export interface ExecutionStrategyConfig {
  type: StrategyType;  
  targetDateISO?: string;  
  condition?: "day" | "night" | string;
}

export interface IExecutionStrategy {
  readonly type: StrategyType;  
  apply(task: ITask): Promise<TaskResult>;  
  cancel?(task: ITask): Promise<void>;
}

export interface IStrategySelector {
  getStrategy(config: ExecutionStrategyConfig): IExecutionStrategy;
}