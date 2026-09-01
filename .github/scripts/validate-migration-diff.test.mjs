import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { classifyDiff } from "./validate-migration-diff.mjs";

describe("validate-migration-diff — classificador estático do diff de migration", () => {
  it("DROP COLUMN é bloqueado", () => {
    const r = classifyDiff("ALTER TABLE `users` DROP COLUMN `phone`;");
    assert.equal(r.blockedCount, 1);
    assert.equal(r.safeCount, 0);
  });

  it("mudança de tipo (MODIFY) cai em review, nunca em safe automático", () => {
    const r = classifyDiff("ALTER TABLE `users` MODIFY `phone` VARCHAR(20) NOT NULL;");
    assert.equal(r.blockedCount, 0);
    assert.equal(r.reviewCount, 1);
    assert.equal(r.safeCount, 0);
  });

  it("CHANGE que renomeia coluna é bloqueado (rename disfarçado)", () => {
    const r = classifyDiff("ALTER TABLE `users` CHANGE `old_name` `new_name` VARCHAR(191) NULL;");
    assert.equal(r.blockedCount, 1);
  });

  it("CHANGE que só re-tipifica sem renomear cai em review", () => {
    const r = classifyDiff("ALTER TABLE `users` CHANGE `phone` `phone` VARCHAR(30) NULL;");
    assert.equal(r.blockedCount, 0);
    assert.equal(r.reviewCount, 1);
  });

  it("RENAME TABLE é bloqueado", () => {
    const r = classifyDiff("RENAME TABLE `users` TO `people`;");
    assert.equal(r.blockedCount, 1);
  });

  it("RENAME INDEX é safe (índice não carrega dado nem identidade de linha)", () => {
    const r = classifyDiff("ALTER TABLE `legacy_records` RENAME INDEX `old_idx` TO `new_idx`;");
    assert.equal(r.blockedCount, 0);
    assert.equal(r.reviewCount, 0);
    assert.equal(r.safeCount, 1);
  });

  it("DELETE é bloqueado", () => {
    const r = classifyDiff("DELETE FROM `users` WHERE 1=1;");
    assert.equal(r.blockedCount, 1);
  });

  it("TRUNCATE é bloqueado", () => {
    const r = classifyDiff("TRUNCATE `users`;");
    assert.equal(r.blockedCount, 1);
  });

  it("DROP TABLE é bloqueado", () => {
    const r = classifyDiff("DROP TABLE `users`;");
    assert.equal(r.blockedCount, 1);
  });

  it("diff vazio é tratado corretamente (isEmpty=true, zero statements)", () => {
    const r = classifyDiff("-- This is an empty migration.\n");
    assert.equal(r.isEmpty, true);
    assert.equal(r.statements.length, 0);
    assert.equal(r.blockedCount, 0);
  });

  it("somente DDL aditivo (CREATE TABLE + ADD COLUMN + ADD INDEX + ADD CONSTRAINT FK) é permitido como safe", () => {
    const sql = `
-- CreateTable
CREATE TABLE \`catalog2_change_orders\` (
  \`id\` VARCHAR(191) NOT NULL,
  PRIMARY KEY (\`id\`)
);

-- AlterTable
ALTER TABLE \`project_products\` ADD COLUMN \`catalog2_product_id\` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX \`project_products_catalog2_product_id_idx\` ON \`project_products\`(\`catalog2_product_id\`);

-- AddForeignKey
ALTER TABLE \`project_products\` ADD CONSTRAINT \`project_products_catalog2_product_id_fkey\` FOREIGN KEY (\`catalog2_product_id\`) REFERENCES \`catalog2_products\`(\`id\`) ON DELETE RESTRICT ON UPDATE CASCADE;
`;
    const r = classifyDiff(sql);
    assert.equal(r.blockedCount, 0);
    assert.equal(r.reviewCount, 0);
    assert.equal(r.safeCount, 4);
  });

  it("DROP FOREIGN KEY seguido de ADD CONSTRAINT (par comum de nullable) fica: drop=safe, add=safe, nenhum blocked", () => {
    const sql = `
ALTER TABLE \`project_products\` DROP FOREIGN KEY \`project_products_product_id_fkey\`;

ALTER TABLE \`project_products\` MODIFY \`product_id\` VARCHAR(191) NULL;

ALTER TABLE \`project_products\` ADD CONSTRAINT \`project_products_product_id_fkey\` FOREIGN KEY (\`product_id\`) REFERENCES \`products\`(\`id\`) ON DELETE SET NULL ON UPDATE CASCADE;
`;
    const r = classifyDiff(sql);
    assert.equal(r.blockedCount, 0);
    // o MODIFY (nullable) ainda exige review humano — comprovadamente não é
    // auto-safe só pelo texto do diff.
    assert.equal(r.reviewCount, 1);
    assert.equal(r.safeCount, 2);
  });

  it("DROP INDEX isolado (statement de topo) é safe", () => {
    const r = classifyDiff("DROP INDEX `users_must_set_password_idx` ON `users`;");
    assert.equal(r.blockedCount, 0);
    assert.equal(r.safeCount, 1);
  });

  it("statement completamente desconhecido cai em blocked por padrão", () => {
    const r = classifyDiff("EXOTIC STATEMENT THAT DOES NOT EXIST;");
    assert.equal(r.blockedCount, 1);
  });

  it("ALTER TABLE com múltiplas cláusulas mistas (ADD + MODIFY) reflete o pior nível entre elas", () => {
    const sql = "ALTER TABLE `project_tasks` ADD COLUMN `catalog2_task_id` VARCHAR(191) NULL, MODIFY `product_id` VARCHAR(191) NULL;";
    const r = classifyDiff(sql);
    assert.equal(r.blockedCount, 0);
    assert.equal(r.reviewCount, 1, "review porque tem uma cláusula MODIFY, mesmo com ADD COLUMN junto");
  });

  it("ALTER TABLE com DROP COLUMN misturado a cláusulas seguras ainda bloqueia o statement inteiro", () => {
    const sql = "ALTER TABLE `users` ADD COLUMN `x` VARCHAR(191) NULL, DROP COLUMN `y`;";
    const r = classifyDiff(sql);
    assert.equal(r.blockedCount, 1);
  });
});
