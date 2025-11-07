import { BaseTask } from "./BaseTask";
import type { TaskPayload } from "../types/tasks";

type EmailAddress = string;

type EmailPayload = TaskPayload & {
  to?: EmailAddress[];    
  subject?: string;
  body?: string;  
  sentAt?: string;
  messageId?: string;
};

function isValidEmail(addr: string): boolean {  
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr);
}

export class EmailTask extends BaseTask {
  constructor(params?: { id?: string; name?: string; payload?: EmailPayload }) {
    super({
      id: params?.id,
      name: params?.name ?? "Enviar email",
      type: "email",
      payload: {
        to: params?.payload?.to ?? [],        
        subject: params?.payload?.subject ?? "Asunto",
        body: params?.payload?.body ?? "Contenido del mensaje",       
      },
    });
  }

  public async execute(): Promise<void> {
    const p = this.payload as EmailPayload;    
    this.setStatus("running", "Iniciando ejecución");

    try {
      if (!p.to || p.to.length === 0 || !isValidEmail(p.to[0])) {
        throw new Error("EmailTask: al menos un destinatario en 'to' es requerido y debe ser válido");
      }
      if (!p.subject || !p.subject.trim()) {
        throw new Error("EmailTask: 'subject' es requerido");
      }
      if (!p.body || !p.body.trim()) {
        throw new Error("EmailTask: 'body' es requerido");
      }

      await new Promise((res) => setTimeout(res, 350));

      p.messageId = Math.random().toString(36).slice(2, 10);
      p.sentAt = new Date().toISOString();
      
      this.setStatus("completed", "Email enviado correctamente");      
    } catch (err: any) {  
      this.setStatus("failed", `Error: ${err?.message ?? String(err)}`);      
      throw err;
    }
  }

  protected cloneAdjustments(): void {    
    const p = this.payload as EmailPayload;
    if (p.sentAt) delete p.sentAt;
    if (p.messageId) delete p.messageId;
  }
}