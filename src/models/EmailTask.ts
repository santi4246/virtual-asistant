// src/models/EmailTask.ts
import { BaseTask } from "./BaseTask";
import type { TaskPayload, TaskType } from "../models/ITask";

export class EmailTask extends BaseTask {
  constructor(payload: TaskPayload, priority?: number, id?: string, createdAt?: string) {
    super("email", payload, priority, id, createdAt);
  }

  async execute(): Promise<void> {
    const recipient = this.payload.recipient ?? "<sin destinatario>";
    const subject = this.payload.title ?? "<sin asunto>";
    const message = this.payload.message ?? "<sin mensaje>";

    console.log(`[EmailTask] (${this.id}) Iniciando envío a ${recipient}`);
    console.log(`[EmailTask] Subject: ${subject}`);
    console.log(`[EmailTask] Message: ${message}`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const result = {
      status: "simulated",
      info: `Email simuladamente enviado a ${recipient}`,
      timestamp: new Date().toISOString(),
    };

    console.log(`[EmailTask] (${this.id}) Envío simulado completo`, result);
    await this.persistResult(result);
  }
}