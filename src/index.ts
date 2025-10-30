import "dotenv/config";
import { startCli } from "./cli/cli";
import { bootstrapFacade } from "./app/bootstrap";
import { TaskLogger } from "./core/logger/TaskLogger";

async function main() {
  console.log("\n-------- Bienvenido al sistema --------\n");
  console.log("Nota: la condición 'noche' comienza a las 20:00 y 'día' es 06:00-20:00.\n");  
  
  TaskLogger.getInstance();
  
  // 2) Iniciar CLI
  const { facade } = bootstrapFacade();
  await startCli(facade);
}

main().catch((err) => {
  console.error("Error en la aplicación:", err);
  process.exit(1);
});