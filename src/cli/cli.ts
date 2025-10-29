// src/cli/cli.ts
import * as readline from "readline";
import { initLogger } from "./logger";
import { DbConnection } from "../db/DbConnection";
import { SchedulerService } from "../services/SchedulerService";
import { createTaskInteractive, createCleanTaskInteractive, createInteractiveBackup } from "./taskActions";

export let showMainMenu: (() => Promise<void>) | null = null;

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

initLogger(rl);

let isClosed = false;
let isAsking = false; // true cuando questionFn está esperando respuesta

rl.on("close", () => {
  isClosed = true;
});

/**
 * Función question que se pasa a los helpers.
 * Marca isAsking para que safeLog sepa si debe reimprimir prompt o no.
 */
export const questionFn = (q: string): Promise<string> =>
  new Promise((resolve, reject) => {
    if (isClosed) {
      reject(new Error("readline was closed"));
      return;
    }
    isAsking = true;
    rl.question(q, (ans) => {
      isAsking = false;
      resolve(ans.trim());
    });
  });

/**
 * safeLog: imprime de forma "segura" cuando tenemos un prompt activo.
 * Limpia la línea actual, imprime y vuelve a llamar rl.prompt() si no hay una pregunta en curso.
 */
export function safeLog(...args: any[]) {
  // Si cerraron el readline, hace un console.log normal
  if (isClosed) {
    console.log(...args);
    return;
  }

  try {
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  } catch {
    // ignore, seguir con console.log
  }

  console.log(...args);

  // Si no hay una question() en curso, reimprimimos prompt
  if (!isAsking) {
    // reimprimimos el prompt asíncronamente para no interferir
    setImmediate(() => {
      if (!isClosed) rl.prompt();
    });
  }
}

/**
 * Renderiza el menú y pone el prompt.
 */
function renderMenu() {
  if (isClosed) return;

  console.log("\n--- Menú ---");
  console.log("1. Crear tarea interactiva");
  console.log("2. Listar tareas persistidas");
  console.log("3. Listar tareas activas en memoria");
  console.log("4. Cancelar tarea por id");
  console.log("5. Limpiar DB");
  console.log("6. Programar Backup DB");
  console.log("0. Salir");
  
  rl.setPrompt("Seleccione una opción: ");
  rl.prompt();
}

// Exponer showMainMenu para que los módulos externos (taskActions) lo invoquen
showMainMenu = async () => {
  renderMenu();
};

/**
 * Start CLI: usa rl.on('line') para procesar opciones.
 */
export async function startCli(): Promise<void> {
  const db = await DbConnection.getInstance();
  const scheduler = SchedulerService.getInstance();

  // Handler de línea
  rl.on("line", async (input) => {
    const opt = input.trim();

    try {
      switch (opt) {
        case "1": {
          // Crear tarea interactiva (pasa questionFn, comprobador de estado y showMainMenu)
          await createTaskInteractive(questionFn, () => isClosed, showMainMenu);
          break;
        }

        case "2": {
          const all = await db.getAll();
          safeLog("Tareas persistidas:", JSON.stringify(all, null, 2));
          break;
        }

        case "3": {
          const active = scheduler.list();
          safeLog("Tareas activas en memoria:", active);
          break;
        }

        case "4": {          
          try {
            const id = await questionFn("ID de la tarea a cancelar: ");
            if (isClosed) break;
            const ok = await scheduler.cancel(id);
            safeLog(ok ? "Cancelada OK" : "No encontrada o no pudo cancelarse");
          } catch (err) {
            safeLog("Error leyendo ID:", err);
          }
          break;
        }

        case "5": {          
          await createCleanTaskInteractive(questionFn, () => isClosed, showMainMenu);
          break;
        }

        case "6":
          await createInteractiveBackup(questionFn, () => isClosed, showMainMenu);
          break;

        case "0": {
          safeLog("Saliendo...");
          isClosed = true;
          rl.close();
          return;
        }

        default:
          safeLog("Opción no válida.");
      }
    } catch (err) {
      safeLog("Error procesando opción:", err instanceof Error ? err.message : err);
    } finally {
      // Si sigue abierto, reimprimir el menú (renderMenu llama rl.prompt())
      if (!isClosed) {
        // renderMenu();
      }
    }
  });

  // Mostrar menú inicial
  renderMenu();
}