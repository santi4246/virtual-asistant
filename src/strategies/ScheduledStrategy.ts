// src/strategies/ScheduledStrategy.ts
import type { Task } from "../models/ITask";
import type { IExecutionStrategy } from "./IExecutionStrategy";
import { SchedulerService } from "../services/SchedulerService";
import { safeLog } from "../cli/logger";
import { showMainMenu } from "../cli/cli";

export class ScheduledStrategy implements IExecutionStrategy {
  private targetDate: Date;
  private timeoutId: NodeJS.Timeout | null = null;
  private taskId: string = "";

  constructor(targetDate: Date) {
    this.targetDate = targetDate;
  }

  async schedule(task: Task): Promise<void> {
    const now = new Date();
    const delay = this.targetDate.getTime() - now.getTime();

    // registrar taskId para posibles cancelaciones
    this.taskId = task.id;

    if (delay <= 0) {
      safeLog(`[ScheduledStrategy] Fecha pasada para tarea ${task.id}. Ejecutando inmediatamente.`);
      try {
        await task.execute();
        safeLog(`[ScheduledStrategy] Tarea ${task.id} ejecutada.`);
      } catch (err) {
        safeLog(`[ScheduledStrategy] Error ejecutando tarea ${task.id}:`, err);
      } finally {
        // remover del scheduler si existía registro previo
        const scheduler = SchedulerService.getInstance();
        scheduler.unregister(task.id);
      }
      return;
    }

    safeLog(`\n[ScheduledStrategy] Tarea ${task.id} programada para ejecutarse en ${delay}ms`);

    this.timeoutId = setTimeout(async () => {
      try {
        await task.execute();
        safeLog(`[ScheduledStrategy] Tarea ${task.id} ejecutada.`);
      } catch (err) {
        safeLog(`[ScheduledStrategy] Error ejecutando tarea ${task.id}:`, err);
      } finally {
        // Remover del registro al finalizar
        const scheduler = SchedulerService.getInstance();
        scheduler.unregister(task.id);
        if (showMainMenu) {
          showMainMenu().catch(console.error);
        }
      }
    }, delay);

    // permitir que el proceso termine si no hay otras referencias
    if (this.timeoutId && typeof (this.timeoutId as any).unref === "function") {
      (this.timeoutId as any).unref();
    }

    // Registrar en SchedulerService
    const scheduler = SchedulerService.getInstance();
    scheduler.register(task.id, task, this);
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      safeLog(`[ScheduledStrategy] Tarea ${this.taskId} cancelada.`);

      // Registrar cancelación en SchedulerService
      const scheduler = SchedulerService.getInstance();
      scheduler.unregister(this.taskId);
    }
  }
}