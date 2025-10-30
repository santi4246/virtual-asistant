import type { IExecutionStrategy } from "../types/strategy";
import type { ITask, TaskResult } from "../types/tasks";
import { TaskLogger } from "../logger/TaskLogger";

type TimerId = ReturnType<typeof setTimeout>;

interface ConditionalStrategyConfig {
  condition: string | (() => boolean);
  intervalMs?: number;
  maxAttempts?: number;
}

export class ConditionalStrategy implements IExecutionStrategy {
  public readonly type = "conditional" as const;
  private static timers = new Map<string, TimerId>();
  private readonly condition: string | (() => boolean);
  private readonly intervalMs: number;
  private readonly maxAttempts: number;
  private attemptCount = 0;

  constructor(config: ConditionalStrategyConfig) {
    if (!config) throw new Error("ConditionalStrategy: configuración requerida");
    this.condition = config.condition;
    this.intervalMs = config.intervalMs ?? 60000;
    this.maxAttempts = config.maxAttempts ?? 10;
  }

  public async apply(task: ITask): Promise<TaskResult> {
    const logger = TaskLogger.getInstance();

    logger.log({
      timestampISO: new Date().toISOString(),
      taskId: task.id,
      taskName: task.name,
      type: task.type,
      strategy: this.type,
      status: "waiting",
      message: `Tarea a la espera de condición: ${typeof this.condition === "function" ? "función" : this.condition} - ${task.name}`,
    });

    const checkAndMaybeRun = async () => {
      this.attemptCount++;
      if (this.attemptCount > this.maxAttempts) {
        logger.log({
          timestampISO: new Date().toISOString(),
          taskId: task.id,
          taskName: task.name,
          type: task.type,
          strategy: this.type,
          status: "failed",
          message: `Condición no cumplida tras ${this.maxAttempts} intentos: ${task.name}`,
        });
        ConditionalStrategy.timers.delete(task.id);
        return;
      }

      const conditionMet = this.evaluateCondition();

      if (conditionMet) {
        await this.executeTask(task);
      } else {
        const t = setTimeout(checkAndMaybeRun, this.intervalMs);
        ConditionalStrategy.timers.set(task.id, t);
      }
    };

    void checkAndMaybeRun();

    return { status: "waiting", condition: typeof this.condition === "function" ? "función" : this.condition };
  }

  private evaluateCondition(): boolean {
    if (typeof this.condition === "function") {
      try {
        return this.condition();
      } catch {
        return false;
      }
    }
    if (this.condition === "day") {
      const hour = new Date().getHours();
      return hour >= 6 && hour < 20;
    }
    if (this.condition === "night") {
      const hour = new Date().getHours();
      return hour < 6 || hour >= 20;
    }
    // Otras condiciones string o por defecto
    return false;
  }

  private async executeTask(task: ITask): Promise<void> {
    const logger = TaskLogger.getInstance();
    try {
      await task.execute();
      logger.log({
        timestampISO: new Date().toISOString(),
        taskId: task.id,
        taskName: task.name,
        type: task.type,
        strategy: this.type,
        status: "completed",
        message: `Tarea completada (condicional): ${task.name}`,
      });
    } catch (err) {
      logger.log({
        timestampISO: new Date().toISOString(),
        taskId: task.id,
        taskName: task.name,
        type: task.type,
        strategy: this.type,
        status: "failed",
        message: `Tarea fallida (condicional): ${task.name} - ${err instanceof Error ? err.message : String(err)}`,
      });
    } finally {
      ConditionalStrategy.timers.delete(task.id);
    }
  }

  public async cancel(task: ITask): Promise<void> {
    const t = ConditionalStrategy.timers.get(task.id);
    if (!t) return;

    clearTimeout(t);
    ConditionalStrategy.timers.delete(task.id);

    TaskLogger.getInstance().log({
      timestampISO: new Date().toISOString(),
      taskId: task.id,
      taskName: task.name,
      type: task.type,
      strategy: this.type,
      status: "canceled",
      message: `Tarea cancelada (condicional): ${task.name}`,
    });
  }
}