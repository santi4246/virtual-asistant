// src/db/TaskDb.ts
import * as fs from "fs/promises";
import * as path from "path";
import { randomUUID } from "crypto";
import type { TaskRecord } from "../models/ITask";

export class TaskDb {
  private dbPath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(dbPath: string = "./data/tasks_db.json") {
    this.dbPath = path.resolve(dbPath);
  }

  private async readAll(): Promise<TaskRecord[]> {
    try {
      const data = await fs.readFile(this.dbPath, "utf-8");
      if (!data.trim()) {
        return []; // Si el archivo está vacío, devolver array vacío
      }
      return JSON.parse(data);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        // Si el archivo no existe, devolver array vacío
        return [];
      }
      console.error("[TaskDb] Error leyendo base de datos:", err);
      return []; // Devolver array vacío en caso de error
    }
  }

  private async writeAll(records: TaskRecord[]): Promise<void> {
    try {
      // Asegurarse de que el directorio existe
      const dir = path.dirname(this.dbPath);
      await fs.mkdir(dir, { recursive: true });

      // Escribir datos como JSON formateado
      const data = JSON.stringify(records, null, 2);
      await fs.writeFile(this.dbPath, data, "utf-8");
    } catch (err) {
      console.error("[TaskDb] Error escribiendo base de datos:", err);
      throw err;
    }
  }

  async getAll(): Promise<TaskRecord[]> {
    return this.readAll();
  }

  async add(record: Omit<TaskRecord, "id" | "executedAt">): Promise<string> {
    const id = randomUUID();
    const newRecord: TaskRecord = {
      id,
      executedAt: new Date().toISOString(),
      ...record,
    };

    this.writeQueue = this.writeQueue.then(async () => {
      const records = await this.readAll();
      records.push(newRecord);
      await this.writeAll(records);
    });

    await this.writeQueue;
    return id;
  }

  async clear(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      await this.writeAll([]);
    });
    return this.writeQueue;
  }

  /**
   * Realiza un backup del contenido actual de tasks_db.json en backupPath
   * y luego vacía tasks_db.json (atomicidad relativa garantizada por writeQueue).
   * Si no se pasa backupPath, usa ./data/backup_db.json.
   */
  async backupAndClear(backupPath?: string): Promise<void> {
    const backupResolved = path.resolve(backupPath ?? "./data/backup_db.json");

    this.writeQueue = this.writeQueue.then(async () => {
      // Leemos los registros existentes
      const records = await this.readAll();

      // Asegurarnos de que el directorio del backup existe
      await fs.mkdir(path.dirname(backupResolved), { recursive: true });

      // Escribir backup
      await fs.writeFile(backupResolved, JSON.stringify(records, null, 2), "utf-8");

      // Finalmente vaciar la DB
      await this.writeAll([]);
    });

    return this.writeQueue;
  }

  // Actualiza campos de un registro por id (merge parcial)
  async updateById(id: string, patch: Partial<TaskRecord>): Promise<void> {
    // serializar escrituras usando la writeQueue existente
    this.writeQueue = this.writeQueue.then(async (): Promise<void> => {
      const records = await this.readAll();
      const idx = records.findIndex((r) => r.id === id);
      if (idx === -1) {
        // si no existe, insertamos un nuevo registro mínimo
        const newRec: TaskRecord = {
          id,
          type: patch.type ?? "unknown",
          payload: patch.payload ?? {},
          executedAt: patch.executedAt ?? new Date().toISOString(),
          result: patch.result,
        };
        records.push(newRec);
      } else {
        records[idx] = { ...records[idx], ...patch };
      }
      await this.writeAll(records);
    });
    return this.writeQueue;
  }

  // Buscar por status (útil para scheduler)
  async findByStatus(status: string): Promise<TaskRecord[]> {
    const records = await this.readAll();
    return records.filter((r) => r.result?.status === status);
  }

  // Buscar por id
  async findById(id: string): Promise<TaskRecord | undefined> {
    const records = await this.readAll();
    return records.find((r) => r.id === id);
  }

  // Eliminar por id
  async deleteById(id: string): Promise<boolean> {
    let deleted = false;

    this.writeQueue = this.writeQueue.then(async (): Promise<void> => {
      const records = await this.readAll();
      const initialLength = records.length;
      const filtered = records.filter((r) => r.id !== id);
      if (filtered.length !== initialLength) {
        await this.writeAll(filtered);
        deleted = true;
      }
    });

    await this.writeQueue;
    return deleted;
  }
}