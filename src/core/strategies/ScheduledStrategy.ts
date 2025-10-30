import type { IExecutionStrategy } from "../types/strategy";
import type { ITask, TaskResult } from "../types/tasks";
import { TaskLogger } from "../logger/TaskLogger";

type TimerId = ReturnType<typeof setTimeout>;

export class ScheduledStrategy implements IExecutionStrategy {
  public readonly type = "scheduled" as const;
  private static timers = new Map<string, TimerId>();

  constructor(private readonly targetDateISO: string) {
    if (!targetDateISO) throw new Error("ScheduledStrategy: targetDateISO requerido");
  }

  public async apply(task: ITask): Promise<TaskResult> {
    const logger = TaskLogger.getInstance();
    const now = Date.now();
    const target = Date.parse(this.targetDateISO);
    const delay = Math.max(0, target - now);    

    logger.log({
      timestampISO: new Date().toISOString(),
      taskId: task.id,
      taskName: task.name,
      type: task.type,
      strategy: this.type,
      status: "scheduled",
      message: `Tarea programada para ${this.targetDateISO}: ${task.name}`,
    });

    const timer = setTimeout(async () => {
      try {        
        await task.execute();
        logger.log({
          timestampISO: new Date().toISOString(),
          taskId: task.id,
          taskName: task.name,
          type: task.type,
          strategy: this.type,
          status: "completed",
          message: `Tarea completada (programado): ${task.name}`,
        });
      } catch (err) {
        logger.log({
          timestampISO: new Date().toISOString(),
          taskId: task.id,
          taskName: task.name,
          type: task.type,
          strategy: this.type,
          status: "failed",
          message: `Tarea fallida (programado): ${task.name} - ${err instanceof Error ? err.message : String(err)}`,
        });
      } finally {
        ScheduledStrategy.timers.delete(task.id);
      }
    }, delay);

    ScheduledStrategy.timers.set(task.id, timer);

    return { status: "scheduled", scheduledFor: this.targetDateISO };
  }

  public async cancel(task: ITask): Promise<void> {
    const t = ScheduledStrategy.timers.get(task.id);
    if (t) {
      clearTimeout(t);
      ScheduledStrategy.timers.delete(task.id);

      TaskLogger.getInstance().log({
        timestampISO: new Date().toISOString(),
        taskId: task.id,
        taskName: task.name,
        type: task.type,
        strategy: this.type,
        status: "canceled",
        message: `Tarea cancelada (programado): ${task.name}`,
      });
    }
  }
}