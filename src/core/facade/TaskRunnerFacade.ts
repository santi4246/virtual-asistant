import type { ITaskRunnerFacade, TaskRequest, TaskResponse } from "../types/facade";
import type { IPrototypeRegistry } from "../types/registry";
import type { ITaskLogger } from "../types/logger";
import type { ExecutionStrategyConfig, IExecutionStrategy, IStrategySelector } from "../types/strategy";
import type { ITask, ITaskPrototype, TaskResult, TaskStatus, TaskType } from "../types/tasks";
import { BackupTask, CalendarTask, CleanTask, EmailTask, SocialPostTask } from "../tasks/modules";
import taskEvents from "../events/taskEvents";
import path from "path";
import { notificationBus } from "../../ui/NotificationBus";
import { StrategySelector } from "../strategies/StrategySelector";

export class TaskRunnerFacade implements ITaskRunnerFacade {
  private pendingTasks: { key: string; overrides?: any; prototype: ITaskPrototype | null; status: TaskStatus; instanceId?: string; pendingId: string; }[] = [];
  private scheduledTasks = new Map<string, { task: ITask; scheduledFor: string }>();

  constructor(
    private readonly registry: IPrototypeRegistry,
    private readonly logger: ITaskLogger,
    private readonly strategySelector: IStrategySelector,
    private activeConditional = new Map<string, IExecutionStrategy>()
  ) {
    taskEvents.on("taskCompleted", (info) => {
      if (info.type === "clean") {
        // Política: el cutoff es la marca de tiempo del evento actual
        const cutoffISO = new Date().toISOString();
        const mode = (info as any).cleanMode ?? "soft";
        this.cleanupHistory(mode, cutoffISO);
      }
      this.updatePendingTaskStatus(info.taskId, info.status);
      this.logger.log({
        timestampISO: new Date().toISOString(),
        taskId: info.taskId,
        taskName: info.taskName,
        type: info.taskType,
        strategy: info.strategy ?? "immediate",
        status: info.status,
        message: info.message,
      });
    });

    taskEvents.on("taskFailed", (info) => {
      this.updatePendingTaskStatus(info.taskId, info.status);
      this.logger.log({
        timestampISO: new Date().toISOString(),
        taskId: info.taskId,
        taskName: info.taskName,
        type: info.taskType,
        strategy: info.strategy,
        status: info.status,
        message: info.message,
      });
    });

    taskEvents.on("taskWaiting", (info) => {
      this.updatePendingTaskStatus(info.taskId, "waiting");
      this.logger.log({
        timestampISO: new Date().toISOString(),
        taskId: info.taskId,
        taskName: info.taskName,
        type: info.taskType,
        strategy: info.strategy ?? "immediate",
        status: "waiting",
        message: info.message,
      });
    });

    taskEvents.on("taskRunning", (info) => {
      this.updatePendingTaskStatus(info.taskId, "running");
      this.logger.log({
        timestampISO: new Date().toISOString(),
        taskId: info.taskId,
        taskName: info.taskName,
        type: info.taskType,
        strategy: info.strategy ?? "immediate",
        status: "running",
        message: info.message,
      });
    });
    
    this.strategySelector = new StrategySelector((taskId) => {
      this.scheduledTasks.delete(taskId);
    });
  }

  public async run(request: TaskRequest): Promise<TaskResponse> {
    try {
      const { task, strategyConfig } = this.resolveTaskAndStrategy(request);

      if (task instanceof CleanTask || task instanceof BackupTask) {
        task.setFacade(this);
      }

      this.validateTask(task);
      this.validateStrategy(strategyConfig);

      const strategy = this.strategySelector.getStrategy(strategyConfig);
      task.setStrategy(strategyConfig);

      if (strategyConfig.type === "conditional") {
        this.activeConditional.set(task.id, strategy);
      }

      if (request.pendingRef) {
        this.bindInstanceToPending(task.id, request.pendingRef.key, request.pendingRef.overrides);
      }

      // Estado inicial según estrategia
      const initialStatus: TaskStatus =
        strategyConfig.type === "conditional"
          ? "waiting"
          : strategyConfig.type === "scheduled"
            ? "waiting"
            : "running";

      // Lanzar ejecución en background (NO await)
      (async () => {
        try {
          const result = await strategy.apply(task);

          if (result.status === "scheduled" && "scheduledFor" in result) {
            this.scheduledTasks.set(task.id, {
              task,
              scheduledFor: result.scheduledFor as string,
            });
          }

          if (strategyConfig.type === "conditional") this.activeConditional.delete(task.id);

          if (task.type === "clean") {
            const { mode = "soft", scope } = (task as any).payload ?? {};
            const nowISO = new Date().toISOString();
            this.cleanupHistory(mode, nowISO, scope);
            this.purgePendingTasks(mode);
          }

          this.updatePendingTaskStatus(task.id, result.status);
          notificationBus.emit("task:result", { taskId: task.id, taskName: task.name, result });
        } catch (err) {
          const fail: TaskResult = { status: "failed", error: (err as Error).message };
          if (strategyConfig.type === "conditional") this.activeConditional.delete(task.id);
          this.updatePendingTaskStatus(task.id, "failed");
          notificationBus.emit("task:result", { taskId: task.id, taskName: task.name, result: fail });
        }
      })();

      return {
        ok: true,
        taskId: task.id,
        taskName: task.name,
        strategy: strategyConfig.type,
        status: initialStatus,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
        status: "failed",
      };
    }
  }

