// src/strategies/ImmediateStrategy.ts
import type { Task } from "../models/ITask";
import { IExecutionStrategy } from "./IExecutionStrategy";

export class ImmediateStrategy implements IExecutionStrategy {
  async schedule(task: Task): Promise<void> {
    // Ejecuta la tarea de inmediato
    await task.execute();
  }
}