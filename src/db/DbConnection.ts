// src/db/DbConnection.ts
import { TaskDb } from "./TaskDb";
import { safeLog } from "../cli/logger";
// import { CloudDb } from "./CloudDb"; // cuando tengas la implementación real

export class DbConnection {
  private static instance: TaskDb | null = null;
  private static managerInstance: DbConnection | null = null;

  private settings: Record<string, string> = {
    dbPath: "./db/tasks_db.json",
    uri: "", // setéalo desde variables de entorno al iniciar
    mode: "development",
  };

  private constructor() {}

  public static getManager(): DbConnection {
    if (!DbConnection.managerInstance) {
      DbConnection.managerInstance = new DbConnection();
      safeLog("[DbConnection] ✅ Base remota inicializada vía getManager()");
    }
    return DbConnection.managerInstance;
  }

  public setSetting(key: string, value: string): void {
    this.settings[key] = value;
  }

  public getSetting(key: string): string | undefined {
    return this.settings[key];
  }

  // Intenta cloud y, si no puede, usa JSON local. Nunca retorna null.
  public static async getInstance(): Promise<TaskDb> {
    if (DbConnection.instance) {
      return DbConnection.instance;
    }

    const manager = DbConnection.getManager();
    const cloudUri = manager.settings.uri?.trim();

    // Intento de conexión a la nube
    if (cloudUri) {
      try {
        safeLog("[DbConnection] Intentando conectar a la base de datos en la nube...");
        // const cloud = new CloudDb(cloudUri);
        // await cloud.connect();
        // DbConnection.dbInstance = cloud as unknown as TaskDb;

        // Quita estas 2 líneas cuando implementes CloudDb real:
        throw new Error("Simulación: no hay CloudDb implementado aún");
        // safeLog("[DbConnection] ✅ Conectado a la base de datos en la nube");
        // return DbConnection.dbInstance!;
      } catch (e) {
        safeLog(`[DbConnection] ⚠️ No se pudo conectar a la nube: ${e instanceof Error ? e.message : String(e)}`);
        safeLog("[DbConnection] Usando base de datos local (JSON) como fallback...");
      }
    } else {
      safeLog("[DbConnection] URI no seteado: se usará base local (JSON).");
    }

    // Fallback garantizado al JSON local
    DbConnection.instance = new TaskDb();
    safeLog("[DbConnection] ✅ Base de datos local (JSON) inicializada");
    return DbConnection.instance;
  }
}