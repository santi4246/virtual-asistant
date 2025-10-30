// src/cli/cli.ts
import readline from "readline";
import type { ITaskRunnerFacade } from "../core/types/facade";
import { askScheduledDate, createTaskInteractive, createCleanTaskInteractive } from "./taskActions";
import { logger } from "./logger";
import { ExecutionStrategyConfig } from "../core/types/strategy";

export async function startCli(facade: ITaskRunnerFacade) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Promisify question
  const question = (query: string): Promise<string> =>
    new Promise((resolve) => rl.question(query, resolve));

  async function showMenu(): Promise<void> {
    logger.log("\n=== Menú Principal ===");
    logger.log("1) Crear nueva tarea");
    logger.log("2) Clonar plantilla y personalizar");
    logger.log("3) Ejecutar tarea (no implementado - opcional)");
    logger.log("4) Ver historial de tareas");
    logger.log("0) Salir");
  }

  async function handleCreateNewTask() {
    try {
      const taskRequest = await createTaskInteractive(rl);
      if (!taskRequest) {
        logger.log("Creación de tarea cancelada.");
        return;
      }
      const response = await facade.run(taskRequest);
      if (response.ok) {
        const actionMsg = response.strategy === "immediate"
          ? "creada y ejecutada"
          : "creada y programada";
        logger.log(`\nTarea ${actionMsg}: ${response.taskName} (ID: ${response.taskId})`);
      } else {
        logger.error(`\nError al ejecutar tarea: ${response.error}`);
      }
    } catch (err) {
      logger.error(`\nError inesperado: ${(err as Error).message}`);
    }
  }

  async function handleCloneTemplate() {
    try {
      const templates = facade.listTemplates();
      if (templates.length === 0) {
        logger.log("\nNo hay plantillas registradas.");
        return;
      }
      logger.log("Plantillas disponibles:");
      templates.forEach((t, i) => logger.log(`${i + 1}) ${t.name} (clave: ${t.key})`));
      const answer = await question("Seleccione plantilla por número (0 para cancelar): ");
      const index = Number(answer) - 1;
      if (index < 0 || index >= templates.length) {
        logger.log("Operación cancelada o selección inválida.");
        return;
      }
      const selected = templates[index];

      // Pedir overrides básicos
      const newName = await question("Nuevo nombre para la tarea (enter para mantener): ");
      let strategyConfig: ExecutionStrategyConfig = { type: "immediate" as const };
      const useScheduled = await question("¿Programar tarea? (s/n): ");
      if (useScheduled.toLowerCase() === "s") {
        const dateISO = await askScheduledDate(rl);
        if (dateISO) {
          strategyConfig = { type: "scheduled", targetDateISO: dateISO };
        }
      }

      const request = {
        source: {
          kind: "prototype" as const,
          data: {
            key: selected.key,
            overrides: {
              name: newName.trim() || undefined,
              strategy: strategyConfig,
            },
          },
        },
        executeNow: true,
      };

      const response = await facade.run(request);
      if (response.ok) {
        logger.log(`Tarea clonada y ejecutada: ${response.taskName} (ID: ${response.taskId})`);
      } else {
        logger.error(`Error al ejecutar tarea: ${response.error}`);
      }
    } catch (err) {
      logger.error(`Error inesperado: ${(err as Error).message}`);
    }
  }

  async function handleViewHistory() {
    const logs = facade.getHistory();
    if (logs.length === 0) {
      logger.log("\nNo hay historial de tareas.");
      return;
    }
    logger.log("\n=== Historial de tareas ===");
    logs.forEach((entry, i) => {
      logger.log(
        `${i + 1}) [${entry.timestampISO}] Tarea: ${entry.taskName} (ID: ${entry.taskId}) - Estrategia: ${entry.strategy} - Estado: ${entry.status} - Mensaje: ${entry.message}`
      );
    });
  }

  async function mainLoop() {
    while (true) {
      await showMenu();
      const answer = await question("Seleccione una opción: ");
      switch (answer.trim()) {
        case "1":
          await handleCreateNewTask();
          break;
        case "2":
          await handleCloneTemplate();
          break;
        case "3":
          logger.log("Opción 3 no implementada.");
          break;
        case "4":
          await handleViewHistory();
          break;
        case "0":
          logger.log("Saliendo...");
          rl.close();
          return;
        default:
          logger.log("Opción inválida, intente de nuevo.");
      }
    }
  }

  await mainLoop();
}