import { BaseTask } from "./BaseTask";

export class BackupTask extends BaseTask {
  constructor(params: { id?: string; name?: string; payload?: { source?: string; destination?: string } }) {
    super({
      id: params.id,
      name: params.name ?? "Backup genérico",
      type: "backup",
      payload: {
        source: params.payload?.source ?? "/var/data",
        destination: params.payload?.destination ?? "/var/backups",
      },
    });
  }

  public async execute(): Promise<void> {
    const { source, destination } = this.payload as { source: string; destination: string };

    if (!source || !destination) {
      throw new Error("BackupTask: 'source' y 'destination' son requeridos");
    }
    if (source === destination) {
      throw new Error("BackupTask: 'source' y 'destination' no pueden ser iguales");
    }

    await new Promise((res) => setTimeout(res, 200));
    (this.payload as any).lastOperation = `Copia simulada de ${source} a ${destination}`;

    await new Promise((res) => setTimeout(res, 500));
    (this.payload as any).lastRunAt = new Date().toISOString();
  }

  protected cloneAdjustments(): void {
    if (this.payload && typeof this.payload === "object" && "lastRunAt" in this.payload) {
      delete (this.payload as any).lastRunAt;
    }
  }
}