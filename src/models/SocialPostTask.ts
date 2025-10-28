import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../models/ITask";
import { safeLog } from "../cli/logger";

export class SocialPostTask extends BaseTask {
  constructor(payload: TaskPayload, priority?: number, id?: string, createdAt?: string) {
    super("social", payload, priority, id, createdAt);
  }

  async execute(): Promise<void> {
    // Validar que el contenido no esté vacío
    if (!this.payload.content || this.payload.content.trim().length === 0) {
      const errorResult = {
        status: "error",
        error: "Mensaje vacío. No se puede publicar.",
        timestamp: new Date().toISOString()
      };

      await this.persistResult(errorResult);
      throw new Error("Mensaje vacío. No se puede publicar.");
    }

    // Simular publicación en red social
    const result = {
      status: "simulated",
      info: `Post simulado en ${this.payload.platform}: "${this.payload.content}"`,
      publishedAt: new Date().toISOString(),
      timestamp: new Date().toISOString()
    };

    safeLog(`[SocialPostTask] (${this.id}) Publicando en ${this.payload.platform}`);
    safeLog(`[SocialPostTask] (${this.id}) Contenido: ${this.payload.content}`);
    safeLog(`[SocialPostTask] (${this.id}) Post simulado publicado:`, result);

    await this.persistResult(result);
  }
}