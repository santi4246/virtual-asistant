import { TaskFactory } from "../factories/TaskFactory";
import { ImmediateStrategy } from "../strategies/ImmediateStrategy";
import { ScheduledStrategy } from "../strategies/ScheduledStrategy";
import { ConditionalStrategy } from "../strategies/ConditionalStrategy";
import type { Task } from "../models/ITask";
import type { IExecutionStrategy } from "../strategies/IExecutionStrategy";

type TaskType = "email" | "calendar" | "social" | "clean";
type StrategyType = "immediate" | "scheduled" | "conditional";

export class TaskBuilder {
  private type: TaskType | null = null;
  private payload: any = {};
  private strategyType: StrategyType | null = null;
  private priority: number = 0;
  private scheduledDate: Date | null = null;
  private condition: "day" | "night" | (() => boolean) | null = null;
  private intervalMs?: number;
  private maxAttempts?: number;

  setType(type: TaskType): TaskBuilder {
    this.type = type;
    return this;
  }

  setPayload(payload: any): TaskBuilder {
    this.payload = payload;
    return this;
  }

  setStrategy(strategy: StrategyType): TaskBuilder {
    this.strategyType = strategy;
    return this;
  }

  setPriority(priority: number): TaskBuilder {
    this.priority = priority;
    return this;
  }

  setScheduledDate(date: Date): TaskBuilder {
    this.scheduledDate = date;
    return this;
  }

  setCondition(condition: "day" | "night" | (() => boolean)): TaskBuilder {
    this.condition = condition;
    return this;
  }

  setInterval(intervalMs: number): TaskBuilder {
    this.intervalMs = intervalMs;
    return this;
  }

  setMaxAttempts(maxAttempts: number): TaskBuilder {
    this.maxAttempts = maxAttempts;
    return this;
  }

  // src/builders/TaskBuilder.ts (método build con validación)
  async build(): Promise<{ task: Task; strategy: IExecutionStrategy | null }> {
    if (!this.type) {
      throw new Error("Tipo de tarea es requerido");
    }

    // Validaciones específicas por tipo de tarea
    if (this.type === "social" && this.payload) {
      if (!this.payload.content || this.payload.content.trim().length === 0) {
        throw new Error("El contenido del post no puede estar vacío");
      }
      if (!this.payload.platform) {
        throw new Error("La plataforma es requerida para publicar en redes sociales");
      }
    }

    if (this.type === "email" && this.payload) {
      if (!this.payload.recipient) {
        throw new Error("El destinatario es requerido para enviar emails");
      }
      if (!this.payload.subject) {
        throw new Error("El asunto es requerido para enviar emails");
      }
    }

    if (this.type === "calendar" && this.payload) {
      if (!this.payload.title) {
        throw new Error("El título es requerido para crear recordatorios");
      }
      if (!this.payload.date) {
        throw new Error("La fecha es requerida para crear recordatorios");
      }
    }

    // Crear la tarea usando TaskFactory
    const task = TaskFactory.create(this.type, this.payload, {
      priority: this.priority,
    });

    // Determinar la estrategia
    let strategy: IExecutionStrategy | null = null;

    switch (this.strategyType) {
      case "immediate":
        strategy = new ImmediateStrategy();
        break;

      case "scheduled":
        if (!this.scheduledDate) {
          throw new Error("Fecha programada es requerida para estrategia scheduled");
        }
        strategy = new ScheduledStrategy(this.scheduledDate);
        break;

      case "conditional":
        if (!this.condition) {
          throw new Error("Condición es requerida para estrategia conditional");
        }
        strategy = new ConditionalStrategy({
          condition: this.condition,
          intervalMs: this.intervalMs,
          maxAttempts: this.maxAttempts,
        });
        break;

      default:
        // Sin estrategia - ejecución inmediata
        strategy = null;
    }

    return { task, strategy };
  }

  async buildAndExecute(): Promise<void> {
    const { task, strategy } = await this.build();

    if (strategy) {
      await strategy.schedule(task);
    } else {
      await task.execute();
    }
  }
}