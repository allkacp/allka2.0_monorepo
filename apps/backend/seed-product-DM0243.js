// seed-product-DM0243.js — Animação de Logotipo
// PILOTO de migração da base antiga (produtos-modelos-questionarios.json).
//
// ⚠ ID PROVISÓRIO: PRODUCT_ID usa o prefixo "LEGACY-IMPORT-" de propósito —
//    ainda NÃO segue a convenção definitiva de ID do nosso modelo novo de
//    produtos. Trocar para o padrão final (curto/mnemônico ou cuid, a
//    definir) antes de considerar este produto pronto para produção.
//
// Campos marcados com "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]" precisam de revisão/preenchimento manual —
// não existiam no dump antigo (conteúdo de apresentação/FAQ/imagens é
// tipicamente escrito à mão, ver seed-product-PA0003.js como referência).
//
// Idempotente: upsert por PRODUCT_ID fixo.
// Uso: node seed-product-DM0243.js

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "LEGACY-IMPORT-DM0243";

const meta = {
  "_origem": "Importado do dump da plataforma antiga (produtos-modelos-questionarios.json), piloto de migração — revisar campos marcados como dado não disponível. ID do produto é PROVISÓRIO (prefixo LEGACY-IMPORT-), ainda não segue a convenção definitiva do modelo novo.",
  "recurrence": "Avulso e Mensal",
  "deliveryDays": 6,
  "summaryDescription": "• A animação tem duração de 5 a 15 segundos.\n• Este material pode ser utilizado em apresentações, campanhas e conteúdos publicitários diversos, como vídeos e banners.\n• A produção deste material será em formato 2D, podendo ser uma mescla de vídeos e animações combinadas.\n• A entrega deste material será em .MP4 de alta qualidade em até 3 formato escolhido (9:16 – 16:9 - 1x1) de 24 a 30 FPS, variando de acordo com o tipo e a quantidade de animações inseridas.\n• Após aprovado, será entregue o vídeo escolhido em formato .MP4 e os arquivos abertos.",
  "finalPrice": 226.8,
  "itemLimit": 1,
  "totalExecutionHours": 5,
  "stepsEnabled": true,
  "taskModel": {
    "objective": "Criar uma identidade para sua marca, fazer ela ter o destaque diante a concorrência.",
    "creator": "Consultor/Agência",
    "responsible": "Líder de Audiovisual/Criativo",
    "executor": "Nômade Especialista",
    "requiresAccess": false,
    "itemLimit": 1,
    "totalDeadlineDays": 6
  },
  "warnings": [
    {
      "level": "info",
      "message": "• Todos elementos utilizados devem ser criados pelo Nômade designado ou captados de um banco de imagens/fontes que permitam o uso comercial das mesmas respeitando os temos da Lei Federal N° 9.610/98 (Lei de Direitos Autorais), qualquer problema legal diante a criação que desrespeitam esta, o Nômade terá a responsabilidade legal."
    },
    {
      "level": "warning",
      "message": "Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega."
    },
    {
      "level": "warning",
      "message": "Todos os elementos, conteúdos e demais itens de propriedade do cliente devem respeitar os termos da Lei Federal Nº9.610/98 (Lei de Direito Autorais). Caso o material enviado desrespeite essa determinação, diante qualquer problema, a Allka estará isenta e o cliente será responsabilizado legalmente."
    }
  ],
  "accessInstructions": null,
  "rawExecutionRules": "Tarefa: Animação de Logotipo\n• Criador: Consultor/Agência\n• Responsável: Líder de Audiovisual/Criativo\n• Executor: Nômade Especialista\n• Objetivo: Elaboração do logotipo animado para as aplicações informadas na tarefa.\nExecução:\n• O executor deve elaborar a animação do logotipo do cliente e poderá apresentar mais de 1 modelo para avaliação;\n• O executor deve produzir uma animação com conceitos 2D.\n• O executor deverá entregar o material utilizando entre 24 a 30 FPS, a animação deverá ter entre 10 a 15 segundos de duração.\n• O executor deverá fazer em até 3 formatos escolhido pelo cliente.\n• O executor pode estar utilizando templates e plataformas de animação, desde que esteja ciente que qualquer alteração solicitada pelo cliente deve ser atendida, sem limitações.\n• Caso o(a) cliente solicite um material sem o uso de animações prontas o executor deve criar uma nova animação que atenda o pedido.\n• O executor deve respeitar a paleta de cores do(a) cliente e estar atento as cores proibidas.\n• O executor deve analisar toda a solicitação e a identidade visual do cliente nos materiais enviados e em suas páginas digitais.\n• No caso do envio de arte com erro de diagramação, digitação, recorte de imagem, artes sem relação com a referência ou erro em formato, serão retornadas para alteração sem alteração de prazo de entrega inicialmente estipulado.\nConclusão:\n• A tarefa poderá ser \"Aprovada\" ou \"Reprovada\" pelo cliente, retornando para correção até o próximo dia útil com todas as solicitações atendidas.",
  "recurrenceRules": {
    "avulso": {
      "expiresAfterDays": 90,
      "description": "• O cliente tem até 90 dias para solicitar o item contratado. Após esse prazo, a tarefa é considerada \"expirada\" e não pode mais ser utilizada."
    },
    "mensal": {
      "cycleDays": 30,
      "description": "• Não disponível"
    }
  },
  "presentation": {
    "tagline": "• Um logotipo é como o coração de uma identidade de marca. Apresenta a personalidade e desempenha um papel significativo na estratégia de branding.\n• Aqui você irá contar com um profissional de qualidade que vai se comprometer a transferir a personalidade e o poder da sua marca em uma animação marcante e original, uma animação que poderá ser utilizada em todo material de vídeo promocional ou institucional nos seus vídeos de feed e propaganda. Podendo solicitar até 3 formatos de vídeos (9x16; 1x1; 16x9, etc...)",
    "highlights": [
      "Design",
      "Ideia criativa",
      "Conteúdo da Animação",
      "Animação"
    ],
    "targetAudience": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "whatIsIncluded": [
      {
        "title": "Design",
        "description": ""
      },
      {
        "title": "Ideia criativa",
        "description": ""
      },
      {
        "title": "Conteúdo da Animação",
        "description": ""
      },
      {
        "title": "Animação",
        "description": ""
      }
    ],
    "notIncluded": [
      "Suporte técnico",
      "Visita consultiva",
      "Elaboração de logotipo",
      "Vetorização de logotipo"
    ],
    "benefits": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "deliverables": [
      "Design",
      "Ideia criativa",
      "Conteúdo da Animação",
      "Animação"
    ],
    "requirements": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "howToRequest": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "faq": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "complementaryProducts": [
      {
        "title": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
        "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
      },
      {
        "title": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
        "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
      },
      {
        "title": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
        "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
      }
    ]
  },
  "baseFeatures": [
    "Design",
    "Ideia criativa",
    "Conteúdo da Animação",
    "Animação"
  ],
  "tasks": [
    {
      "id": "DM0243",
      "name": "Animação de Logotipo",
      "description": "Objetivo: Criar uma identidade para sua marca, fazer ela ter o destaque diante a concorrência.\n• A animação tem duração de 5 a 15 segundos, de acordo com o cliente.\n• Este material pode ser utilizado em apresentações e campanhas.\n• A produção deste material será em formato 2D.\n• A entrega deste material será em .MP4 de alta qualidade em formato desejado.\n• Após aprovado, será entregue o vídeo escolhido em formato .MP4 e os arquivos abertos.",
      "category": "Audiovisual e Multimedia",
      "objective": "Criar uma identidade para sua marca, fazer ela ter o destaque diante a concorrência.",
      "dependencies": [],
      "requiresAccess": false,
      "calculatedCost": 0,
      "checklist": [
        "Verifiquei o briefing e a animação esta seguindo ele corretamente.",
        "Verifiquei se os vídeos estão no arquivo e na formatação padrão.",
        "As animações de logo criadas estão dentro do que foi solicitado no briefing e seguem as referências de animação enviado.",
        "Os vídeos estão no formato correto (Solicitado pelo cliente).",
        "As animações do logo estão padronizadas e sincronizadas.",
        "Confirmei que não houve erros na hora da exportação dos vídeos.",
        "Verifiquei se os vídeos estão com a minutagem correta (até 15 segundos)"
      ],
      "steps": []
    }
  ],
  "stages": [],
  "questionnaire": {
    "id": "DM0243-Q",
    "code": "DM0135",
    "title": "Alteração de Materiais Diversos (por material)",
    "observation": "Obs: O cliente deve inserir arquivos editáveis para alteração, caso contrário, a tarefa será rejeitada.",
    "questions": [
      {
        "id": "DM0243-Q01",
        "question": "Qual alteração no material deseja ser feita?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "qualAlteracaoNoMaterialDesejaSerFeita",
        "placeholder": "Ex: Edição da página 2 do material, anexei o ajuste em um documento."
      },
      {
        "id": "DM0243-Q02",
        "question": "Envie o arquivo aberto para edição com fontes e todos os itens necessários:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "envieOArquivoAbertoParaEdicaoComFontesET",
        "placeholder": "Ex: Anexei o arquivo aberto completo para edição."
      },
      {
        "id": "DM0243-Q03",
        "question": "Por favor, anexe o logotipo renderizado. Se você tiver o Manual da Marca, também gostaríamos de recebê-lo anexado.",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "porFavorAnexeOLogotipoRenderizadoSeVoceT",
        "placeholder": "Ex: Sim, anexei o manual da marca."
      },
      {
        "id": "DM0243-Q04",
        "question": "Você possui um banco de imagens pago que possa compartilhar? Se sim, por favor, informe o nome do banco e o plano contratado. Caso contrário, usaremos bancos gratuitos para a produção.",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "vocePossuiUmBancoDeImagensPagoQuePossaCo",
        "placeholder": "Ex: Sim, o Getty Images. Após aprovação, enviarei a imagem comprada."
      }
    ]
  },
  "questionnairesExtra": [
    {
      "code": "DM0136",
      "title": "Animação de Logotipo",
      "questions": [
        {
          "id": "DM0243-Q01",
          "question": "Qual a ideia para a animação de logotipo?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "qualAIdeiaParaAAnimacaoDeLogotipo",
          "placeholder": "Ex: quero que ele entre de uma forma elegante e minimalista."
        },
        {
          "id": "DM0243-Q02",
          "question": "Qual o objetivo da animação de logotipo?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "qualOObjetivoDaAnimacaoDeLogotipo",
          "placeholder": "Ex: Criar uma marca registrada para meus vídeos."
        },
        {
          "id": "DM0243-Q03",
          "question": "Nos informe as referências para a animação de logotipo:",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "nosInformeAsReferenciasParaAAnimacaoDeLo",
          "placeholder": "Ex: https://br.pinterest.com/search/pins/?q=anima%C3%A7%C3%A3o%20logo&rs=typed"
        },
        {
          "id": "DM0243-Q04",
          "question": "Qual seria a aplicação da animação de logotipo?",
          "type": "text",
          "required": true,
          "options": [
            "Não",
            "Sim"
          ],
          "attachmentEnabled": true,
          "briefingKey": "qualSeriaAAplicacaoDaAnimacaoDeLogotipo",
          "placeholder": "Ex: instagram e youtube."
        },
        {
          "id": "DM0243-Q05",
          "question": "Qual seria os formatos da animação de logotipo?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "qualSeriaOsFormatosDaAnimacaoDeLogotipo",
          "placeholder": "Ex: 9x16 e 16x9"
        },
        {
          "id": "DM0243-Q06",
          "question": "Por favor, anexe o logotipo renderizado. Se você tiver o Manual da Marca, também gostaríamos de recebê-lo anexado.",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "porFavorAnexeOLogotipoRenderizadoSeVoceT",
          "placeholder": "Se sim, anexar o manual da marca"
        },
        {
          "id": "DM0243-Q07",
          "question": "Você possui um banco de imagens pago que possa compartilhar? Se sim, por favor, informe o nome do banco e o plano contratado. Caso contrário, usaremos bancos gratuitos para a produção.",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "vocePossuiUmBancoDeImagensPagoQuePossaCo",
          "placeholder": "Ex: Sim, o Getty Images. Após aprovação, enviarei a imagem comprada."
        }
      ]
    }
  ],
  "portfolioImages": [
    "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
  ]
};

