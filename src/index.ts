// src/index.ts
import { recoverAllScheduledTasks } from "./services/Scheduler";
import { startCli } from "./cli/cli";

async function main() {
  console.log("\n-------- Bienvenido al sistema --------\n");
  console.log("Nota: la condición 'noche' comienza a las 20:00 y 'día' es 06:00-20:00.\n");

  try {
    await recoverAllScheduledTasks();
    console.log("[Scheduler] Tareas programadas recuperadas.");
  } catch (err) {
    console.error("[Scheduler] Error al recuperar tareas:", err);
  }

  await startCli();
}

main().catch((err) => {
  console.error("Error en la aplicación:", err);
  process.exit(1);
});