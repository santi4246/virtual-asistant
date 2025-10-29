// src/db/DbConnection.ts
import { safeLog } from "../cli/logger";
import type { ITaskStore } from "./ITaskStore";
import { TaskDb } from "./TaskDb";
import { CloudDb } from "./CloudDb";

export class DbConnection {
  // Singleton del manager (para settings)
  private static managerInstance: DbConnection | null = null;
  // Singleton de la DB operativa (TaskDb o CloudDb)
  private static dbInstance: ITaskStore | null = null;

  private settings: Record<string, string> = {
    uri: "",
    dbName: "",
    collectionName: "",
    dbPath: "",
    mode: "",
  };

  private constructor() {}

  // Obtiene el manager para configurar ajustes antes de inicializar la DB
  public static getManager(): DbConnection {
    if (!DbConnection.managerInstance) {
      DbConnection.managerInstance = new DbConnection();
    }
    return DbConnection.managerInstance;
  }

  public setSetting(key: string, value: string): void {
    this.settings[key] = value;
  }

  public getSetting(key: string): string | undefined {
    return this.settings[key];
  }

  // Devuelve la DB operativa (CloudDb si hay URI válida y conecta; sino TaskDb)
  public static async getInstance(): Promise<ITaskStore> {
    if (DbConnection.dbInstance) return DbConnection.dbInstance;

    const m = DbConnection.getManager();
    const uri = (m.getSetting("uri") || process.env.DB_URI || "").trim();
    const dbName = (m.getSetting("dbName") || process.env.DB_NAME || "tasks_db").trim();
    const collectionName = (m.getSetting("collectionName") || process.env.DB_COLLECTION || "tasks").trim();

    if (uri) {
      try {
        safeLog("[DbConnection] Intentando conectar a la base de datos en la nube...");
        const cloud = new CloudDb(uri, { dbName, collectionName });
        await cloud.connect();
        DbConnection.dbInstance = cloud;
        safeLog("[DbConnection] ✅ Conectado a la base de datos en la nube");
        return DbConnection.dbInstance;
      } catch (e) {
        safeLog(`[DbConnection] ⚠️ No se pudo conectar a la nube: ${e instanceof Error ? e.message : String(e)}`);
        safeLog("[DbConnection] Usando base de datos local (JSON) como fallback...");
      }
    } else {
      safeLog("[DbConnection] URI vacío: se usará base local (JSON).");
    }

    // Fallback a JSON local
    const local = new TaskDb();
    DbConnection.dbInstance = local;
    safeLog("[DbConnection] ✅ Base de datos local (JSON) inicializada");
    return DbConnection.dbInstance;
  }

  // Utilidad: saber si la instancia actual es Cloud o Local (opcional)
  public static isUsingCloud(): boolean {
    // Heurística simple basada en clase
    return DbConnection.dbInstance instanceof CloudDb;
  }

  // Permite cerrar la conexión en caso de CloudDb (opcional)
  public static async close(): Promise<void> {
    if (DbConnection.dbInstance instanceof CloudDb) {
      await DbConnection.dbInstance.close?.();
      safeLog("[DbConnection] Conexión cloud cerrada");
    }
    DbConnection.dbInstance = null;
  }
}