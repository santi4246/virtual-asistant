import { TaskRequest } from "../types/facade";
import { ExecutionStrategyConfig } from "../types/strategy";
import { TaskPayload, TaskType } from "../types/tasks";


export class TaskRequestBuilder {
    private kind: "builder" | "prototype" = "builder";
    private key?: string;
    private name?: string;
    private type?: TaskType;
    private payload: TaskPayload = {};
    private strategy?: ExecutionStrategyConfig;

    // Constructores estáticos
    static fromBuilder() {
        const b = new TaskRequestBuilder();
        b.kind = "builder";
        return b;
    }

    static fromPrototype(key: string) {
        const b = new TaskRequestBuilder();
        b.kind = "prototype";
        b.key = key;
        return b;
    }

    // Setters fluidos
    setName(name: string) { this.name = name; return this; }
    setType(type: TaskType) { this.type = type; return this; }
    setPayload(payload: TaskPayload) { this.payload = payload; return this; }
    setStrategy(strategy: ExecutionStrategyConfig) { this.strategy = strategy; return this; }

    private validate() {
        if (this.kind === "builder") {
            if (!this.type) throw new Error("Tipo de tarea es requerido");

            switch (this.type) {
                case "social": {
                    const p = this.payload as any;
                    if (!p?.content || typeof p.content !== "string" || p.content.trim().length === 0) {
                        throw new Error("Social: 'content' es requerido");
                    }
                    if (!p?.platform) {
                        throw new Error("Social: 'platform' es requerido");
                    }
                    break;
                }
                case "email": {
                    const p = this.payload as any;
                    if (!p?.to) throw new Error("Email: 'to' es requerido");
                    if (!p?.subject) throw new Error("Email: 'subject' es requerido");
                    if (typeof p?.body !== "string") throw new Error("Email: 'body' debe ser string (puede ser vacío)");
                    break;
                }
                case "calendar": {
                    const p = this.payload as any;                    
                    if (!p?.title) throw new Error("Calendar: 'title' es requerido");
                    if (!p?.date) throw new Error("Calendar: 'date' es requerido");
                    break;
                }
                case "backup": {
                    const p = this.payload as any;                    
                    if (!p?.destination) throw new Error("Backup: 'destination' es requerido");
                    break;
                }
                case "clean": {
                    const p = this.payload as any;
                    const mode = p?.mode ?? "soft";
                    if (!["soft", "hard"].includes(mode)) {
                        throw new Error("Clean: 'mode' debe ser 'soft' o 'hard'");
                    }
                    // scope es opcional; si está, que sea un TaskType válido
                    if (p?.scope && !["email", "calendar", "social", "clean", "backup"].includes(p.scope)) {
                        throw new Error("Clean: 'scope' inválido");
                    }
                    break;
                }
                default:
                    // Si agregas más tipos en el futuro, extiende aquí
                    break;
            }
        } else {
            if (!this.key) throw new Error("Prototype: 'key' de plantilla es requerida");
            // overrides se validan más tarde en el dominio si es necesario
        }
    }
    
    build(executeNow = false): TaskRequest {
        this.validate();        

        if (this.kind === "builder") {
            if (!this.type) throw new Error("Tipo de tarea es requerido");

            return {
                source: {
                    kind: "builder",
                    data: {
                        name: this.name ?? `Tarea ${this.type}`,
                        type: this.type,
                        payload: this.payload,
                        strategy: this.strategy
                    },
                },
                executeNow,
            };
        }

        return {
            source: {
                kind: "prototype",
                data: {
                    key: this.key!,
                    overrides: {
                        name: this.name,                        
                        payload: this.payload,
                        strategy: this.strategy,
                    },
                },
            },
            executeNow,
        };
    }
}