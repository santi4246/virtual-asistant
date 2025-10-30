// src/cli/taskActions.ts
import type readline from "readline";
import type { TaskRequest } from "../core/types/facade";
import { logger } from "./logger";
import type { ExecutionStrategyConfig } from "../core/types/strategy";

// Función para preguntar usando readline.Interface directamente
async function askQuestion(rl: readline.Interface, query: string): Promise<string> {
  return new Promise((resolve) => rl.question(query, resolve));
}

// Función para pedir fecha programada en formato ISO
export async function askScheduledDate(rl: readline.Interface): Promise<string | null> {
  while (true) {
    const input = await askQuestion(rl, "Ingrese fecha y hora programada (YYYY-MM-DD HH:mm) o vacío para cancelar: ");
    if (!input.trim()) return null;

    const iso = new Date(input).toISOString();
    if (isNaN(Date.parse(iso))) {
      logger.log("Fecha inválida, intente de nuevo.");
      continue;
    }
    return iso;
  }
}

// Crear tarea limpia interactiva (ejemplo para CleanTask)
export async function createCleanTaskInteractive(rl: readline.Interface): Promise<TaskRequest> {
  const name = await askQuestion(rl, "Nombre de la tarea de limpieza: ");
  const targetsRaw = await askQuestion(rl, "Rutas a limpiar (separadas por coma): ");
  const mode = await askQuestion(rl, "Modo de limpieza (soft/hard): ");

  const targets = targetsRaw.split(",").map((t) => t.trim()).filter(Boolean);

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

  return {
    source: {
      kind: "builder",
      data: {
        name,
        type: "clean",
        payload: { targets, mode },
        strategy: strategyConfig,
      },
    },
    executeNow: true,
  };
}

// Crear tarea genérica interactiva (ejemplo para builder)
export async function createTaskInteractive(rl: readline.Interface): Promise<TaskRequest | null> {
  const type = await askQuestion(rl, "Tipo de tarea (email/calendar/social/clean/backup): ");
  if (!["email", "calendar", "social", "clean", "backup"].includes(type)) {
    logger.log("Tipo inválido.");
    return null;
  }
  const name = await askQuestion(rl, "Nombre de la tarea: ");

  // Para simplificar, payload vacío o básico según tipo
  let payload: Record<string, any> = {};

  switch (type) {
    case "email":
      payload = {
        to: [await askQuestion(rl, "Destinatario email: ")],
        subject: await askQuestion(rl, "Asunto: "),
        body: await askQuestion(rl, "Cuerpo: "),
      };
      break;
    case "calendar":
      payload = {
        title: await askQuestion(rl, "Título: "),
        whenISO: new Date(await askQuestion(rl, "Fecha y hora (YYYY-MM-DD HH:mm): ")).toISOString(),
      };
      break;
    case "social":
      payload = {
        platform: await askQuestion(rl, "Plataforma (twitter/facebook/instagram): "),
        message: await askQuestion(rl, "Mensaje: "),
      };
      break;
    case "clean":
      return createCleanTaskInteractive(rl);
    case "backup":
      payload = {
        source: await askQuestion(rl, "Ruta origen: "),
        destination: await askQuestion(rl, "Ruta destino: "),
      };
      break;
  }

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

  return {
    source: {
      kind: "builder",
      data: {
        name,
        type: type as any,
        payload,
        strategy: strategyConfig,
      },
    },
    executeNow: true,
  };
}