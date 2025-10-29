import { promises as fs } from "fs";
import path from "path";
import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "./ITask";
import { DbConnection } from "../db/DbConnection";
import { safeLog } from "../cli/cli";

export class CleanTask extends BaseTask {
  // Guardamos una promesa que resuelve a la DB real (TaskDb/CloudDb adaptada)
  private dbPromise = DbConnection.getInstance();

  constructor(payload: TaskPayload = {}, priority?: number, id?: string, createdAt?: string) {
    super("clean", payload, priority, id, createdAt);
  }

  public async execute(): Promise<void> {
    safeLog(`\n[CleanTask] (${this.id}) Iniciando limpieza de DB`);

    const auditDir = path.resolve(process.cwd(), "data");
    const auditFile = path.join(auditDir, "clear_log.json");
    const backupDefault = path.join(auditDir, "backup_db.json");

    const baseRecord = {
      id: this.id,
      type: "clean",
      payload: this.payload,
      triggeredAt: new Date().toISOString(),
    };

    // 0) Obtener la instancia de DB (resolviendo la promesa)
    const db = await this.dbPromise;

    // 1) Registrar auditoría previa (antes de backup)
    try {
      await fs.mkdir(auditDir, { recursive: true });
      const raw = await fs.readFile(auditFile, "utf-8").catch(() => "");
      const arr = raw.trim() ? JSON.parse(raw) : [];
      arr.push({ ...baseRecord, stage: "before_backup" });
      await fs.writeFile(auditFile, JSON.stringify(arr, null, 2), "utf-8");
    } catch (err) {
      safeLog(`[CleanTask] (${this.id}) No se pudo escribir auditoría previa:`, err);
    }

    // 2) Hacer backup y luego clear a través de TaskDb.backupAndClear()
    try {
      await db.backupAndClear(backupDefault);

      // Obtener info del backup (cantidad de registros) para auditoría
      const backupRaw = await fs.readFile(backupDefault, "utf-8").catch(() => "");
      const backupRecords = backupRaw.trim() ? JSON.parse(backupRaw) : [];
      const backupInfo = {
        path: backupDefault,
        count: Array.isArray(backupRecords) ? backupRecords.length : 0,
      };

      // registrar auditoría post-backup
      try {
        const raw2 = await fs.readFile(auditFile, "utf-8").catch(() => "");
        const arr2 = raw2.trim() ? JSON.parse(raw2) : [];
        arr2.push({ ...baseRecord, stage: "after_backup", backup: backupInfo });
        await fs.writeFile(auditFile, JSON.stringify(arr2, null, 2), "utf-8");
      } catch (err) {
        safeLog(`[CleanTask] (${this.id}) No se pudo escribir auditoría post-backup:`, err);
      }

      // 3) Registrar auditoría final: cleared
      try {
        const raw3 = await fs.readFile(auditFile, "utf-8").catch(() => "");
        const arr3 = raw3.trim() ? JSON.parse(raw3) : [];
        arr3.push({
          ...baseRecord,
          stage: "after_clear",
          backup: backupInfo,
          timestamp: new Date().toISOString(),
        });
        await fs.writeFile(auditFile, JSON.stringify(arr3, null, 2), "utf-8");
      } catch (err) {
        safeLog(`[CleanTask] (${this.id}) No se pudo escribir auditoría post-clear:`, err);
      }

      safeLog(
        `[CleanTask] (${this.id}) Backup guardado en ${backupDefault} y DB limpia correctamente.`
      );
      // NOTA: No llamamos a persistResult para no dejar rastro en tasks_db.json
    } catch (err) {
      safeLog(`[CleanTask] (${this.id}) Error durante backup o clear:`, err);

      // registrar error en auditoría
      try {
        const rawErr = await fs.readFile(auditFile, "utf-8").catch(() => "");
        const arrErr = rawErr.trim() ? JSON.parse(rawErr) : [];
        arrErr.push({
          ...baseRecord,
          stage: "error",
          error: String(err),
          timestamp: new Date().toISOString(),
        });
        await fs.writeFile(auditFile, JSON.stringify(arrErr, null, 2), "utf-8");
      } catch {
        // ignore
      }      
    }
  }
}