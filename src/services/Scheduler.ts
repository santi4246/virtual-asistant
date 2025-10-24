// src/cli/Scheduler.ts
import { DbConnection } from "../db/DbConnection";

/**
 * Reprograma todas las tareas con result.status === "scheduled"
 */
export async function recoverScheduledTasks(): Promise<void> {
  // imports "lazy" para evitar import circular
  const { TaskFactory } = await import("../factories/TaskFactory");
  const { ScheduledStrategy } = await import("../strategies/ScheduledStrategy");

  const db = DbConnection.getInstance();
  const records = await db.getAll();

  const scheduled = records.filter(
    (r) => r.result?.status === "scheduled" && new Date(r.result.scheduledFor) > new Date()
  );

  for (const record of scheduled) {
    try {
      const scheduledFor = record.result?.scheduledFor;
      if (!scheduledFor || isNaN(new Date(scheduledFor).getTime())) {
        console.warn(`[Scheduler] Fecha inválida para tarea ${record.id}. Ignorando.`);
        continue;
      }

      const targetDate = new Date(scheduledFor);
      const task = TaskFactory.create(record.type as any, record.payload, {
        priority: record.payload?.priority,
      });
      const strategy = new ScheduledStrategy(targetDate);

      console.log(`[Scheduler] Reprogramando (scheduled) tarea ${record.id} para ${targetDate.toISOString()}`);
      await strategy.schedule(task);
    } catch (err) {
      console.error(`[Scheduler] Error al reprogramar tarea scheduled ${record.id}:`, err);
    }
  }
}

/**
 * Reprograma todas las tareas con result.status === "waiting"
 * (estas usan ConditionalStrategy)
 */
export async function recoverConditionalTasks(): Promise<void> {
  // imports "lazy"
  const { TaskFactory } = await import("../factories/TaskFactory");
  const { ConditionalStrategy } = await import("../strategies/ConditionalStrategy");

  const db = DbConnection.getInstance();
  const records = await db.getAll();

  const waiting = records.filter((r) => r.result?.status === "waiting");

  for (const record of waiting) {
    try {
      const storedCondition = record.result?.condition;
      const intervalMs = (record.result?.intervalMs as number) ?? undefined;
      const maxAttempts = (record.result?.maxAttempts as number) ?? undefined;

      let conditionSpec: "day" | "night" | undefined;
      if (storedCondition === "day" || storedCondition === "night") {
        conditionSpec = storedCondition;
      } else {
        console.warn(
          `[Scheduler] Condición personalizada no serializable para tarea ${record.id}. Usando "day" por defecto.`
        );
        conditionSpec = "day";
      }

      let condition: "day" | "night" | (() => boolean) = "day"; // valor por defecto

      if (conditionSpec === "day" || conditionSpec === "night") {
        condition = conditionSpec;
      } else {
        // Si no hay condición válida, usamos "day" por defecto
        console.warn(
          `[Scheduler] Condición inválida para tarea ${record.id}. Usando "day" por defecto.`
        );
      }

      const strategy = new ConditionalStrategy({
        condition,
        intervalMs,
        maxAttempts,
      });

      const task = TaskFactory.create(record.type as any, record.payload, {
        priority: record.payload?.priority,
      });

      console.log(`[Scheduler] Reprogramando (waiting) tarea ${record.id} con condición=${conditionSpec}`);
      await strategy.schedule(task);
    } catch (err) {
      console.error(`[Scheduler] Error al reprogramar tarea waiting ${record.id}:`, err);
    }
  }
}

/**
 * Orquestador: reprograma tanto scheduled como waiting
 */
export async function recoverAllScheduledTasks(): Promise<void> {
  await recoverScheduledTasks();
  await recoverConditionalTasks();
}