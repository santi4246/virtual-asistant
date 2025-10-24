// src/builders/TaskBuilder.ts
import type { Task, TaskType, TaskPayload } from "../models/ITask";
import type { IExecutionStrategy } from "../strategies/IExecutionStrategy";

export class TaskBuilder {
  private _type?: TaskType;
  private _payload?: TaskPayload;
  private _priority?: number;
  private _strategy?: IExecutionStrategy;

  setType(type: TaskType): this {
    this._type = type;
    return this;
  }

  setPayload(payload: TaskPayload): this {
    this._payload = payload;
    return this;
  }

  setPriority(priority: number): this {
    this._priority = priority;
    return this;
  }

  setStrategy(strategy: IExecutionStrategy): this {
    this._strategy = strategy;
    return this;
  }

  async build(): Promise<{ task: Task; strategy: IExecutionStrategy }> {
    if (!this._type) throw new Error("Task type is required");
    if (!this._payload) throw new Error("Task payload is required");

    // Validaciones por tipo
    switch (this._type) {
      case "email":
        if (!this._payload.recipient || !this._payload.message) {
          throw new Error("Email task requires recipient and message");
        }
        break;
      case "calendar":
        if (!this._payload.title || !this._payload.date) {
          throw new Error("Calendar task requires title and date");
        }
        break;
      case "social":
        if (!this._payload.message) {
          throw new Error("Social task requires a message");
        }
        break;
      default:
        throw new Error("Unsupported task type");
    }

    // Estrategia por defecto (lazy import para evitar ciclos)
    let strategy = this._strategy;
    if (!strategy) {
      const { ImmediateStrategy } = await import("../strategies/ImmediateStrategy");
      strategy = new ImmediateStrategy();
    }

    // Lazy import de la fábrica para romper ciclos
    const { TaskFactory } = await import("../factories/TaskFactory");
    const task: Task = TaskFactory.create(this._type, this._payload, {
      priority: this._priority,
    });

    return { task, strategy };
  }
}