/**
 * Fixture LOCAL do novo catálogo (sprint de produtos, bloco 3/6).
 *
 *   npm run catalog2:seed-demo
 *   npm run catalog2:seed-demo -- --remove
 *
 * UM produto `[TESTE LOCAL]` completo: v1 PUBLICADA + v2 rascunho, 1 variação
 * obrigatória com opções (uma com efeito), 1 adicional opcional com efeito,
 * tarefas ordenadas com etapas ordenadas (incl. 1 tarefa condicional e 1
 * híbrida com custo de IA), 1 condição TIPADA, especialidades com valor/hora,
 * e o módulo de precificação com percentuais preenchidos (só localmente).
 * Nunca se mistura aos 36 da planilha. Não roda no boot.
 */
import { PrismaClient } from "@prisma/client";
import { assertLocalDatabase } from "../lib/assert-local-database";
import { seedCatalog2Classifications } from "../lib/catalog2-classifications-seed";
import { publishVersion, describeCondition } from "../lib/catalog2-service";

const SLUG = "teste-local-produto-demonstrativo";
const NAME = "[TESTE LOCAL] Produto Demonstrativo";
const db = new PrismaClient();

async function remove() {
  const p = await db.catalog2Product.findUnique({ where: { slug: SLUG } });
  if (!p) {
    console.log("Nada a remover.");
    return;
  }
  await db.catalog2Product.update({ where: { id: p.id }, data: { published_version_id: null } });
  await db.catalog2ProductVersion.deleteMany({ where: { product_id: p.id } });
  await db.catalog2ProductFourF.deleteMany({ where: { product_id: p.id } });
  await db.catalog2Product.delete({ where: { id: p.id } });
  console.log("Fixture removido.");
}