async function main() {
  console.log("▶ Seeding DM0243 — Animação de Logotipo (piloto de migração)...");

  const existing = await p.product.findUnique({ where: { id: PRODUCT_ID } });
  if (existing) {
    await p.productAddon.deleteMany({ where: { product_id: PRODUCT_ID } });
    await p.productVariation.deleteMany({ where: { product_id: PRODUCT_ID } });
    console.log("  ✓ Relações anteriores removidas (variações + addons)");
  }

  const base = {
    name: "Animação de Logotipo",
    description: "• A animação tem duração de 5 a 15 segundos, de acordo com o cliente.\n• Este material pode ser utilizado em apresentações e campanhas.\n• A produção deste material será em formato 2D.\n• A entrega deste material será em .MP4 de alta qualidade em formato desejado.\n• Após aprovado, será entregue o vídeo escolhido em formato .MP4 e os arquivos abertos.",
    short_description: "• A animação tem duração de 5 a 15 segundos.\n• Este material pode ser utilizado em apresentações, campanhas e conteúdos publicitários diversos, como vídeos e banners.\n• A produção deste material será em formato 2D, podendo ser uma mescla de vídeos e animações combinadas.\n• A entrega deste material será em .MP4 de alta qualidade em até 3 formato escolhido (9:16 – 16:9 - 1x1) de 24 a 30 FPS, variando de acordo com o tipo e a quantidade de animações inseridas.\n• Após aprovado, s",
    category: "Audiovisual e Multimedia",
    tags: JSON.stringify([
  "Illustrator",
  "After Effects",
  "Vídeo",
  "Animação",
  "Logo",
  "Animação de logo",
  "MP4",
  "Marca",
  "Impacto de marca",
  "Branding"
]),
    base_price: 226.8,
    complexity: "basic",
    visibility: JSON.stringify({ company: true, agency: true, partner: false, inHouse: false }),
    image: null,
    demonstrations: JSON.stringify([]),
    completion_time: "6 dias",
    metadata: JSON.stringify(meta),
    is_active: true,
  };

  await p.product.upsert({
    where: { id: PRODUCT_ID },
    create: { id: PRODUCT_ID, ...base, created_at: new Date(), updated_at: new Date() },
    update: { ...base, updated_at: new Date() },
  });
  console.log("  ✓ Produto " + PRODUCT_ID + " upserted");

  await p.productVariation.create({
    data: {
      id: "LEGACY-IMPORT-DM0243-V01",
      product_id: PRODUCT_ID,
      name: "Contratação Padrão",
      description: "• A animação tem duração de 5 a 15 segundos.\n• Este material pode ser utilizado em apresentações, campanhas e conteúdos publicitários diversos, como vídeos e banners.\n• A produção deste material será em formato 2D, podendo ser uma mescla de vídeos e animações combinadas.\n• A entrega deste material será em .MP4 de alta qualidade em até 3 formato escolhido (9:16 – 16:9 - 1x1) de 24 a 30 FPS, variando de acordo com o tipo e a quantidade de animações inseridas.\n• Após aprovado, s",
      price: 226.8,
      price_modifier: 0,
      deadline_days: 6,
      scope_description: "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      features: JSON.stringify([
  "Design",
  "Ideia criativa",
  "Conteúdo da Animação",
  "Animação"
]),
      sort_order: 1,
      is_active: true,
    },
  });
  console.log("  ✓ Variação LEGACY-IMPORT-DM0243-V01 criada");

  console.log("✅ DM0243 — Animação de Logotipo seeded (PILOTO, revisar campos marcados).");
  await p.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erro no seed DM0243:", e.message);
  p.$disconnect();
  process.exit(1);
});
