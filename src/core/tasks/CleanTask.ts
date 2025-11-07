import { BaseTask } from "./BaseTask";
import type { TaskPayload, TaskType } from "../types/tasks";
import { ITaskRunnerFacade } from "../types/facade";

type CleanPayload = TaskPayload & {  
  mode?: "soft" | "hard";
  lastRunAt?: string;
  scope?: TaskType;
};

export class CleanTask extends BaseTask {
  private facadeInstance?: ITaskRunnerFacade;
  constructor(params?: { id?: string; name?: string; payload?: CleanPayload }) {
    super({
      id: params?.id,
      name: params?.name ?? "Limpieza básica",
      type: "clean",
      payload: {        
        mode: params?.payload?.mode ?? "soft",        
        scope: params?.payload?.scope ?? "",
      },
    });
  }

  public async execute(): Promise<void> {
    const payload = this.payload as CleanPayload;
    const mode = payload.mode ?? "soft";
    this.setStatus("running", "Iniciando ejecución");

    try {
      if (!this.facadeInstance) {
        throw new Error("CleanTask: Facade no asignado. No se puede realizar la limpieza.");
      }

      this.facadeInstance.clearCompletedTasksAndLogs();

      this.setStatus("completed", `Limpieza completada correctamente con el método ${mode}`);
    } catch (err: any) {
      this.setStatus("failed", `Error: ${err?.message ?? String(err)}`);
      throw err;
    }
  }

  protected cloneAdjustments(): void {
    const p = this.payload as CleanPayload;
    if (p.lastRunAt) delete p.lastRunAt;
    if (p.notes && p.notes.length) p.notes = [];
  }

  public setFacade(facade: ITaskRunnerFacade) {
    this.facadeInstance = facade;
  }
}