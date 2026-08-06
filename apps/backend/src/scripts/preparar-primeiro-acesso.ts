/**
 * preparar-primeiro-acesso.ts — Deixa os usuários importados da plataforma
 * antiga prontos para definir a própria senha no primeiro acesso.
 *
 * Faz três coisas:
 *
 *   1. Cria usuário para nômade que não tem — 238 dos 396 importados existiam
 *      só como cadastro (na base antiga, `nomad_user` cobria 507 de 790), então
 *      não conseguiam entrar de jeito nenhum.
 *
 *   2. Invalida a senha herdada. Os 809 usuários vieram com o hash bcrypt do
 *      sistema antigo, ou seja, a senha antiga deles ainda valia — inclusive
 *      para quem saiu da operação. O hash é substituído por um valor aleatório
 *      inutilizável (não dá pra "acertar" nem por engano).
 *
 *   3. Gera o link de primeiro acesso. O projeto não envia e-mail, então o link
 *      é gerado aqui e entregue pela operação. O token vai em texto só no
 *      arquivo de saída; no banco fica o hash sha256.
 *
 * Idempotente: quem já definiu senha (must_set_password = false e sem token)
 * não é tocado, salvo --refazer.
 *
 *   npx tsx src/scripts/preparar-primeiro-acesso.ts [--apply] [--refazer]
 *                                                   [--validade=90]
 */

import fs from "node:fs";
import path from "node:path";
import { createHash, randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma";

const APPLY = process.argv.includes("--apply");
const REFAZER = process.argv.includes("--refazer");
const VALIDADE_DIAS = Number(
  process.argv.find((a) => a.startsWith("--validade="))?.split("=")[1] ?? 90,
);

const BASE_URL = process.env.APP_URL ?? "http://localhost:8080";

// Um arquivo por execução, com carimbo de data/hora. Sobrescrever um nome fixo
// seria destrutivo: preparar um único usuário depois apagaria os links de todos
// os outros, e não há como regerar um token já entregue (só emitir outro).
const SAIDA = path.resolve(
  __dirname,
  `../../../../links-primeiro-acesso-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.csv`,
);

function novoToken() {
  const token = randomBytes(32).toString("hex");
  return { token, hash: createHash("sha256").update(token).digest("hex") };
}

/** Hash bcrypt de valor aleatório: existe só pra coluna não ficar vazia. */
function senhaInutilizavel() {
  // Não passa por bcrypt.hash de propósito — nenhuma senha digitada gera este
  // formato, então bcrypt.compare sempre falha, sem custo de CPU.
  return `!indisponivel:${randomBytes(24).toString("hex")}`;
}

async function main() {
  console.log(`▶ Primeiro acesso — ${APPLY ? "APPLY" : "DRY-RUN"}${REFAZER ? " (refazendo tokens)" : ""}\n`);

  // ── 1. Nômades sem usuário ────────────────────────────────────────────────
  const semUsuario = await prisma.nomade.findMany({
    where: { legacy_id: { not: null }, user_id: null },
    select: { id: true, name: true, email: true, legacy_id: true, status: true },
  });

  let criados = 0;
  let colisao = 0;
  let seq = await proximoUserSeq();

  for (const n of semUsuario) {
    const email = n.email.trim().toLowerCase();
    const jaExiste = await prisma.user.findUnique({ where: { email } });
    if (jaExiste) {
      // Já há usuário com este e-mail (o nômade tinha conta sob outro vínculo):
      // aproveita em vez de duplicar.
      if (APPLY) {
        await prisma.nomade.update({ where: { id: n.id }, data: { user_id: jaExiste.id } });
      }
      colisao++;
      continue;
    }
    if (APPLY) {
      const user = await prisma.user.create({
        data: {
          email,
          name: n.name,
          role: "nomad",
          account_type: "nomades",
          password_hash: senhaInutilizavel(),
          must_set_password: true,
          is_active: n.status === "ativo",
          user_code: `user_${seq++}`,
          legacy_id: null,
        },
      });
      await prisma.nomade.update({ where: { id: n.id }, data: { user_id: user.id } });
    }
    criados++;
  }
  console.log(
    `nômades sem usuário: ${semUsuario.length} → ${criados} usuários criados · ${colisao} religados a usuário existente`,
  );

  // ── 2 e 3. Senha herdada e link ───────────────────────────────────────────
  const alvos = await prisma.user.findMany({
    where: REFAZER
      ? { OR: [{ legacy_id: { not: null } }, { must_set_password: true }] }
      : {
          OR: [
            { legacy_id: { not: null }, must_set_password: false },
            { must_set_password: true, password_setup_token: null },
          ],
        },
    select: { id: true, name: true, email: true, user_code: true, role: true },
  });

  console.log(`usuários a preparar: ${alvos.length}`);

  if (!APPLY) {
    console.log("\n(dry-run — nada foi escrito. Rode com --apply.)");
    return;
  }

  const expira = new Date(Date.now() + VALIDADE_DIAS * 86400000);
  const linhas = ["user_code;nome;email;papel;link_primeiro_acesso;expira_em"];

  for (const u of alvos) {
    const { token, hash } = novoToken();
    await prisma.user.update({
      where: { id: u.id },
      data: {
        password_hash: senhaInutilizavel(),
        must_set_password: true,
        password_setup_token: hash,
        password_setup_expires_at: expira,
      },
    });
    linhas.push(
      [
        u.user_code ?? "",
        u.name.replace(/;/g, ","),
        u.email,
        u.role,
        `${BASE_URL}/primeiro-acesso/${token}`,
        expira.toISOString().slice(0, 10),
      ].join(";"),
    );
  }

  fs.writeFileSync(SAIDA, linhas.join("\n"), "utf8");

  console.log(`\n✅ ${alvos.length} usuários preparados`);
  console.log(`   links salvos em: ${SAIDA}`);
  console.log(`   validade: ${VALIDADE_DIAS} dias (até ${expira.toLocaleDateString("pt-BR")})`);
  console.log(
    `\n⚠ O arquivo contém links de acesso — trate como senha. Está fora do versionamento.`,
  );

  const pendentes = await prisma.user.count({ where: { must_set_password: true } });
  const prontos = await prisma.user.count({ where: { must_set_password: false } });
  console.log(`\nusuários aguardando definir senha: ${pendentes} · com senha ativa: ${prontos}`);
}

async function proximoUserSeq(): Promise<number> {
  const users = await prisma.user.findMany({
    where: { user_code: { startsWith: "user_" } },
    select: { user_code: true },
  });
  let max = 0;
  for (const u of users) {
    const m = u.user_code?.match(/^user_(\d+)$/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return max + 1;
}

main()
  .catch((e) => {
    console.error("❌ Erro:", e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
