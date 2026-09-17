#!/bin/sh
# Item 16.2 (reuniao 2026-09-14, "Ordem executavel do deploy").
#
# Substitui `npm run db:deploy` (prisma migrate deploy puro) como comando do
# servico `migrate` em docker-compose.prod.yml. Roda DENTRO do mesmo
# container/imagem (mesmo DATABASE_URL, mesmo schema.prisma) -- nao precisa
# de SSH nem orquestracao nova.
#
# Motivo: `prisma migrate deploy` sozinho ja falhou antes exatamente neste
# banco ("Table 'users' already exists", run 33452356620) porque havia
# migration(s) nao registradas em `_prisma_migrations` cujo efeito fisico ja
# existia no banco -- ele tentou recriar o que ja existia. Este script
# distingue esse caso (baseline dessincronizada -- ABORTA) do caso seguro
# (migration nova genuinamente pendente -- prossegue), usando o mesmo
# `prisma migrate diff` que o workflow de reconciliacao usa para provar se o
# banco fisico ja bate com o schema.prisma alvo.
#
# Contrato de saida: exit 0 = seguro, `prisma migrate deploy` já rodou.
# exit 1 = ABORTADO, NADA foi escrito no banco por este script. Como este
# comando roda dentro de `docker compose run --rm migrate` no meio da cadeia
# `pull && up mysql && run migrate && up backend` do deploy-backend.yml, um
# exit 1 aqui interrompe a cadeia ANTES de `up -d --no-deps backend` --
# o container antigo continua rodando, nunca e trocado por uma versao cujo
# banco nao esta comprovadamente compativel.
#
# Item 16.3 (reuniao 2026-09-14, "Conferir as ferramentas") -- achado real:
# o diff acima e AGREGADO (todas as migrations pendentes de uma vez). Se uma
# migration pendente ANTIGA ja tiver efeito fisico fora da trilha do Prisma
# mas OUTRA pendente, mais nova, for genuinamente aditiva, o diff agregado
# sai NAO-vazio e mascara a antiga -- o script abaixo confere isso, mas
# ANTES disso roda migrate-precheck.js, que confere CADA migration pendente
# INDIVIDUALMENTE contra o information_schema real (nunca so o agregado).
set -eu

echo "== migrate-deploy-checked: verificando pre-condicoes antes de 'prisma migrate deploy' =="

status_output="$(npx prisma migrate status 2>&1)" || true
echo "$status_output"

if echo "$status_output" | grep -qi "database schema is up to date"; then
  echo "== Baseline ja reconciliada, nada pendente no _prisma_migrations. Rodando migrate deploy (no-op esperado) =="
  exec npx prisma migrate deploy
fi

if echo "$status_output" | grep -qi "have not yet been applied"; then
  pending_names="$(printf '%s\n' "$status_output" | awk '/have not yet been applied/{flag=1; next} /^$/{flag=0} flag')"
  echo "== Migration(s) pendente(s) detectada(s): =="
  echo "$pending_names"

  echo "== Conferindo CADA migration pendente individualmente contra o banco real (nao so o diff agregado) =="
  # shellcheck disable=SC2086
  if ! node migrate-precheck.js $pending_names; then
    echo "##[error] ABORTANDO no precheck individual -- ver mensagem acima. NADA foi escrito no banco por este script." >&2
    exit 1
  fi

  echo "== Precheck individual passou -- calculando o diff agregado real contra o schema alvo antes de decidir =="
  diff_output="$(npx prisma migrate diff --from-url "$DATABASE_URL" --to-schema-datamodel prisma/schema.prisma --script 2>&1)"
  echo "$diff_output"
  if echo "$diff_output" | grep -q "This is an empty migration"; then
    {
      echo "##[error] ABORTANDO: ha migration(s) pendente(s) em _prisma_migrations, mas o schema FISICO do banco ja bate com o schema.prisma alvo (diff vazio)."
      echo "##[error] Este e exatamente o padrao da baseline dessincronizada que ja causou falha real antes (\"Table 'users' already exists\", run 33452356620)."
      echo "##[error] 'prisma migrate deploy' tentaria recriar estrutura que ja existe fisicamente -- nao e seguro prosseguir as cegas."
      echo "##[error] Reconciliar a baseline primeiro: qa-migration-reconcile.yml mode=apply, garantindo que TODAS as migrations pendentes (nao so a mais recente) fiquem marcadas como aplicadas -- depois repetir este deploy."
    } >&2
    exit 1
  fi
  echo "== Diff real e NAO-vazio confirmado -- migration(s) pendente(s) sao genuinamente aditivas sobre o banco atual. Rodando migrate deploy =="
  exec npx prisma migrate deploy
fi

{
  echo "##[error] ABORTANDO: 'prisma migrate status' devolveu um estado nao reconhecido (nem 'up to date' nem 'have not yet been applied') -- nao presumindo seguro."
  echo "$status_output"
} >&2
exit 1
