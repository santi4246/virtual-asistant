import crypto from "crypto";
import type { ITaskPrototype, TaskOverrides, TaskPayload, TaskResult, TaskType } from "../types/tasks";

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

  protected constructor(params: { id?: string; name: string; type: TaskType; payload?: TaskPayload }) {
    this.id = params.id ?? crypto.randomUUID();
    this.name = params.name;
    this.type = params.type;
    this.payload = params.payload ? deepClone(params.payload) : {};
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
}