# 🧠 Proyecto: Asistente Virtual CLI — Sistema de Tareas Automatizadas (v2)
### Descripción

Este proyecto implementa una aplicación de consola (CLI) escrita en TypeScript que simula un asistente virtual capaz de crear, clonar y ejecutar tareas automatizadas (emails simulados, publicaciones sociales, limpiezas, backups, recordatorios…).
La aplicación se basa en un conjunto de patrones de diseño de software (Factory, Strategy, Prototype, Builder, Facade, Singleton) para mantener una arquitectura modular, extensible y limpia.

---
### Tecnologías usadas
- Node.js (v14+ recomendable)
- TypeScript
- fs/promises (Node) para persistencia en disco
- readline (Node) para CLI interactivo
- EventEmitter para el sistema de eventos (taskEvents y notificationBus)
- Diseño orientado a patrones: Factory, Builder, Strategy, Singleton

# 🧩 Arquitectura general
src/
├── core/
│   ├── types/                  # Definiciones de tipos e interfaces (ITask, ITaskLogger, Strategy, etc.)
│   ├── logger/TaskLogger.ts    # Registro centralizado de eventos de tarea
│   ├── registry/PrototypeRegistry.ts # Registro de plantillas clonables
│   ├── events/TaskEvents.ts    # Sistema de eventos global
│   └── TaskRunnerFacade.ts     # Fachada unificada para ejecutar y gestionar tareas
│
├── strategies/
│   ├── ImmediateStrategy.ts    # Ejecuta instantáneamente
│   ├── ScheduledStrategy.ts    # Programa tareas (setTimeout)
│   ├── ConditionalStrategy.ts  # Ejecuta con condiciones (día/noche/etc.)
│   └── StrategySelector.ts     # Selector dinámico de estrategia
│
├── tasks/
│   ├── BaseTask.ts             # Clase abstracta base
│   ├── EmailTask.ts            # Simula envío de correos
│   ├── SocialPostTask.ts       # Simula post en Facebook/Twitter
│   ├── CleanTask.ts            # Limpieza y depuración de registros
│   ├── BackupTask.ts           # Backup de base de datos JSON local
│   └── ReminderTask.ts         # Recordatorios y alertas
│
├── builder/
│   └── TaskBuilder.ts          # Construcción fluida de tareas con validación de payload
│
├── cli/
│   ├── cli.ts                  # Menú principal y navegación
│   ├── taskActions.ts          # Handlers del CLI (crear, clonar, ver tareas)
│   ├── wireNotifications.ts    # Subsistema de notificaciones en consola
│   └── utils/                  # Helpers de interfaz, colorización, fecha, etc.
│
└── data/
    └── backup_db.json          # Archivo de backup generado automáticamente

# Características principales
- Crear tareas: email, calendar, social
- Estrategias de ejecución:
    * immediate — Ejecuta al instante
    * scheduled — Ejecuta en fecha/hora dada
    * conditional — Ejecuta cuando se cumple condición (day o night, o función personalizada)
- Persistencia en JSON (data/tasks_db.json)
- Registro en memoria de tareas programadas (para listar y cancelar)
- CLI interactivo con menú recursivo y refresco del menú tras ejecución de tareas
- Validaciones de payloads y manejo de errores comunes (JSON corrupto, archivo inexistente, readline cerrado, mensajes vacíos)

# ⚙️ Instalación y configuración del entorno
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

# 🧭 Uso del CLI
Arranca:
```bash
npx ts-node src/index.ts
```
```
Menú principal:
-------- Asistente Virtual CLI --------

Menú principal:
1) Crear una nueva tarea
2) Clonar plantilla existente
3) Ver historial y tareas pendientes
4) Ejecutar limpieza o backup
0) Salir

Ejemplo rápido (crear tarea programada en memoria):
* Selecciona 1
* Tipo: email
* Payload: ingresar destinatario, asunto, mensaje
* Estrategia: scheduled
* Fecha programada: 2025-10-27 10:02 (ejemplo futuro)
```

