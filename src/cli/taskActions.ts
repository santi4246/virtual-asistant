import { TaskBuilder } from "../builders/TaskBuilder";
import { safeLog } from "../cli/logger";

type QuestionFn = (q: string) => Promise<string>;
type IsClosedFn = () => boolean;
type ShowMenuFn = (() => Promise<void>) | null;

async function askScheduledDate(question: QuestionFn, isReadlineClosed: IsClosedFn): Promise<Date | null> {
  while (true) {
    const dateStr = await question("Fecha programada (YYYY-MM-DD HH:MM): ");
    if (isReadlineClosed()) return null;

    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date;
    }

    console.log("Fecha inválida.");

    const retry = await question("¿Querés reingresar la fecha? (s/n): ");
    if (isReadlineClosed()) return null;

    if (retry.toLowerCase() !== "s") {
      return null;
    }
  }
}

/**
 * Crea una tarea interactiva (email/calendar/social).
 * Nota: no reimprime el menú al final — el caller (cli.ts) es el responsable de eso.
 */
export async function createTaskInteractive(
  question: QuestionFn,
  isReadlineClosed: IsClosedFn,
  showMainMenu: ShowMenuFn
): Promise<void> {
  try {
    if (isReadlineClosed()) return;

    safeLog("\n--- Crear Tarea ---");

    const type = await question("Tipo de tarea (email/calendar/social): ");
    if (isReadlineClosed()) return;

    if (!["email", "calendar", "social"].includes(type)) {
      safeLog("Tipo no válido. Use: email, calendar, o social");
      return;
    }

    let payload: any = {};
    switch (type) {
      case "email":
        payload = {
          recipient: await question("Destinatario: "),
          subject: await question("Asunto: "),
          message: await question("Mensaje: "),
        };
        break;

      case "calendar":
        payload = {
          title: await question("Título del evento: "),
          date: await question("Fecha (YYYY-MM-DD): "),
          description: await question("Descripción: "),
        };
        break;

      case "social": {
        const platform = await question("Plataforma (twitter/facebook/linkedin): ");
        const content = await question("Contenido del post: ");

        if (!content || content.trim().length === 0) {
          safeLog("❌ Error: El contenido del post no puede estar vacío");
          return;
        }

        payload = { platform, content };
        break;
      }
    }

    if (isReadlineClosed()) return;

    const strategyType = await question("Estrategia (immediate/scheduled/conditional): ");
    if (isReadlineClosed()) return;

    if (!["immediate", "scheduled", "conditional"].includes(strategyType)) {
      safeLog("Estrategia no válida. Use: immediate, scheduled, o conditional");
      return;
    }

    const builder = new TaskBuilder().setType(type as any).setPayload(payload);

    if (strategyType === "scheduled") {      
      if (isReadlineClosed()) return;

      const date = await askScheduledDate(question, isReadlineClosed);

      if (!date) {
        console.log("Creación de tarea cancelada por fecha inválida.");
        return;
      }

      builder.setStrategy("scheduled").setScheduledDate(date);
    } else if (strategyType === "conditional") {
      const condition = await question("Condición (day/night): ");
      if (isReadlineClosed()) return;

      if (condition !== "day" && condition !== "night") {
        safeLog("Condición no válida. Use: day o night");
        return;
      }
      builder.setStrategy("conditional").setCondition(condition);

      const intervalStr = await question("Intervalo de verificación (ms) [5000]: ");
      if (isReadlineClosed()) return;
      const interval = parseInt(intervalStr) || 5000;
      builder.setInterval(interval);

      const maxAttemptsStr = await question("Máximo de intentos [10]: ");
      if (isReadlineClosed()) return;
      const maxAttempts = parseInt(maxAttemptsStr) || 10;
      builder.setMaxAttempts(maxAttempts);
    } else {
      builder.setStrategy("immediate");
    }

    const priorityStr = await question("Prioridad [0]: ");
    if (isReadlineClosed()) return;
    const priority = parseInt(priorityStr) || 0;
    builder.setPriority(priority);

    const { task, strategy } = await builder.build();

    if (strategy) {
      await strategy.schedule(task);
      safeLog(`\n✅ Tarea ${task.id} programada con éxito`);
      safeLog(`[Sistema] Puedes continuar usando el menú principal mientras se ejecutan tareas en segundo plano.\n`);
    } else {
      await task.execute();
      safeLog(`✅ Tarea ${task.id} ejecutada inmediatamente\n`);
    }

    if (showMainMenu && !isReadlineClosed()) {
      await showMainMenu();
    }

  } catch (error) {
    safeLog(`❌ Error creando tarea: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Crea / programa la tarea de limpieza (clean).
 * Nota: no reimprime el menú al final — el caller (cli.ts) es el responsable de eso.
 */
export async function createCleanTaskInteractive(
  question: QuestionFn,
  isReadlineClosed: IsClosedFn,
  showMainMenu: ShowMenuFn
): Promise<void> {
  try {
    if (isReadlineClosed()) return;

    safeLog("\n--- Crear Tarea: Limpiar DB ---");

    const mode = await question("¿Limpiar ahora o programar? (now/scheduled/conditional): ");
    if (isReadlineClosed()) return;

    if (!["now", "scheduled", "conditional"].includes(mode)) {
      safeLog("Modo no válido. Use: now, scheduled o conditional");
      return;
    }

    const builder = new TaskBuilder().setType("clean").setPayload({});

    if (mode === "scheduled") {
      if (isReadlineClosed()) return;

      const date = await askScheduledDate(question, isReadlineClosed);

      if (!date) {
        console.log("Creación de tarea cancelada por fecha inválida.");
        return;
      }

      builder.setStrategy("scheduled").setScheduledDate(date);
    } else if (mode === "conditional") {
      const condition = await question("Condición (day/night): ");
      if (isReadlineClosed()) return;

      if (condition !== "day" && condition !== "night") {
        safeLog("Condición no válida. Use: day o night");
        return;
      }
      builder.setStrategy("conditional").setCondition(condition);

      const intervalStr = await question("Intervalo de verificación (ms) [5000]: ");
      if (isReadlineClosed()) return;
      const interval = parseInt(intervalStr) || 5000;
      builder.setInterval(interval);

      const maxAttemptsStr = await question("Máximo de intentos [10]: ");
      if (isReadlineClosed()) return;
      const maxAttempts = parseInt(maxAttemptsStr) || 10;
      builder.setMaxAttempts(maxAttempts);
    } else {
      builder.setStrategy("immediate");
    }

    const priorityStr = await question("Prioridad [0]: ");
    if (isReadlineClosed()) return;
    const priority = parseInt(priorityStr) || 0;
    builder.setPriority(priority);

    const { task, strategy } = await builder.build();

    if (strategy) {
      await strategy.schedule(task);
      safeLog(`\n✅ Tarea ${task.id} programada con éxito`);
      safeLog(`[Sistema] Puedes continuar usando el menú principal mientras se ejecutan tareas en segundo plano.\n`);
    } else {
      await task.execute();
      safeLog(`✅ Tarea ${task.id} ejecutada inmediatamente\n`);
    }

    if (showMainMenu && !isReadlineClosed()) {
      await showMainMenu();
    }

  } catch (error) {
    safeLog(`❌ Error creando tarea de limpieza: ${error instanceof Error ? error.message : String(error)}`);
  }
}