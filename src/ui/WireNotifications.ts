import readline from "readline";
import { notificationBus } from "./NotificationBus";

export function wireNotifications(rl: readline.Interface) {
  notificationBus.on("task:result", ({ taskId, taskName, result }) => {
    let msg: string;

    switch (result.status) {
      case "completed":
        msg = `✓ Tarea "${taskName}" (${taskId}) completada`;
        break;

      case "failed":
        msg = `✗ Tarea "${taskName}" (${taskId}) falló: ${result.error ?? "error desconocido"}`;
        break;

      case "canceled":
        msg = `ℹ Tarea "${taskName}" (${taskId}) cancelada (condición no satisfecha${result.condition ? `: ${result.condition}` : ""})`;
        break;

      case "scheduled":
        if ("scheduledFor" in result && result.scheduledFor) {
          const targetDate = new Date(result.scheduledFor as string);
          msg = `⏰ Tarea "${taskName}" (${taskId}) programada para ${targetDate.toLocaleString()}`;
        } else {
          msg = `⏰ Tarea "${taskName}" (${taskId}) programada`;
        }
        break;

      default:
        // Para cualquier otro estado no manejado
        msg = `ℹ Tarea "${taskName}" (${taskId}) terminó: ${result.status}`;
        break;
    }

    // Imprimir sin romper el prompt actual y reponerlo
    const out = (rl as any).output ?? process.stdout;
    out.write("\n" + msg + "\n");
    rl.prompt(true);
  });
}