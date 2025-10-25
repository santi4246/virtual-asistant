// src/cli/cli.ts (versión corregida)
import * as readline from "readline";
import { DbConnection } from "../db/DbConnection";
import { SchedulerService } from "../services/SchedulerService";
import { TaskBuilder } from "../builders/TaskBuilder";

// Exportamos una referencia al menú para usarla desde otras partes
export let showMainMenu: (() => Promise<void>) | null = null;
let isReadlineClosed = false;

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

// Escuchar cuando se cierra readline
rl.on('close', () => {
  isReadlineClosed = true;
});

const question = (q: string): Promise<string> =>
  new Promise((res, rej) => {
    // Verificar si readline está cerrado antes de hacer la pregunta
    if (isReadlineClosed) {
      rej(new Error('readline was closed'));
      return;
    }
    rl.question(q, (ans) => res(ans.trim()));
  });

export async function startCli(): Promise<void> {
  const db = DbConnection.getInstance();
  const scheduler = SchedulerService.getInstance();

  // Definimos la función del menú
  const menu = async () => {
    // Verificar si readline está cerrado antes de mostrar el menú
    if (isReadlineClosed) {
      return;
    }

    console.log("\n--- Menú ---");
    console.log("1. Crear tarea interactiva");
    console.log("2. Listar tareas persistidas");
    console.log("3. Listar tareas activas en memoria");
    console.log("4. Cancelar tarea por id");
    console.log("5. Limpiar DB");
    console.log("0. Salir");

    try {
      const opt = await question("Seleccione una opción: ");

      if (isReadlineClosed) {
        return;
      }

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
          // Verificar nuevamente después de obtener la respuesta
          if (isReadlineClosed) {
            return;
          }
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
          isReadlineClosed = true;
          rl.close();
          return;

        default:
          console.log("Opción no válida.");
      }

      await menu();
    } catch (error) {      
      if (error instanceof Error && error.message === 'readline was closed') {
        return;
      }
      console.error("Error en el menú:", error);
    }
  };

  // Guardamos la referencia al menú
  showMainMenu = async () => {
    // Verificar si readline está cerrado antes de mostrar el menú
    if (isReadlineClosed) {
      return;
    }
    await menu();
  };
  
  // Iniciar el menú principal
  await menu();
}

async function createTaskInteractive(): Promise<void> {
  try {
    // Verificar si readline está cerrado
    if (isReadlineClosed) {
      return;
    }

    console.log("\n--- Crear Tarea ---");
    
    // Seleccionar tipo de tarea
    const type = await question("Tipo de tarea (email/calendar/social): ");
    // Verificar nuevamente después de obtener la respuesta
    if (isReadlineClosed) {
      return;
    }
    
    if (!["email", "calendar", "social"].includes(type)) {
      console.log("Tipo no válido. Use: email, calendar, o social");
      if (showMainMenu && !isReadlineClosed) await showMainMenu();
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
    
    // Verificar nuevamente después de obtener las respuestas
    if (isReadlineClosed) {
      return;
    }

    // Seleccionar estrategia
    const strategyType = await question("Estrategia (immediate/scheduled/conditional): ");
    // Verificar nuevamente después de obtener la respuesta
    if (isReadlineClosed) {
      return;
    }
    
    if (!["immediate", "scheduled", "conditional"].includes(strategyType)) {
      console.log("Estrategia no válida. Use: immediate, scheduled, o conditional");
      if (showMainMenu && !isReadlineClosed) await showMainMenu();
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
        // Verificar nuevamente después de obtener la respuesta
        if (isReadlineClosed) {
          return;
        }
        
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) {
          console.log("Fecha inválida");
          if (showMainMenu && !isReadlineClosed) await showMainMenu();
          return;
        }
        builder.setStrategy("scheduled").setScheduledDate(date);
        break;
      }
      
      case "conditional": {
        const condition = await question("Condición (day/night): ");
        // Verificar nuevamente después de obtener la respuesta
        if (isReadlineClosed) {
          return;
        }
        
        if (condition !== "day" && condition !== "night") {
          console.log("Condición no válida. Use: day o night");
          if (showMainMenu && !isReadlineClosed) await showMainMenu();
          return;
        }
        builder.setStrategy("conditional").setCondition(condition);
        
        // Opciones adicionales para conditional
        const intervalStr = await question("Intervalo de verificación (ms) [5000]: ");
        // Verificar nuevamente después de obtener la respuesta
        if (isReadlineClosed) {
          return;
        }
        
        const interval = parseInt(intervalStr) || 5000;
        builder.setInterval(interval);
        
        const maxAttemptsStr = await question("Máximo de intentos [10]: ");
        // Verificar nuevamente después de obtener la respuesta
        if (isReadlineClosed) {
          return;
        }
        
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
    // Verificar nuevamente después de obtener la respuesta
    if (isReadlineClosed) {
      return;
    }
    
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
    // Si es un error de readline cerrado, simplemente retornamos silenciosamente
    if (error instanceof Error && error.message === 'readline was closed') {
      return;
    }
    console.error("❌ Error creando tarea:", error);
  }
  
  // Volver al menú principal solo si readline no está cerrado
  if (showMainMenu && !isReadlineClosed) {
    await showMainMenu();
  }
}