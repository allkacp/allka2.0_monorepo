// Auditoria SOMENTE LEITURA dos campos comerciais "antigos" do catalog2 (16/10): para cada campo, quantos valores existem fora do padrão,
// em quais produtos/versões, se ainda têm efeito e onde podem ser alterados. Nada é gravado.
//
// Uso: npx tsx src/scripts/catalog2-legacy-fields-audit.ts            (imprime o relatório em Markdown)
//      npx tsx src/scripts/catalog2-legacy-fields-audit.ts --json     (saída em JSON)
import { prisma } from "../lib/prisma";

type Row = Record<string, unknown>;
const num = (v: unknown) => Number(v ?? 0);
async function dist(table: string, column: string, extraWhere = ""): Promise<{ value: string; n: number }[]> {
  const rows = (await prisma.$queryRawUnsafe(`SELECT \`${column}\` AS v, COUNT(*) AS n FROM \`${table}\` ${extraWhere} GROUP BY \`${column}\` ORDER BY n DESC`)) as Row[];
  return rows.map((r) => ({ value: String(r.v), n: num(r.n) }));
}

export interface FieldAudit { field: string; table: string; default_value: string; distribution: { value: string; n: number }[]; non_default: number; effect: string; editable_in: string; note: string }

export async function auditLegacyFields(): Promise<FieldAudit[]> {
  const out: FieldAudit[] = [];
  const add = async (table: string, column: string, def: string, effect: string, editable_in: string, note: string, field = column) => {
    const d = await dist(table, column);
    out.push({ field, table, default_value: def, distribution: d, non_default: d.filter((x) => x.value !== def).reduce((a, x) => a + x.n, 0), effect, editable_in, note });
  };
  await add("catalog2_product_versions", "has_initial_implementation", "0", "Só troca o rótulo do contrato (`mensal` × `mensal_implementacao`) e o log. Não muda preço, prazo nem tarefas.", "Sem tela (removido do cartão em 14/10).", "Substituído pelas etapas “Só na primeira execução”.");
  await add("catalog2_product_versions", "implementation_rule", "first_only", "Só age sobre TAREFA com ciclo “implementação” (produto individual não tem). Em preço e geração, `on_revalidation` e `first_only` se comportam igual (1ª vez).", "Sem tela.", "Valor antigo `on_revalidation` do preenchimento de 02/10; neutralizado no Produto 1.");
  await add("catalog2_product_versions", "implementation_blocks_operation", "1", "Só vale se houver tarefa de implementação E tarefa operacional no mesmo produto (combos antigos).", "Sem tela.", "Sem efeito em produto individual.");
  await add("catalog2_product_versions", "sell_mode", "standalone", "`package_only` + `sale_modes_enforced` bloqueia a compra fora de um pacote ativo. Não bloqueia a publicação.", "Sem tela no cadastro; a decisão passou para Pacotes e Dependências (“Impedir venda separada”).", "Campo mantido para contratos/versões antigas.");
  await add("catalog2_product_versions", "sale_modes_enforced", "0", "Liga a validação de modalidades na cotação/checkout. É ligado sozinho ao publicar e ao criar versão nova.", "Automático (publicação).", "Rascunho antigo pode estar 0; vira 1 ao publicar.");
  await add("catalog2_product_versions", "accepts_one_time", "1", "Define se o produto é vendido avulso (um ciclo, sem renovação).", "Passo 2 › Entrega comercial › Modalidade › Avulso.", "Campo visível.");
  await add("catalog2_product_versions", "accepts_recurring", "0", "Define se há assinatura mensal. Exige “Este produto gera uma nova entrega todo mês” (Passo 4).", "Passo 2 › Entrega comercial › Modalidade › Assinatura mensal.", "Campo visível.");
  await add("catalog2_tasks", "cycle_type", "recorrente", "Tarefa `implementacao` é cobrada só na 1ª vez; `avulso` uma única vez; `recorrente` todo ciclo.", "Sem tela (painel da tarefa removido); padrão `recorrente` serve ao produto individual.", "Em produto individual a primeira execução é por ETAPA.");
  await add("catalog2_tasks", "repeat_rule", "all_cycles", "`first_only` trata a tarefa inteira como cobrança única; `every_n_cycles` espaça os ciclos.", "Sem tela; padrão `all_cycles`.", "Equivale a `repeat_mode` citado no pedido (o nome real é repeat_rule).");
  await add("catalog2_tasks", "asset_rule", "first_only", "Quando os acessos são revalidados (primeira vez, sempre, a cada X dias, mudança do cliente/executor…).", "Passo 2 › Continuidade do executor › Revalidação dos acessos.", "Equivale a `access_request_rule` citado no pedido (o nome real é asset_rule).");
  await add("catalog2_tasks", "executor_continuity", "not_allowed", "Define se a tarefa tenta voltar ao mesmo executor e habilita a dispensa de etapas “dispensáveis”.", "Passo 2 › Continuidade do executor nos próximos ciclos.", "Equivale a `continuity_mode` citado no pedido (o nome real é executor_continuity).");
  await add("catalog2_task_steps", "first_execution_only", "0", "Forma a IMPLANTAÇÃO: entra só na primeira cobrança e roda só no 1º ciclo do produto no projeto.", "Etapa › bloco 3 › Só na primeira execução.", "Campo visível.");
  await add("catalog2_task_steps", "skip_when_same_executor", "0", "Dispensa a etapa quando o mesmo executor continua (exige continuidade ≠ não permitida).", "Etapa › bloco 3 › Dispensável quando o mesmo executor continua.", "Campo visível.");
  return out;
}

async function main() {
  const rows = await auditLegacyFields();
  const products = (await prisma.$queryRawUnsafe(
    "SELECT p.sequence_number AS n, p.internal_name AS nome, v.version_number AS v, v.state AS estado, v.implementation_rule AS impl_rule, v.has_initial_implementation AS has_impl, v.sell_mode AS sell_mode, v.sale_modes_enforced AS enforced FROM catalog2_product_versions v JOIN catalog2_products p ON p.id = v.product_id WHERE v.implementation_rule <> 'first_only' OR v.has_initial_implementation = 1 OR v.sell_mode <> 'standalone' ORDER BY p.sequence_number, v.version_number",
  )) as Row[];
  if (process.argv.includes("--json")) { console.log(JSON.stringify({ campos: rows, versoes_com_valor_antigo: products }, null, 2)); return; }
  console.log("# Auditoria dos campos comerciais antigos (somente leitura)\n");
  for (const r of rows) {
    console.log(`## ${r.table}.${r.field}`);
    console.log(`- Padrão: \`${r.default_value}\` · fora do padrão: **${r.non_default}** · distribuição: ${r.distribution.map((d) => `\`${d.value}\`=${d.n}`).join(", ") || "—"}`);
    console.log(`- Efeito hoje: ${r.effect}`);
    console.log(`- Onde editar: ${r.editable_in}`);
    console.log(`- Observação: ${r.note}\n`);
  }
  console.log("## Versões com valor antigo preservado");
  if (products.length === 0) console.log("Nenhuma.");
  for (const p of products) console.log(`- Produto #${p.n} “${p.nome}” v${p.v} (${p.estado}): implementation_rule=${p.impl_rule}, has_initial_implementation=${p.has_impl}, sell_mode=${p.sell_mode}, sale_modes_enforced=${p.enforced}`);
}

if (require.main === module || process.argv[1]?.includes("catalog2-legacy-fields-audit")) {
  main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
}
