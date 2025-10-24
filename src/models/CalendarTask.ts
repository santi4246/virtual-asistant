// src/models/CalendarTask.ts
import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../models/ITask";

export class CalendarTask extends BaseTask {
  constructor(payload: TaskPayload, priority?: number, id?: string, createdAt?: string) {
    super("calendar", payload, priority, id, createdAt);
  }

  async execute(): Promise<void> {
    const title = this.payload.title ?? "<sin título>";
    const dateStr = this.payload.date ?? "";
    const description = this.payload.message ?? this.payload.description ?? "<sin descripción>";

    console.log(`[CalendarTask] (${this.id}) Creando recordatorio: ${title}`);
    console.log(`[CalendarTask] Fecha (raw): ${dateStr}`);
    console.log(`[CalendarTask] Descripción: ${description}`);

    const scheduledDate = dateStr ? new Date(dateStr) : null;
    if (dateStr && (!scheduledDate || isNaN(scheduledDate.getTime()))) {
      const errMsg = `[CalendarTask] (${this.id}) Fecha inválida: ${dateStr}`;
      console.error(errMsg);

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
      status: "simulated",
      info: `Recordatorio creado: "${title}" programado para ${scheduledDate ? scheduledDate.toISOString() : "fecha no especificada"}`,
      scheduledFor: scheduledDate ? scheduledDate.toISOString() : null,
      timestamp: new Date().toISOString(),
    };

    console.log(`[CalendarTask] (${this.id}) Recordatorio simulado creado`, result);
    await this.persistResult(result);
  }
}