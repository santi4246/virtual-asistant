import { TaskDb } from "./TaskDb";

export class DbConnection {
  private static instance: TaskDb | null = null;

  // Retorna la única instancia de TaskDb
  static getInstance(): TaskDb {
    if (!DbConnection.instance) {
      DbConnection.instance = new TaskDb();
    }
    return DbConnection.instance;
  }
}