// Suítes anteriores a 26/10 criavam projeto implicitamente. Hoje a compra
// exige escolher projeto ANTES: preparar esse dado de teste, sem alterar
// validações reais nem a identidade do projeto em retries.
import crypto from "node:crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";
import { requireTestDatabaseUrl } from "./require-test-database";
const ids = new Map<string, string>();
export async function withCheckoutProject(path: string, opts: { method?: string; token?: string; body?: unknown }, createdIds: string[]) {
  const body = opts.body as Record<string, unknown> | undefined;
  if (path !== "/api/catalog2/checkout" || opts.method !== "POST" || !body || body.project_id) return opts;
  requireTestDatabaseUrl();
  const actor = jwt.decode(opts.token ?? "") as { id?: string; role?: string } | null;
  if (!actor?.id || actor.role === "admin") return opts;
  const key = `${actor.id}:${body.checkout_client_action_id}`;
  let id = ids.get(key);
  if (!id) {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: actor.id } });
    const p = await prisma.project.create({ data: { title: `[TESTE] Checkout ${crypto.randomUUID()}`, project_code: `qa-${crypto.randomUUID()}`, status: "draft", company_id: user.company_id, agency_id: user.agency_id, created_by_user_id: user.id } });
    id = p.id; ids.set(key, id); createdIds.push(id);
  }
  return { ...opts, body: { ...body, project_id: id } };
}
