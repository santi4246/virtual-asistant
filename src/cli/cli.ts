import readline from "readline";
import type { ITaskRunnerFacade } from "../core/types/facade";
import { logger, initLogger } from "./logger";
import * as taskActions from "./taskActions";
import { askQuestion } from "./taskHelpers";
import { wireNotifications } from "../utils/WireNotifications";

type UILogger = {
  log: (...args: any[]) => void;
  error: (...args: any[]) => void;
};

function renderHeader() {
  console.log("-------- Bienvenido al sistema --------\n");
  console.log("Nota: la condición 'noche' comienza a las 20:00 y 'día' es de 06:00-20:00.\n");
}

function renderMenu() {
  console.log("=== Menú Principal ===");
  console.log("1) Crear nueva tarea");
  console.log("2) Clonar plantilla y personalizar");
  console.log("3) Ejecutar tarea");
  console.log("4) Ver historial de tareas");
  console.log("0) Salir");
}

function clearAndShowMenu(rl?: readline.Interface) {
  if (rl) rl.pause();
  console.clear();
  renderHeader();
  renderMenu();
  if (rl) rl.resume();
}

export async function startCli(
  facade: ITaskRunnerFacade,
  appLogger: UILogger = logger
) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Integrar logger seguro con readline
  initLogger(rl);
  wireNotifications(rl);

  // Primer pintado de menú
  clearAndShowMenu(rl);

  // Loop principal
  let exit = false;
  while (!exit) {
    const answer = await askQuestion(rl, "Seleccione una opción: ");
    switch (answer.trim()) {
      case "1": {
        console.clear();
        renderHeader();
        await taskActions.handleCreateNewTask(rl, facade, appLogger);
        clearAndShowMenu(rl);
        break;
      }
      case "2": {
        console.clear();
        renderHeader();
        await taskActions.handleCloneTemplate(rl, facade, appLogger, askQuestion);
        clearAndShowMenu(rl);
        break;
      }
      case "3": {
        console.clear();
        renderHeader();
        await taskActions.handleExecutePendingTask(rl, facade, appLogger, askQuestion);
        clearAndShowMenu(rl);
        break;
      }
      case "4": {
        console.clear();
        renderHeader();

        await taskActions.handleViewHistory(facade);

        rl.pause();
        process.stdout.write("\nPresione cualquier tecla para volver al menú…");
        await taskActions.waitForKeypress();
        const output = (rl as any).output ?? process.stdout;
        readline.clearLine(output, 0);
        readline.cursorTo(output, 0);
        rl.resume();

        clearAndShowMenu(rl);
        break;
      }
      case "0":
        console.log("Saliendo...");
        try { await facade.shutdown?.(); } catch { }
        rl.close();
        exit = true;
        break;
      default: {
        appLogger.log("Opción inválida, intente de nuevo.");        
        clearAndShowMenu(rl);
        break;
      }
    }
  }
  setImmediate(() => {    
    if (!process.env.NO_FORCE_EXIT) process.exit(0);
  });
}