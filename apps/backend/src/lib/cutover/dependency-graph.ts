// Grafo de dependências (FKs reais) das entidades centrais — lido direto de
// information_schema, nunca hardcoded, então reflete o banco de verdade em
// qualquer ambiente (dev/QA/teste). Puramente leitura: SELECT em
// information_schema não é uma ação de escrita (não é bloqueada nem
// precisaria ser pelo read-only-guard, mas também nunca passa por
// executeRaw/executeRawUnsafe).
import { Prisma } from "@prisma/client";

export interface ForeignKeyDependency {
  table: string;
  column: string;
  references_table: string;
  references_column: string;
  on_delete: "CASCADE" | "SET NULL" | "RESTRICT" | "NO ACTION" | string;
}

export interface DependencyGraphDb {
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: unknown[]): Promise<T>;
}

// Mesmas 8 tabelas-núcleo já usadas na auditoria de preparação da virada —
// tudo que aponta pra elas precisa ser considerado na ordem de cópia/limpeza.
export const CORE_ENTITY_TABLES = [
  "users",
  "companies",
  "agencies",
  "nomades",
  "projects",
  "products",
  "catalog2_products",
  "partner_profiles",
] as const;

interface RawFkRow {
  TABLE_NAME: string;
  COLUMN_NAME: string;
  REFERENCED_TABLE_NAME: string;
  REFERENCED_COLUMN_NAME: string;
  DELETE_RULE: string;
}

export async function getForeignKeyDependencies(
  db: DependencyGraphDb,
  coreTables: readonly string[] = CORE_ENTITY_TABLES,
): Promise<ForeignKeyDependency[]> {
  const rows = await db.$queryRaw<RawFkRow[]>(Prisma.sql`
    SELECT
      k.TABLE_NAME AS TABLE_NAME,
      k.COLUMN_NAME AS COLUMN_NAME,
      k.REFERENCED_TABLE_NAME AS REFERENCED_TABLE_NAME,
      k.REFERENCED_COLUMN_NAME AS REFERENCED_COLUMN_NAME,
      r.DELETE_RULE AS DELETE_RULE
    FROM information_schema.KEY_COLUMN_USAGE k
    JOIN information_schema.REFERENTIAL_CONSTRAINTS r
      ON r.CONSTRAINT_SCHEMA = k.TABLE_SCHEMA
     AND r.CONSTRAINT_NAME = k.CONSTRAINT_NAME
     AND r.TABLE_NAME = k.TABLE_NAME
    WHERE k.TABLE_SCHEMA = DATABASE()
      AND k.REFERENCED_TABLE_NAME IN (${Prisma.join(coreTables)})
    ORDER BY k.REFERENCED_TABLE_NAME, k.TABLE_NAME, k.COLUMN_NAME;
  `);

  return rows.map((r) => ({
    table: r.TABLE_NAME,
    column: r.COLUMN_NAME,
    references_table: r.REFERENCED_TABLE_NAME,
    references_column: r.REFERENCED_COLUMN_NAME,
    on_delete: r.DELETE_RULE,
  }));
}

/** Ordem segura de leitura/cópia: tabelas-núcleo sem dependentes RESTRICT primeiro seria ideal,
 * mas a ordem real depende do grafo — esta função só isola quem trava (RESTRICT), que é o que
 * importa pra decidir a ordem de uma futura limpeza (nunca executada aqui). */
export function restrictedDependencies(deps: ForeignKeyDependency[]): ForeignKeyDependency[] {
  return deps.filter((d) => d.on_delete === "RESTRICT");
}
