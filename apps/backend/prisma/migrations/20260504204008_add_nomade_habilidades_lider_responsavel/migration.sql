-- CreateTable
CREATE TABLE "nomade_habilidades" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "nomade_id" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "categoria_produto" TEXT,
    "produto_id" TEXT,
    "modelo_tarefa_id" TEXT,
    "nota_media" REAL NOT NULL DEFAULT 0,
    "disponibilidade" TEXT NOT NULL DEFAULT 'disponivel',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "nomade_habilidades_nomade_id_fkey" FOREIGN KEY ("nomade_id") REFERENCES "nomades" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_project_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "project_product_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "catalog_task_id" TEXT,
    "code_snapshot" TEXT,
    "name_snapshot" TEXT NOT NULL,
    "category_snapshot" TEXT,
    "task_code" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PARA_LANCAMENTO',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignee_id" TEXT,
    "responsavel_agencia_id" TEXT,
    "nomade_responsavel_id" TEXT,
    "lider_responsavel_id" TEXT,
    "due_date" DATETIME,
    "start_date" DATETIME,
    "completed_at" DATETIME,
    "data_lancamento" DATETIME,
    "data_liberacao_execucao" DATETIME,
    "data_inicio_execucao" DATETIME,
    "data_conclusao" DATETIME,
    "lancamento_expires_at" DATETIME,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "fase" TEXT,
    "phase" TEXT,
    "checklist_snapshot" TEXT,
    "steps_snapshot" TEXT,
    "briefing_snapshot" TEXT,
    "observations" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "project_tasks_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_tasks_project_product_id_fkey" FOREIGN KEY ("project_product_id") REFERENCES "project_products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_tasks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "project_tasks_catalog_task_id_fkey" FOREIGN KEY ("catalog_task_id") REFERENCES "catalog_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "project_tasks_lider_responsavel_id_fkey" FOREIGN KEY ("lider_responsavel_id") REFERENCES "users" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_project_tasks" ("assignee_id", "briefing_snapshot", "catalog_task_id", "category_snapshot", "checklist_snapshot", "code_snapshot", "completed_at", "created_at", "data_conclusao", "data_inicio_execucao", "data_lancamento", "data_liberacao_execucao", "description", "due_date", "fase", "id", "lancamento_expires_at", "name_snapshot", "nomade_responsavel_id", "observations", "phase", "priority", "product_id", "project_id", "project_product_id", "responsavel_agencia_id", "sort_order", "start_date", "status", "steps_snapshot", "task_code", "title", "updated_at") SELECT "assignee_id", "briefing_snapshot", "catalog_task_id", "category_snapshot", "checklist_snapshot", "code_snapshot", "completed_at", "created_at", "data_conclusao", "data_inicio_execucao", "data_lancamento", "data_liberacao_execucao", "description", "due_date", "fase", "id", "lancamento_expires_at", "name_snapshot", "nomade_responsavel_id", "observations", "phase", "priority", "product_id", "project_id", "project_product_id", "responsavel_agencia_id", "sort_order", "start_date", "status", "steps_snapshot", "task_code", "title", "updated_at" FROM "project_tasks";
DROP TABLE "project_tasks";
ALTER TABLE "new_project_tasks" RENAME TO "project_tasks";
CREATE UNIQUE INDEX "project_tasks_task_code_key" ON "project_tasks"("task_code");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "nomade_habilidades_nomade_id_area_categoria_produto_produto_id_modelo_tarefa_id_key" ON "nomade_habilidades"("nomade_id", "area", "categoria_produto", "produto_id", "modelo_tarefa_id");
