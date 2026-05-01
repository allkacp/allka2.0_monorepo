-- CreateTable
CREATE TABLE "partner_levels" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "icon" TEXT,
    "color" TEXT,
    "gradient" TEXT,
    "min_mrr" INTEGER NOT NULL DEFAULT 0,
    "max_mrr" INTEGER,
    "led_agencies_min" INTEGER NOT NULL DEFAULT 0,
    "led_agencies_mrr_min" INTEGER NOT NULL DEFAULT 0,
    "premium_project_limit" INTEGER,
    "commission_rate" REAL NOT NULL DEFAULT 0,
    "extra_discount" REAL NOT NULL DEFAULT 0,
    "receives_leads_premium" BOOLEAN NOT NULL DEFAULT false,
    "requires_partner" BOOLEAN NOT NULL DEFAULT false,
    "level_up_bonus_credits" INTEGER NOT NULL DEFAULT 0,
    "benefits" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "catalog_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "subcategory" TEXT,
    "task_type" TEXT NOT NULL DEFAULT 'execution',
    "description" TEXT,
    "objective" TEXT,
    "default_deadline_days" INTEGER,
    "default_priority" TEXT NOT NULL DEFAULT 'medium',
    "complexity" TEXT NOT NULL DEFAULT 'basic',
    "estimated_hours" REAL,
    "responsible_type" TEXT,
    "requires_access" BOOLEAN NOT NULL DEFAULT false,
    "requires_briefing" BOOLEAN NOT NULL DEFAULT false,
    "requires_files" BOOLEAN NOT NULL DEFAULT false,
    "steps" TEXT,
    "checklist" TEXT,
    "briefing_questions" TEXT,
    "required_files" TEXT,
    "execution_rules" TEXT,
    "conclusion_rules" TEXT,
    "internal_guidance" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ativa',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "product_catalog_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "product_id" TEXT NOT NULL,
    "catalog_task_id" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "is_mandatory" BOOLEAN NOT NULL DEFAULT true,
    "phase" TEXT,
    "notes" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "product_catalog_tasks_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "product_catalog_tasks_catalog_task_id_fkey" FOREIGN KEY ("catalog_task_id") REFERENCES "catalog_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_products" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "variation_id" TEXT,
    "product_name_snapshot" TEXT NOT NULL,
    "product_code_snapshot" TEXT,
    "product_category_snapshot" TEXT NOT NULL,
    "product_price_snapshot" REAL NOT NULL DEFAULT 0,
    "recurrence_snapshot" TEXT,
    "preco_final_cliente_snapshot" REAL NOT NULL DEFAULT 0,
    "comissao_snapshot" REAL NOT NULL DEFAULT 0,
    "pagador_snapshot" TEXT NOT NULL DEFAULT 'AGENCIA',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "start_date" DATETIME,
    "expected_end_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "project_products_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "project_products_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "project_products_variation_id_fkey" FOREIGN KEY ("variation_id") REFERENCES "product_variations" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_tasks" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "project_product_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "catalog_task_id" TEXT,
    "code_snapshot" TEXT,
    "name_snapshot" TEXT NOT NULL,
    "category_snapshot" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PARA_LANCAMENTO',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignee_id" TEXT,
    "responsavel_agencia_id" TEXT,
    "nomade_responsavel_id" TEXT,
    "due_date" DATETIME,
    "start_date" DATETIME,
    "completed_at" DATETIME,
    "data_lancamento" DATETIME,
    "data_liberacao_execucao" DATETIME,
    "data_inicio_execucao" DATETIME,
    "data_conclusao" DATETIME,
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
    CONSTRAINT "project_tasks_catalog_task_id_fkey" FOREIGN KEY ("catalog_task_id") REFERENCES "catalog_tasks" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "project_task_stages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_task_id" TEXT NOT NULL,
    "catalog_step_ref" TEXT,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "obrigatoria" BOOLEAN NOT NULL DEFAULT true,
    "briefing_necessario" BOOLEAN NOT NULL DEFAULT false,
    "checklist_snapshot" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "project_task_stages_project_task_id_fkey" FOREIGN KEY ("project_task_id") REFERENCES "project_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_briefing_answers" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_task_id" TEXT NOT NULL,
    "question_key" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "answer" TEXT,
    "files" TEXT,
    "links" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "task_briefing_answers_project_task_id_fkey" FOREIGN KEY ("project_task_id") REFERENCES "project_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "task_attachments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_task_id" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'file',
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "size" INTEGER,
    "mime_type" TEXT,
    "observations" TEXT,
    "uploaded_by" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "task_attachments_project_task_id_fkey" FOREIGN KEY ("project_task_id") REFERENCES "project_tasks" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "client_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "lifecycle" TEXT NOT NULL DEFAULT 'avulso',
    "type" TEXT,
    "value" REAL NOT NULL DEFAULT 0,
    "budget" REAL NOT NULL DEFAULT 0,
    "spent" REAL NOT NULL DEFAULT 0,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "agency" TEXT,
    "company_type" TEXT,
    "consultant" TEXT,
    "consultant_email" TEXT,
    "team_size" INTEGER NOT NULL DEFAULT 0,
    "nomades" TEXT,
    "bitrix_sync" BOOLEAN NOT NULL DEFAULT false,
    "portfolio_permission" BOOLEAN NOT NULL DEFAULT false,
    "overdue" BOOLEAN NOT NULL DEFAULT false,
    "from_lead" BOOLEAN NOT NULL DEFAULT false,
    "billing_day" INTEGER,
    "billing_start_date" TEXT,
    "start_date" DATETIME,
    "end_date" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "projects_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_projects" ("client_id", "created_at", "description", "end_date", "id", "lifecycle", "start_date", "status", "title", "updated_at", "value") SELECT "client_id", "created_at", "description", "end_date", "id", "lifecycle", "start_date", "status", "title", "updated_at", "value" FROM "projects";
DROP TABLE "projects";
ALTER TABLE "new_projects" RENAME TO "projects";
CREATE TABLE "new_users" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "username" TEXT,
    "password_hash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'company_user',
    "account_type" TEXT NOT NULL DEFAULT 'empresas',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "avatar" TEXT,
    "phone" TEXT,
    "position" TEXT,
    "admin_profile_id" TEXT,
    "company_id" TEXT,
    "last_login" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "users_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_users" ("account_type", "admin_profile_id", "avatar", "company_id", "created_at", "email", "id", "is_active", "last_login", "name", "password_hash", "phone", "position", "role", "updated_at", "username") SELECT "account_type", "admin_profile_id", "avatar", "company_id", "created_at", "email", "id", "is_active", "last_login", "name", "password_hash", "phone", "position", "role", "updated_at", "username" FROM "users";
DROP TABLE "users";
ALTER TABLE "new_users" RENAME TO "users";
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "partner_levels_name_key" ON "partner_levels"("name");

-- CreateIndex
CREATE UNIQUE INDEX "catalog_tasks_code_key" ON "catalog_tasks"("code");

-- CreateIndex
CREATE UNIQUE INDEX "product_catalog_tasks_product_id_catalog_task_id_key" ON "product_catalog_tasks"("product_id", "catalog_task_id");

-- CreateIndex
CREATE UNIQUE INDEX "project_products_project_id_product_id_key" ON "project_products"("project_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "task_briefing_answers_project_task_id_question_key_key" ON "task_briefing_answers"("project_task_id", "question_key");
