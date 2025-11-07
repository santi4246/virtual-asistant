import type { ExecutionStrategyConfig, IExecutionStrategy } from "../types/strategy";
import type { ITask, TaskResult } from "../types/tasks";

type TimerId = ReturnType<typeof setTimeout>;

export class ScheduledStrategy implements IExecutionStrategy {
  public readonly type = "scheduled" as const;
  private static timers = new Map<string, TimerId>();

  constructor(private readonly targetDateISO: string, private readonly onExecuted?: (taskId: string) => void) {
    if (!targetDateISO) throw new Error("ScheduledStrategy: targetDateISO requerido");
  }

  public async apply(task: ITask): Promise<TaskResult> {
    const now = Date.now();
    const target = Date.parse(this.targetDateISO);
    const delay = Math.max(0, target - now);

    const timer = setTimeout(async () => {
      const targetDate = new Date(this.targetDateISO);
      console.log(`\n\n⏰ Ejecutando tarea programada: "${task.name}" (programada para ${targetDate.toLocaleString()})\n`);

      const strategyConfig: ExecutionStrategyConfig = {
        type: "scheduled",
        targetDateISO: this.targetDateISO,
      };

      try {
        task.setStrategy(strategyConfig);
        await task.execute();
      } catch (err) {
        console.error(`Error al ejecutar tarea programada "${task.name}": ${(err as Error).message}`);
      } finally {
        ScheduledStrategy.timers.delete(task.id);
        if (this.onExecuted) {
          this.onExecuted(task.id);
        }
      }
    }, delay);

    ScheduledStrategy.timers.set(task.id, timer);

    return { status: "scheduled", scheduledFor: this.targetDateISO };
  }

  public async cancel(task: ITask): Promise<void> {
    const timer = ScheduledStrategy.timers.get(task.id);
    if (timer) {
      clearTimeout(timer);
      ScheduledStrategy.timers.delete(task.id);
      console.log(`⏰ Tarea programada "${task.name}" cancelada.`);
      if (this.onExecuted) {
        this.onExecuted(task.id);
      }
    }
  }
}