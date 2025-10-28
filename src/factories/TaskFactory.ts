import { Task, TaskType, TaskPayload } from "../models/ITask";
import { EmailTask } from "../models/EmailTask";
import { CalendarTask } from "../models/CalendarTask";
import { SocialPostTask } from "../models/SocialPostTask";
import { CleanTask } from "../models/CleanTask";

export class TaskFactory {
  static create(type: TaskType, payload: TaskPayload, opts?: { priority?: number }): Task {
    switch (type) {
      case "email":
        return new EmailTask(payload, opts?.priority);
      case "calendar":
        return new CalendarTask(payload, opts?.priority);
      case "social":
        return new SocialPostTask(payload, opts?.priority);
      case "clean":
        return new CleanTask(payload, opts?.priority);
      default:
        throw new Error(`Unsupported task type: ${type}`);
    }
  }
}