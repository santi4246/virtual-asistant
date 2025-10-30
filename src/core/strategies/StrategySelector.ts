import type { ExecutionStrategyConfig, IExecutionStrategy, IStrategySelector } from "../types/strategy";
import { ImmediateStrategy } from "./ImmediateStrategy";
import { ScheduledStrategy } from "./ScheduledStrategy";
import { ConditionalStrategy } from "./ConditionalStrategy";

function assertNever(x: never): never {
    throw new Error(`StrategySelector: estrategia no soportada: ${String(x)}`);
}

export class StrategySelector implements IStrategySelector {
    getStrategy(config: ExecutionStrategyConfig): IExecutionStrategy {
        switch (config.type) {
            case "immediate":
                return new ImmediateStrategy();
            case "scheduled": {
                if (!config.targetDateISO) throw new Error("StrategySelector: targetDateISO requerido para scheduled");
                return new ScheduledStrategy(config.targetDateISO);
            }
            case "conditional": {
                const cond = config.condition ?? "night";
                return new ConditionalStrategy({ condition: cond });
            }
            default:
                return assertNever(config.type);
        }
    }
}