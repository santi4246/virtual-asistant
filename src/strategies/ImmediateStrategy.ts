// src/strategies/ImmediateStrategy.ts
import type { Task } from "../models/ITask";
import type { IExecutionStrategy } from "./IExecutionStrategy";
import { safeLog } from "../cli/logger";

export class ImmediateStrategy implements IExecutionStrategy {
  async schedule(task: Task): Promise<void> {
    safeLog(`[ImmediateStrategy] Ejecutando tarea ${task.id} inmediatamente`);
    try {
      await task.execute();
      safeLog(`[ImmediateStrategy] Tarea ${task.id} ejecutada.`);
    } catch (err) {
      safeLog(`[ImmediateStrategy] Error ejecutando tarea ${task.id}:`, err);
    }
  }

  cancel(): void {
    // No hay nada que cancelar en ejecución inmediata
    safeLog(`[ImmediateStrategy] No hay nada que cancelar.`);
  }
}