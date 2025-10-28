import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../models/ITask";
import { safeLog } from "../cli/logger";

export class CalendarTask extends BaseTask {
  constructor(payload: TaskPayload, priority?: number, id?: string, createdAt?: string) {
    super("calendar", payload, priority, id, createdAt);
  }

  async execute(): Promise<void> {
    const title = this.payload.title ?? "<sin título>";
    const dateStr = this.payload.date ?? "";
    const description = this.payload.message ?? this.payload.description ?? "<sin descripción>";

    safeLog(`\n[CalendarTask] (${this.id}) Creando recordatorio: ${title}`);
    safeLog(`[CalendarTask] Fecha (raw): ${dateStr}`);
    safeLog(`[CalendarTask] Descripción: ${description}`);

    const scheduledDate = dateStr ? new Date(dateStr) : null;
    if (dateStr && (!scheduledDate || isNaN(scheduledDate.getTime()))) {
      const errMsg = `[CalendarTask] (${this.id}) Fecha inválida: ${dateStr}`;
      safeLog(errMsg);

      const errorResult = {
        status: "error",
        info: errMsg,
        timestamp: new Date().toISOString(),
      };

      await this.persistResult(errorResult);
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = {
      status: "completada",
      info: `Recordatorio creado: "${title}" programado para ${scheduledDate ? scheduledDate.toISOString() : "fecha no especificada"}`,
      scheduledFor: scheduledDate ? scheduledDate.toISOString() : null,
      timestamp: new Date().toISOString(),
    };

    safeLog(`\n[CalendarTask] (${this.id}) Recordatorio simulado creado`, result);
    await this.persistResult(result);
  }
}