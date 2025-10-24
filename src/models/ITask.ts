export type TaskType = 'email' | 'calendar' | 'social'

export interface TaskPayload {
    title?: string;
    message?: string;
    recipient?: string;
    date?: string;
    [key: string]: any;
}

export interface Task {
    id: string;
    type: TaskType;
    payload: TaskPayload;
    priority?: number;
    createdAt: string;
    execute(): Promise<void>;
    toSerializable(): any;
}