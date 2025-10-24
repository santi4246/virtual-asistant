// src/strategies/ScheduledStrategy.ts
import type { Task } from "../models/ITask";
import type { IExecutionStrategy } from "./IExecutionStrategy";
import { SchedulerService } from "../services/SchedulerService";
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

    if (delay <= 0) {
      console.warn(`[ScheduledStrategy] Fecha pasada para tarea ${task.id}. Ejecutando inmediatamente.`);
      await task.execute();
      this.showMenuIfAvailable();
      return;
    }

    console.log(`\n[ScheduledStrategy] Tarea ${task.id} programada para ejecutarse en ${delay}ms`);

    // Guardar taskId para uso posterior
    this.taskId = task.id;

    this.timeoutId = setTimeout(async () => {
      try {
        await task.execute();
        console.log(`[ScheduledStrategy] Tarea ${task.id} ejecutada.`);
        console.log(`[Sistema] Volviendo al menú principal...`);
      } catch (err) {
        console.error(`[ScheduledStrategy] Error ejecutando tarea ${task.id}:`, err);
      } finally {
        // Remover del registro al finalizar
        const scheduler = SchedulerService.getInstance();
        scheduler.unregister(task.id);
        
        // Mostrar menú después de ejecutar la tarea
        this.showMenuIfAvailable();
      }
    }, delay);

    // Añade esta línea para que no bloquee el proceso:
    if (this.timeoutId) {
      this.timeoutId.unref();
    }

    // Registrar en SchedulerService
    const scheduler = SchedulerService.getInstance();
    scheduler.register(task.id, task, this);
  }

  private showMenuIfAvailable() {
    if (showMainMenu) {
      setTimeout(() => {
        showMainMenu!().catch(console.error);
      }, 100);
    }
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      console.log(`[ScheduledStrategy] Tarea ${this.taskId} cancelada.`);
      
      // Registrar cancelación en SchedulerService
      const scheduler = SchedulerService.getInstance();
      scheduler.unregister(this.taskId);
    }
  }
}