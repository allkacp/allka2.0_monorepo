-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "project_id" TEXT NOT NULL,
    "user_id" TEXT,
    "amount" REAL NOT NULL,
    "payment_method" TEXT NOT NULL DEFAULT 'CARTAO_TESTE',
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "gateway" TEXT NOT NULL DEFAULT 'FAKE_SANDBOX',
    "fake_transaction_id" TEXT,
    "card_last_digits" TEXT,
    "card_holder" TEXT,
    "notes" TEXT,
    "paid_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL,
    CONSTRAINT "payments_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
