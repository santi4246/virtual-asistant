import { Task, TaskType, TaskPayload } from "../models/ITask";
import { EmailTask } from "../models/EmailTask";
import { CalendarTask } from "../models/CalendarTask";
import { SocialPostTask } from "../models/SocialPostTask";
import { CleanTask } from "../models/CleanTask";
import { BackupTask } from "../models/BackupTask";

export class TaskFactory {
  static create(type: TaskType, payload: TaskPayload, opts?: { priority?: number, id?: string }): Task {
    switch (type) {
      case "email":
        return new EmailTask(payload, opts?.priority, opts?.id);
      case "calendar":
        return new CalendarTask(payload, opts?.priority, opts?.id);
      case "social":
        return new SocialPostTask(payload, opts?.priority, opts?.id);
      case "clean":
        return new CleanTask(payload, opts?.priority, opts?.id);
      case "backup":
        return new BackupTask(payload, opts?.priority, opts?.id);
      default:
        throw new Error(`Unsupported task type: ${type}`);
    }
  }
}