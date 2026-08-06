/**
 * extract-legacy-operations.js — Extrai do dump da plataforma antiga o domínio
 * de OPERAÇÃO DE TAREFAS (o "motor"): tarefas, etapas, delegação, qualificação,
 * prazos, avaliações e os históricos de status. Também traz projetos e os
 * produtos de cada projeto, que são a base da importação.
 *
 * Serve a dois propósitos:
 *   - entender como o motor antigo funcionava (ver docs/motor-tarefas-legado.md)
 *   - alimentar a importação real (apps/backend/src/scripts/import-legacy-platform.ts)
 *
 * Por isso NÃO trunca texto: conteúdo cortado aqui viraria conteúdo cortado
 * dentro da plataforma nova. As tabelas de conteúdo pesado (respostas de
 * briefing, itens entregues) entram só como amostra, porque não são importadas
 * — existem aqui apenas para inspeção do formato.
 *
 * Fora do escopo: relatórios (não funcionavam no sistema antigo).
 *
 * Uso: node scripts/extract-legacy-operations.js
 */

const path = require("node:path");
const { extract } = require("./lib/dump-extract");

const WANTED = {
  // domínio / lookup
  task_status: Infinity,
  task_stage_status: Infinity,
  task_delegation_status: Infinity,
  task_qualification_status: Infinity,
  task_type: Infinity,
  task_category: Infinity,
  task_reproval_reason_list: Infinity,
  task_reproval_reason: Infinity,
  project_status: Infinity,
  project_cancel_reason_list: Infinity,
  project_lost_reason_list: Infinity,
  nomad_level_config: Infinity,
  // o motor
  task: Infinity,
  task_stage: Infinity,
  task_status_history: Infinity,
  task_stage_status_history: Infinity,
  task_delegation_status_history: Infinity,
  task_stage_delegation_status_history: Infinity,
  task_qualification_status_history: Infinity,
  task_stage_qualification_status_history: Infinity,
  task_update_deadline_log: Infinity,
  task_stage_update_deadline_log: Infinity,
  task_rating: Infinity,
  task_stage_rating: Infinity,
  task_qualification_checklist: Infinity,
  task_especial_alert: Infinity,
  // projetos
  project: Infinity,
  project_product: Infinity,
  project_status_history: Infinity,
  // Respostas de briefing: importadas de verdade (viram TaskBriefingAnswer),
  // por isso vêm completas.
  task_answered_question: Infinity,
  // conteúdo pesado: só amostra, não é importado
  task_delivered_itens: 300,
  task_project_vault: 300,
};

extract({
  dump: path.resolve(__dirname, "../../allka antigo/Dump20260423.sql"),
  out: path.resolve(__dirname, "../../allka antigo/operacao-tarefas-legado.json"),
  wanted: WANTED,
  maxString: 0,
  escopo:
    "Operação de tarefas (motor de execução) + projetos. Texto integral; tabelas de conteúdo pesado amostradas.",
}).catch((e) => {
  console.error("❌", e);
  process.exit(1);
});
