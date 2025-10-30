import type { ITaskPrototype } from "./tasks";

export interface IPrototypeRegistry {
  register(key: string, prototype: ITaskPrototype): void;
  get(key: string): ITaskPrototype | undefined;
  listKeys(): string[];
  list(): { key: string; prototype: ITaskPrototype }[];
}