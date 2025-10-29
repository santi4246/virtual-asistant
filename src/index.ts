import "dotenv/config";
import { recoverAllScheduledTasks } from "./services/Scheduler";
import { startCli } from "./cli/cli";
import { DbConnection } from "./db/DbConnection";

async function main() {
  console.log("\n-------- Bienvenido al sistema --------\n");
  console.log("Nota: la condición 'noche' comienza a las 20:00 y 'día' es 06:00-20:00.\n");

  // 1) Configurar URI (usa getManager para acceder a settings)
  const manager = DbConnection.getManager();
  manager.setSetting("dbName", process.env.DB_NAME || "");
  manager.setSetting("collectionName", process.env.COLLECTION_NAME || "");
  manager.setSetting("dbPath", process.env.DB_PATH || "");
  manager.setSetting("mode", process.env.MODE || "");
  manager.setSetting("uri", process.env.DB_URI || "");
  
  // 2) Conectar DB (intenta nube, si falla usa JSON local)
  await DbConnection.getInstance(); // esto inicializa la DB

  // 3) Recuperar tareas programadas
  try {
    await recoverAllScheduledTasks();
    console.log("[Scheduler] Tareas programadas recuperadas.");
  } catch (err) {
    console.error("[Scheduler] Error al recuperar tareas:", err);
  }

  // 4) Iniciar CLI
  await startCli();
}

main().catch((err) => {
  console.error("Error en la aplicación:", err);
  process.exit(1);
});