// seed-product-PA0176.js — Gestão de Projetos de Marketing
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
// Uso: node seed-product-PA0176.js

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "LEGACY-IMPORT-PA0176";

const meta = {
  "_origem": "Importado do dump da plataforma antiga (produtos-modelos-questionarios.json), piloto de migração — revisar campos marcados como dado não disponível. ID do produto é PROVISÓRIO (prefixo LEGACY-IMPORT-), ainda não segue a convenção definitiva do modelo novo.",
  "recurrence": "Avulso e Mensal",
  "deliveryDays": 25,
  "summaryDescription": "• Profissional Qualificado: Contamos com especialistas em gestão de projetos de marketing.\n• Plano Tático: É necessário enviar o Plano Tático completo com todos os detalhes para cada tarefa que deve ser lançada, pois o gestor não executará o papel estratégico ou coletará informações em outras fontes.\n• Qualidade do Plano: O resultado depende da qualidade do plano tático, do correto dimensionamento de prazos e do estudo do briefing. O gestor é responsável somente por lançar, avaliar, enviar para aprovação e fornecer feedback.\n• Feedback: O profissional enviará semanalmente atualizações na tarefa de gestão, destacando desafios encontrados ou relatando conquistas obtidas.\n• Materiais Diversos: Deve ser entregue uma pasta compartilhada com todos os materiais necessários para executar as tarefas projetadas. Caso o cliente esteja devendo algum material, o profissional poderá cobrar no meio de comunicação apresentado até que o item seja disponibilizado.\n• Contato Direto: Você poderá disponibilizar um contato de WhatsApp, um e-mail ou o link de um grupo para o profissional efetuar contatos frequentes com solicitações ou envio de itens para aprovação.\n• Prazo de Execução: O profissional terá até 4 dias úteis para o lançamento inicial do projeto e, posteriormente, terá mais 3 etapas de 5 dias úteis cada, onde acompanhará e enviará o Plano Tático com status atualizado.",
  "finalPrice": 432.43,
  "itemLimit": 1,
  "totalExecutionHours": 11,
  "stepsEnabled": true,
  "taskModel": {
    "objective": "Gestor de projetos especializado na plataforma allka para aplicar o Plano Tático.",
    "creator": "Consultor/Agência",
    "responsible": "Líder de Estratégia e Vendas",
    "executor": "Nômade Especialista",
    "requiresAccess": false,
    "itemLimit": 1,
    "totalDeadlineDays": 25
  },
  "warnings": [
    {
      "level": "info",
      "message": "Todos elementos utilizados devem ser criados pelo Nômade designado ou captados de um banco de imagens/fontes que permitam o uso comercial das mesmas respeitando os temos da Lei Federal N° 9.610/98 (Lei de Direitos Autorais), qualquer problema legal diante a criação que desrespeitam esta, o Nômade terá a responsabilidade legal."
    },
    {
      "level": "warning",
      "message": "Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega."
    },
    {
      "level": "warning",
      "message": "Todos os elementos, conteúdos e demais itens de propriedade do cliente devem respeitar os termos da Lei Federal Nº9.610/98 (Lei de Direito Autorais). Caso o material enviado desrespeite essa determinação, diante qualquer problema, a allka estará isenta e o cliente será responsabilizado legalmente."
    }
  ],
  "accessInstructions": null,
  "rawExecutionRules": "Gestão de Projeto de Marketing\n • Criador: Consultor/Agência\n • Responsável: Líder de Estratégia e Vendas\n • Executor: Nômade Especialista\n • Objetivo: Gestor de projetos especializado na plataforma Allka para aplicar o Plano Tático.\nExecução:\n• O executor deve analisar o briefing, pesquisar sobre o negócio e acessar as redes do cliente, estudar os anexos e conferir o plano tático. É importante sanar dúvidas pelos comentários da tarefa para que o trabalho seja efetuado corretamente.\n• Antes de lançar as tarefas é importante identificar todas as tarefas dependentes, analisar as tarefas abertas no projeto na plataforma Allka, utilizando o acesso provisório enviado no briefing.\n• Cada tarefa pode ter um meio de contato para envio de itens e solicitações. É necessário que o executo se apresente como “Gestor de Projeto responsável por aquele projeto durante os próximos 30 dias”.\n• Esta tarefa é dividida em 5 etapas que devem ser realizadas na sequência abaixo:\nGestão de Projeto – Lançamento\nGestão de Projeto – Feedback 1\nGestão de Projeto – Feedback 2\nGestão de Projeto – Feedback 3\nGestão de Projeto – Feedback 4\n• Efetue o lançamento de todas as tarefas que já contenham os materiais necessários e não sejam dependentes de outros serem executadas anteriormente.\n• Tarefas com dependência devem ser lançadas posteriormente nas outras etapas.\n• Tarefas com falta de materiais, o profissional poderá cobrar na forma de contato escolhida no briefing e registrar no Plano Tático a tentativa.\n• Nas tarefas de feedback é necessário atualizar o status das tarefas no Plano Tático, inserir justificativa para tarefas não executas, enviando para analise do solicitante.\n• O executor precisa acompanhar o recebimento de tarefas executadas para avaliar se foi feito como solicitado e posteriormente enviar para aprovação com uma mensagem padronizada que apresente o prazo de 10 dias para aprovar ou a tarefa é considerada aprovada automaticamente. (ex: Olá #nome, segue para sua aprovação o Banner Digital elaborado para inserção no site. Você possuí 10 dais para aprovar ou reprovar com solicitações de ajustes.)\n• O executor poderá mandar outras mensagens ao longo dos dias cobrando aprovação e informando o prazo atualizado.\n• Ao receber a aprovação o executor deve pegar o material e dar continuidade nas ações, liberando novas tarefas que dependem do material ou informando no Plano Tático que o item foi aprovado e o solicitante pode utilizar em suas aplicações.\n• Ao receber uma reprovação o executor deve inserir na Allka e reprovar o item aguardando uma nova entrega para enviar para aprovação.\n• As 5 etapas desta tarefa devem ser enviadas para avaliação do solicitando nos prazos estipulados com o Plano Tático atualizado anexo, clicando em salvar. Se houver uma reprovação por parto do solicitante, basta devolver coma resposta e solicitar que aceite como concluído, pois ajustes estão sendo efetuados na próxima etapa da tarefa.\n• Esta é uma tarefa que o cliente pode escolher liberar para o mesmo profissional, sendo assim, se agestão e o atendimento forem qualitativos o executor pode passar a ter uma renda recorrente daquele projeto.\nConclusão:\n• A tarefa poderá ser \"Aprovada\" ou \"Reprovada\" pelo cliente, retornando para correção até o próximo dia útil com todas as solicitações atendidas.",
  "recurrenceRules": {
    "avulso": {
      "expiresAfterDays": 90,
      "description": "• O cliente tem até 90 dias para solicitar o item contratado. Após esse prazo, a tarefa é considerada \"expirada\" e não pode mais ser utilizada."
    },
    "mensal": {
      "cycleDays": 30,
      "description": "• A tarefa fica disponível a cada 30 dias e pode ser utilizada até a abertura da próxima. Se não for utilizada, será considerada \"expirada\" e não poderá mais ser utilizada."
    }
  },
  "presentation": {
    "tagline": "• Muitos profissionais de marketing desenvolvem grandes projetos, mas por falta de gestão adequada, acabam perdendo prazos, não alcançam resultados satisfatórios e, em alguns casos, decepcionam o cliente com entregas finais que não atendem às expectativas.\n• Para evitar esses problemas, oferecemos um serviço que inclui um gestor de projetos especializado. Esse profissional será responsável por lançar as tarefas na plataforma allka, acompanhar sua execução, verificar a qualidade das entregas, enviar para aprovação conforme o meio escolhido pelo cliente e dar continuidade em tarefas dependentes de outros que estavam em desenvolvimento.\n• Esse serviço está disponível apenas para agências que adotam o modelo de Plano Tático. É necessário inserir o arquivo padronizado com todos os campos preenchidos, mas não inclui a elaboração do projeto pelo gestor do projeto.",
    "highlights": [
      "Análise do Plano Tático e Briefing enviados.",
      "Lançamento das tarefas na plataforma Allka.",
      "Acompanhamento das entregas.",
      "Envio de tarefas para aprovação.",
      "Coleta de aprovação e reprovação.",
      "Atualização do status semanal."
    ],
    "targetAudience": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "whatIsIncluded": [
      {
        "title": "Análise do Plano Tático e Briefing enviados.",
        "description": ""
      },
      {
        "title": "Lançamento das tarefas na plataforma Allka.",
        "description": ""
      },
      {
        "title": "Acompanhamento das entregas.",
        "description": ""
      },
      {
        "title": "Envio de tarefas para aprovação.",
        "description": ""
      },
      {
        "title": "Coleta de aprovação e reprovação.",
        "description": ""
      },
      {
        "title": "Atualização do status semanal.",
        "description": ""
      }
    ],
    "notIncluded": [
      "Plano tático e estratégico.",
      "Coleta de briefing.",
      "Coleta de materiais em locais diversos.",
      "Pesquisas diversas.",
      "Ligação telefônica.",
      "Reunião online ou presencial."
    ],
    "benefits": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "deliverables": [
      "Análise do Plano Tático e Briefing enviados.",
      "Lançamento das tarefas na plataforma Allka.",
      "Acompanhamento das entregas.",
      "Envio de tarefas para aprovação.",
      "Coleta de aprovação e reprovação.",
      "Atualização do status semanal."
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
    "complementaryProducts": []
  },
  "baseFeatures": [
    "Análise do Plano Tático e Briefing enviados.",
    "Lançamento das tarefas na plataforma Allka.",
    "Acompanhamento das entregas.",
    "Envio de tarefas para aprovação.",
    "Coleta de aprovação e reprovação.",
    "Atualização do status semanal."
  ],
  "tasks": [
    {
      "id": "PA0176",
      "name": "Gestão de Projeto de Marketing",
      "description": "Objetivo: Gestor de projetos especializado na plataforma allka para aplicar o Plano Tático.\n• Profissional Qualificado: Contamos com especialistas em gestão de projetos de marketing.\n• Plano Tático: É necessário enviar o Plano Tático completo com todos os detalhes para cada tarefa que deve ser lançada, pois o gestor não executará o papel estratégico ou coletará informações em outras fontes.\n• Qualidade do Plano: O resultado depende da qualidade do plano tático, do correto dimensionamento de prazos e do estudo do briefing. O gestor é responsável somente por lançar, avaliar, enviar para aprovação e fornecer feedback.\n• Feedback: O profissional enviará semanalmente atualizações na tarefa de gestão, destacando desafios encontrados ou relatando conquistas obtidas.\n• Materiais Diversos: Deve ser entregue uma pasta compartilhada com todos os materiais necessários para executar as tarefas projetadas. Caso o cliente esteja devendo algum material, o profissional poderá cobrar no meio de comunicação apresentado até que o item seja disponibilizado.\n• Contato Direto: Você poderá disponibilizar um contato de WhatsApp, um e-mail ou o link de um grupo para o profissional efetuar contatos frequentes com solicitações ou envio de itens para aprovação.\n• Prazo de Execução: O profissional terá até 4 dias úteis para o lançamento inicial do projeto e, posteriormente, terá mais 3 etapas de 5 dias úteis cada, onde acompanhará e enviará o Plano Tático com status atualizado.",
      "category": "Estratégico e Vendas",
      "objective": "Gestor de projetos especializado na plataforma allka para aplicar o Plano Tático.",
      "dependencies": [],
      "requiresAccess": false,
      "calculatedCost": 137.5,
      "checklist": [],
      "steps": [
        {
          "id": "PA0176-PA0176_1",
          "name": "Gestão de Projeto – Lançamento",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 3,
          "calculatedCost": 37.5
        },
        {
          "id": "PA0176-PA0176_2",
          "name": "Gestão de Projeto – Feedback 1",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "PA0176-PA0176_3",
          "name": "Gestão de Projeto – Feedback 2",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "PA0176-PA0176_4",
          "name": "Gestão de Projeto – Feedback 3",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "PA0176-PA0176_5",
          "name": "Gestão de Projeto – Feedback 4",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 2,
          "calculatedCost": 25
        }
      ]
    }
  ],
  "stages": [
    {
      "id": "PA0176-PA0176_1",
      "code": "PA0176-PA0176_1",
      "number": 1,
      "name": "Gestão de Projeto – Lançamento",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Estratégico e Vendas",
      "deliveryDeadlineDays": 4,
      "executionDeadlineHours": 72,
      "executionHours": 3,
      "value": 37.5,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O relatório está corretamente preenchido.",
        "Conferências de erros gramaticais e de concordância efetuada.",
        "Analisar tarefas não enviadas para execução, sem justificativa."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0176-PA0176_2",
      "code": "PA0176-PA0176_2",
      "number": 1,
      "name": "Gestão de Projeto – Feedback 1",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Estratégico e Vendas",
      "deliveryDeadlineDays": 10,
      "executionDeadlineHours": 216,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O relatório está corretamente preenchido.",
        "Conferências de erros gramaticais e de concordância efetuada.",
        "Analisar tarefas não enviadas para execução, sem justificativa."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0176-PA0176_3",
      "code": "PA0176-PA0176_3",
      "number": 1,
      "name": "Gestão de Projeto – Feedback 2",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Estratégico e Vendas",
      "deliveryDeadlineDays": 15,
      "executionDeadlineHours": 336,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O relatório está corretamente preenchido.",
        "Conferências de erros gramaticais e de concordância efetuada.",
        "Analisar tarefas não enviadas para execução, sem justificativa."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0176-PA0176_4",
      "code": "PA0176-PA0176_4",
      "number": 1,
      "name": "Gestão de Projeto – Feedback 3",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Estratégico e Vendas",
      "deliveryDeadlineDays": 20,
      "executionDeadlineHours": 456,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O relatório está corretamente preenchido.",
        "Conferências de erros gramaticais e de concordância efetuada.",
        "Analisar tarefas não enviadas para execução, sem justificativa."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0176-PA0176_5",
      "code": "PA0176-PA0176_5",
      "number": 1,
      "name": "Gestão de Projeto – Feedback 4",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Estratégico e Vendas",
      "deliveryDeadlineDays": 25,
      "executionDeadlineHours": 576,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O relatório está corretamente preenchido.",
        "Conferências de erros gramaticais e de concordância efetuada.",
        "Analisar tarefas não enviadas para execução, sem justificativa."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    }
  ],
  "questionnaire": {
    "id": "PA0176-Q",
    "code": "PA0101",
    "title": "Gestão de Projeto de Marketing",
    "description": ".",
    "questions": [
      {
        "id": "PA0176-Q01",
        "question": "Qual é o nome do negócio em que vamos trabalhar?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualEONomeDoNegocioEmQueVamosTrabalhar",
        "placeholder": "Ex: Allka Crowdwork"
      },
      {
        "id": "PA0176-Q02",
        "question": "Quais são os links úteis para eu entender o negócio?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "quaisSaoOsLinksUteisParaEuEntenderONegoc",
        "placeholder": "Ex: Segue minhas redes sociais, website e outros"
      },
      {
        "id": "PA0176-Q03",
        "question": "Qual é o resultado esperado pelo cliente?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualEOResultadoEsperadoPeloCliente",
        "placeholder": "Ex: Deseja obter 100 novos usuários por mês com perfil..."
      },
      {
        "id": "PA0176-Q04",
        "question": "Poderia descrever o negócio, produtos e serviços de forma resumida?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "poderiaDescreverONegocioProdutosEServico",
        "placeholder": "Ex: Plataforma de Crowdwork para o marketing, com profissionais freelancers para atendimento de agências de marketing. Nossos produtos são serviços de marketing com preço, prazo e processos padronizados. Além de...."
      },
      {
        "id": "PA0176-Q05",
        "question": "Anexar o briefing elaborado junto ao cliente:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "anexarOBriefingElaboradoJuntoAoCliente",
        "placeholder": "Ex: anexei o documento com todos os detalhes do negócio"
      },
      {
        "id": "PA0176-Q06",
        "question": "Anexar apresentações e outros materiais:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "anexarApresentacoesEOutrosMateriais",
        "placeholder": "Ex: Anexei na tarefa"
      },
      {
        "id": "PA0176-Q07",
        "question": "Informe o e-mail, WhatsApp ou link do grupo de WhatsApp que devo coletar informações e aprovações:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "informeOEMailWhatsappOuLinkDoGrupoDeWhat",
        "placeholder": "Ex: Segue link do grupo do WhatsApp que criei junto ao cliente final responsável pelas aprovações: #link"
      },
      {
        "id": "PA0176-Q08",
        "question": "Informar o nome das pessoas envolvidas e com quem devo falar para cada tipo de assunto:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "informarONomeDasPessoasEnvolvidasEComQue",
        "placeholder": "Ex: Jorge – Envio de itens para aprovação / Patrícia – Coleta de informações"
      },
      {
        "id": "PA0176-Q09",
        "question": "Anexar o Plano Tático com todas as tarefas contratadas no projeto:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "anexarOPlanoTaticoComTodasAsTarefasContr",
        "placeholder": "Ex: #link do documento padronizado"
      },
      {
        "id": "PA0176-Q10",
        "question": "Você deseja que eu coloque os arquivos para aprovação e aprovados em algum link de armazenamento?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "voceDesejaQueEuColoqueOsArquivosParaApro",
        "placeholder": "Ex Sim, segue link compartilhado"
      },
      {
        "id": "PA0176-Q11",
        "question": "Link do projeto dentro da plataforma Allka: ",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "linkDoProjetoDentroDaPlataformaAllka",
        "placeholder": "Ex: Segue o link do projeto na allka e copiar a URL"
      },
      {
        "id": "PA0176-Q12",
        "question": "Usuário e senha de acesso a sua conta Allka:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "usuarioESenhaDeAcessoASuaContaAllka",
        "placeholder": "Ex: Anexei no cofre"
      },
      {
        "id": "PA0176-Q13",
        "question": "Deseja enviar outras informações complementares?",
        "type": "text",
        "required": false,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "desejaEnviarOutrasInformacoesComplementa",
        "placeholder": "Ex: não, nesse momento não tenho nada novo para colocar"
      }
    ]
  },
  "questionnairesExtra": [],
  "portfolioImages": [
    "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
  ]
};

async function main() {
  console.log("▶ Seeding PA0176 — Gestão de Projetos de Marketing (piloto de migração)...");

  const existing = await p.product.findUnique({ where: { id: PRODUCT_ID } });
  if (existing) {
    await p.productAddon.deleteMany({ where: { product_id: PRODUCT_ID } });
    await p.productVariation.deleteMany({ where: { product_id: PRODUCT_ID } });
    console.log("  ✓ Relações anteriores removidas (variações + addons)");
  }

  const base = {
    name: "Gestão de Projetos de Marketing",
    description: "• Custo Operacional: Tenha vários gestores de projeto ampliando sua escalabilidade ilimitadamente sem aumentar os custos operacionais.\n• Troca de Profissional: Escolha entre ter um novo profissional a cada tarefa ou manter o mesmo, no plano Advanced, garantindo consistência.\n• Treinamento: Nossos profissionais são treinados pela plataforma para executar a tarefa de forma padronizada e eficaz, bastando fornecer informações relevantes no briefing.\n• Escalabilidade: Amplie sua equipe de gestão de projetos a qualquer momento sem a necessidade de passar por processos seletivos, criando mais oportunidades para seu time de vendas.\n• Estratégia: O profissional seguirá exatamente a estratégia apresentada no Plano Tático e a executará corretamente.\n• Relacionamento: O profissional poderá enviar os itens para aprovação ao seu cliente de forma padronizada e com frases escolhidas por você, além de desenvolver um relacionamento e acelerar as aprovações.",
    short_description: "• Profissional Qualificado: Contamos com especialistas em gestão de projetos de marketing.\n• Plano Tático: É necessário enviar o Plano Tático completo com todos os detalhes para cada tarefa que deve ser lançada, pois o gestor não executará o papel estratégico ou coletará informações em outras fontes.\n• Qualidade do Plano: O resultado depende da qualidade do plano tático, do correto dimensionamento de prazos e do estudo do briefing. O gestor é responsável somente por lançar, a",
    category: "Estratégico e Vendas",
    tags: JSON.stringify([
  "Assistente",
  "Assistência",
  "Gestão de projetos",
  "Gestor de projetos",
  "Gerenciamento de projetos"
]),
    base_price: 432.43,
    complexity: "basic",
    visibility: JSON.stringify({ company: true, agency: true, partner: false, inHouse: false }),
    image: null,
    demonstrations: JSON.stringify([]),
    completion_time: "25 dias",
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
      id: "LEGACY-IMPORT-PA0176-V01",
      product_id: PRODUCT_ID,
      name: "Contratação Padrão",
      description: "• Profissional Qualificado: Contamos com especialistas em gestão de projetos de marketing.\n• Plano Tático: É necessário enviar o Plano Tático completo com todos os detalhes para cada tarefa que deve ser lançada, pois o gestor não executará o papel estratégico ou coletará informações em outras fontes.\n• Qualidade do Plano: O resultado depende da qualidade do plano tático, do correto dimensionamento de prazos e do estudo do briefing. O gestor é responsável somente por lançar, a",
      price: 432.43,
      price_modifier: 0,
      deadline_days: 25,
      scope_description: "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      features: JSON.stringify([
  "Análise do Plano Tático e Briefing enviados.",
  "Lançamento das tarefas na plataforma Allka.",
  "Acompanhamento das entregas.",
  "Envio de tarefas para aprovação.",
  "Coleta de aprovação e reprovação.",
  "Atualização do status semanal."
]),
      sort_order: 1,
      is_active: true,
    },
  });
  console.log("  ✓ Variação LEGACY-IMPORT-PA0176-V01 criada");

  console.log("✅ PA0176 — Gestão de Projetos de Marketing seeded (PILOTO, revisar campos marcados).");
  await p.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erro no seed PA0176:", e.message);
  p.$disconnect();
  process.exit(1);
});
