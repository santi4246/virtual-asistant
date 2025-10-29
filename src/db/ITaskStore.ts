import { TaskRecord } from "../models/ITask";

export interface ITaskStore {
  add(record: TaskRecord | Omit<TaskRecord, "id" | "executedAt">): Promise<string>;
  getAll(): Promise<TaskRecord[]>;
  findById(id: string): Promise<TaskRecord | undefined>;
  updateById(id: string, updates: Partial<TaskRecord>): Promise<void>;
  clear(): Promise<void>;
  backupAndClear(backupPath: string): Promise<void>;
}