import readline from "readline";
import type { ITaskRunnerFacade, TaskRequest } from "../core/types/facade";
import type { ExecutionStrategyConfig, StrategyType } from "../core/types/strategy";
import { askScheduledDate, createTaskInteractive, askQuestion, printHistory } from "./taskHelpers";
import { colorizeStatus } from "../utils/colors";
import { TaskLogEntry } from "../core/types/logger";

export type UILogger = {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

// ========== Helpers de UI ==========

export async function waitForKeypress(): Promise<void> {
  return new Promise((resolve) => {
    const stdin = process.stdin;
    const wasRaw = (stdin as any).isRaw ?? false;

    stdin.setRawMode?.(true);
    stdin.resume();

    const onData = () => {
      stdin.setRawMode?.(wasRaw);
      stdin.removeListener("data", onData);
      resolve();
    };

    stdin.once("data", onData);
  });
}

async function pauseAndReturnToMenu(rl: readline.Interface): Promise<void> {
  rl.pause();
  process.stdout.write("Presione cualquier tecla para volver al menú…");
  await waitForKeypress();
  rl.resume();
}

// ========== Resolución de estrategias ==========

async function resolveStrategyConfigForExecution(
  rl: readline.Interface,
  question: typeof askQuestion,
  existingStrategy?: ExecutionStrategyConfig
): Promise<ExecutionStrategyConfig | null> {
  // Si ya existe una estrategia scheduled, ofrecer cambiarla
  if (existingStrategy?.type === "scheduled") {
    const existingDate = existingStrategy.targetDateISO;
    const change = (await question(rl, `La tarea tiene fecha programada para ${existingDate}. ¿Desea cambiarla? (s/n): `))
      .trim()
      .toLowerCase();

    if (change === "n") {
      if (!existingDate) {
        console.log("No hay fecha programada válida. Debe indicar una nueva.");
      } else {
        return { type: "scheduled", targetDateISO: existingDate };
      }
    }
  }

  const stratInput = (await question(rl, "Estrategia (immediate/scheduled/conditional): "))
    .trim()
    .toLowerCase() as StrategyType | string;

  switch (stratInput) {
    case "immediate":
      return { type: "immediate" };

    case "scheduled":
      return await askScheduledStrategyConfig(rl, question);

    case "conditional":
      return await askConditionalStrategyConfig(rl, question);

    default:
      console.log("Estrategia no reconocida. Se usará 'immediate'.");
      return { type: "immediate" };
  }
}

async function askScheduledStrategyConfig(
  rl: readline.Interface,
  question: typeof askQuestion
): Promise<ExecutionStrategyConfig | null> {
  const targetDateISO = (await question(rl, "Fecha/hora programada (ISO, ej: 2025-11-06T20:30:00Z): ")).trim();

  if (!targetDateISO) {
    console.log("Fecha programada requerida para 'scheduled'.");
    return null;
  }

  return { type: "scheduled", targetDateISO };
}

async function askConditionalStrategyConfig(
  rl: readline.Interface,
  question: typeof askQuestion
): Promise<ExecutionStrategyConfig | null> {
  const cond = (await question(rl, "Condición (day/night): ")).trim().toLowerCase();

  if (!["day", "night"].includes(cond)) {
    console.log("Condición inválida. Use 'day' o 'night'.");
    return null;
  }

  const intervalStr = (await question(rl, "Intervalo ms (opcional) [1000]: ")).trim();
  const maxStr = (await question(rl, "Máx. intentos (opcional) [10]: ")).trim();

  const intervalMs = intervalStr ? Number(intervalStr) : 1000;
  const maxAttempts = maxStr ? Number(maxStr) : 10;

  return {
    type: "conditional",
    condition: cond as "day" | "night",
    intervalMs,
    maxAttempts,
  };
}

// ========== Construcción de TaskRequest ==========

function buildTaskRequestFromPending(
  selectedTask: any,
  strategyConfig: ExecutionStrategyConfig
): TaskRequest {
  if (selectedTask.prototype) {
    return {
      source: {
        kind: "prototype",
        data: {
          key: selectedTask.key,
          overrides: {
            ...selectedTask.overrides,
            strategy: strategyConfig,
          },
        },
      },
      executeNow: true,
      pendingRef: { key: selectedTask.key, overrides: selectedTask.overrides },
    };
  }

  // Builder-based task
  return {
    source: {
      kind: "builder",
      data: {
        ...(selectedTask.overrides as any),
        strategy: strategyConfig,
      },
    },
    executeNow: true,
    pendingRef: { key: selectedTask.key, overrides: selectedTask.overrides },
  };
}

// ========== Selección de tareas pendientes ==========

async function selectPendingTask(
  rl: readline.Interface,
  question: typeof askQuestion,
  pendingTasks: any[]
): Promise<any | null> {
  console.log("\nTareas pendientes:");
  pendingTasks.forEach((t, i) => {
    const name = t.overrides?.name ?? t.prototype?.name ?? "Sin nombre";
    const status = t.status ?? "unknown";
    console.log(`${i + 1}) ${name} - Estado: ${status}`);
  });

  const answer = await question(rl, "Seleccione tarea por número (0 para cancelar): ");
  const index = Number(answer) - 1;

  if (!Number.isInteger(index) || index < -1 || index >= pendingTasks.length) {
    console.log("\nOperación cancelada o selección inválida.");
    return null;
  }

  if (index === -1) {
    console.log("\nOperación cancelada.");
    return null;
  }

  return pendingTasks[index];
}

// ========== Handlers principales ==========

export async function handleCreateNewTask(
  rl: readline.Interface,
  facade: ITaskRunnerFacade,
  logger: UILogger
) {
  try {
    const taskRequest = await createTaskInteractive(rl);

    if (!taskRequest) {
      logger.log("Creación de tarea cancelada.");
    } else {
      facade.registerTask(taskRequest);
      const createdName =
        taskRequest.source.kind === "builder"
          ? taskRequest.source.data.name
          : taskRequest.source.data.overrides?.name ?? "Sin nombre";
      console.log(`\nTarea creada: ${createdName}`);
    }
  } catch (err) {
    console.log(`\nError inesperado: ${(err as Error).message}`);
  }

  await pauseAndReturnToMenu(rl);
}

export async function handleCloneTemplate(
  rl: readline.Interface,
  facade: ITaskRunnerFacade,
  logger: UILogger,
  question: typeof askQuestion
) {
  try {
    const templates = facade.listTemplates();

    if (templates.length === 0) {
      console.log("\nNo hay plantillas registradas.");
      await pauseAndReturnToMenu(rl);
      return;
    }

    // 1) Selección de plantilla
    console.log("Plantillas disponibles:");
    templates.forEach((t, i) => console.log(`${i + 1}) ${t.name} (clave: ${t.key})`));

    const answer = await question(rl, "Seleccione plantilla por número (0 para cancelar): ");
    const index = Number(answer) - 1;

    if (!Number.isInteger(index) || index < -1 || index >= templates.length) {
      console.log("Operación cancelada o selección inválida.");
      await pauseAndReturnToMenu(rl);
      return;
    }

    if (index === -1) {
      console.log("Operación cancelada.");
      await pauseAndReturnToMenu(rl);
      return;
    }

    const selected = templates[index];

    // 2) Nombre de la tarea
    const newName = await question(rl, "Nuevo nombre para la tarea (enter para mantener): ");

    // 3) Personalización de datos (ANTES de estrategia)
    const personalize = selected.key !== "backupSemanal" ? (await question(rl, "¿Desea personalizar los datos de la tarea? (s/n): ")) : ""
      .trim()
      .toLowerCase();

    let overrides: any = { name: newName.trim() || undefined };

    if (personalize === "s") {
      switch (selected.key) {
        case "emailBase": {
          overrides.to = (await question(rl, "Destinatario (email): ")).trim();
          overrides.subject = (await question(rl, "Asunto: ")).trim();
          overrides.body = (await question(rl, "Cuerpo: ")).trim();
          break;
        }
        case "socialPostBase": {
          overrides.network = (await question(rl, "Red social (facebook/twitter/instagram): ")).trim();
          overrides.message = (await question(rl, "Mensaje: ")).trim();
          break;
        }
        case "limpiezaBasica": {
          const mode = (await question(rl, "Modo de limpieza (soft/hard): ")).trim().toLowerCase();
          if (!["soft", "hard"].includes(mode)) {
            console.log("Modo inválido. Se mantendrá el valor por defecto de la plantilla.");
          } else {
            overrides.mode = mode;
          }
          break;
        }
        case "backupSemanal": {
          // Backup usa rutas por defecto, normalmente no se personaliza
          break;
        }
        case "calendarBase":
        case "reminderBase": {
          overrides.text = (await question(rl, "Texto del recordatorio/evento: ")).trim();
          break;
        }
        default: {
          // Sin personalización adicional para otros tipos
          break;
        }
      }
    }

    // 4) Estrategia de ejecución (DESPUÉS de personalización)
    let strategyConfig: ExecutionStrategyConfig = { type: "immediate" };
    const useScheduled = (await question(rl, "¿Programar tarea? (s/n): ")).trim().toLowerCase();

    if (useScheduled === "s") {
      const dateISO = await askScheduledDate(rl);
      if (dateISO) {
        strategyConfig = { type: "scheduled", targetDateISO: dateISO };
      }
    }

    // 5) Agregar estrategia a overrides
    overrides.strategy = strategyConfig;

    // 6) Construir request con overrides completos
    const request: TaskRequest = {
      source: {
        kind: "prototype",
        data: {
          key: selected.key,
          overrides,
        },
      },
      executeNow: true,
    };

    // 7) Ejecutar
    const response = await facade.run(request);

    if (response.ok) {
      const isScheduled = strategyConfig.type === "scheduled";      

      if (!isScheduled) {
        console.log(`Tarea clonada y ejecutada: ${response.taskName} (ID: ${response.taskId})`);
      }
    } else {
      console.log(`Error al ejecutar tarea: ${response.error}`);
    }
  } catch (err) {
    console.log(`Error inesperado: ${(err as Error).message}`);
  }

  await pauseAndReturnToMenu(rl);
}

export async function handleExecutePendingTask(
  rl: readline.Interface,
  facade: ITaskRunnerFacade,
  logger: UILogger,
  question: typeof askQuestion
) {
  try {
    const pendingTasks = facade.getPendingTasks();

    if (pendingTasks.length === 0) {
      console.log("\nNo hay tareas pendientes para ejecutar.");
      await pauseAndReturnToMenu(rl);
      return;
    }

    const selectedTask = await selectPendingTask(rl, question, pendingTasks);

    if (!selectedTask) {
      await pauseAndReturnToMenu(rl);
      return;
    }

    const strategyConfig = await resolveStrategyConfigForExecution(
      rl,
      question,
      selectedTask.overrides?.strategy
    );

    if (!strategyConfig) {
      console.log("\nEstrategia inválida o cancelada.");
      await pauseAndReturnToMenu(rl);
      return;
    }

    const taskRequest = buildTaskRequestFromPending(selectedTask, strategyConfig);
    const response = await facade.run(taskRequest);

    if (response.ok) {
      console.log(
        `\nTarea lanzada: ${response.taskName} con estrategia ${strategyConfig.type} (estado inicial: ${response.status}).`
      );
    } else {
      console.log(`\nError al ejecutar tarea: ${response.error}`);
    }
  } catch (err) {
    console.log(`\nError inesperado: ${(err as Error).message}`);
  }

  await pauseAndReturnToMenu(rl);
}

export async function handleViewHistory(facade: ITaskRunnerFacade) {
  const logs: TaskLogEntry[] = facade.getHistory();
  const pendings = facade.getPendingTasks();

  if (pendings.length === 0 && logs.length === 0) {
    console.log("\nNo hay historial de tareas ni tareas pendientes.");
    return;
  }

  if (pendings.length > 0) {
    console.log("\n=== Tareas Pendientes ===");
    pendings.forEach((entry, i) => {
      const name = entry.overrides?.name ?? entry.prototype?.name ?? "Sin nombre";
      const status = entry.status ?? "unknown";
      const line = `${i + 1}) Tarea: ${name} (Clave: ${entry.key}) - Estado: ${status}`;
      console.log(colorizeStatus(status, line));
    });
  }

  if (logs.length > 0) {
    printHistory(logs);
  }
}