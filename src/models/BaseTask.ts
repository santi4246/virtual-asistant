import { randomUUID } from "crypto";
import type { Task, TaskPayload, TaskRecord, TaskResult, TaskType } from "../models/ITask";
import { DbConnection } from "../db/DbConnection";
import { safeLog } from "../cli/logger";

export abstract class BaseTask implements Task {
  id: string;
  type: TaskType;
  payload: TaskPayload;
  priority?: number;
  createdAt: string;
  scheduledDate?: string = new Date().toISOString();

  constructor(
    type: TaskType,
    payload: TaskPayload,
    priority?: number,
    id?: string,
    createdAt?: string

  ) {
    this.id = id ?? randomUUID();
    this.type = type;
    this.payload = payload;
    this.priority = priority;
    this.createdAt = createdAt ?? new Date().toISOString();
  }

  abstract execute(): Promise<void>;

  public toSerializable() {
    return {
      id: this.id,
      type: this.type,
      payload: this.payload,
      priority: this.priority,
      createdAt: this.createdAt,
    };
  }

  // Método protegido para persistir resultados en TaskDb
  // src/models/BaseTask.ts (método persistResult corregido)
  protected async persistResult(result: TaskResult): Promise<void> {
  try {
    const db = await DbConnection.getInstance();

    const record: TaskRecord = {
      id: this.id,
      type: this.type,
      payload: this.payload,
      executedAt: new Date().toISOString(),
      result: result,
    };

    const existing = await db.findById(this.id);
    if (existing) {
      await db.updateById(this.id, record);
    } else {
      await db.add(record);
    }

    safeLog(`\n[BaseTask] (${this.id}) Resultado persistido exitosamente`);
  } catch (err) {
    safeLog(`\n[BaseTask] (${this.id}) Error al persistir resultado:`, err);
  }
}

  public async persistScheduled() {
    await this.persistResult({
      status: "scheduled",
      scheduledFor: this.scheduledDate,
      timestamp: new Date().toISOString(),
    });
  }
}