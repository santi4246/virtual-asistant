import type { ITaskLogger, TaskLogEntry } from "../types/logger";

export class TaskLogger implements ITaskLogger {
  private static instance: TaskLogger | null = null;
  private entries: TaskLogEntry[] = [];

  private constructor() { }

  public static getInstance(): TaskLogger {
    if (!TaskLogger.instance) {
      TaskLogger.instance = new TaskLogger();
    }
    return TaskLogger.instance;
  }

  public log(entry: TaskLogEntry): void {   
    const index = this.entries.findIndex(log => log.taskId === entry.taskId);

    if (index !== -1) {      
      this.entries[index] = entry;
    } else {      
      this.entries.push(entry);
    }
  }

  public list(): TaskLogEntry[] {
    return [...this.entries];
  }

  public clear(): void {
    this.entries = [];
  }
}