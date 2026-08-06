/**
 * migrar-agencias-para-empresas.ts — Converte agências específicas em Company.
 *
 * A plataforma antiga não tinha o conceito de "empresa contratante": toda
 * organização era Agency. Três delas, na verdade, são clientes finais que
 * contratam direto (Sebrae, Brivia, Able Digital), e no modelo novo o lugar
 * delas é Company.
 *
 * Move tudo que estava pendurado na Agency:
 *   - usuários (membros e dono) → company_id, papéis de empresa
 *   - vínculos de cliente (ClientLink.agency_id) → company_id
 *   - projetos (Project.agency_id) → company_id
 * e só então apaga a Agency, para nenhuma FK ficar apontando para o vazio.
 *
 * Idempotente: reconhece pelo legacy_id o que já foi convertido.
 *   npx tsx src/scripts/migrar-agencias-para-empresas.ts [--apply]
 */

import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");

// legacy_id das agências da plataforma antiga que viram Company.
const ALVOS = [
  { legacyId: 297, nome: "Sebrae" },
  { legacyId: 158, nome: "Brivia" },
  { legacyId: 403, nome: "Able Digital" },
];

async function main() {
  console.log(`▶ Agências → Empresas — ${APPLY ? "APPLY" : "DRY-RUN"}\n`);

  for (const alvo of ALVOS) {
    const agency = await prisma.agency.findFirst({ where: { legacy_id: alvo.legacyId } });
    if (!agency) {
      const jaConvertida = await prisma.company.findFirst({ where: { legacy_id: alvo.legacyId } });
      console.log(
        jaConvertida
          ? `✓ ${alvo.nome} já é empresa (${jaConvertida.name})`
          : `⚠ ${alvo.nome} (#${alvo.legacyId}) não encontrada`,
      );
      continue;
    }

    const [membros, links, projetos] = await Promise.all([
      prisma.user.findMany({ where: { agency_id: agency.id }, select: { id: true } }),
      prisma.clientLink.findMany({ where: { agency_id: agency.id }, select: { id: true, client_id: true } }),
      prisma.project.findMany({ where: { agency_id: agency.id }, select: { id: true } }),
    ]);

    console.log(
      `■ ${agency.name} → Company · ${membros.length} usuários · ${links.length} clientes · ${projetos.length} projetos`,
    );

    if (!APPLY) continue;

    await prisma.$transaction(async (tx) => {
      const company = await tx.company.create({
        data: {
          name: agency.name,
          cnpj: agency.cnpj,
          email: agency.email,
          phone: agency.phone,
          type: "empresa",
          status: agency.status === "ativo" ? "ativo" : "inativo",
          address: agency.address,
          number: agency.number,
          neighborhood: agency.neighborhood,
          city: agency.city,
          state: agency.state,
          zip_code: agency.zip_code,
          pix_key: agency.pix_key,
          pix_key_type: agency.pix_key_type,
          legacy_id: agency.legacy_id,
        },
      });

      // Projetos e vínculos de cliente trocam de dono. Feito ANTES de apagar a
      // Agency porque as FKs apontam para ela.
      await tx.project.updateMany({
        where: { agency_id: agency.id },
        data: { agency_id: null, company_id: company.id },
      });

      for (const link of links) {
        // O par (cliente, empresa) tem unique próprio — se já existir vínculo
        // com esta empresa, o antigo é descartado em vez de duplicar.
        const jaExiste = await tx.clientLink.findFirst({
          where: { client_id: link.client_id, company_id: company.id },
        });
        if (jaExiste) {
          await tx.clientLink.delete({ where: { id: link.id } });
        } else {
          await tx.clientLink.update({
            where: { id: link.id },
            data: { agency_id: null, company_id: company.id },
          });
        }
      }

      // Membros viram usuários da empresa; o dono vira company_admin e assume
      // owner_user_id (que é unique, por isso sai da Agency antes).
      const donoId = agency.owner_user_id;
      for (const m of membros) {
        await tx.user.update({
          where: { id: m.id },
          data: {
            agency_id: null,
            company_id: company.id,
            role: m.id === donoId ? "company_admin" : "company_user",
            account_type: "empresas",
          },
        });
      }
      if (donoId && !membros.some((m) => m.id === donoId)) {
        await tx.user.update({
          where: { id: donoId },
          data: {
            agency_id: null,
            company_id: company.id,
            role: "company_admin",
            account_type: "empresas",
          },
        });
      }
      await tx.company.update({
        where: { id: company.id },
        data: { owner_user_id: donoId ?? null },
      });

      await tx.agency.delete({ where: { id: agency.id } });
    });

    console.log(`   ✅ convertida`);
  }

  const empresas = await prisma.company.count();
  const agencias = await prisma.agency.count();
  console.log(`\n${APPLY ? "✅" : "◻"} empresas: ${empresas} · agências: ${agencias}`);
  if (!APPLY) console.log("(dry-run — nada foi escrito. Rode com --apply.)");
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
