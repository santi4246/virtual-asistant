// src/db/TaskDb.ts
import fs from "fs";
import path from "path";

const fsPromises = fs.promises;

export interface TaskRecord {
  id: string;
  type: string;
  payload: any;
  executedAt: string;
  result?: any;
}

export class TaskDb {
  private filePath: string;
  // usamos una promesa encadenada para serializar escrituras
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath?: string) {
    // por defecto guardamos en ./data/tasks_db.json (ruta relativa al cwd)
    this.filePath = filePath ?? path.resolve(process.cwd(), "data", "tasks_db.json");
  }

  // Asegura que el directorio exista
  private async ensureDir() {
    const dir = path.dirname(this.filePath);
    await fsPromises.mkdir(dir, { recursive: true });
  }

  // Lee el archivo y retorna array (si no existe, retorna [])
  private async readAll(): Promise<TaskRecord[]> {
    try {
      const content = await fsPromises.readFile(this.filePath, { encoding: "utf8" });
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed as TaskRecord[];
      return [];
    } catch (err: any) {
      if (err.code === "ENOENT") {
        return [];
      }
      throw err;
    }
  }

  // Escribe de forma "atómica" (archivo temporal + rename) para reducir riesgo de corrupción
  private async writeAll(records: TaskRecord[]): Promise<void> {
    await this.ensureDir();
    const tempPath = `${this.filePath}.tmp`;
    const data = JSON.stringify(records, null, 2);
    await fsPromises.writeFile(tempPath, data, { encoding: "utf8" });
    await fsPromises.rename(tempPath, this.filePath);
  }

  // Agrega una nueva entrada al DB (persistente)
  async add(record: TaskRecord): Promise<void> {
    // Encolamos la operación de escritura para serializar
    this.writeQueue = this.writeQueue.then(async () => {
      const records = await this.readAll();
      records.push(record);
      await this.writeAll(records);
    });
    return this.writeQueue;
  }

  // Retorna todas las entradas
  async getAll(): Promise<TaskRecord[]> {
    // lectura simple (no encolada)
    return this.readAll();
  }

  // Limpia el archivo (escribe array vacío)
  async clear(): Promise<void> {
    this.writeQueue = this.writeQueue.then(async () => {
      await this.writeAll([]);
    });
    return this.writeQueue;
  }
}