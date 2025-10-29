// src/cli/Scheduler.ts
import { DbConnection } from "../db/DbConnection";
import { safeLog } from "../cli/logger";

/**
 * Reprograma todas las tareas con result.status === "scheduled"
 * Si la fecha programada ya pasó y la tarea no está completada, se ejecuta inmediatamente.
 */
export async function recoverScheduledTasks(): Promise<void> {
  // imports "lazy" para evitar import circular
  const { TaskFactory } = await import("../factories/TaskFactory");
  const { ScheduledStrategy } = await import("../strategies/ScheduledStrategy");

  const db = await DbConnection.getInstance();
  const records = await db.getAll();

  // Filtrar tareas scheduled que no estén completadas
  const scheduled = records.filter(
    (r) =>
      r.result?.status === "scheduled"
  );

  for (const record of scheduled) {
    try {
      const scheduledFor = record.result?.scheduledFor;
      if (!scheduledFor || isNaN(new Date(scheduledFor).getTime())) {
        safeLog(`[Scheduler] Fecha inválida para tarea ${record.id}. Ignorando.`);
        continue;
      }

      const targetDate = new Date(scheduledFor);
      const task = TaskFactory.create(record.type as any, record.payload, {
        priority: record.payload?.priority, id: record.id
      });
      const strategy = new ScheduledStrategy(targetDate);

      if (targetDate <= new Date()) {
        safeLog(`[Scheduler] Fecha pasada para tarea ${record.id}. Ejecutando inmediatamente.`);
        await task.execute();
        safeLog(`[Scheduler] Tarea ${record.id} ejecutada.`);

        // Actualizar estado a success/completed en DB
        await db.updateById(record.id, {
          result: {
            status: "completada",
            completedAt: new Date().toISOString(),
          },
        });
      } else {
        safeLog(`[Scheduler] Reprogramando tarea ${record.id} para ${targetDate.toISOString()}`);
        await strategy.schedule(task);
      }
    } catch (err) {
      safeLog(`[Scheduler] Error al reprogramar tarea scheduled ${record.id}:`, err);
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

  const db = await DbConnection.getInstance();
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
        safeLog(
          `[Scheduler] Condición personalizada no serializable para tarea ${record.id}. Usando "day" por defecto.`
        );
        conditionSpec = "day";
      }

      let condition: "day" | "night" | (() => boolean) = "day"; // valor por defecto

      if (conditionSpec === "day" || conditionSpec === "night") {
        condition = conditionSpec;
      } else {
        // Si no hay condición válida, usamos "day" por defecto
        safeLog(
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

      safeLog(`[Scheduler] Reprogramando (waiting) tarea ${record.id} con condición=${conditionSpec}`);
      await strategy.schedule(task);
    } catch (err) {
      safeLog(`[Scheduler] Error al reprogramar tarea waiting ${record.id}:`, err);
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