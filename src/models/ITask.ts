export interface Task {
  id: string;
  type: TaskType;
  payload: TaskPayload;
  priority?: number;
  createdAt: string;
  execute(): Promise<void>;
}

export type TaskType = "email" | "calendar" | "social";

export interface TaskPayload {
  [key: string]: any;
}

export interface TaskResult {
  status: string;
  [key: string]: any;
}

export interface TaskRecord {
  id: string;
  type: TaskType | "unknown";
  payload: TaskPayload;
  executedAt: string;
  result?: TaskResult;
}