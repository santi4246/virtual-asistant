import "dotenv/config";
import { startCli } from "./cli/cli";
import { bootstrapFacade } from "./app/bootstrap";

async function main() {
  const { facade } = bootstrapFacade();
  await startCli(facade);
}

main().catch((err) => {
  console.error("Error en la aplicación:", err);
  process.exit(1);
});