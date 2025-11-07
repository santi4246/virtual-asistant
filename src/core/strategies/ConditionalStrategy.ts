import type { ExecutionStrategyConfig, IExecutionStrategy } from "../types/strategy";
import type { ITask, TaskResult } from "../types/tasks";

type TimerId = ReturnType<typeof setTimeout>;

interface ConditionalStrategyConfig {
  condition: "day" | "night" | string | (() => boolean);
  intervalMs?: number;
  maxAttempts?: number;
}

export class ConditionalStrategy implements IExecutionStrategy {
  public readonly type = "conditional" as const;  
  private static timers = new Map<string, TimerId>();
  private readonly condition: "day" | "night" | string | (() => boolean);
  private readonly intervalMs: number;
  private readonly maxAttempts: number;
  private attemptCount = 0;

  constructor(config: ConditionalStrategyConfig) {
    if (!config) throw new Error("ConditionalStrategy: configuración requerida");
    this.condition = config.condition;
    this.intervalMs = config.intervalMs ?? 60_000;
    this.maxAttempts = config.maxAttempts ?? 10;
  }

  public async apply(task: ITask): Promise<TaskResult> {    
    return new Promise<TaskResult>((resolve) => {
      this.attemptCount = 0;

      const clearTimer = () => {
        const t = ConditionalStrategy.timers.get(task.id);
        if (t) {
          clearTimeout(t);
          ConditionalStrategy.timers.delete(task.id);
        }
      };

      const scheduleNext = () => {
        const t = setTimeout(tick, this.intervalMs);
        ConditionalStrategy.timers.set(task.id, t);
      };

      const tick = async () => {
        this.attemptCount++;

        if (this.attemptCount > this.maxAttempts) {
          clearTimer();
          console.log(`\n\n[DEBUG Conditional] task=${task.id} => canceled (maxAttempts)`);
          resolve({ status: "canceled", condition: this.describeCondition() });
          return;
        }

        const conditionMet = this.evaluateCondition();
        if (conditionMet) {
          try {
            clearTimer();
            const result = await this.executeTask(task);
            resolve(result ?? { status: "completed" });
          } catch (err) {
            clearTimer();
            resolve({ status: "failed", error: (err as Error).message });
          }
        } else {
          scheduleNext();
        }
      };

      scheduleNext();
    });
  }

  private describeCondition(): string {
    return typeof this.condition === "function" ? "custom" : this.condition ?? "unknown";
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
    return false;
  }

  private async executeTask(task: ITask): Promise<TaskResult | void> {
    try {      
      const strategyConfig: ExecutionStrategyConfig = { type: "conditional" };
      task.setStrategy?.(strategyConfig);
      return await task.execute();
    } finally {      
      ConditionalStrategy.timers.delete(task.id);
    }
  }
    
  public async cancel(task: ITask): Promise<void> {
    const t = ConditionalStrategy.timers.get(task.id);
    if (!t) return;
    clearTimeout(t);
    ConditionalStrategy.timers.delete(task.id);
  }
}