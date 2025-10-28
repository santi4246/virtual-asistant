// src/tasks/BackupTask.ts
import { BaseTask } from "./BaseTask";
import { safeLog } from "../cli/logger";
import * as fs from "fs/promises";
import * as path from "path";
import { TaskPayload } from "./ITask";

export class BackupTask extends BaseTask {
  constructor(payload: TaskPayload = {}, priority?: number, id?: string, createdAt?: string) {
    super("backup", payload, priority, id, createdAt);
  }

  async execute(): Promise<void> {
    safeLog(`[BackupTask] (${this.id}) Iniciando backup de la base de datos`);

    try {
      const dbPath = path.resolve(__dirname, "../../db/tasks_db.json");
      const backupPath = path.resolve(__dirname, "../../db/backup_db.json");

      const data = await fs.readFile(dbPath, "utf-8");
      await fs.writeFile(backupPath, data, "utf-8");

      safeLog(`[BackupTask] (${this.id}) Backup realizado correctamente en backup_db.json`);

      // Persistir resultado en la DB usando BaseTask
      await this.persistResult({
        status: "success",
        info: "Backup realizado correctamente",
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      safeLog(`[BackupTask] (${this.id}) Error realizando backup:`, err);

      await this.persistResult({
        status: "error",
        info: `Error realizando backup: ${err instanceof Error ? err.message : String(err)}`,
        timestamp: new Date().toISOString(),
      });

      throw err;
    }
  }
}