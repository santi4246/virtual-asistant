import type { TaskPayload, TaskResult, TaskType } from "./tasks";
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

export interface TaskRequest {
    source: TaskSource;
    executeNow?: boolean;
}

export interface TaskResponse {
    ok: boolean;
    taskId?: string;
    taskName?: string;
    strategy?: StrategyType;
    result?: TaskResult;
    error?: string;
    logs?: TaskLogEntry[];
}

export interface ITaskRunnerFacade {
    run(request: TaskRequest): Promise<TaskResponse>;

    listTemplates(): { key: string; name: string }[];
    getHistory(): TaskLogEntry[];
    clearHistory(): void;
}