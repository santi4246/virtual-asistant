import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../types/tasks";

type SocialPayload = TaskPayload & {
  platform?: "twitter" | "x" | "facebook" | "instagram" | "linkedin";
  message?: string;
  tags?: string[];
  attachments?: { url: string; type?: "image" | "video" | "file" }[];
  publishedAt?: string;
  postId?: string;
};

export class SocialPostTask extends BaseTask {
  constructor(params?: { id?: string; name?: string; payload?: SocialPayload }) {
    super({
      id: params?.id,
      name: params?.name ?? "Publicación social",
      type: "social",
      payload: {
        platform: params?.payload?.platform ?? "twitter",
        message: params?.payload?.message ?? "Mensaje por defecto",
        tags: params?.payload?.tags ?? [],
        attachments: params?.payload?.attachments ?? [],
      },
    });
  }

  public async execute(): Promise<void> {
    const payload = this.payload as SocialPayload;
    this.setStatus("running", "Iniciando ejecución");

    try {
      const message = (payload.message ?? "").trim();
      if (!message) {
        throw new Error("SocialPostTask: el mensaje no puede estar vacío");
      }
      if (message.length > 280 && (payload.platform === "twitter" || payload.platform === "x")) {
        throw new Error("SocialPostTask: el mensaje excede 280 caracteres para Twitter/X");
      }

      await new Promise((res) => setTimeout(res, 400));

      const fakeId = Math.random().toString(36).slice(2, 10);

      payload.postId = fakeId;
      payload.publishedAt = new Date().toISOString();

      this.setStatus("completed", "Post creado correctamente");      
    } catch (err: any) {
      this.setStatus("failed", `Error: ${err?.message ?? String(err)}`);      
      throw err;
    }
  }

  protected cloneAdjustments(): void {
    const p = this.payload as SocialPayload;
    if (p.publishedAt) delete p.publishedAt;
    if (p.postId) delete p.postId;
  }
}