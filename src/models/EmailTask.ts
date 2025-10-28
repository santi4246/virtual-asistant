import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../models/ITask";
import { safeLog } from "../cli/logger";

export class EmailTask extends BaseTask {
  constructor(payload: TaskPayload, priority?: number, id?: string, createdAt?: string) {
    super("email", payload, priority, id, createdAt);
  }

  async execute(): Promise<void> {
    const recipient = this.payload.recipient ?? "<sin destinatario>";
    const subject = this.payload.subject ?? "<sin asunto>";
    const message = this.payload.message ?? "<sin mensaje>";

    safeLog(`[EmailTask] (${this.id}) Iniciando envío a ${recipient}`);
    safeLog(`[EmailTask] Subject: ${subject}`);
    safeLog(`[EmailTask] Message: ${message}`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = {
      status: "simulated",
      info: `Email simuladamente enviado a ${recipient}`,
      timestamp: new Date().toISOString(),
    };

    safeLog(`[EmailTask] (${this.id}) Envío simulado completo`, result);
    await this.persistResult(result);
  }
}