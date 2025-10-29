// src/services/SchedulerService.ts
import { DbConnection } from "../db/DbConnection";
import type { IExecutionStrategy } from "../strategies/IExecutionStrategy";
import type { Task } from "../models/ITask";
import { safeLog } from "../cli/logger";

type RegistryEntry = {
  strategy: IExecutionStrategy;
  task: Task;
};

export class SchedulerService {
  private static instance: SchedulerService | null = null;
  private registry = new Map<string, RegistryEntry>();

  private constructor() {}

  static getInstance(): SchedulerService {
    if (!SchedulerService.instance) {
      SchedulerService.instance = new SchedulerService();
    }
    return SchedulerService.instance;
  }

  register(taskId: string, task: Task, strategy: IExecutionStrategy) {
    this.registry.set(taskId, { strategy, task });
  }

  unregister(taskId: string) {
    this.registry.delete(taskId);
  }

  has(taskId: string): boolean {
    return this.registry.has(taskId);
  }

  list(): { taskId: string; type: string; payload: any }[] {
    const out: { taskId: string; type: string; payload: any }[] = [];
    for (const [id, entry] of this.registry.entries()) {
      out.push({ taskId: id, type: entry.task.type, payload: entry.task.payload });
    }
    return out;
  }

  async cancel(taskId: string): Promise<boolean> {
    const entry = this.registry.get(taskId);
    if (!entry) return false;
    try {      
      entry.strategy.cancel?.();

      // marcar en DB como cancelada
      const db = await DbConnection.getInstance();
      await db.updateById(taskId, {
        executedAt: "cancelled",
        result: { status: "cancelled", cancelledAt: new Date().toISOString() },
      });
      this.registry.delete(taskId);
      safeLog(`[SchedulerService] Tarea ${taskId} cancelada correctamente.`);
      return true;
    } catch (err) {
      safeLog(`[SchedulerService] Error cancelando ${taskId}:`, err);
      return false;
    }
  }
}