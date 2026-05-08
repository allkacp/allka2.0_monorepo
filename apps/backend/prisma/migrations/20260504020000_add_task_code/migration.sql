-- Add globally-unique operational task code to project_tasks
ALTER TABLE "project_tasks" ADD COLUMN "task_code" TEXT;

-- Ensure uniqueness at the DB level
CREATE UNIQUE INDEX "project_tasks_task_code_key" ON "project_tasks"("task_code");
