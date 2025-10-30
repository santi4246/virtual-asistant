// src/cli/logger.ts
import * as readline from "readline";

let rlRef: readline.Interface | null = null;

/**
 * Inicializa el logger con la referencia a readline.
 * Llamar desde cli.ts justo después de crear rl.
 */
export function initLogger(rl: readline.Interface) {
  rlRef = rl;
}

/**
 * Imprime de forma "segura" mientras hay un prompt activo.
 * Limpia la línea actual, imprime el mensaje y vuelve a mostrar el prompt.
 */
export function safeLog(...args: any[]) {
  // Si no tenemos rl, fallback a console.log normal
  if (!rlRef) {
    console.log(...args);
    return;
  }  

  try {
    // limpiar la línea actual y mover cursor al inicio
    readline.clearLine(process.stdout, 0);
    readline.cursorTo(process.stdout, 0);
  } catch {
    // ignore; seguimos con console.log
  }

  // Imprimir el mensaje (puede ser multiline)
  console.log(...args);

  // rl.prompt() // reimprime sólo el prompt; el menú completo lo imprime el loop principal cuando corresponda
}

export const logger = {
  log: safeLog,
  error: (...args: any[]) => console.error(...args),
  // otros métodos si querés
};