import path from "path";
import { promises as fs } from "fs";
import { BaseTask } from "./BaseTask";
import { TaskPayload } from "../types/tasks";
import { ITaskRunnerFacade } from "../types/facade";
import { TaskLogEntry } from "../types/logger";

type BackupPayload = TaskPayload & {
  destination?: string;  
  lastRunAt?: string;
};

function projectPath(...segments: string[]): string {
  return path.resolve(process.cwd(), ...segments);
}

export class BackupTask extends BaseTask {
  private facadeInstance?: ITaskRunnerFacade;
  constructor(params: { id?: string; name?: string; payload?: BackupPayload }) {
    const defaultPath = projectPath("data", "backup_db.json");
    super({
      id: params.id,
      name: params.name ?? "Backup genérico",
      type: "backup",
      payload: {
        destination: params.payload?.destination ?? defaultPath,
      },
    });
  }

  public async execute(): Promise<void> {
    const p = this.payload as BackupPayload;
    const { destination } = this.payload as { destination: string };
    this.setStatus("running", "Iniciando ejecución");
    
    try {
      if (!destination || !p) {
        throw new Error("BackupTask: 'destination' es requerido");
      }

      if (!this.facadeInstance) {
        throw new Error("BackupTask: Facade no asignado.");
      }

      const destDir = path.dirname(destination);
      await fs.mkdir(destDir, { recursive: true });

      // 1) Obtener historial completo
      const history = this.facadeInstance.getHistory();

      // 2) Determinar último estado por taskId
      const lastIndexByTask = new Map<string, number>();
      for (let i = 0; i < history.length; i++) {
        lastIndexByTask.set(history[i].taskId, i);
      }

      // 3) Seleccionar las tareas cuyo último estado sea "completed"
      const completedTaskIds = new Set<string>();
      const isRealTask = (entry: TaskLogEntry) => entry.taskId !== "system" && !entry.isAudit;
      for (const [taskId, idx] of lastIndexByTask.entries()) {
        if (history[idx].status === "completed" && isRealTask(history[idx])) {
          completedTaskIds.add(taskId);
        }
      }

      // 4) Construir snapshot de tareas completadas con su último registro
      //    Si querés incluir más campos, amplialo aquí.
      const completedTasksSnapshot = Array.from(completedTaskIds).map((taskId) => {
        const idx = lastIndexByTask.get(taskId)!;
        const last = history[idx];
        return {
          taskId: last.taskId,
          taskName: last.taskName,
          type: last.type,
          strategy: last.strategy ?? "unknown",
          status: last.status,
          lastMessage: last.message,
          lastTimestampISO: last.timestampISO,
        };
      });

      // 5) Escribir JSON en destino
      const backupData = {
        generatedAt: new Date().toISOString(),
        count: completedTasksSnapshot.length,
        tasks: completedTasksSnapshot,        
      };

      await fs.writeFile(destination, JSON.stringify(backupData, null, 2), "utf-8");

      // 6) Marcar metadata interna
      p.lastRunAt = new Date().toISOString();

      // 7) Emitir evento de éxito
      this.setStatus("completed", `Backup realizado: ${completedTasksSnapshot.length} tarea(s) completadas respaldadas`);      
    } catch (err: any) {
      this.setStatus("failed", `Error: ${err?.message ?? String(err)}`);
      throw err;
    }
  }

  protected cloneAdjustments(): void {
    if (this.payload && typeof this.payload === "object" && "lastRunAt" in this.payload) {
      delete (this.payload as any).lastRunAt;
    }
  }

  public setFacade(facade: ITaskRunnerFacade) {
    this.facadeInstance = facade;
  }
}