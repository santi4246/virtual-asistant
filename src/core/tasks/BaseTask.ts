import crypto from "crypto";
import type { ITaskPrototype, TaskOverrides, TaskPayload, TaskType } from "../types/tasks";
import { ExecutionStrategyConfig } from "../types/strategy";
import taskEvents from "../events/taskEvents";
import type { TaskStatus } from "../types/tasks";

function deepClone<T>(obj: T): T {
  if (typeof globalThis.structuredClone === "function") {
    return globalThis.structuredClone(obj);
  }
  return JSON.parse(JSON.stringify(obj));
}

export abstract class BaseTask implements ITaskPrototype {
  public id: string;
  public name: string;
  public type: TaskType;
  public payload: TaskPayload;
  protected strategy?: ExecutionStrategyConfig;

  protected constructor(params: { id?: string; name: string; type: TaskType; payload?: TaskPayload }) {
    this.id = params.id ?? crypto.randomUUID();
    this.name = params.name;
    this.type = params.type;
    this.payload = params.payload ? deepClone(params.payload) : {};
  }

  public setStrategy(strategy: ExecutionStrategyConfig) {
    this.strategy = strategy;
  }

  public getStrategy(): ExecutionStrategyConfig | undefined {
    return this.strategy;
  }

  public abstract execute(): Promise<void>;

  protected cloneAdjustments(_overrides?: Partial<TaskOverrides>): void { }

  public clone(overrides?: Partial<TaskOverrides>): ITaskPrototype {
    const Cls = this.constructor as new (...args: any[]) => BaseTask;

    const newId = crypto.randomUUID();
    const newName = overrides?.name ?? this.name;
    const newPayload = overrides?.payload ? deepClone(overrides.payload) : deepClone(this.payload);

    const cloned = new Cls({
      id: newId,
      name: newName,
      type: this.type,
      payload: newPayload,
    });

    cloned.cloneAdjustments(overrides);

    return cloned;
  }

  protected setStatus(status: TaskStatus, message: string) {
    // Actualiza estado interno si lo tienes (hoy no tenés this.status; si querés, agregalo como opcional)
    // (this as any).status = status; // opcional
    const strategyType = this.strategy?.type ?? "immediate";
    const payload = {
      taskId: this.id,
      taskName: this.name,
      status,
      message,
      taskType: this.type,
      strategy: strategyType,
    };
        
    switch (status) {
      case "waiting":
        taskEvents.emit("taskWaiting", payload);
        break;
      case "running":
        taskEvents.emit("taskRunning", payload);
        break;
      case "completed":
        taskEvents.emit("taskCompleted", payload);
        break;
      case "failed":
        taskEvents.emit("taskFailed", payload);
        break;
      case "canceled":
        taskEvents.emit("taskCanceled", payload);
        break;
    }
  }

  public onScheduled(targetDateISO: string) {    
    this.setStatus("waiting", `Tarea programada para ${targetDateISO}`);
  }
    
  public onConditional(desc = "condición") {
    this.setStatus("waiting", `Tarea en espera de ${desc}`);
  }
}