import type { StrategyType } from "./strategy";
import type { TaskType, TaskStatus } from "./tasks";

export interface TaskLogEntry {
  timestampISO: string;
  taskId: string;
  taskName: string;
  type: TaskType;
  strategy: StrategyType;
  status: TaskStatus;
  message: string;
  isAudit?: boolean;
}

export interface ITaskLogger {
  log(entry: TaskLogEntry): void;
  list(): TaskLogEntry[];
  clear(): void;  
  replace(entries: TaskLogEntry[]): void;
  purgeBefore(cutoffISO: string, options?: { keepFinals?: boolean }): void
  addAuditEntry(params: { taskId?: string; taskName?: string; type: TaskType; strategy?: StrategyType; message: string; }): void;
}