// seed-product-PA0186.js — Gestão de Tráfego Até 2 Campanhas
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
// Uso: node seed-product-PA0186.js

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "LEGACY-IMPORT-PA0186";

const meta = {
  "_origem": "Importado do dump da plataforma antiga (produtos-modelos-questionarios.json), piloto de migração — revisar campos marcados como dado não disponível. ID do produto é PROVISÓRIO (prefixo LEGACY-IMPORT-), ainda não segue a convenção definitiva do modelo novo.",
  "recurrence": "Avulso e Mensal",
  "deliveryDays": 28,
  "summaryDescription": "• Até 2 campanhas - Esta opção inclui o gerenciamento de 2 campanhas em uma plataforma de sua escolha.\n• O cliente deve adicionar crédito na conta de anúncios através de um boleto e informar o valor que pretende investir ao longo do mês.\n• Este produto contempla o acompanhamento da campanha por 30 dias a partir do envio da tarefa.\n• Essa campanha serve para: Captação de seguidores, engajamento de seguidores, tráfego para site externo, download de aplicativo e conversão em vendas.\n• Este plano contempla o desenvolvimento de campanhas nas plataformas: Meta Ads, (Facebook e Instagram), Google Ads e Youtube Ads, Pinterest Ads, Linkedin Ads, Tiktok Ads\n• Não inclui a instalação de tag e pixel de conversão. Para um melhor desempenho da campanha e correto acompanhamento das conversões, é recomendada a contratação do Data Analytics. Caso não contrate antes de iniciar a campanha, o cliente se responsabiliza por toda a instalação do pixel e tag no site.\n• A plataforma de anúncios pode bloquear a conta de anúncios caso utilize criativos ou informações no site que estejam fora de suas políticas; sempre utilize criativos seguindo as melhores políticas da plataforma de anúncios.\n• Essa tarefa não inclui o planejamento com estratégias para campanha; caso precise criar um planejamento, contrate a tarefa Planejamento de Gestão de Tráfego.\n• O monitoramento das campanhas se limita ao plano contratado; o cliente pode solicitar a pausa e criação de uma nova campanha desde que seja dentro das plataformas informadas no briefing, não sendo permitida a criação de campanhas em novas plataformas.\n• O profissional tem um prazo de até 48 horas para responder aos comentários e solicitações feitas na tarefa.\n• É necessário compartilhar a conta de anúncio como administrador com o e-mail mktperformance2023@gmail.com, para compartilhamento com o profissional.",
  "finalPrice": 381.02,
  "itemLimit": 1,
  "totalExecutionHours": 8,
  "stepsEnabled": true,
  "taskModel": {
    "objective": "Gestão de Tráfego",
    "creator": "Consultor/Agência",
    "responsible": "Líder de Performance",
    "executor": "Nômade Especialista",
    "requiresAccess": true,
    "itemLimit": 1,
    "totalDeadlineDays": 28
  },
  "warnings": [
    {
      "level": "info",
      "message": "• Todos elementos utilizados devem ser criados pelo Nômade designado ou captados de um banco de imagens/fontes que permitam o uso comercial das mesmas respeitando os temos da Lei Federal N° 9.610/98 (Lei de Direitos Autorais), qualquer problema legal diante a criação que desrespeitam esta, o Nômade terá a responsabilidade legal."
    },
    {
      "level": "warning",
      "message": "Quanto mais detalhadas forem as informações fornecidas, mais precisa e de melhor qualidade será a entrega."
    },
    {
      "level": "warning",
      "message": "O cliente deve adicionar crédito a conta de anúncios para ser utilizado ao longo de 30 dias, caso não insira vai correr normalmente e será concluída no mesmo período."
    },
    {
      "level": "warning",
      "message": "Não está contemplada a instalação de pixel e tags de conversão; é necessário contratar o produto Data Analytics."
    },
    {
      "level": "warning",
      "message": "Esse produto não inclui o planejamento inicial; o cliente deve enviar todas as informações no briefing para o melhor entendimento do profissional."
    },
    {
      "level": "warning",
      "message": "A Allka não se responsabiliza pela criação do Gerenciador de Negócios nem por possíveis bloqueios na rede social."
    },
    {
      "level": "warning",
      "message": "Para a Campanha de Google Shopping, não está incluída a instalação do Merchant Center. O cliente deve configurar o Merchant Center em sua plataforma de loja virtual."
    },
    {
      "level": "warning",
      "message": "Este produto não garante resultados, pois a estratégia é do cliente, e as sugestões do especialista devem ser aprovadas pelo estrategista contratante."
    },
    {
      "level": "warning",
      "message": "Todos os elementos, conteúdos e demais itens de propriedade do cliente devem respeitar os termos da Lei Federal Nº9.610/98 (Lei de Direito Autorais). Caso o material enviado desrespeite essa determinação, diante qualquer problema, a Allka estará isenta e o cliente será responsabilizado legalmente."
    }
  ],
  "accessInstructions": {
    "steps": [
      "Compartilhamento da conta de anúncios como administrador ou proprietário.",
      "Compartilhar as contas de anúncios com o e-mail: mktperformance2023@gmail.com"
    ],
    "note": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
  },
  "rawExecutionRules": "Gestão de Tráfego\n• Criador: Consultor/Agência\n• Responsável: Líder de Performance\n• Executor: Nômade Especialista\n• Objetivo: Elaboração e acompanhamento de campanhas para a mesma empresa e seus produtos nas redes sociais.\n Execução:\n•  O executor deve verificar se a conta de anúncios foi compartilhada com seu e-mail, caso não identifique, é necessário comentar na tarefa sobre o não recebimento da conta de anúncios;\n• O executor inicialmente deve estruturar a campanha seguindo o planejamento e preenchendo o documento padronizado (https://knowledgebase.allka.com.vc/modelos-de-entrega-nomades/), indicando a campanha, anúncios, criativo, palavras-chave selecionadas, palavras-chave negativas, público-alvo, extensões e configurações recomendadas. Todas as informações com base na solicitação do briefing visando apresentar ao cliente a melhor estratégia para o objetivo;\n• Se o site não tiver tags ou pixel instalados, o executor deve informar onde as tags devem ser inseridas;\n• O executor deve anexar o documento na etapa da tarefa e clicar em “Salvar”;\n• Após a aprovação da estrutura da campanha, o executor precisará inserir o arquivo final, que não é nada mais do que o documento já enviado comprovando que a campanha está ativa e em execução.;\n• O executor deve emitir um relatório semanal, fornecendo feedback que inclui o saldo em conta, o valor investido no período, uma análise das métricas, as principais alterações realizadas, o que se pretende otimizar na próxima semana e possíveis solicitações ao cliente;\n• Caso a conta de anúncio esteja sem crédito no dia da criação ou na análise semanal, o profissional deve informar no feedback semanal e clicar em “Salvar” para a análise do cliente;\n• Após a execução, o profissional deve enviar o documento padronizado e clicar em “Salvar” para a análise do cliente;\n• O executor não deve entregar o serviço com artes e descrições diferentes do solicitado, nem com público ou objetivo de campanha que não estejam de acordo com o briefing. Caso isso ocorra, a tarefa será retornada para correção sem alteração do prazo inicial de entrega. Se não for corrigida, as penalizações previstas serão aplicadas.\n• Após o período de 30 dias, o executor deve enviar o relatório final com documento padronizado, que inclui analise do período completo, comparação com o mês anterior, sugestões de otimizações, prints que comprovem resultados e execuções realizadas. É hora de defender o seu trabalho efetuado para garantir que a tarefa do próximo período volte para você.\n• Após elaborar o documento acima anexe na etapa da tarefa e clique em “Salvar” para a análise do cliente.\nConclusão:\n• A tarefa poderá ser \"Aprovada\" ou \"Reprovada\" pelo cliente, retornando para correção até o próximo dia útil com todas as solicitações atendidas.\nCondição:\n• Necessário crédito ativo na campanha para que o profissional efetue os testes de 5 dias úteis. Caso contrário a tarefa será finalizada em 7 dias úteis.",
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
    "tagline": "• Nossa Gestão de Tráfego oferece uma equipe de especialistas tecnicamente habilitados para criar e gerenciar campanhas patrocinadas em várias plataformas digitais, incluindo Meta Ads, Google Ads, Bing Ads, TikTok Ads e Linkedin Ads.\n• Com nossas campanhas, você pode atingir uma variedade de objetivos, desde aumentar o tráfego do site e capturar leads até impulsionar as vendas, conversões e o engajamento com suas publicações. Você define seus objetivos e nossos especialistas sugerem e implementam as campanhas necessárias para alcançá-los.\n• É hora de elevar seus resultados com a expertise de profissionais de alto nível. Deixe suas ideias nas mãos dos verdadeiros especialistas.",
    "highlights": [
      "Criação e otimização campanha semanal",
      "Configuração das campanhas nas plataformas",
      "Acompanhamento das métricas",
      "Feedbacks semanais",
      "Relatório final",
      "Segmentação de público-alvo e palavra-chave"
    ],
    "targetAudience": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "whatIsIncluded": [
      {
        "title": "Criação e otimização campanha semanal",
        "description": ""
      },
      {
        "title": "Configuração das campanhas nas plataformas",
        "description": ""
      },
      {
        "title": "Acompanhamento das métricas",
        "description": ""
      },
      {
        "title": "Feedbacks semanais",
        "description": ""
      },
      {
        "title": "Relatório final",
        "description": ""
      },
      {
        "title": "Segmentação de público-alvo e palavra-chave",
        "description": ""
      }
    ],
    "notIncluded": [
      "Instalação e configuração de pixel ou tag de conversão",
      "Planejamento Inicial",
      "Criação de conta ou resolução de bloqueios",
      "Design e conteúdo",
      "Configuração de plataforma externa",
      "Relatório ou suporte diário"
    ],
    "benefits": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "deliverables": [
      "Criação e otimização campanha semanal",
      "Configuração das campanhas nas plataformas",
      "Acompanhamento das métricas",
      "Feedbacks semanais",
      "Relatório final",
      "Segmentação de público-alvo e palavra-chave"
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
    "Criação e otimização campanha semanal",
    "Configuração das campanhas nas plataformas",
    "Acompanhamento das métricas",
    "Feedbacks semanais",
    "Relatório final",
    "Segmentação de público-alvo e palavra-chave"
  ],
  "tasks": [
    {
      "id": "PA0186",
      "name": "Gestão de Tráfego Até 2 Campanhas",
      "description": "Objetivo: Gestão de Tráfego\n• Essa tarefa é utilizada para criação e otimização de campanhas de tráfego pago nas redes sociais e Google.\n• Essa tarefa visa à captação de leads, incremento de vendas, aumento do número de seguidores, engajamento com o perfil, reconhecimento de marca e downloads de apps.\n• Podem ser realizadas campanhas em mais de uma plataforma de anúncios, como (dependendo do plano contratado): Meta ADS, Google ADS, LinkedIn ADS e TikTok ADS.\n• A instalação de pixels e tags de conversão não está incluída.\n• O planejamento inicial, com indicação de campanhas e a plataforma a ser utilizada, não está incluído.\n• O profissional monitorará e otimizará a campanha ao longo de 30 dias, oferecendo análises e sugestões de melhorias.\n• A entrega desta tarefa será em um arquivo PowerPoint, incluindo um feedback inicial, três feedbacks semanais e um relatório final com os principais dados da campanha.\n• Quanto mais detalhadas forem as informações, mais fiel e qualitativa será a entrega. Por favor, não envie esta tarefa para execução caso ela dependa de algum material ou da conclusão de outra tarefa que ainda está sendo executada.",
      "category": "Performance e Anúncios Patrocinados",
      "objective": "Gestão de Tráfego",
      "dependencies": [],
      "requiresAccess": true,
      "calculatedCost": 100,
      "checklist": [
        "O documento está dentro do padrão."
      ],
      "steps": [
        {
          "id": "PA0186-PA0186_1",
          "name": "Verificação de acessos",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 0,
          "calculatedCost": 0
        },
        {
          "id": "PA0186-PA0186_2.0",
          "name": "Gestão de Tráfego Feedback 1",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 2,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "PA0186-PA0186_2.1",
          "name": "Gestão de Tráfego Feedback 2",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 2,
          "estimatedHours": 1,
          "calculatedCost": 12.5
        },
        {
          "id": "PA0186-PA0186_2.2",
          "name": "Gestão de Tráfego Feedback 3",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 2,
          "estimatedHours": 1,
          "calculatedCost": 12.5
        },
        {
          "id": "PA0186-PA0186_2.3",
          "name": "Gestão de Tráfego Feedback 4",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 2,
          "estimatedHours": 1,
          "calculatedCost": 12.5
        },
        {
          "id": "PA0186-PA0186_2.4",
          "name": "Gestão de Tráfego Relatorio Final",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 2,
          "estimatedHours": 3,
          "calculatedCost": 37.5
        },
        {
          "id": "PA0186-PA0186_3",
          "name": "Remoção de acessos",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 3,
          "estimatedHours": 0,
          "calculatedCost": 0
        }
      ]
    }
  ],
  "stages": [
    {
      "id": "PA0186-PA0186_1",
      "code": "PA0186-PA0186_1",
      "number": 1,
      "name": "Verificação de acessos",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Performance e Anúncios Patrocinados",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": true,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [
        "Teste 01",
        "Teste 02",
        "Verifiquei os acessos de acordo com o que foi solicitado e estão corretos"
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0186-PA0186_2.0",
      "code": "PA0186-PA0186_2.0",
      "number": 2,
      "name": "Gestão de Tráfego Feedback 1",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Performance e Anúncios Patrocinados",
      "deliveryDeadlineDays": 5,
      "executionDeadlineHours": 96,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O documento está dentro do padrão.",
        "As campanhas estão de acordo com o briefing.",
        "As alterações feitas estão dentro do solicitado.",
        "O investimento está de acordo com o briefing.",
        "O público e localidade estão de acordo com o público alvo e localidade do cliente.",
        "Os prints estão corretos e são do cliente na tarefa.",
        "O relatório está bem diagramado e de fácil compreensão."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0186-PA0186_2.1",
      "code": "PA0186-PA0186_2.1",
      "number": 2,
      "name": "Gestão de Tráfego Feedback 2",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Performance e Anúncios Patrocinados",
      "deliveryDeadlineDays": 11,
      "executionDeadlineHours": 240,
      "executionHours": 1,
      "value": 12.5,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O documento está dentro do padrão.",
        "As campanhas estão de acordo com o briefing.",
        "As alterações feitas estão dentro do solicitado.",
        "O investimento está de acordo com o briefing.",
        "O público e localidade estão de acordo com o público alvo e localidade do cliente.",
        "Os prints estão corretos e são do cliente na tarefa.",
        "O relatório está bem diagramado e de fácil compreensão."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0186-PA0186_2.2",
      "code": "PA0186-PA0186_2.2",
      "number": 2,
      "name": "Gestão de Tráfego Feedback 3",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Performance e Anúncios Patrocinados",
      "deliveryDeadlineDays": 17,
      "executionDeadlineHours": 384,
      "executionHours": 1,
      "value": 12.5,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O documento está dentro do padrão.",
        "As campanhas estão de acordo com o briefing.",
        "As alterações feitas estão dentro do solicitado.",
        "O investimento está de acordo com o briefing.",
        "O público e localidade estão de acordo com o público alvo e localidade do cliente.",
        "Os prints estão corretos e são do cliente na tarefa.",
        "O relatório está bem diagramado e de fácil compreensão."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0186-PA0186_2.3",
      "code": "PA0186-PA0186_2.3",
      "number": 2,
      "name": "Gestão de Tráfego Feedback 4",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Performance e Anúncios Patrocinados",
      "deliveryDeadlineDays": 23,
      "executionDeadlineHours": 528,
      "executionHours": 1,
      "value": 12.5,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O documento está dentro do padrão.",
        "As campanhas estão de acordo com o briefing.",
        "As alterações feitas estão dentro do solicitado.",
        "O investimento está de acordo com o briefing.",
        "O público e localidade estão de acordo com o público alvo e localidade do cliente.",
        "Os prints estão corretos e são do cliente na tarefa.",
        "O relatório está bem diagramado e de fácil compreensão."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0186-PA0186_2.4",
      "code": "PA0186-PA0186_2.4",
      "number": 2,
      "name": "Gestão de Tráfego Relatorio Final",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Performance e Anúncios Patrocinados",
      "deliveryDeadlineDays": 28,
      "executionDeadlineHours": 648,
      "executionHours": 3,
      "value": 37.5,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "O documento está dentro do padrão.",
        "As campanhas estão de acordo com o briefing.",
        "As alterações feitas estão dentro do solicitado.",
        "O investimento está de acordo com o briefing.",
        "O público e localidade estão de acordo com o público alvo e localidade do cliente.",
        "Os prints estão corretos e são do cliente na tarefa.",
        "O relatório está bem diagramado e de fácil compreensão.",
        "O relatório final, o investimento está de acordo com o informado.",
        "O relatório final, a campanha está pausada após o termino se solicitado pelo cliente no briefing."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "PA0186-PA0186_3",
      "code": "PA0186-PA0186_3",
      "number": 3,
      "name": "Remoção de acessos",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Performance e Anúncios Patrocinados",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": true,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [
        "Removi os acessos referente a essa tarefa utilizados pelo nômade"
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    }
  ],
  "questionnaire": {
    "id": "PA0186-Q",
    "code": "PA0106",
    "title": "Gestão de Tráfego",
    "observation": "Obs: É necessário compartilhar o gerenciador de anúncios, inserindo o e-mail mktperformance2023@gmail.com como administrador ou com controle total, para permitir que a plataforma habilite e desabilite os nômades dentro da conta para gestão de tráfego.\nItem 1: Caso a conta seja compartilhada com acesso padrão, a responsabilidade de compartilhamento com o profissional é da agência.\nItem 2: É necessário fornecer o criativo, copy e url do site utilizado na campanha.\nItem 3 A conta de anúncios precisa ter saldo e estar funcionando (sem bloqueio por parte da plataforma de anúncio).",
    "questions": [
      {
        "id": "PA0186-Q01",
        "question": "Selecione abaixo o status da sua campanha:",
        "type": "select",
        "required": true,
        "options": [
          "Otimização de campanha existente",
          "Nunca anunciei",
          "Nova campanha",
          "Criação de nova campanha com base em campanha existente"
        ],
        "attachmentEnabled": false,
        "briefingKey": "selecioneAbaixoOStatusDaSuaCampanha",
        "placeholder": "Ex: Criação de nova campanha com base em campanha existente"
      },
      {
        "id": "PA0186-Q02",
        "question": "Como você descreveria o desempenho e os resultados da sua última campanha?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "comoVoceDescreveriaODesempenhoEOsResulta",
        "placeholder": "Ex: A campanha anterior gerou um aumento de 20% nas vendas, mas o custo por aquisição foi alto."
      },
      {
        "id": "PA0186-Q03",
        "question": "Esta será uma nova campanha ou uma otimização de uma campanha ativa?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "estaSeraUmaNovaCampanhaOuUmaOtimizacaoDe",
        "placeholder": "Ex: Quero criar uma nova campanha focada em um novo produto."
      },
      {
        "id": "PA0186-Q04",
        "question": "Você concorda em ativar a campanha por 30 dias corridos, mesmo sem a aprovação? ",
        "type": "select",
        "required": true,
        "options": [
          "Sim confio na expertise do especialista e desejo agilizar o processo.",
          "Não por favor esperar a aprovação."
        ],
        "attachmentEnabled": false,
        "briefingKey": "voceConcordaEmAtivarACampanhaPor30DiasCo",
        "placeholder": "Ex: Sim, confio na expertise do especialista e desejo agilizar o processo.\n"
      },
      {
        "id": "PA0186-Q05",
        "question": "Qual será o seu investimento diário na campanha?",
        "type": "text",
        "required": true,
        "options": [
          "Não - por favor esperar a aprovação.",
          "Sim - confio na expertise do especialista e desejo agilizar o processo."
        ],
        "attachmentEnabled": false,
        "briefingKey": "qualSeraOSeuInvestimentoDiarioNaCampanha",
        "placeholder": "Ex: R$50,00 por dia no Meta e R$30,00 por dia no Google"
      },
      {
        "id": "PA0186-Q06",
        "question": "Em quais dias, intervalos de datas e períodos do dia você deseja veicular sua campanha?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "emQuaisDiasIntervalosDeDatasEPeriodosDoD",
        "placeholder": "Ex: De 01/05 a 31/05, de segunda a sexta, das 8h às 22h."
      },
      {
        "id": "PA0186-Q07",
        "question": "Deseja manter a campanha ativa após a conclusão da tarefa?",
        "type": "select",
        "required": true,
        "options": [
          "Não pausar a campanha ao concluir a tarefa ou na data estabelecida acima.",
          "Sim continuar investindo o valor diário informado acima."
        ],
        "attachmentEnabled": false,
        "briefingKey": "desejaManterACampanhaAtivaAposAConclusao",
        "placeholder": "Ex: Não, pausar a campanha ao concluir a tarefa ou na data estabelecida acima."
      },
      {
        "id": "PA0186-Q08",
        "question": "Em quais plataformas você deseja anunciar?",
        "type": "multiselect",
        "required": true,
        "options": [
          "Tiktok Ads",
          "Linkedin Ads",
          "Youtube Ads",
          "Google Ads",
          "Meta Ads"
        ],
        "attachmentEnabled": false,
        "briefingKey": "emQuaisPlataformasVoceDesejaAnunciar",
        "placeholder": "Ex: Meta ADS e Google ADS"
      },
      {
        "id": "PA0186-Q09",
        "question": "Quais são os resultados esperados com a campanha?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "quaisSaoOsResultadosEsperadosComACampanh",
        "placeholder": "Ex: Aumentar o reconhecimento da marca na região sul e ter um aumento em 20% das vendas"
      },
      {
        "id": "PA0186-Q10",
        "question": "Pode descrever a estratégia desejada para a campanha? ",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "podeDescreverAEstrategiaDesejadaParaACam",
        "placeholder": "Ex: Meta ads: veicular campanha apenas no reels e stories do Instagram com objetivo cadastro no site, utilizar o criativo 1 e 2; Google ads: Criar uma campanha na rede de pesquisa com as palavras chave informadas no briefing para região de São Paulo."
      },
      {
        "id": "PA0186-Q11",
        "question": "Qual página ou website deve ser utilizado na campanha?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualPaginaOuWebsiteDeveSerUtilizadoNaCam",
        "placeholder": "Ex: Exemplo: https://shopsutentavel.com.br/"
      },
      {
        "id": "PA0186-Q12",
        "question": "Quais produtos, serviços, aplicações e dados específicos você gostaria de destacar?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "quaisProdutosServicosAplicacoesEDadosEsp",
        "placeholder": "Ex: Destacar a nova linha de produtos sustentáveis"
      },
      {
        "id": "PA0186-Q13",
        "question": "Para quem é destinada cada campanha? ",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "paraQuemEDestinadaCadaCampanha",
        "placeholder": "Ex: Mulheres, 25 a 34 anos, interessadas em moda sustentável nas regiões Sul e Sudeste"
      },
      {
        "id": "PA0186-Q14",
        "question": "Em quais cidades, países, bairros ou raio de atuação você deseja focar?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "emQuaisCidadesPaisesBairrosOuRaioDeAtuac",
        "placeholder": "Ex: Atuação no estado de São Paulo, especialmente na capital e em Campinas."
      },
      {
        "id": "PA0186-Q15",
        "question": "Quais ações de conversão você considera mais importantes?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "quaisAcoesDeConversaoVoceConsideraMaisIm",
        "placeholder": "Ex: Preenchimento de formulário de contato e tempo de permanência no site."
      },
      {
        "id": "PA0186-Q16",
        "question": "Você tem sugestões de palavras-chave ou público-alvo para a pesquisa? ",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "voceTemSugestoesDePalavrasChaveOuPublico",
        "placeholder": "Ex: Moda sustentável, roupas ecológicas."
      },
      {
        "id": "PA0186-Q17",
        "question": "Existem palavras-chave que devem ser evitadas na pesquisa? ",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "existemPalavrasChaveQueDevemSerEvitadasN",
        "placeholder": "Ex: Moda rápida, produtos plásticos, couro, animais"
      },
      {
        "id": "PA0186-Q18",
        "question": "Qual o melhor e-mail para enviarmos os relatórios da campanha?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualOMelhorEMailParaEnviarmosOsRelatorio",
        "placeholder": "Ex: adm@shopsustentavel.com.br"
      },
      {
        "id": "PA0186-Q19",
        "question": "Como podemos identificar facilmente suas contas de anúncio?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "comoPodemosIdentificarFacilmenteSuasCont",
        "placeholder": "Ex: Nossa Loja - Moda Sustentável, ID: 9878-6543-215"
      },
      {
        "id": "PA0186-Q20",
        "question": "Você pode anexar os criativos da campanha nas medidas adequadas? ",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "vocePodeAnexarOsCriativosDaCampanhaNasMe",
        "placeholder": "Ex: Sim, foi anexado"
      },
      {
        "id": "PA0186-Q21",
        "question": "Pode anexar ideias de texto para os anúncios?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "podeAnexarIdeiasDeTextoParaOsAnuncios",
        "placeholder": "Ex: Não possuo ideias para anexar"
      },
      {
        "id": "PA0186-Q22",
        "question": "Existe algum material diverso relacionado às campanhas que você gostaria de anexar?",
        "type": "file",
        "required": false,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "existeAlgumMaterialDiversoRelacionadoAsC",
        "placeholder": "Ex: Por favor, anexe os arquivos."
      }
    ]
  },
  "questionnairesExtra": [],
  "portfolioImages": [
    "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
  ]
};

async function main() {
  console.log("▶ Seeding PA0186 — Gestão de Tráfego Até 2 Campanhas (piloto de migração)...");

  const existing = await p.product.findUnique({ where: { id: PRODUCT_ID } });
  if (existing) {
    await p.productAddon.deleteMany({ where: { product_id: PRODUCT_ID } });
    await p.productVariation.deleteMany({ where: { product_id: PRODUCT_ID } });
    console.log("  ✓ Relações anteriores removidas (variações + addons)");
  }

  const base = {
    name: "Gestão de Tráfego Até 2 Campanhas",
    description: "• Alcance direcionado: Chegue a pessoas específicas baseando-se em dados demográficos, interesses e comportamento.\n• Engajamento aprimorado: Promova a interação com seu público, aumentando o conhecimento da marca e a fidelidade do cliente.\n• Análise de desempenho: Obtenha insights valiosos sobre o desempenho de seus anúncios e a resposta do público.\n• Flexibilidade: Teste diferentes tipos de anúncios e ajuste suas campanhas conforme necessárias para melhor desempenho.\n• Custos controláveis: Defina seu próprio orçamento e controle quanto deseja gastar.\n• Feedback semanal: Relatório com feedback semanal das principais métricas e otimizações realizadas no período.\n• Especialista: Tarefa realizada por especialistas de nível pleno.\n• Liberdade: A qualquer momento você pode solicitar a paralisação da campanha atual e a criação de uma nova dentro da mesma plataforma.",
    short_description: "• Até 2 campanhas - Esta opção inclui o gerenciamento de 2 campanhas em uma plataforma de sua escolha.\n• O cliente deve adicionar crédito na conta de anúncios através de um boleto e informar o valor que pretende investir ao longo do mês.\n• Este produto contempla o acompanhamento da campanha por 30 dias a partir do envio da tarefa.\n• Essa campanha serve para: Captação de seguidores, engajamento de seguidores, tráfego para site externo, download de aplicativo e conversão em ven",
    category: "Performance e Anúncios Patrocinados",
    tags: JSON.stringify([
  "Campanhas de mídia social",
  "Facebook Ads",
  "Instagram Ads",
  "Anúncios pagos",
  "Linkedin ADS",
  "TikTok Ads",
  "Pinterest Ads",
  "Tráfego Pago",
  "Anúncio Online",
  "Meta ADS",
  "Patrocinado",
  "Anúncio Pago"
]),
    base_price: 381.02,
    complexity: "basic",
    visibility: JSON.stringify({ company: true, agency: true, partner: false, inHouse: false }),
    image: null,
    demonstrations: JSON.stringify([]),
    completion_time: "28 dias",
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
      id: "LEGACY-IMPORT-PA0186-V01",
      product_id: PRODUCT_ID,
      name: "Contratação Padrão",
      description: "• Até 2 campanhas - Esta opção inclui o gerenciamento de 2 campanhas em uma plataforma de sua escolha.\n• O cliente deve adicionar crédito na conta de anúncios através de um boleto e informar o valor que pretende investir ao longo do mês.\n• Este produto contempla o acompanhamento da campanha por 30 dias a partir do envio da tarefa.\n• Essa campanha serve para: Captação de seguidores, engajamento de seguidores, tráfego para site externo, download de aplicativo e conversão em ven",
      price: 381.02,
      price_modifier: 0,
      deadline_days: 28,
      scope_description: "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      features: JSON.stringify([
  "Criação e otimização campanha semanal",
  "Configuração das campanhas nas plataformas",
  "Acompanhamento das métricas",
  "Feedbacks semanais",
  "Relatório final",
  "Segmentação de público-alvo e palavra-chave"
]),
      sort_order: 1,
      is_active: true,
    },
  });
  console.log("  ✓ Variação LEGACY-IMPORT-PA0186-V01 criada");

  console.log("✅ PA0186 — Gestão de Tráfego Até 2 Campanhas seeded (PILOTO, revisar campos marcados).");
  await p.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erro no seed PA0186:", e.message);
  p.$disconnect();
  process.exit(1);
});
