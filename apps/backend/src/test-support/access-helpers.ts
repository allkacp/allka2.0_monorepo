import { prisma } from "../lib/prisma";

/** P-12: cadastra os acessos do produto no cadastro único (exigências de conexão). */
export async function addAccessRequirements(versionId: string, items: { type: string; label: string; required?: boolean }[]) {
  let order = 1;
  for (const it of items) {
    const ct = await prisma.connectionType.upsert({ where: { key: it.type }, update: {}, create: { key: it.type, name: it.label, allowed_methods_json: "[]", permission_levels_json: "[]" } });
    await prisma.catalog2ConnectionRequirement.create({ data: { version_id: versionId, connection_type_id: ct.id, key: `${it.type}-${order}`, label: it.label, obligation: it.required === false ? "optional" : "required", sort_order: order++ } });
  }
}
