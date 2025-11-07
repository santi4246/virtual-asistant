import type { ITaskPrototype, TaskPayload, TaskResult, TaskType } from "./tasks";
import type { ExecutionStrategyConfig, StrategyType } from "./strategy";
import type { TaskLogEntry } from "./logger";

export type TaskSource =
    | {
        kind: "builder";
        data: { name: string; type: TaskType; payload: TaskPayload; strategy: ExecutionStrategyConfig };
    }
    | {
        kind: "prototype";
        data: { key: string; overrides?: Partial<{ name: string; payload: TaskPayload; strategy: ExecutionStrategyConfig }> };
    };

export type TaskRequest = {
  source:
    | { kind: "prototype"; data: { key: string; overrides?: any } }
    | { kind: "builder"; data: { name: string; type: TaskType; payload: TaskPayload; strategy?: ExecutionStrategyConfig } };
  executeNow?: boolean;
  pendingRef?: { key: string; overrides?: any };
};

export interface TaskResponse {
    ok: boolean;
    taskId?: string;
    taskName?: string;
    strategy?: StrategyType;
    result?: TaskResult;
    error?: string;
    logs?: TaskLogEntry[];
    status: string;
}

export interface ITaskRunnerFacade {
    run(request: TaskRequest): Promise<TaskResponse>;
    listTemplates(): { key: string; name: string }[];
    getHistory(): TaskLogEntry[];
    clearHistory(): void;
    registerTask(request: TaskRequest): void;
    getPendingTasks(): { key: string; overrides?: any; prototype: ITaskPrototype | null; status: string; }[];
    removePendingTask(key: string, overrides?: any): void;
    clearCompletedTasksAndLogs(): void;
    shutdown(): Promise<void>;
}