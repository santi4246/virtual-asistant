import { MongoClient, Collection } from "mongodb";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";
import { safeLog } from "../cli/logger";
import type { ITaskStore } from "./ITaskStore";
import type { TaskRecord } from "../models/ITask";

export class CloudDb implements ITaskStore {
  private uri: string;
  private dbName: string;
  private collectionName: string;

  private client: MongoClient | null = null;
  private _collection: Collection<TaskRecord> | null = null;

  constructor(
    uri: string,
    options?: {
      dbName?: string;
      collectionName?: string;
    }
  ) {
    this.uri = uri;
    this.dbName = options?.dbName || process.env.DB_NAME || "tasks_db";
    this.collectionName = options?.collectionName || process.env.DB_COLLECTION || "tasks";
  }

  public async connect(): Promise<void> {
    if (this.client && this._collection) return;

    if (!this.uri) {
      throw new Error("CloudDb: URI vacío o no configurado");
    }

    this.client = new MongoClient(this.uri);
    await this.client.connect();

    const db = this.client.db(this.dbName);
    this._collection = db.collection<TaskRecord>(this.collectionName);

    // Índices recomendados
    await this._collection.createIndex({ id: 1 }, { unique: true });
    await this._collection.createIndex({ "result.status": 1 });
    await this._collection.createIndex({ "type": 1 });

    safeLog(`[CloudDb] Conectado a MongoDB - db=${this.dbName}, collection=${this.collectionName}`);
  }

  public async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this._collection = null;
      safeLog("[CloudDb] Conexión cerrada");
    }
  }

  // Getter seguro: asegura que la colección esté lista y la devuelve tipada
  private get collection(): Collection<TaskRecord> {
    if (!this._collection) {
      throw new Error("CloudDb no inicializado. Llama a connect() primero.");
    }
    return this._collection;
  }

  public async add(
    record: TaskRecord | Omit<TaskRecord, "id" | "executedAt">
  ): Promise<string> {    
    const normalized: TaskRecord = {
      id: (record as any).id ?? crypto.randomUUID(),
      type: (record as any).type,
      payload: (record as any).payload,
      executedAt: (record as any).executedAt ?? new Date().toISOString(),
      result: (record as any).result,
    };

    const res = await this.collection.insertOne(normalized);
    if (!res.acknowledged) {
      throw new Error("CloudDb.add: insertOne no fue acknowledged");
    }
    return normalized.id;
  }

  public async getAll(): Promise<TaskRecord[]> {
    const docs = await this.collection.find({}).toArray();
    return docs; // ya es TaskRecord[]
  }

  public async findById(id: string): Promise<TaskRecord | undefined> {
    const doc = await this.collection.findOne({ id }); // TaskRecord | null
    return doc ?? undefined;
  }

  public async updateById(id: string, updates: Partial<TaskRecord>): Promise<void> {
    const res = await this.collection.updateOne({ id }, { $set: updates });
    if (res.matchedCount === 0) {
      throw new Error(`CloudDb.updateById: no existe registro con id=${id}`);
    }
  }

  public async clear(): Promise<void> {
    await this.collection.deleteMany({});
  }

  /**
   * Crea un backup local en backupPath con todos los registros y limpia la colección.
   * backupPath puede ser relativo al proyecto; se normaliza a ruta absoluta.
   */
  public async backupAndClear(backupPath: string): Promise<void> {
    const all = await this.getAll();

    const absPath = path.isAbsolute(backupPath)
      ? backupPath
      : path.resolve(process.cwd(), backupPath);

    await fs.mkdir(path.dirname(absPath), { recursive: true });
    await fs.writeFile(absPath, JSON.stringify(all, null, 2), "utf-8");

    await this.clear();
  }
}