async function main() {
  assertLocalDatabase(process.env.DATABASE_URL);
  if (process.argv.includes("--remove")) return remove();

  await seedCatalog2Classifications(db);

  // Só localmente: preenche percentuais e valores para o cálculo ficar completo.
  await db.catalog2PricingSettings.upsert({
    where: { id: "default" },
    create: { id: "default", tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 15, currency: "BRL", notes: "[TESTE LOCAL] valores fictícios para o simulador." },
    update: { tax_percent: 6, commission_percent: 10, operational_fee_percent: 5, profit_margin_percent: 30, human_review_percent: 15 },
  });
  await db.catalog2Specialty.updateMany({ where: { key: "designer" }, data: { max_hourly_rate: 90, hourly_rate_note: "[TESTE LOCAL]" } });
  await db.catalog2Specialty.updateMany({ where: { key: "redator" }, data: { max_hourly_rate: 70, hourly_rate_note: "[TESTE LOCAL]" } });

  if (await db.catalog2Product.findUnique({ where: { slug: SLUG } })) {
    console.log("Fixture já existe. Use --remove para recriar.");
    return;
  }

  const pillar = await db.catalog2Pillar.findUnique({ where: { key: "redes_conteudo" } });
  const category = await db.catalog2Category.findUnique({ where: { key: "design" } });
  const fF = await db.catalog2FourF.findMany({ where: { key: { in: ["fluxo", "forca"] } } });
  const designer = await db.catalog2Specialty.findUnique({ where: { key: "designer" } });
  const redator = await db.catalog2Specialty.findUnique({ where: { key: "redator" } });

  const product = await db.catalog2Product.create({
    data: {
      slug: SLUG,
      internal_name: NAME,
      pillar_id: pillar?.id ?? null,
      category_id: category?.id ?? null,
      origin: "existente",
      status: "em_preparacao",
      four_f: { create: fF.map((f) => ({ four_f_id: f.id })) },
    },
  });

  const v1 = await db.catalog2ProductVersion.create({
    data: {
      product_id: product.id,
      version_number: 1,
      state: "rascunho",
      title: "Peça de Comunicação (demo)",
      summary: "Arte + copy + legenda para redes sociais.",
      full_description: "Versão 1 — valida a arquitetura do construtor, condições tipadas e o simulador de preço.",
      tasks: {
        create: [
          {
            key: "briefing",
            name: "Alinhar briefing",
            objective: "Entender o objetivo da peça.",
            sort_order: 1,
            execution_mode: "humano",
            specialty_id: redator?.id ?? null,
            estimated_minutes: 60,
            requires_review: false,
            steps: { create: [
              { key: "coletar", name: "Coletar referências", sort_order: 1, estimated_minutes: 30 },
              { key: "validar", name: "Validar com o cliente", sort_order: 2, estimated_minutes: 30 },
            ] },
          },
          {
            key: "criacao",
            name: "Criar a arte",
            objective: "Produzir a peça visual.",
            sort_order: 2,
            execution_mode: "hibrido",
            specialty_id: designer?.id ?? null,
            estimated_minutes: 120,
            requires_review: true,
            steps: { create: [
              { key: "rascunho", name: "Gerar rascunho", sort_order: 1, estimated_minutes: 40 },
              { key: "refino", name: "Refinar com direção de arte", sort_order: 2, estimated_minutes: 50 },
              { key: "entrega", name: "Exportar e entregar", sort_order: 3, estimated_minutes: 30 },
            ] },
            ai: { create: {
              provider: "(a definir)", model: "(a definir)",
              est_input_tokens: 1500, est_output_tokens: 900,
              unit_cost_input_per_1k: 0.01, unit_cost_output_per_1k: 0.03,
              currency: "BRL", est_review_rounds: 1,
              cost_note: "[TESTE LOCAL] custos fictícios.", human_review_required: true,
            } },
          },
          {
            key: "animacao",
            name: "Animar (só Motion)",
            objective: "Animação da peça — só quando o formato Motion é escolhido.",
            sort_order: 3,
            execution_mode: "humano",
            specialty_id: designer?.id ?? null,
            estimated_minutes: 90,
            is_conditional: true,
            steps: { create: [{ key: "keyframes", name: "Montar keyframes", sort_order: 1, estimated_minutes: 90 }] },
          },
        ],
      },
    },
  });

  const varFormato = await db.catalog2Variation.create({
    data: {
      version_id: v1.id, key: "formato", name: "Formato", sort_order: 1, is_required: true,
      options: { create: [
        { key: "estatico", label: "Estático", sort_order: 1, is_default: true },
        { key: "carrossel", label: "Carrossel", sort_order: 2 },
        { key: "motion", label: "Motion", sort_order: 3 },
      ] },
    },
    include: { options: true },
  });
  const motionOpt = varFormato.options.find((o) => o.key === "motion")!;
  await db.catalog2OptionEffect.create({ data: { variation_option_id: motionOpt.id, effect_type: "add_task", effect_value: "animacao", sort_order: 1 } });
  await db.catalog2OptionEffect.create({ data: { variation_option_id: motionOpt.id, effect_type: "add_deadline_days", effect_value: "2", sort_order: 2 } });

  const addon = await db.catalog2Addon.create({
    data: { version_id: v1.id, key: "legenda_extra", name: "Pacote de legendas extra", description: "Opcional.", sort_order: 1, base_cost: 40 },
  });
  await db.catalog2AddonEffect.create({ data: { addon_id: addon.id, effect_type: "add_deliverable", effect_value: "3 variações de legenda", sort_order: 1 } });

  const condData = {
    version_id: v1.id, key: "urgente", name: "Prazo urgente",
    is_active: true, sort_order: 1,
    trigger_source: "contract_attribute", trigger_ref: "urgente", operator: "eq", comparison_value: "sim",
    effect_type: "add_percent", effect_value: "20",
  };
  await db.catalog2Condition.create({ data: { ...condData, explanation: describeCondition(condData) } });

  await publishVersion(v1.id, "system", { changeSummary: "Publicação inicial da demo." });

  await db.catalog2ProductVersion.create({
    data: { product_id: product.id, version_number: 2, state: "rascunho", title: "Peça de Comunicação (demo) — revisão", summary: "Rascunho da próxima versão." },
  });

  const fresh = await db.catalog2Product.findUnique({ where: { id: product.id } });
  console.log(JSON.stringify({ product_id: product.id, slug: SLUG, status: fresh?.status, published_version_id: fresh?.published_version_id }, null, 2));
  console.log("\nRemover: npm run catalog2:seed-demo -- --remove");
}

main().finally(() => db.$disconnect());
