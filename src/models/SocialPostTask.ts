// src/models/SocialPostTask.ts
import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../models/ITask";

export class SocialPostTask extends BaseTask {
  constructor(payload: TaskPayload, priority?: number, id?: string, createdAt?: string) {
    super("social", payload, priority, id, createdAt);
  }

  async execute(): Promise<void> {
    const platform = (this.payload.platform as string) ?? "generic";
    const message = (this.payload.message as string) ?? "";

    console.log(`[SocialPostTask] (${this.id}) Preparando post en "${platform}"`);

    if (!message) {
      const errMsg = `[SocialPostTask] (${this.id}) Mensaje vacío. No se puede publicar.`;
      console.error(errMsg);

      const errorResult = {
        status: "error",
        info: errMsg,
        timestamp: new Date().toISOString(),
      };

      await this.persistResult(errorResult);
      return;
    }

    console.log(`[SocialPostTask] (${this.id}) Mensaje: ${message}`);

    await new Promise((resolve) => setTimeout(resolve, 500));

    const publishedAt = new Date().toISOString();

    const result = {
      status: "simulated",
      info: `Post simulado publicado en ${platform}`,
      platform,
      publishedAt,
      timestamp: new Date().toISOString(),
    };

    console.log(`[SocialPostTask] (${this.id}) Publicación simulada completada`, result);
    await this.persistResult(result);
  }
}