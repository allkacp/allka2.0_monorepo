#!/usr/bin/env node
/**
 * Compara o que está rodando em produção com o commit publicado.
 *
 * Por que isto existe: em 07-08/08/2026 o deploy falhou em silêncio duas
 * vezes seguidas, de duas formas diferentes, e nas duas o pipeline ficou
 * verde:
 *
 *   1. O cache de layers do Actions publicava imagens carimbadas com o SHA
 *      certo mas contendo código de dias antes. A tag batia, o conteúdo não.
 *   2. Numa subida com backend e frontend, só o frontend foi. O backend ficou
 *      no commit anterior, sem a migration nova, sem nenhum aviso.
 *
 * Os dois casos só apareceram porque alguém foi conferir na mão. Este script
 * transforma essa conferência em um comando.
 *
 * Uso:
 *   node tools/verificar-deploy.mjs
 *
 * Precisa de acesso SSH ao VPS (chave allka_deploy). Sai com código 1 quando
 * encontra divergência, para poder ser usado em automação.
 */
import { execSync } from "node:child_process";

const VPS = process.env.ALLKA_VPS ?? "root@2.24.203.121";
const CHAVE = process.env.ALLKA_SSH_KEY ?? `${process.env.HOME}/.ssh/allka_deploy`;
const REMOTO = process.env.ALLKA_REMOTE ?? "allka2";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

function ssh(cmd) {
  return sh(
    `ssh -i "${CHAVE}" -o StrictHostKeyChecking=no -o ConnectTimeout=15 ${VPS} ${JSON.stringify(cmd)}`,
  );
}

let problemas = 0;

// ── o que o repositório publicou ────────────────────────────────────────────
let publicado;
try {
  sh(`git fetch ${REMOTO} --quiet`);
  publicado = sh(`git rev-parse --short=7 ${REMOTO}/main`);
} catch {
  console.error(`Não consegui ler ${REMOTO}/main. O remote existe?`);
  process.exit(2);
}

// ── o que está rodando ──────────────────────────────────────────────────────
let rodando;
try {
  rodando = ssh(
    "docker ps --format '{{.Names}} {{.Image}}' | grep -E 'backend|frontend'",
  );
} catch {
  console.error("Não consegui falar com o VPS por SSH.");
  process.exit(2);
}

const tags = {};
for (const linha of rodando.split("\n")) {
  const [nome, imagem] = linha.trim().split(/\s+/);
  const servico = nome.includes("backend") ? "backend" : "frontend";
  tags[servico] = (imagem ?? "").split(":").pop();
}

// Os workflows têm filtro de caminho: cada um só roda quando os arquivos do
// seu serviço mudam. Então o esperado para cada serviço não é o HEAD, e sim o
// último commit que tocou nos caminhos dele — comparar com o HEAD acusaria
// diferença toda vez que um commit mexe só num lado.
const CAMINHOS = {
  backend: "apps/backend docker/backend.prod.Dockerfile docker-compose.prod.yml infra .github/workflows/deploy-backend.yml",
  frontend: "apps/frontend docker/frontend.prod.Dockerfile .github/workflows/deploy-frontend.yml",
};

/** `a` é ancestral de `b` (ou o próprio)? */
function contem(a, b) {
  try {
    sh(`git merge-base --is-ancestor ${a} ${b}`);
    return true;
  } catch {
    return false;
  }
}

console.log(`commit publicado em ${REMOTO}/main : ${publicado}\n`);
const esperado = {};
for (const servico of ["backend", "frontend"]) {
  esperado[servico] = sh(
    `git log -1 --format=%h --abbrev=7 ${REMOTO}/main -- ${CAMINHOS[servico]}`,
  );
  const tag = tags[servico] ?? "";

  // Rodar um commit MAIS NOVO que o último a tocar no serviço não é
  // divergência: um deploy manual (workflow_dispatch) reconstrói no HEAD
  // mesmo sem mudança nos caminhos daquele serviço. O que importa é o
  // commit em produção conter a última mudança do serviço e existir na
  // branch publicada — não ser exatamente igual.
  const naBranch = tag ? contem(tag, publicado) : false;
  const temAMudanca = tag ? contem(esperado[servico], tag) : false;
  const ok = naBranch && temAMudanca;
  if (!ok) problemas++;

  const motivo = !tag
    ? "não está rodando"
    : !naBranch
      ? `${tag} não está em ${REMOTO}/main`
      : `${tag} é anterior a ${esperado[servico]}`;
  console.log(
    `  ${ok ? "ok   " : "ATRÁS"}  ${servico.padEnd(9)} rodando ${tag || "—"}` +
      (ok
        ? tag === esperado[servico]
          ? ""
          : ` (inclui ${esperado[servico]}, a última mudança do serviço)`
        : ` — ${motivo}`),
  );
}

// ── a tag bate, mas o conteúdo confere? ─────────────────────────────────────
// Só a tag não basta: foi exatamente esse o primeiro modo de falha. Procura
// no dist do container uma marca que só existe no código atual.
if (tags.backend && contem(esperado.backend, tags.backend)) {
  const marcaLocal = sh(
    "git grep -c requirePermission -- apps/backend/src/middleware/auth.ts || true",
  );
  if (marcaLocal && marcaLocal !== "0") {
    let dentro = "0";
    try {
      dentro = ssh(
        "docker exec allka-2026-backend-1 grep -c requirePermission dist/middleware/auth.js || true",
      );
    } catch {
      dentro = "0";
    }
    const confere = dentro !== "0" && dentro !== "";
    if (!confere) problemas++;
    console.log(
      `\n  ${confere ? "ok " : "IMAGEM VELHA"}  conteúdo do backend ${
        confere ? "confere com o código" : "NÃO corresponde à tag"
      }`,
    );
  }
}

// ── migrations pendentes ────────────────────────────────────────────────────
try {
  const noRepo = sh(
    "git ls-tree -d --name-only HEAD apps/backend/prisma/migrations | wc -l",
  );
  // Roda por arquivo em vez de linha única: o escape do shell aninhado
  // (ssh -> bash -> docker -> mysql) era o que impedia a consulta de rodar.
  const comando =
    "cd /opt/allka-2026 && . ./.env && " +
    'docker compose exec -T mysql mysql -u root -p"$MYSQL_ROOT_PASSWORD" ' +
    '"$MYSQL_DATABASE" -N -e "SELECT COUNT(*) FROM _prisma_migrations;" 2>/dev/null';
  const aplicadas = ssh(comando).split("\n").pop().trim();
  const faltam = Number(noRepo) - Number(aplicadas);
  if (Number.isFinite(faltam) && faltam > 0) {
    problemas++;
    console.log(`\n  PENDENTE  ${faltam} migration(s) não aplicada(s) em produção`);
  } else if (Number.isFinite(faltam)) {
    console.log(`\n  ok        migrations em dia (${aplicadas} aplicadas)`);
  }
} catch {
  console.log("\n  (não consegui conferir as migrations)");
}

console.log(
  problemas === 0
    ? "\n══ produção está com o código publicado ══"
    : `\n══ ${problemas} divergência(s) — produção NÃO está com o código publicado ══`,
);
process.exit(problemas === 0 ? 0 : 1);
