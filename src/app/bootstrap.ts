import { PrototypeRegistry } from "../core/registry/PrototypeRegistry";
import { TaskLogger } from "../core/logger/TaskLogger";
import { StrategySelector } from "../core/strategies/StrategySelector";
import { TaskRunnerFacade } from "../core/facade/TaskRunnerFacade";
import { CalendarTask, CleanTask, BackupTask, EmailTask, SocialPostTask, ReminderTask } from "../core/tasks/modules";
import path from "path";

export function bootstrapFacade() {
    const registry = new PrototypeRegistry();

    registry.register(
        "emailBase",
        new EmailTask({
            name: "Plantilla Email base",
            payload: {
                to: ["destinatario@ejemplo.com"],
                subject: "Asunto por defecto",
                body: "Cuerpo del email por defecto",
                cc: [],
                bcc: [],
                attachments: [],
            },
        })
    );

    registry.register(
        "socialPostBase",
        new SocialPostTask({
            name: "Plantilla Publicación Social base",
            payload: {
                platform: "twitter",
                message: "Mensaje por defecto para publicación social",
                tags: ["#ejemplo"],
                attachments: [],
            },
        })
    );

    registry.register(
        "reminderBase",
        new ReminderTask({
            name: "Recordatorio base",
            payload: { message: "Revisa tus tareas", whenISO: new Date(Date.now() + 10 * 60 * 1000).toISOString() },
        })
    );

    registry.register(
        "calendarBase",
        new CalendarTask({
            name: "Registro calendario base",
            payload: { title: "Recordatorio Calendario", description: "Revise sus tareas", whenISO: new Date(Date.now() + 10 * 60 * 1000).toISOString(), location: "Oficina" },
        })
    );

    registry.register(
        "limpiezaBasica",
        new CleanTask({
            name: "Limpieza básica",
            payload: { mode: "soft" },
        })
    );

    registry.register(
        "backupSemanal",
        new BackupTask({
            name: "Backup semanal",
            payload: { destination: path.resolve(process.cwd(), "data", "backup_db.json") },
        })
    );

    const logger = TaskLogger.getInstance();

    const selector = new StrategySelector();

    const facade = new TaskRunnerFacade(registry, logger, selector);

    return { facade, registry };
}