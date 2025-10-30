import { ITask } from "../types/tasks";

export interface ExecutionContext {
    now?: Date;
    condition?: any;
}

export interface IExecutionStrategy {
    apply(task: ITask): Promise<any>;
    cancel?(task: ITask): Promise<void>;
}