// src/strategies/ImmediateStrategy.ts
import type { Task } from "../models/ITask";
import type { IExecutionStrategy } from "./IExecutionStrategy";

export class ImmediateStrategy implements IExecutionStrategy {
  async schedule(task: Task): Promise<void> {
    console.log(`[ImmediateStrategy] Ejecutando tarea ${task.id} inmediatamente`);
    await task.execute();
    console.log(`[ImmediateStrategy] Tarea ${task.id} ejecutada.`);
  }

  cancel(): void {
    // No hay nada que cancelar en ejecución inmediata
    console.log(`[ImmediateStrategy] No hay nada que cancelar.`);
  }
}