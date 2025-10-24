import * as readline from "readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const MenuView = () => {
  console.log("\n--- Menú ---");
  console.log("1. Mostrar saludo");  
  console.log("0. Salir");
  rl.question("Seleccione una opción: ", manejarOpcion);
};

const manejarOpcion = (opcion: string) => {
  switch (opcion) {
    case "1":
        console.log(`\nHola mundo!`)
        MenuView();
        break;    
    case "0":
      console.log("Saliendo...");
      rl.close();
      break;
    default:
      console.log("Opción no válida. Intente de nuevo.");
      MenuView();
      break;
  }
};
console.log(`\n-------- Bienvenido al menú del sistema de Asistente Virtual --------\n`);
MenuView();