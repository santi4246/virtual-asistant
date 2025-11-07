import readline from "readline";
import { ExecutionStrategyConfig } from "../core/types/strategy";
import { TaskLogEntry } from "../core/types/logger";
import { colorizeAudit, colorizeStatus, highlightAuditPrefix } from "../utils/colors";
import { TaskRequestBuilder } from "../core/builder/TaskRequestBuilder";
import { TaskType } from "../core/types/tasks";
import path from "path";

export function askQuestion(rl: readline.Interface, query: string): Promise<string> {
    return new Promise((resolve) => {
        const output = (rl as any).output ?? process.stdout;
        readline.clearLine(output, 0);
        readline.cursorTo(output, 0);
        rl.question(query, (ans) => resolve(ans));
    });
}

export async function askTask(rl: readline.Interface, prompt: string): Promise<string | null> {
    const taskTypes = ["email", "calendar", "social", "clean", "backup"];
    while (true) {
        const answer = await askQuestion(rl, prompt);
        const num = Number(answer.trim());
        if (!isNaN(num) && num >= 1 && num <= taskTypes.length) {
            return taskTypes[num - 1];
        }
        console.log(`Entrada inválida. Por favor ingrese un número entre 1 y ${taskTypes.length}.`);
    }
}

function parseDateToISO(input: string): string | null {
    // Espera formato "YYYY-MM-DD HH:mm"
    const normalized = input.replace("T", " ").trim();
    const [datePart, timePart] = normalized.split(" ");
    if (!datePart || !timePart) return null;
    const [yyyy, mm, dd] = datePart.split("-").map(Number);
    const [HH, MM] = timePart.split(":").map(Number);
    if (!yyyy || !mm || !dd || Number.isNaN(HH) || Number.isNaN(MM)) return null;
    const d = new Date(Date.UTC(yyyy, mm - 1, dd, HH, MM, 0));
    if (isNaN(d.getTime())) return null;
    return d.toISOString();
}

function normalizeDateInput(input: string): string | null {
    const regex = /^(\d{4})-(\d{1,2})-(\d{1,2}) (\d{1,2}):(\d{2})$/;
    const match = input.match(regex);
    if (!match) return null;

    const [_, year, month, day, hour, minute] = match;
    const mm = month.padStart(2, "0");
    const dd = day.padStart(2, "0");
    const hh = hour.padStart(2, "0");

    return `${year}-${mm}-${dd} ${hh}:${minute}`;
}

export async function askScheduledDate(rl: readline.Interface): Promise<string | null> {
    while (true) {
        const input = await askQuestion(rl, "Ingrese fecha y hora programada (YYYY-MM-DD HH:mm) o vacío para cancelar: ");
        if (!input.trim()) return null;

        const normalized = normalizeDateInput(input.trim());
        if (!normalized) {
            console.log("Formato inválido. Use YYYY-MM-DD HH:mm");
            continue;
        }

        const date = new Date(normalized);
        if (isNaN(date.getTime())) {
            console.log("Fecha inválida, intente de nuevo.");
            continue;
        }

        if (date.getTime() <= Date.now()) {
            console.log("La fecha debe ser futura, intente de nuevo.");
            continue;
        }

        return date.toISOString();
    }
}

