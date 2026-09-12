// Classificador determinístico de especialidade/tempo PROVISÓRIOS pras
// tarefas do catalog2 (reunião 10/09, "36 produtos funcionalmente completos
// para teste"). Puramente por REGRAS (nenhuma IA, nenhuma chamada externa),
// aplicado ao texto "<nome do produto> <nome da tarefa>" — o contexto do
// produto ajuda a desambiguar termos genéricos ("roteiro" sozinho é
// ambíguo; "roteiro" + "vídeo"/"animação" no nome do produto aponta
// claramente pra Editor de Vídeo).
//
// Só reaproveita as 7 especialidades JÁ existentes (CATALOG2_SPECIALTIES em
// catalog2-classifications-seed.ts) — nunca inventa uma nova.

export interface EffortEstimate {
  specialty_key: string;
  estimated_minutes: number;
  rule: string;
  ambiguous: boolean;
  ambiguous_reason: string | null;
}

// Ordem de prioridade quando mais de uma especialidade "bate" no texto —
// a primeira da lista abaixo que casar vence, mas o caso ainda é marcado
// ambíguo se houver mais de um match (pra aparecer no relatório).
const SPECIALTY_RULES: { key: string; test: RegExp }[] = [
  { key: "editor_video", test: /v[íi]deo|anima[çc][ãa]o|decupagem|\bcortes?\b|personagens|\bcenas?\b|upscaling|motion/i },
  { key: "especialista_seo_geo", test: /\bseo\b|meta description|palavras?-chave|ranking|auditoria t[ée]cnica|p[áa]ginas? de concorrentes/i },
  { key: "gestor_trafego", test: /tr[áa]fego pago|an[úu]ncios?|lances?|pixel\/tag|segmenta[çc][õo]es de p[úu]blico|conta de an[úu]ncio|m[ée]tricas de performance/i },
  { key: "especialista_automacao", test: /\bcrm\b|funil de vendas|automa[çc][ãa]o|fluxo de conversa|prospec[çc][ãa]o|\bleads?\b|\bicp\b|qualifica[çc][ãa]o|chatbot|triggers?/i },
  { key: "designer", test: /layout|\barte\b|design|identidade visual|logotipo|\bkv\b|criativo|imagens?|diagram|vetoriz|retoqu|retrat|papelaria/i },
  { key: "desenvolvedor_web", test: /\bsite\b|loja virtual|e-commerce|\bcms\b|\bdns\b|hospedagem|analytics|rastreamento|responsividade|landing page|p[áa]gina|dom[íi]nio/i },
  { key: "redator", test: /copy|texto|redigir|pauta|conte[úu]do|e-mail|descri[çc][ãa]o|\bbio\b|roteiro narrativo|estrutura narrativa/i },
];

// Base de minutos por especialidade — reflete o esforço TÍPICO de uma
// unidade de tarefa daquele tipo (não o produto inteiro, que já foi
// dividido em várias etapas/tarefas na importação anterior).
const BASE_MINUTES_BY_SPECIALTY: Record<string, number> = {
  redator: 45,
  designer: 60,
  desenvolvedor_web: 90,
  editor_video: 90,
  gestor_trafego: 45,
  especialista_seo_geo: 45,
  especialista_automacao: 60,
};

// Multiplicador de complexidade — primeiro que casar no texto vence.
const COMPLEXITY_RULES: { multiplier: number; label: string; test: RegExp }[] = [
  { multiplier: 1.5, label: "entregável complexo (manual/animação/vídeo final)", test: /manual da marca|v[íi]deo final|anima[çc][ãa]o|identidade visual/i },
  { multiplier: 1.2, label: "análise/relatório (auditoria, diagnóstico, monitoramento)", test: /auditoria|diagn[óo]stico|relat[óo]rio|analisar|monitorar/i },
  { multiplier: 0.7, label: "configuração/verificação rápida", test: /configurar|instalar|verificar|checar/i },
];
const DEFAULT_MULTIPLIER = { multiplier: 1, label: "padrão (sem sinal de complexidade no texto)" };

function roundToStep(n: number, step = 15): number {
  return Math.max(step, Math.round(n / step) * step);
}

/** Classifica uma tarefa por especialidade e minutos, 100% determinístico.
 * Prioriza o texto da PRÓPRIA TAREFA (o que ela de fato descreve fazer);
 * `productName` só entra quando a tarefa sozinha não bate com nenhuma
 * palavra-chave — pra desambiguar termos genéricos (ex.: "Gerar o roteiro"
 * sozinho não diz nada; no produto de vídeo, aponta pra Editor de Vídeo).
 * Isso evita que uma palavra do NOME DO PRODUTO (ex.: "Anúncios" no título)
 * puxe erradamente uma tarefa de texto pra Gestor de Tráfego. */
export function classifyTaskEffort(productName: string, taskName: string): EffortEstimate {
  const taskOnlyMatches = SPECIALTY_RULES.filter((r) => r.test.test(taskName));
  const usedProductContext = taskOnlyMatches.length === 0;
  const haystack = usedProductContext ? `${productName} ${taskName}` : taskName;
  const matches = usedProductContext ? SPECIALTY_RULES.filter((r) => r.test.test(haystack)) : taskOnlyMatches;

  let specialtyKey: string;
  let ambiguous = false;
  let ambiguousReason: string | null = null;

  if (matches.length === 0) {
    // Nenhuma palavra-chave bateu (nem na tarefa, nem no produto) —
    // fallback conservador pro tipo de trabalho mais genérico
    // (redação/conteúdo), sempre sinalizado.
    specialtyKey = "redator";
    ambiguous = true;
    ambiguousReason = "nenhuma palavra-chave reconhecida no texto — fallback para Redator, revisar manualmente";
  } else {
    specialtyKey = matches[0].key;
    if (matches.length > 1) {
      ambiguous = true;
      ambiguousReason = `mais de uma especialidade combina (${matches.map((m) => m.key).join(", ")}${usedProductContext ? ", considerando o nome do produto" : ""}) — escolhida "${specialtyKey}" pela ordem de prioridade`;
    }
  }

  const base = BASE_MINUTES_BY_SPECIALTY[specialtyKey] ?? 45;
  const complexity = COMPLEXITY_RULES.find((c) => c.test.test(haystack)) ?? DEFAULT_MULTIPLIER;
  const minutes = roundToStep(base * complexity.multiplier);

  return {
    specialty_key: specialtyKey,
    estimated_minutes: minutes,
    rule: `especialidade por palavra-chave (${matches.map((m) => m.key).join(",") || "fallback"}${usedProductContext ? ", via nome do produto" : ", via nome da tarefa"}); minutos = base(${specialtyKey})=${base}min × complexidade(${complexity.label})=${complexity.multiplier} → ${minutes}min`,
    ambiguous,
    ambiguous_reason: ambiguousReason,
  };
}
