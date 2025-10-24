import type { Task } from "../models/ITask";

export interface ExecutionContext {
    now?: Date;
    condition?: any;
}

export interface IExecutionStrategy {
    schedule(task: Task): Promise<void>;
    cancel?(): void;
}