import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../types/tasks";

type CleanPayload = TaskPayload & {
  targets?: string[];
  mode?: "soft" | "hard";
  notes?: string[];
  lastRunAt?: string;
};

export class CleanTask extends BaseTask {
  constructor(params?: { id?: string; name?: string; payload?: CleanPayload }) {
    super({
      id: params?.id,
      name: params?.name ?? "Limpieza básica",
      type: "clean",
      payload: {
        targets: params?.payload?.targets ?? ["./temp", "./cache"],
        mode: params?.payload?.mode ?? "soft",
        notes: params?.payload?.notes ?? [],        
      },
    });
  }

  public async execute(): Promise<void> {
    const payload = this.payload as CleanPayload;
    const targets = payload.targets ?? [];
    const mode = payload.mode ?? "soft";
    
    payload.notes = [...(payload.notes ?? []), `Iniciando limpieza (${mode}) de ${targets.length} objetivo(s)`];
    
    await new Promise((res) => setTimeout(res, 300));

    payload.notes.push("Limpieza completada correctamente");
    payload.lastRunAt = new Date().toISOString();
  }

  protected cloneAdjustments(): void {    
    const p = this.payload as CleanPayload;
    if (p.lastRunAt) delete p.lastRunAt;
    if (p.notes && p.notes.length) p.notes = [];
  }
}