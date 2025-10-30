import type { IPrototypeRegistry } from "../types/registry";
import type { ITaskPrototype } from "../types/tasks";

export class PrototypeRegistry implements IPrototypeRegistry {
    private readonly map = new Map<string, ITaskPrototype>();

    register(key: string, prototype: ITaskPrototype): void {
        if (!key || !prototype) {
            throw new Error("PrototypeRegistry.register: key y prototype son requeridos");
        }
        this.map.set(key, prototype);
    }

    get(key: string): ITaskPrototype | undefined {
        return this.map.get(key);
    }

    listKeys(): string[] {
        return Array.from(this.map.keys());
    }

    list(): { key: string; prototype: ITaskPrototype }[] {
        return Array.from(this.map.entries()).map(([key, prototype]) => ({ key, prototype }));
    }
}