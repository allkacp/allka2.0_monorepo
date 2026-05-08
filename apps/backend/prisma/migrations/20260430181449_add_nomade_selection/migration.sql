-- CreateTable
CREATE TABLE "task_assignment_history" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_task_id" TEXT NOT NULL,
    "nomade_id" TEXT,
    "criterio" TEXT NOT NULL,
    "nota_nomade" REAL,
    "automatico" BOOLEAN NOT NULL DEFAULT true,
    "resultado" TEXT NOT NULL,
    "detalhes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_assignment_history_project_task_id_fkey" FOREIGN KEY ("project_task_id") REFERENCES "project_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "system_alerts" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "severity" TEXT NOT NULL DEFAULT 'warning',
    "entity_type" TEXT,
    "entity_id" TEXT,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
