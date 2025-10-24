// src/cli/cli.ts
import * as readline from "readline";
import { DbConnection } from "../db/DbConnection";
import { SchedulerService } from "../services/SchedulerService";
import { TaskBuilder } from "../builders/TaskBuilder";

// Exportamos una referencia al menú para usarla desde otras partes
export let showMainMenu: (() => Promise<void>) | null = null;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (q: string): Promise<string> =>
  new Promise((res) => rl.question(q, (ans) => res(ans.trim())));

export async function startCli(): Promise<void> {
  const db = DbConnection.getInstance();
  const scheduler = SchedulerService.getInstance();

  // Definimos la función del menú
  const menu = async () => {
    console.log("\n--- Menú ---");
    console.log("1. Crear tarea interactiva");
    console.log("2. Listar tareas persistidas");
    console.log("3. Listar tareas activas en memoria");
    console.log("4. Cancelar tarea por id");
    console.log("5. Limpiar DB");
    console.log("0. Salir");

    const opt = await question("Seleccione una opción: ");

    switch (opt) {
      case "1": {
        await createTaskInteractive();
        break;
      }

      case "2": {
        const all = await db.getAll();
        console.log("Tareas persistidas:", JSON.stringify(all, null, 2));
        break;
      }

      case "3": {
        const active = scheduler.list();
        console.log("Tareas activas en memoria:", active);
        break;
      }

      case "4": {
        const id = await question("ID de la tarea a cancelar: ");
        const ok = await scheduler.cancel(id);
        console.log(ok ? "Cancelada OK" : "No encontrada o no pudo cancelarse");
        break;
      }

      case "5": {
        await db.clear();
        console.log("DB limpiada.");
        break;
      }

      case "0":
        console.log("Saliendo...");
        rl.close();
        return;

      default:
        console.log("Opción no válida.");
    }    
    await menu();
  };

  // Guardamos la referencia al menú
  showMainMenu = menu;
  
  // Iniciar el menú principal
  await menu();
}

async function createTaskInteractive(): Promise<void> {
  try {
    console.log("\n--- Crear Tarea ---");
    
    // Seleccionar tipo de tarea
    const type = await question("Tipo de tarea (email/calendar/social): ");
    if (!["email", "calendar", "social"].includes(type)) {
      console.log("Tipo no válido. Use: email, calendar, o social");
      if (showMainMenu) await showMainMenu();
      return;
    }

    // Configurar payload según el tipo
    let payload: any = {};
    switch (type) {
      case "email":
        payload = {
          recipient: await question("Destinatario: "),
          subject: await question("Asunto: "),
          message: await question("Mensaje: ")
        };
        break;
      case "calendar":
        payload = {
          title: await question("Título del evento: "),
          date: await question("Fecha (YYYY-MM-DD): "),
          description: await question("Descripción: ")
        };
        break;
      case "social":
        payload = {
          platform: await question("Plataforma (twitter/facebook/linkedin): "),
          content: await question("Contenido del post: ")
        };
        break;
    }

    // Seleccionar estrategia
    const strategyType = await question("Estrategia (immediate/scheduled/conditional): ");
    if (!["immediate", "scheduled", "conditional"].includes(strategyType)) {
      console.log("Estrategia no válida. Use: immediate, scheduled, o conditional");
      if (showMainMenu) await showMainMenu();
      return;
    }

    // Crear builder
    const builder = new TaskBuilder()
      .setType(type as any)
      .setPayload(payload);

    // Configurar estrategia específica
    switch (strategyType) {
      case "scheduled": {
        const dateStr = await question("Fecha programada (YYYY-MM-DD HH:MM): ");
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.log("Fecha inválida");
          if (showMainMenu) await showMainMenu();
          return;
        }
        builder.setStrategy("scheduled").setScheduledDate(date);
        break;
      }
      
      case "conditional": {
        const condition = await question("Condición (day/night): ");
        if (condition !== "day" && condition !== "night") {
          console.log("Condición no válida. Use: day o night");
          if (showMainMenu) await showMainMenu();
          return;
        }
        builder.setStrategy("conditional").setCondition(condition);
        
        // Opciones adicionales para conditional
        const intervalStr = await question("Intervalo de verificación (ms) [5000]: ");
        const interval = parseInt(intervalStr) || 5000;
        builder.setInterval(interval);
        
        const maxAttemptsStr = await question("Máximo de intentos [10]: ");
        const maxAttempts = parseInt(maxAttemptsStr) || 10;
        builder.setMaxAttempts(maxAttempts);
        break;
      }
      
      case "immediate":
      default:
        builder.setStrategy("immediate");
        break;
    }

    // Configurar prioridad
    const priorityStr = await question("Prioridad [0]: ");
    const priority = parseInt(priorityStr) || 0;
    builder.setPriority(priority);

    // Construir y ejecutar
    const { task, strategy } = await builder.build();
    
    if (strategy) {
      await strategy.schedule(task);
      console.log(`✅ Tarea ${task.id} programada con éxito`);
      console.log(`[Sistema] Puedes continuar usando el menú principal mientras se ejecutan tareas en segundo plano.`);
    } else {
      await task.execute();
      console.log(`✅ Tarea ${task.id} ejecutada inmediatamente`);
    }
  } catch (error) {
    console.error("❌ Error creando tarea:", error);
  }
  
  // Volver al menú principal
  if (showMainMenu) {
    await showMainMenu();
  }
}