import type { IExecutionStrategy } from "../types/strategy";
import type { ITask, TaskResult } from "../types/tasks";
import { TaskLogger } from "../logger/TaskLogger";

export class ImmediateStrategy implements IExecutionStrategy {
  public readonly type = "immediate" as const;

  public async apply(task: ITask): Promise<TaskResult> {
    const logger = TaskLogger.getInstance();
    const startedAt = new Date().toISOString();

    try {
      await task.execute();

      const result: TaskResult = { status: "completed", startedAt, finishedAt: new Date().toISOString() };
      logger.log({
        timestampISO: result.finishedAt,
        taskId: task.id,
        taskName: task.name,
        type: task.type,
        strategy: this.type,
        status: result.status,
        message: `Tarea completada: ${task.name}`,
      });
      return result;
    } catch (err) {
      const result: TaskResult = {
        status: "failed",
        startedAt,
        finishedAt: new Date().toISOString(),
        error: err instanceof Error ? err.message : String(err),
      };
      logger.log({
        timestampISO: result.finishedAt,
        taskId: task.id,
        taskName: task.name,
        type: task.type,
        strategy: this.type,
        status: result.status,
        message: `Tarea fallida: ${task.name}`,
      });
      return result;
    }
  }
}