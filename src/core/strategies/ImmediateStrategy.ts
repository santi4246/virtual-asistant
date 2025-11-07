import type { ExecutionStrategyConfig, IExecutionStrategy } from "../types/strategy";
import type { ITask, TaskResult } from "../types/tasks";

export class ImmediateStrategy implements IExecutionStrategy {
  public readonly type = "immediate" as const;

  public async apply(task: ITask): Promise<TaskResult> {    
    const startedAt = new Date().toISOString();

    try {
      const strategyConfig: ExecutionStrategyConfig = {
              type: "immediate",
            };
      task.setStrategy(strategyConfig);
      await task.execute();

      const result: TaskResult = { status: "completed", startedAt, finishedAt: new Date().toISOString() };

      return result;
    } catch (err) {
      const result: TaskResult = {
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
      
      return result;
    }
  }
}