  public listTemplates(): { key: string; name: string }[] {
    return this.registry.list().map(({ key, prototype }) => ({
      key,
      name: (prototype as any).name ?? key,
    }));
  }

  public getHistory() {
    return this.logger.list();
  }

  public clearHistory() {
    this.logger.clear();
  }

  public registerTask(request: TaskRequest): void {
    let key: string;
    let overrides: any;
    let prototype: ITaskPrototype | null = null;
    const pendingId = crypto.randomUUID();

    if (request.source.kind === "prototype") {
      key = request.source.data.key;
      overrides = request.source.data.overrides;
      prototype = this.registry.get(key) ?? null;
      if (!prototype) {
        throw new Error(`No existe plantilla con clave "${key}"`);
      }
    } else if (request.source.kind === "builder") {
      key = `${request.source.data.type}:${request.source.data.name ?? "sin-nombre"}`;
      overrides = { ...request.source.data };
    } else {
      throw new Error("Tipo de source no soportado en registerTask");
    }

    this.pendingTasks.push({ key, overrides, prototype, status: "waiting", pendingId });
    taskEvents.emit("taskWaiting", {
      taskId: prototype?.id ?? overrides?.id ?? `${key}::pending`,
      taskName: overrides?.name ?? (prototype as any)?.name ?? key,
      status: "waiting",
      message: "Tarea pendiente creada",
      taskType: prototype ? prototype.type : overrides?.type,
      strategy: overrides?.strategy?.type ?? "immediate",
    });
  }

  public getPendingTasks(): { key: string; overrides?: any; prototype: ITaskPrototype | null; status: string }[] {
    const scheduled = Array.from(this.scheduledTasks.values()).map(({ task, scheduledFor }) => ({
      key: task.type,
      status: "scheduled" as const,
      prototype: null,
      overrides: { name: task.name, scheduledFor },
      pendingId: task.id,
      instanceId: task.id,
    }));
    return this.pendingTasks.concat(scheduled);
  }

  public removePendingTask(key: string, overrides?: any): void {
    this.pendingTasks = this.pendingTasks.filter(
      (t) => !(t.key === key && JSON.stringify(t.overrides) === JSON.stringify(overrides))
    );
  }

  private updatePendingTaskStatus(taskId: string, status: TaskStatus) {
    const i = this.pendingTasks.findIndex(t => t.instanceId === taskId);
    if (i !== -1) {
      this.pendingTasks[i].status = status;
      if (["completed", "failed", "canceled"].includes(status)) {
        this.pendingTasks.splice(i, 1);
      }
    }
  }

  // ————— Helpers privados —————

  public async shutdown(): Promise<void> {
    for (const [taskId, strat] of this.activeConditional.entries()) {
      try {
        await strat.cancel?.({ id: taskId } as any);
      } catch { }
    }
    this.activeConditional.clear();
  }

  private defaultStrategy(s?: ExecutionStrategyConfig): ExecutionStrategyConfig {
    return s ?? { type: "immediate" };
  }

