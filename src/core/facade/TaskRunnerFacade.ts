import type { ITaskRunnerFacade, TaskRequest, TaskResponse } from "../types/facade";
import type { IPrototypeRegistry } from "../types/registry";
import type { ITaskLogger } from "../types/logger";
import type { ExecutionStrategyConfig, IStrategySelector } from "../types/strategy";
import type { ITask, ITaskPrototype } from "../types/tasks";
import { BackupTask, CalendarTask, CleanTask, EmailTask, SocialPostTask } from "../tasks/modules";

export class TaskRunnerFacade implements ITaskRunnerFacade {
  constructor(
    private readonly registry: IPrototypeRegistry,
    private readonly logger: ITaskLogger,
    private readonly strategySelector: IStrategySelector
  ) { }

  public async run(request: TaskRequest): Promise<TaskResponse> {
    try {
      const { task, strategyConfig } = this.resolveTaskAndStrategy(request);

      this.validateTask(task);
      this.validateStrategy(strategyConfig);

      const strategy = this.strategySelector.getStrategy(strategyConfig);
      const result = await strategy.apply(task);

      return {
        ok: true,
        taskId: task.id,
        taskName: (task as any).name,
        strategy: strategy.type,
        result,
      };
    } catch (err) {
      return {
        ok: false,
        error: err instanceof Error ? err.message : String(err),
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

  // ————— Helpers privados —————

  private resolveTaskAndStrategy(request: TaskRequest): { task: ITaskPrototype; strategyConfig: ExecutionStrategyConfig } {
    if (request.source.kind === "builder") {
      const { name, type, payload, strategy } = request.source.data;

      const task = this.materializeTaskFromType({ name, type, payload });

      return {
        task,
        strategyConfig: strategy,
      };
    }

    const { key, overrides } = request.source.data;
    const proto = this.registry.get(key);
    if (!proto) throw new Error(`No existe plantilla con clave "${key}"`);

    const task = proto.clone(overrides);
    const strategyConfig = overrides?.strategy ?? { type: "immediate" as const };

    return { task, strategyConfig };
  }

  private materializeTaskFromType(data: { name: string; type: ITask["type"]; payload: ITask["payload"] }): ITaskPrototype {
    switch (data.type) {
      case "email": {
        return new EmailTask({ name: data.name, payload: data.payload });
      }
      case "calendar": {
        return new CalendarTask({ name: data.name, payload: data.payload });
      }
      case "social": {
        return new SocialPostTask({ name: data.name, payload: data.payload });
      }
      case "clean": {
        return new CleanTask({ name: data.name, payload: data.payload });
      }
      case "backup": {
        return new BackupTask({ name: data.name, payload: data.payload });
      }
      default:
        const neverType: never = data.type;
        throw new Error(`Tipo de tarea no soportado: ${String(neverType)}`);
    }
  }

  private validateTask(task: ITask): void {
    if (!task.name || !task.name.trim()) throw new Error("La tarea requiere un nombre");
    if (!task.type) throw new Error("La tarea requiere un tipo");
  }

  private validateStrategy(strategy: ExecutionStrategyConfig): void {
    console.log("Validando estrategia:", strategy);
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
}