# Proyecto: Asistente Virtual (CLI) — Sistema de Tareas Programables
### Descripción

Este proyecto es una aplicación de consola (CLI) en TypeScript que simula un asistente virtual capaz de crear y ejecutar tareas automáticas (enviar emails simulados, crear recordatorios de calendario simulados y publicar en redes sociales de forma simulada). Soporta múltiples estrategias de ejecución: inmediata, programada y condicional. Los resultados se persisten en un archivo JSON local. 

---
### Tecnologías usadas
- Node.js (v14+ recomendable)
- TypeScript
- fs/promises (Node) para persistencia en disco
- readline (Node) para CLI interactivo
- Diseño orientado a patrones: Factory, Builder, Strategy, Singleton

### Estructura principal y componentes
- src/cli/cli.ts — CLI interactivo, menú y flujo principal. Exporta showMainMenu para refrescar el menú desde estrategias.
- src/index.ts — Punto de entrada; recupera tareas programadas al iniciar y arranca el CLI.
- src/builders/TaskBuilder.ts — Builder para construir tareas de forma fluida.
- src/factories/TaskFactory.ts — Crea instancias concretas de tareas (EmailTask, CalendarTask, SocialPostTask).
- src/models/
    * ITask.ts — Tipos e interfaces (Task, TaskType, TaskPayload, TaskRecord, TaskResult).
    * BaseTask.ts — Lógica común de persistencia y utilidad para tareas.
    * EmailTask.ts, CalendarTask.ts, SocialPostTask.ts — Implementaciones concretas de tareas.
- src/strategies/
    * IExecutionStrategy.ts — Interface para estrategias (schedule / cancel).
    * ImmediateStrategy.ts — Ejecuta inmediatamente.
    * ScheduledStrategy.ts — Ejecuta en fecha/hora objetivo (usa setTimeout y unref()).
    * ConditionalStrategy.ts — Ejecuta cuando se cumple una condición (p. ej. day/night), usa setInterval y unref().
- src/services/SchedulerService.ts — Registro en memoria de tareas programadas; permite register, unregister, list, cancel.
- src/db/TaskDb.ts & src/db/DbConnection.ts — Persistencia a data/tasks_db.json con manejo de concurrencia (cola de escrituras) y robustez frente a archivo vacío / inexistente.

## Características principales
- Crear tareas: email, calendar, social
- Estrategias de ejecución:
    * immediate — Ejecuta al instante
    * scheduled — Ejecuta en fecha/hora dada
    * conditional — Ejecuta cuando se cumple condición (day o night, o función personalizada)
- Persistencia en JSON (data/tasks_db.json)
- Registro en memoria de tareas programadas (para listar y cancelar)
- CLI interactivo con menú recursivo y refresco del menú tras ejecución de tareas
- Validaciones de payloads y manejo de errores comunes (JSON corrupto, archivo inexistente, readline cerrado, mensajes vacíos)

## Instalación
1. Clona el repositorio
2. Instala dependencias
```bash
npm install
```
3. Compilar o ejecutar directamente con ts-node (si lo tienes)
```bash
npx ts-node src/index.ts
```
O con compilación:
```bash
npm run build
node dist/index.js
```
(Recomiendo añadir scripts en package.json como start y build.)

### Configuración y primeros pasos
- Asegúrate de tener Node.js instalado (v14+).
- En la raíz del proyecto se crea automáticamente la carpeta data y el archivo data/tasks_db.json cuando se persiste por primera vez. Si algo falla, puedes crear manualmente:
```bash
mkdir -p data
echo "[]" > data/tasks_db.json
```
- Al iniciar (src/index.ts) el sistema recupera tareas programadas almacenadas (si las hay) y las vuelve a registrar en memoria para que sigan pendientes.

## Uso (CLI)
Arranca:
```bash
npx ts-node src/index.ts
```
```
Menú principal:
- 1 — Crear tarea interactiva
    * Te pide type (email | calendar | social), el payload correspondiente (ej.: destinatario, título, fecha...), la strategy (immediate | scheduled | conditional) y parámetros de la estrategia (fecha para scheduled; condición, intervalo y max attempts para conditional).
- 2 — Listar tareas persistidas
    * Muestra el contenido de data/tasks_db.json.
- 3 — Listar tareas activas en memoria
    * Muestra tareas actualmente registradas y pendientes en SchedulerService
- 4 — Cancelar tarea por id
    * Interrumpe la ejecución planificada y marca la tarea como cancelada en la DB.
- 5 — Limpiar DB
    * Borra todos los registros persistidos (escribe [] en el archivo).
- 0 — Salir

Ejemplo rápido (crear tarea programada en memoria):
* Selecciona 1
* Tipo: email
* Payload: ingresar destinatario, asunto, mensaje
* Estrategia: scheduled
* Fecha programada: 2025-10-27 10:02 (ejemplo futuro)
* Prioridad: 1

Después, usa 3 para ver la tarea en memoria; cuando se ejecute, dejará de aparecer en 3 y su resultado quedará en 2.
```
### Validaciones implementadas
- TaskBuilder valida payloads según el tipo (ej.: email requiere recipient y subject; social requiere platform y content; calendar requiere title y date).
- SocialPostTask.execute() valida contenido no vacío; si está vacío, persiste un resultado de tipo error y lanza excepción controlada.
- TaskDb.readAll() maneja archivo vacío y ENOENT, evitando Unexpected end of JSON input.

### Notas importantes de comportamiento y UX
- Las timers (setTimeout / setInterval) usan .unref() para que no impidan que el proceso Node finalice cuando el usuario decide salir.
- Tras la ejecución de una tarea programada/condicional, el sistema intenta refrescar el menú CLI (se exporta showMainMenu en cli.ts y las estrategias lo invocan tras finalizar) — pero antes de llamar revisa si readline está abierto para evitar el error readline was closed.
- Si cierras el CLI (0 — Salir) y una tarea intenta refrescar el menú después, el código ahora comprueba si readline está cerrado y evita llamar a rl.question (previniendo ERR_USE_AFTER_CLOSE).

### Troubleshooting (errores comunes)
- Unexpected end of JSON input
    * Causa: archivo data/tasks_db.json vacío o corrupto.
    * Solución: El código ya maneja archivo vacío devolviendo []. Si persiste, elimina o reemplaza data/tasks_db.json con [].
- Error: readline was closed / ERR_USE_AFTER_CLOSE
    * Causa: una tarea en segundo plano intenta refrescar el menú luego de que el usuario cerró la sesión.
    * Solución: El CLI ahora marca isReadlineClosed y evita solicitar entradas si readline está cerrado.
- Mensaje vacío al publicar social
    * Causa: payload.content vacío.
    * Solución: CLI y TaskBuilder validan y devuelven error antes de crear la tarea; SocialPostTask persiste un resultado de error si se intenta ejecutar con contenido vacío.
---
## Licencia
Este proyecto es para uso personal y educativo. No se permite su venta ni uso comercial sin autorización expresa.
---
¡Gracias por usar este proyecto para crear tareas con asistente virtual!
# 👤 Autor
```
Santiago Romero / https://www.santiago-romero.online / https://www.linkedin.com/in/santiago-romero-santi4246/
```