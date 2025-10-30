import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../types/tasks";

type CalendarPayload = TaskPayload & {
  title?: string;
  description?: string;
  whenISO?: string;
  location?: string;
  createdAt?: string;
  eventId?: string;
};

function isIsoDate(s?: string): boolean {
  if (!s) return false;
  const t = Date.parse(s);
  return !Number.isNaN(t);
}

export class CalendarTask extends BaseTask {
  constructor(params?: { id?: string; name?: string; payload?: CalendarPayload }) {
    super({
      id: params?.id,
      name: params?.name ?? "Recordatorio de calendario",
      type: "calendar",
      payload: {
        title: params?.payload?.title ?? "Recordatorio",
        description: params?.payload?.description ?? "",
        whenISO:
          params?.payload?.whenISO ??
          new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        location: params?.payload?.location ?? "",        
      },
    });
  }

  public async execute(): Promise<void> {
    const p = this.payload as CalendarPayload;
    
    if (!p.title || !p.title.trim()) {
      throw new Error("CalendarTask: 'title' es requerido");
    }
    if (!isIsoDate(p.whenISO)) {
      throw new Error("CalendarTask: 'whenISO' debe ser una fecha ISO válida");
    }
    
    await new Promise((res) => setTimeout(res, 250));

    p.eventId = Math.random().toString(36).slice(2, 10);
    p.createdAt = new Date().toISOString();
  }

  protected cloneAdjustments(): void {    
    const p = this.payload as CalendarPayload;
    if (p.createdAt) delete p.createdAt;
    if (p.eventId) delete p.eventId;
  }
}