```
Al crear o clonar tareas:
El sistema permite elegir entre diferentes estrategias de ejecución:
    * immediate: ejecuta al instante.
    * scheduled: programa con fecha y hora específica.
    * conditional: ejecuta cuando se cumple una condición externa (día/noche, temperatura, etc.).

Cada tarea clonada puede personalizar campos según su tipo (email, red social, limpieza, etc.).
```
# 🧱 Funcionalidades implementadas| Característica | Descripción |
|----------------|-------------|
| 🧩 **Prototype Pattern** | Registro y clonación de plantillas (PrototypeRegistry). Las tareas clonadas son independientes y personalizables. |
| 🧠 **Facade Pattern** | `TaskRunnerFacade` centraliza la creación, ejecución, registro y notificaciones. |
| ⚡ **Strategy Pattern** | Manejo de ejecución inmediata, programada y condicional mediante `StrategySelector`. |
| 🧰 **Builder Pattern** | `TaskBuilder` facilita la creación modular y validada de tareas. |
| 🧾 **Logging centralizado** | `TaskLogger` registra transiciones e informes de estado (`waiting`, `running`, `completed`, etc.). |
| 🕓 **Scheduled Tasks** | `ScheduledStrategy` mantiene un mapa interno de timers y callbacks, con notificación al ejecutar. |
| 🔊 **Eventos y Notificaciones** | `taskEvents` y `notificationBus` permiten emisión de cambios en tiempo real en la consola (`wireNotifications`). |
| 🧼 **CleanTask & BackupTask** | Permite depurar historial y generar snapshot del registro (`backup_db.json`). |

# 🧠 Sistema de eventos
El CLI reacciona a cambios en tiempo real gracias a los eventos:
```
taskEvents.on("taskCompleted", payload => console.log("✓", payload.taskName, "finalizada"));
taskEvents.on("taskScheduled", payload => console.log("⏰ Programada para", payload.date));
taskEvents.on("taskCanceled", payload => console.log("⚠ Cancelada:", payload.taskName));
```
El listener wireNotifications.ts formatea la salida con íconos y colores para una mejor UX.

# 💾 Tareas pendientes y programadas
Las tareas scheduled se almacenan internamente en Facade.scheduledTasks y pueden consultarse con:
```
=== Tareas Pendientes ===
1) Tarea: Email Electropulse (Clave: emailBase) - Estado: scheduled - Programada para 07/11/2025 18:30
```
Cuando se ejecutan, se eliminan automáticamente de la lista de pendientes.

# 🔐 Backup automático
Cada ejecución de BackupTask genera un snapshot en:

/data/backup_db.json
con formato:
```
{
  "generatedAt": "2025-11-07T19:31:01.440Z",
  "count": 3,
  "tasks": [...],
  "notes": []
}
```

# 💻 Cómo extender el sistema
1. Crear una nueva tarea en src/tasks/MyNewTask.ts que herede de BaseTask.
2. Registrar una plantilla en el bootstrap:
```
registry.register("myNewTemplate", new MyNewTaskPrototype());
```
3. Agregar cases en handleCloneTemplate para permitir personalización interactiva.

# 🧩 Troubleshooting
| Problema | Causa | Solución |
|-----------|--------|-----------|
| No aparecen tareas programadas en pendientes | Facade no registra `scheduledTasks` | Verificar persistencia y callback de evento |
| Mensajes duplicados de notificación | Doble logging (Facade + wireNotifications) | Silenciar el evento "scheduled" en `wireNotifications` |
| Error "targetDateISO undefined" | Estrategia `scheduled` creada sin fecha | Validar antes de construir `ScheduledStrategy` |
| Archivo backup vacío | No existen tareas completadas | Ejecutar al menos una tarea "completed" antes del backup |

# 🧪 Ejemplo de flujo
```
1️⃣ Clonar plantilla de email base:

Seleccione plantilla: Email Base
Nuevo nombre para la tarea: Email Electropulse
¿Desea personalizar los datos? s
Destinatario: demo@correo.com
Asunto: Test
Cuerpo: Probando envío de Mail
¿Programar tarea? s
Ingrese fecha: 2025-11-07 18:30
Salida esperada:

⏰ Tarea "Email Electropulse" programada para 7/11/2025, 18:30:00
> Tarea clonada y programada: Email Electropulse (ID: ...)
Se ejecutará el: 7/11/2025, 18:30:00
```
---
## Licencia
Este proyecto es para uso personal y educativo. No se permite su venta ni uso comercial sin autorización expresa.
---
¡Gracias por usar este proyecto para crear tareas con asistente virtual!
# 👤 Autor
```
Santiago Romero / https://www.santiago-romero.online / https://www.linkedin.com/in/santiago-romero-santi4246/
```