import { randomUUID } from "crypto";
import type { Task, TaskPayload, TaskRecord, TaskResult, TaskType } from "../models/ITask";
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
      const db = DbConnection.getInstance();

      // Crear el registro completo con todas las propiedades necesarias
      const record: Omit<TaskRecord, "id"> = {
        type: this.type,
        payload: this.payload,
        executedAt: new Date().toISOString(),
        result: result,
      };

      // Usar el método add que genera el ID automáticamente
      await db.add(record);
      console.log(`[BaseTask] (${this.id}) Resultado persistido exitosamente`);
    } catch (err) {
      console.error(`[BaseTask] (${this.id}) Error al persistir resultado:`, err);
    }
  }
}