  private resolveTaskAndStrategy(
    request: TaskRequest
  ): { task: ITaskPrototype; strategyConfig: ExecutionStrategyConfig } {
    if (request.source.kind === "builder") {
      const { name, type, payload, strategy } = request.source.data;
      const task = this.materializeTaskFromType({ name, type, payload });

      const strategyConfig = this.defaultStrategy(strategy);
      return { task, strategyConfig };
    }

    // kind === "prototype"
    const { key, overrides } = request.source.data;
    const proto = this.registry.get(key);
    if (!proto) throw new Error(`No existe plantilla con clave "${key}"`);

    // clone puede aplicar overrides y devolver tarea con su propia estrategia (si la soporta)
    const task = proto.clone(overrides);

    // Resolver estrategia con prioridades:
    // 1) overrides.strategy (si el usuario la pasó)
    // 2) task.strategy (si el clon deja una por defecto en la instancia/prototipo)
    // 3) immediate por defecto
    const strategyFromTask =
      // si tu ITaskPrototype expone strategy (ajusta según tu tipo real)
      (task as any).strategy as ExecutionStrategyConfig | undefined;

    const strategyConfig: ExecutionStrategyConfig =
      overrides?.strategy ?? strategyFromTask ?? { type: "immediate" };

    return { task, strategyConfig };
  }

  private materializeTaskFromType(data: { name: string; type: ITask["type"]; payload: ITask["payload"] }): ITaskPrototype {
    switch (data.type) {
      case "email":
        return new EmailTask({ name: data.name, payload: data.payload });
      case "calendar":
        return new CalendarTask({ name: data.name, payload: data.payload });
      case "social":
        return new SocialPostTask({ name: data.name, payload: data.payload });
      case "clean":
        return new CleanTask({ name: data.name, payload: data.payload });
      case "backup":
        const defaultPath = path.resolve(process.cwd(), "data", "backup_db.json");
        const payload = data.payload && typeof data.payload === "object"
          ? data.payload
          : { source: defaultPath, destination: defaultPath };
        return new BackupTask({ name: data.name, payload: payload });
      default:
        const neverType: never = data.type;
        throw new Error(`Tipo de tarea no soportado: ${String(neverType)}`);
    }
  }

  public bindInstanceToPending(taskId: string, key: string, overrides?: any) {
    const i = this.pendingTasks.findIndex(
      (t) => t.key === key && JSON.stringify(t.overrides) === JSON.stringify(overrides)
    );
    if (i !== -1) {
      this.pendingTasks[i].instanceId = taskId;
    }
  }

  private validateTask(task: ITask): void {
    if (!task.name || !task.name.trim()) throw new Error("La tarea requiere un nombre");
    if (!task.type) throw new Error("La tarea requiere un tipo");
  }

  private validateStrategy(strategy: ExecutionStrategyConfig): void {
    if (strategy.type === "scheduled") {
      if (!strategy.targetDateISO) {
        throw new Error("Estrategia 'scheduled' requiere targetDateISO");
      }
      const targetTime = Date.parse(strategy.targetDateISO);
      if (isNaN(targetTime) || targetTime <= Date.now()) {
        throw new Error("Estrategia 'scheduled' requiere una fecha futura válida");
      }
    }
  }

  /// Proceso de limpieza
  public clearCompletedTasksAndLogs(): void {
    this.pendingTasks = this.pendingTasks.filter(t => t.status !== "completed");
    const entries = this.logger.list();

    const lastIndexByTask = new Map<string, number>();
    for (let i = 0; i < entries.length; i++) {
      lastIndexByTask.set(entries[i].taskId, i);
    }

    const completedTaskIds = new Set<string>();
    for (const [taskId, idx] of lastIndexByTask.entries()) {
      if (entries[idx].status === "completed") {
        completedTaskIds.add(taskId);
      }
    }

    const cleaned = entries.filter(e => !completedTaskIds.has(e.taskId));
    this.logger.replace(cleaned);
  }

  public cleanupHistory(mode: "soft" | "hard", cutoffISO?: string, scope?: TaskType) {
    const cutoff = cutoffISO ?? new Date().toISOString();
    const opts: { keepFinals?: boolean; scope?: TaskType } = {
      keepFinals: mode === "soft",
    };
    if (scope) opts.scope = scope;

    this.logger.purgeBefore(cutoff, opts);
    const scopeText = scope ? `scope=${scope}` : "scope=global";
    const msg = `AUDIT: Limpieza ${mode} aplicada (${scopeText}) cutoff=${cutoff}`;
    this.logger.addAuditEntry({
      type: "clean",
      message: msg
    });
  }

  private purgePendingTasks(mode: "soft" | "hard") {
    if (mode !== "hard") return;

    this.pendingTasks = [];
  }
}