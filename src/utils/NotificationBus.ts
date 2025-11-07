import { EventEmitter } from "events";
import type { TaskResult } from "../core/types/tasks";

class NotificationBus extends EventEmitter {}
export const notificationBus = new NotificationBus();

export type TaskResultEvent = {
  taskId: string;
  taskName: string;
  result: TaskResult;
};