// src/strategies/ConditionalStrategy.ts
import type { Task } from "../models/ITask";
import type { IExecutionStrategy } from "./IExecutionStrategy";
import { SchedulerService } from "../services/SchedulerService";
import { safeLog } from "../cli/logger";
import { showMainMenu } from "../cli/cli";

type ConditionalStrategyOptions = {
  condition: "day" | "night" | (() => boolean);
  intervalMs?: number;
  maxAttempts?: number;
};

export class ConditionalStrategy implements IExecutionStrategy {
  private options: ConditionalStrategyOptions;
  private intervalId: NodeJS.Timeout | null = null;
  private attempts: number = 0;
  private taskId: string = "";

  constructor(options: ConditionalStrategyOptions) {
    this.options = options;
  }

  async schedule(task: Task): Promise<void> {
    safeLog(`[ConditionalStrategy] Iniciando monitoreo para tarea ${task.id}`);

    // Guardar taskId para uso posterior (cancelación)
    this.taskId = task.id;

    const intervalMs = this.options.intervalMs ?? 5000; // 5s por defecto
    const maxAttempts = this.options.maxAttempts ?? Infinity;

    const scheduler = SchedulerService.getInstance();
    // Registrar en scheduler para permitir cancelación desde el CLI
    scheduler.register(task.id, task, this);

    const evaluateCondition = (): boolean => {
      try {
        if (this.options.condition === "day") {
          const hour = new Date().getHours();
          return hour >= 6 && hour < 20;
        } else if (this.options.condition === "night") {
          const hour = new Date().getHours();
          return hour >= 20 || hour < 6;
        } else if (typeof this.options.condition === "function") {
          return this.options.condition();
        }
        return false;
      } catch (err) {
        safeLog(`[ConditionalStrategy] Error evaluando condición para ${task.id}:`, err);
        return false;
      }
    };

    // Verificación inmediata
    if (evaluateCondition()) {
      safeLog(`[ConditionalStrategy] Condición cumplida (inmediato) para tarea ${task.id}`);
      await this.executeTask(task);
      // ejecutarTask se encargará de desregistrar
      return;
    }

    // Configurar intervalo de verificación
    this.intervalId = setInterval(async () => {
      try {
        this.attempts += 1;

        if (this.attempts > maxAttempts) {
          safeLog(`[ConditionalStrategy] Máximo de intentos alcanzado para tarea ${this.taskId}`);
          this.cancel();
          return;
        }

        if (evaluateCondition()) {
          safeLog(`[ConditionalStrategy] Condición cumplida para tarea ${task.id}`);
          // parar el intervalo antes de ejecutar para evitar reentradas
          if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
          }
          await this.executeTask(task);
        }
      } catch (err) {
        safeLog(`[ConditionalStrategy] Error en el interval check para ${task.id}:`, err);
      }
    }, intervalMs);

    // Permitir que el proceso termine si no hay otras referencias
    if (this.intervalId && typeof (this.intervalId as any).unref === "function") {
      (this.intervalId as any).unref();
    }
  }

  private async executeTask(task: Task): Promise<void> {
    try {
      await task.execute();
      safeLog(`[ConditionalStrategy] Tarea ${task.id} ejecutada.`);
    } catch (err) {
      safeLog(`[ConditionalStrategy] Error ejecutando tarea ${task.id}:`, err);
    } finally {
      // Remover del registro al finalizar
      const scheduler = SchedulerService.getInstance();
      scheduler.unregister(task.id);
      if (showMainMenu) {
        showMainMenu().catch(console.error);
      }
      try {
        const scheduler = SchedulerService.getInstance();
        scheduler.unregister(task.id);
      } catch (err) {
        safeLog(`[ConditionalStrategy] Error al desregistrar tarea ${task.id}:`, err);
      }
    }
  }

  cancel(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    safeLog(`[ConditionalStrategy] Monitoreo cancelado para tarea ${this.taskId}`);    
    try {
      const scheduler = SchedulerService.getInstance();
      scheduler.unregister(this.taskId);
    } catch (err) {
      safeLog(`[ConditionalStrategy] Error al desregistrar tarea ${this.taskId}:`, err);
    }
  }
}