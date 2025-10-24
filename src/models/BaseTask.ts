// src/models/BaseTask.ts
import { v4 as uuidv4 } from "uuid";
import type { Task, TaskPayload, TaskType } from "../models/ITask";
import { DbConnection } from "../db/DbConnection";

export abstract class BaseTask implements Task {
  id: string;
  type: TaskType;
  payload: TaskPayload;
  priority?: number;
  createdAt: string;

  constructor(
    type: TaskType,
    payload: TaskPayload,
    priority?: number,
    id?: string,
    createdAt?: string
  ) {
    this.id = id ?? uuidv4();
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
  protected async persistResult(result: any): Promise<void> {
    try {
      const db = DbConnection.getInstance();
      await db.add({
        id: this.id,
        type: this.type,
        payload: this.payload,
        executedAt: new Date().toISOString(),
        result,
      });
    } catch (err) {
      console.error(`[BaseTask] (${this.id}) Error al persistir resultado:`, err);
    }
  }
}