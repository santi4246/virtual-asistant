import type { ITaskLogger, TaskLogEntry } from "../types/logger";
import { StrategyType } from "../types/strategy";
import { TaskType } from "../types/tasks";

export class TaskLogger implements ITaskLogger {
  private static instance: TaskLogger | null = null;
  private lastByTaskWithTime = new Map<string, { entry: TaskLogEntry, ts: number }>();
  private DEDUP_WINDOW_MS = 500;
  private entries: TaskLogEntry[] = [];

  private constructor() { }

  public static getInstance(): TaskLogger {
    if (!TaskLogger.instance) {
      TaskLogger.instance = new TaskLogger();
    }
    return TaskLogger.instance;
  }

  public addAuditEntry(params: {
    taskId?: string;
    taskName?: string;
    type: TaskType;
    strategy?: StrategyType;
    message: string;
  }) {
    const entry: TaskLogEntry = {
      timestampISO: new Date().toISOString(),
      taskId: params.taskId ?? "system",
      taskName: params.taskName ?? "System Audit",
      type: params.type,
      strategy: params.strategy ?? "immediate",
      status: "completed",
      message: params.message,
      isAudit: true,
    };
    this.entries.push(entry);
  }

  public log(entry: TaskLogEntry): void {
    const now = Date.now();
    const prev = this.lastByTaskWithTime.get(entry.taskId);
    const isDuplicate =
      prev &&
      now - prev.ts <= this.DEDUP_WINDOW_MS &&
      prev.entry.status === entry.status &&
      prev.entry.message === entry.message &&
      prev.entry.type === entry.type &&
      (prev.entry.strategy ?? "immediate") === (entry.strategy ?? "immediate");

    if (isDuplicate) {
      return;
    }

    this.entries.push(entry);
    this.lastByTaskWithTime.set(entry.taskId, { entry, ts: now });
  }

  public list(): TaskLogEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries = [];
  }

  public replace(entries: TaskLogEntry[]): void {
    this.entries = entries;
  }

  public purgeBefore(
    cutoffISO: string,
    options?: { keepFinals?: boolean; scope?: TaskType }
  ) {
    const keepFinals = options?.keepFinals ?? false;
    const scope = options?.scope;
    const cutoff = new Date(cutoffISO).getTime();
    console.log("\n\n[purge] cutoff", cutoffISO, "keepFinals", keepFinals, "scope", scope ?? "global");
    this.entries = this.entries.filter((e) => {
      // Si hay scope y la entrada NO pertenece al scope, no aplicar purga sobre ella → conservar
      if (scope && e.type !== scope) return true;

      const t = new Date(e.timestampISO).getTime();
      if (Number.isNaN(t)) return true;

      if (t >= cutoff) return true;

      if (keepFinals) {
        return e.status === "completed" || e.status === "failed" || e.status === "canceled";
      }
      return false;
    });
    for (const e of this.entries) {
      console.log("[purge:entry]", e.type, e.status, e.timestampISO);
    }
  }

  public getHistory(): TaskLogEntry[] {
    return [...this.entries];
  }
}