import { BaseTask } from "./BaseTask";

export class ReminderTask extends BaseTask {
  constructor(params: { id?: string; name?: string; payload?: { message?: string; whenISO?: string } }) {
    super({
      id: params.id,
      name: params.name ?? "Recordatorio",
      type: "calendar",
      payload: {
        message: params.payload?.message ?? "Recordatorio pendiente",
        whenISO: params.payload?.whenISO ?? new Date(Date.now() + 60000).toISOString(),
      },
    });
  }

  public async execute(): Promise<void> {
    const { message } = this.payload as { message: string; whenISO?: string };

    await new Promise((res) => setTimeout(res, 200));
    (this.payload as any).lastOperation = `${message}`; // Verificar el message
    
    await new Promise((res) => setTimeout(res, 200));
    (this.payload as any).sentAt = new Date().toISOString();
  }

  protected cloneAdjustments(): void {    
    if ("sentAt" in (this.payload as any)) {
      delete (this.payload as any).sentAt;
    }
  }
}