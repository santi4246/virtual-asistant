// src/strategies/ConditionalStrategy.ts
import type { Task } from "../models/ITask";
import type { IExecutionStrategy } from "./IExecutionStrategy";
import { SchedulerService } from "../services/SchedulerService";
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
    console.log(`[ConditionalStrategy] Iniciando monitoreo para tarea ${task.id}`);

    // Guardar taskId para uso posterior
    this.taskId = task.id;

    const intervalMs = this.options.intervalMs ?? 5000; // 5 segundos por defecto
    const maxAttempts = this.options.maxAttempts ?? Infinity;

    const checkCondition = () => {
      try {
        let conditionMet = false;

        if (this.options.condition === "day") {
          const hour = new Date().getHours();
          conditionMet = hour >= 6 && hour < 20;
        } else if (this.options.condition === "night") {
          const hour = new Date().getHours();
          conditionMet = hour >= 20 || hour < 6;
        } else if (typeof this.options.condition === "function") {
          conditionMet = this.options.condition();
        }

        if (conditionMet) {
          console.log(`[ConditionalStrategy] Condición cumplida para tarea ${task.id}`);
          this.executeTask(task);
          return true;
        }

        return false;
      } catch (err) {
        console.error(`[ConditionalStrategy] Error evaluando condición para ${task.id}:`, err);
        return false;
      }
    };

    // Verificar inmediatamente
    if (checkCondition()) {
      return;
    }

    // Configurar intervalo de verificación
    this.intervalId = setInterval(() => {
      this.attempts++;

      if (this.attempts > maxAttempts) {
        console.log(`[ConditionalStrategy] Máximo de intentos alcanzado para tarea ${this.taskId}`);
        this.cancel();
        return;
      }

      if (checkCondition()) {
        this.cancel();
      }
    }, intervalMs);

    if (this.intervalId) {
      this.intervalId.unref();
    }

    // Registrar en SchedulerService
    const scheduler = SchedulerService.getInstance();
    scheduler.register(task.id, task, this);
  }

  private async executeTask(task: Task): Promise<void> {
    try {
      await task.execute();
      console.log(`[ConditionalStrategy] Tarea ${task.id} ejecutada.`);
      console.log(`[Sistema] Volviendo al menú principal...`);
    } catch (err) {
      console.error(`[ConditionalStrategy] Error ejecutando tarea ${task.id}:`, err);
    } finally {
      // Mostrar menú después de ejecutar la tarea
      this.showMenuIfAvailable();
    }
  }

  private showMenuIfAvailable() {
    if (showMainMenu) {
      setTimeout(() => {
        showMainMenu!().catch(console.error);
      }, 100);
    }
  }

  cancel(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log(`[ConditionalStrategy] Monitoreo cancelado para tarea ${this.taskId}`);

      // Registrar cancelación en SchedulerService
      const scheduler = SchedulerService.getInstance();
      scheduler.unregister(this.taskId);
    }
  }
}