export async function createTaskInteractive(rl: readline.Interface) {
    const type = await askTask(
        rl,
        "Tipo de tarea (1 - email / 2 - calendar / 3 - social / 4 - clean / 5 - backup): "
    ) as TaskType | null;

    if (!type) return null;

    let name = (await askQuestion(rl, "Nombre de la tarea: ")).trim();
    if (!name) name = `Tarea ${type}`;

    let payload: Record<string, any> = {};
    let strategy: ExecutionStrategyConfig | undefined;

    switch (type) {
        case "email": {
            const to = (await askQuestion(rl, "Email del destinatario: ")).trim();
            const subject = (await askQuestion(rl, "Asunto: ")).trim();
            const body = await askQuestion(rl, "Cuerpo: ");
            if (!to) {
                console.log("Destinatario requerido.");
                return null;
            }                        
            payload = { to: [to], subject, body };            
            break;
        }

        case "calendar": {
            const title = (await askQuestion(rl, "Título: ")).trim();
            const whenStr = (await askQuestion(rl, "Fecha y hora (YYYY-MM-DD HH:mm): ")).trim();
            const date = parseDateToISO(whenStr);
            if (!date) {
                console.log("Fecha/hora inválida. Formato esperado: YYYY-MM-DD HH:mm");
                return null;
            }
            payload = { title, date };
            break;
        }

        case "social": {
            const platform = (await askQuestion(rl, "Plataforma (twitter/facebook/instagram): ")).trim().toLowerCase();
            const message = await askQuestion(rl, "Mensaje: ");
            if (!platform || !["twitter", "facebook", "instagram"].includes(platform)) {
                console.log("Plataforma inválida. Use: twitter/facebook/instagram");
                return null;
            }
            payload = { platform, message };
            break;
        }

        case "clean": {
            let mode = (await askQuestion(rl, "Modo de limpieza (soft/hard) [soft]: ")).trim().toLowerCase();
            if (!mode) mode = "soft";
            if (!["soft", "hard"].includes(mode)) {
                console.log("Modo inválido. Use 'soft' o 'hard'.");
                return null;
            }            
            const scopeInput =
                mode === "soft"
                    ? (await askQuestion(rl, "Scope (opcional: email/calendar/social/backup) [vacío=global]: ")).trim().toLowerCase()
                    : "";

            const scope = scopeInput || undefined;
            payload = { mode, ...(scope ? { scope } : {}) };
            break;
        }

        case "backup": {            
            const destination = path.resolve(process.cwd(), "data", "backup_db.json");
            payload = { destination };
            break;
        }

        default:
            console.log(`Tipo de tarea '${type}' no soportado.`);
            return null;
    }

    // Siempre encolamos por defecto (executeNow: false)
    try {
        const request = TaskRequestBuilder
            .fromBuilder()
            .setName(name)
            .setType(type)
            .setPayload(payload)
            .setStrategy(strategy as ExecutionStrategyConfig)
            .build(false);

        return request;
    } catch (err) {
        console.log("Error al construir la tarea:", (err as Error).message);
        return null;
    }
}

export async function askStrategyConfig(rl: readline.Interface): Promise<ExecutionStrategyConfig> {
    const strategyType = await askQuestion(rl, "Estrategia (immediate/scheduled/conditional): ");
    let strategyConfig: ExecutionStrategyConfig = { type: strategyType as any };

    if (strategyType === "scheduled") {
        const dateISO = await askScheduledDate(rl);
        if (!dateISO) throw new Error("Fecha programada requerida para estrategia scheduled");
        strategyConfig = { type: "scheduled", targetDateISO: dateISO };
    } else if (strategyType === "conditional") {
        const condition = await askQuestion(rl, "Condición (day/night): ");
        strategyConfig = { type: "conditional", condition };
    }

    return strategyConfig;
}

export function printHistory(logs: TaskLogEntry[]) {
    // Construimos el set de tareas con estado final
    const hasFinal = new Set<string>();
    for (const e of logs) {
        if (e.status === "completed" || e.status === "failed" || e.status === "canceled") {
            hasFinal.add(e.taskId);
        }
    }

    console.log("\n=== Historial de tareas ===");
    let i = 1;
    for (const e of logs) {
        // Ocultar 'running' si ya existe un final para el mismo taskId
        if (e.status === "running" && hasFinal.has(e.taskId)) {
            continue;
        }

        // Resaltado de auditoría por prefijo del mensaje
        const isAudit = typeof e.message === "string" && e.message.startsWith("AUDIT: ");
        const message = highlightAuditPrefix(e.message); // resalta solo el prefijo “AUDIT: ”

        const line =
            `${i++}) [${e.timestampISO}] ` +
            `Tarea: ${e.taskName} (ID: ${e.taskId}) ` +
            `- Estrategia: ${e.strategy} ` +
            `- Estado: ${e.status} ` +
            `- Mensaje: ${message}`;

        if (isAudit) {
            // Opción A: toda la línea con estilo audit
            console.log(colorizeAudit(line));
            // Opción B, solo prefijo            
            // console.log(colorizeStatus(e.status, line));
        } else {
            console.log(colorizeStatus(e.status, line));
        }
    }
}