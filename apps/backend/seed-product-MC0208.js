// seed-product-MC0208.js — Layout e Configuração de Redes Sociais (até 3 redes)
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
// Uso: node seed-product-MC0208.js

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "LEGACY-IMPORT-MC0208";

const meta = {
  "_origem": "Importado do dump da plataforma antiga (produtos-modelos-questionarios.json), piloto de migração — revisar campos marcados como dado não disponível. ID do produto é PROVISÓRIO (prefixo LEGACY-IMPORT-), ainda não segue a convenção definitiva do modelo novo.",
  "recurrence": "Avulso e Mensal",
  "deliveryDays": 20,
  "summaryDescription": "• Para este serviço, o cliente deve liberar os acessos de até 3 redes sociais para otimização e configuração.\n• Será desenvolvido um layout adaptado para até 3 redes, entregue em arquivo aberto e fechado, viabilizando alterações futuras pelo cliente.\n• Após aprovação do layout, um analista de mídias vai fazer uma verificação completa e entregar um arquivo PDF com todas as recomendações de configuração e alterações de texto.\n• É importante que o cliente já tenha criado a sua página profissional.\n• Fazem parte do layout itens que compõem a rede social, como capa, foto de perfil, ícones de destaque e, dependendo da rede social, elementos de exibição.\n• O layout será entregue em .PNG.\n• Será enviado em mockups para melhor visualização.",
  "finalPrice": 272.16,
  "itemLimit": 1,
  "totalExecutionHours": 5,
  "stepsEnabled": true,
  "taskModel": {
    "objective": "Configuração de redes sociais",
    "creator": "Consultor/Agência",
    "responsible": "Líder de Criação e Arte",
    "executor": "Nômade Especialista",
    "requiresAccess": true,
    "itemLimit": 1,
    "totalDeadlineDays": 20
  },
  "warnings": [
    {
      "level": "info",
      "message": "• Todos elementos utilizados devem ser criados pelo Nômade designado ou captados de um banco de imagens/fontes que permitam o uso comercial das mesmas respeitando os temos da Lei Federal N° 9.610/98 (Lei de Direitos Autorais), qualquer problema legal diante a criação que desrespeitam esta, o Nômade terá a responsabilidade legal."
    },
    {
      "level": "warning",
      "message": "Quanto maior o detalhamento das informações, mais fiel e qualitativa será a entrega."
    },
    {
      "level": "warning",
      "message": "Ressaltamos que não está prevista neste serviço a criação de logos, artes (deverão ser enviados pelo cliente ou o cliente pode contratar esses produtos na plataforma - ver produtos complementares). Não está previsto também o aumento de seguidores e curtidas para as redes sociais, somente a criação e configuração do perfil."
    },
    {
      "level": "warning",
      "message": "Todos os elementos, conteúdos e demais itens de propriedade do cliente devem respeitar os termos da Lei Federal Nº9.610/98 (Lei de Direito Autoral). Caso o material enviado desrespeite essa determinação, diante de qualquer problema, a allka estará isenta e o cliente será responsabilizado legalmente."
    }
  ],
  "accessInstructions": {
    "steps": [
      "Liberar os acessos necessários para as redes sociais informadas no briefing, inserindo no cofre ou efetuando a liberação de acordo com a rede social.",
      "Facebook -&gt; Adicionar o perfil da Lamego (https://www.facebook.com/profile.php?id=100078396200574) como amigo e depois compartilhar a página.",
      "Linkedin -&gt; Adicionar o perfil da Lamego (https://www.linkedin.com/in/lamego-operacional-201529147/) como amigo e depois compartilhar a página.",
      "Instagram -&gt; Compartilhar e-mail e senha de acesso à plataforma no cofre.",
      "X -&gt; Compartilhar e-mail e senha de acesso à plataforma no cofre.",
      "Thread -&gt; Compartilhar e-mail e senha de acesso à plataforma no cofre."
    ],
    "note": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
  },
  "rawExecutionRules": "Layout de Redes Sociais (até 3 redes)\n• Criador: Consultor/Agência\n• Responsável: Líder de Criação e Arte\n• Executor: Nômade Especialista\n• Objetivo: Criação de Layout para Redes Sociais\nExecução:\n• O executor deve enviar todas em um mockup a escolha do executor de alguma das redes solicitadas, com um modelo de imagem de perfil, ícones e imagem de capa, seguindo a referência com todo o conteúdo enviado (LINK DOS MOCKUPS)\n• O executor deve enviar todos os arquivos em .PNG nomeados corretamente\n• O executor não deve entregar o serviço com erro de digitação, erros graves de diagramação (fontes sem legibilidade ou cortadas na tela, imagem cortadas)\n• O executor não deve entregar o serviço com falta de conteúdo solicitado, envio de formato errado, recorte de imagens mal feito e imagens sem qualidade de visualização, pois a tarefa vai retornar para entrega sem alteração do prazo inicial.\n• Caso o profissional não consiga alterar até o prazo final, a tarefa poderá ser cancelada e as penalizações serão aplicadas;\n• Após aprovação final, o executor deve inserir na tarefa a imagem de perfil e imagem de capa em todos os formatos de todas as redes sociais solicitadas pelo cliente em PNG e PSD.\nConclusão:\n• A tarefa poderá ser \"Aprovada\" ou \"Reprovada\" pelo cliente, retornando para correção até o próximo dia útil com todas as solicitações atendidas.\nConfiguração de conta nas Redes Sociais (até 3 redes)\n • Criador: Consultor/Agência\n • Responsável: Líder de Mídias e Conteúdo\n • Executor: Nômade Especialista\n • Objetivo: Otimizar e configurar um perfil em até 3 redes sociais a partir da demanda do cliente.\n Execução:\n• O executor deve acessar todas as redes sociais informadas, links e website, para entender do negócio, tom de voz e identidade visual.\n• Após análise, efetuar em um documento padronizado composto por texto e prints (apresentação, justificativa, objetivo, período de monitoramento, resultados obtidos, alcance da otimização e prints das redes, gráficos e outros dados importantes) com toda sugestão de configuração, pesquisa efetuada, inserção e busca para apresentar um serviço de excelência e qualidade para o cliente. (documento padronizado)\n• Após elaborar o documento, enviar para aprovação do cliente.\n• O executor deve inserir todas as artes já aprovadas nas redes sociais do cliente, com a correta configuração, respeitando a data, horário e formato.\n• O executor não deve entregar o serviço sem relatórios precisos e com imagens inseridas, pois a tarefa vai retornar para entrega sem alteração do prazo inicial. Caso o profissional não consiga alterar até o prazo final, a tarefa poderá ser cancelada e as penalizações serão aplicadas.\nConclusão:\n• A tarefa poderá ser \"Aprovada\" ou \"Reprovada\" pelo cliente, retornando para correção até o próximo dia útil com todas as solicitações atendidas.",
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
    "tagline": "• A configuração de conta nas redes sociais visa impulsionar a página nos sistemas de busca das mídias sociais, além de melhorar o desempenho ao receber a visita do seu público-alvo. Isso inclui uma revisão completa das redações e a elaboração de um novo layout para até 3 redes sociais escolhidas por você.\n• O profissional realizará uma análise da concorrência e das informações do perfil ou página, além da organização geral das configurações da conta para garantir que estejam alinhadas com os objetivos e a identidade da marca ou do usuário, em redes como Facebook, Instagram, TikTok, LinkedIn, entre outras. Você receberá um relatório com todas as sugestões de alteração e, após sua aprovação, os ajustes serão feitos pelo especialista. Este produto oferece a criação do layout para redes sociais, como foto de perfil, capa atrativa e outros elementos que a mídia disponibilizar para edição.",
    "highlights": [
      "Configuração e otimização da conta.",
      "Pesquisa e análise de concorrentes.",
      "Edição e inclusão de informações.",
      "Melhor escolha e definição de categorias.",
      "Configurações de atendimento (horário de funcionamento, área de atendimento, telefone, endereço, etc.).",
      "Segmentação demográfica e territorial.",
      "Layout completo do perfil ou página com todos os elementos visuais (troca de capa, foto de perfil, etc.).",
      "Relatório analítico com as alterações e análises solicitadas."
    ],
    "targetAudience": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "whatIsIncluded": [
      {
        "title": "Configuração e otimização da conta.",
        "description": ""
      },
      {
        "title": "Pesquisa e análise de concorrentes.",
        "description": ""
      },
      {
        "title": "Edição e inclusão de informações.",
        "description": ""
      },
      {
        "title": "Melhor escolha e definição de categorias.",
        "description": ""
      },
      {
        "title": "Configurações de atendimento (horário de funcionamento, área de atendimento, telefone, endereço, etc.).",
        "description": ""
      },
      {
        "title": "Segmentação demográfica e territorial.",
        "description": ""
      },
      {
        "title": "Layout completo do perfil ou página com todos os elementos visuais (troca de capa, foto de perfil, etc.).",
        "description": ""
      },
      {
        "title": "Relatório analítico com as alterações e análises solicitadas.",
        "description": ""
      }
    ],
    "notIncluded": [
      "Criação da página ou perfil nas redes sociais.",
      "Gerenciamento de campanhas.",
      "Postagem nas redes sociais.",
      "Planejamento de conteúdos.",
      "Criação de postagens e outras artes."
    ],
    "benefits": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "deliverables": [
      "Configuração e otimização da conta.",
      "Pesquisa e análise de concorrentes.",
      "Edição e inclusão de informações.",
      "Melhor escolha e definição de categorias.",
      "Configurações de atendimento (horário de funcionamento, área de atendimento, telefone, endereço, etc.).",
      "Segmentação demográfica e territorial.",
      "Layout completo do perfil ou página com todos os elementos visuais (troca de capa, foto de perfil, etc.).",
      "Relatório analítico com as alterações e análises solicitadas."
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
    "Configuração e otimização da conta.",
    "Pesquisa e análise de concorrentes.",
    "Edição e inclusão de informações.",
    "Melhor escolha e definição de categorias.",
    "Configurações de atendimento (horário de funcionamento, área de atendimento, telefone, endereço, etc.).",
    "Segmentação demográfica e territorial.",
    "Layout completo do perfil ou página com todos os elementos visuais (troca de capa, foto de perfil, etc.).",
    "Relatório analítico com as alterações e análises solicitadas."
  ],
  "tasks": [
    {
      "id": "MC0208",
      "name": "Layout e Configuração de Redes Sociais (até 3 redes)",
      "description": "Criação de layout para sua rede social\n• Primeira Impressão Positiva: Um layout visualmente atraente causa uma excelente primeira impressão, capturando a atenção dos visitantes e incentivando-os a explorar mais sobre você ou sua empresa.\n• Profissionalismo e Credibilidade: Um design cuidadosamente elaborado transmite profissionalismo e confiança, o que é fundamental para construir uma reputação sólida na esfera digital.\n• Identidade de Marca Fortalecida: O layout reflete a identidade visual da marca, tornando-a mais reconhecível e destacando sua singularidade no mercado.\n• Engajamento Aumentado: Um layout atraente envolve e atrai a audiência, resultando em maior engajamento, compartilhamento e interação com o conteúdo.\n• Consistência da Marca: Ter um design coeso para todas as redes sociais cria uma imagem consistente da marca, fortalecendo a mensagem e a percepção da marca em diferentes plataformas.\nObjetivo: Configuração de redes sociais\n• A tarefa é dividida em 2 etapas: na primeira etapa serão desenvolvidos novos layouts quando solicitados e enviados para aprovação. Após aprovados, serão enviados para configuração, com análises de concorrência e outros itens pedidos.\n• A entrega deste material será em PNG e PSD para as artes e o relatório em PPT.\n• Irá acompanhado de mockups para melhor visualização.\n• Para este serviço, o cliente deve liberar os acessos de até 3 redes sociais para otimização e configuração.\n• Será desenvolvido um layout adaptado para até 3 redes, entregue em arquivo aberto e fechado, viabilizando alterações futuras pelo cliente.\n• Após aprovação do layout, um analista de mídias vai fazer uma verificação completa e entregar um arquivo PDF com todas as recomendações de configuração e alterações de texto.\n• É importante que o cliente já tenha criado a sua página profissional.\n• Quanto mais detalhadas forem as informações, mais fiel e qualitativa será a entrega. Por favor, não envie esta tarefa para execução caso ela dependa de algum material ou da conclusão de outra tarefa que ainda está sendo executada.",
      "category": "Mídias e Conteúdo",
      "objective": "Configuração de redes sociais",
      "dependencies": [],
      "requiresAccess": true,
      "calculatedCost": 162.51,
      "checklist": [
        "O conteúdo está no arquivo e na formatação padrão.",
        "O conteúdo criado está dentro do que é solicitado no briefing.",
        "A copy está estruturada corretamente e envolvente para o público-alvo.",
        "Se o site tenha várias abas, foi feito conteúdo para cada uma delas e estão separadas corretamente.",
        "Se for uma página de vendas,  os gatilhos mentais estão coerentes.",
        "Os CTA’s estão de acordo com os objetivos do site.",
        "Há orientações para quem irá construir o site (exemplo: indicação de botões e links clicáveis, destaques em frases, sugestões de imagens, etc) e essas orientações estão destacadas corretamente (para não serem confundidas com a copy).",
        "Verificar gramática, ortografia, coesão e coerência, bem como possíveis erros de digitação."
      ],
      "steps": [
        {
          "id": "MC0208-null",
          "name": "Conferencia de acessos enviados",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 0.01,
          "calculatedCost": 0.01
        },
        {
          "id": "MC0208-null",
          "name": "Resposta a seguidores - Semana 1",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "MC0208-null",
          "name": "Resposta a seguidores - Semana 3",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "MC0208-null",
          "name": "Resposta a seguidores - Semana 2",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "MC0208-null",
          "name": "Resposta a seguidores - Semana 4",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "MC0208-MC0208_1",
          "name": "Verificação de acessos",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 0,
          "calculatedCost": 0
        },
        {
          "id": "MC0208-DM0184",
          "name": "Layout de Redes Sociais",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 2,
          "estimatedHours": 2,
          "calculatedCost": 25
        },
        {
          "id": "MC0208-MC0208_3 (310)",
          "name": "Configuração de conta nas Redes Sociais (até 3 redes)",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 3,
          "estimatedHours": 3,
          "calculatedCost": 37.5
        },
        {
          "id": "MC0208-MC0208_4",
          "name": "Remoção de acessos",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 4,
          "estimatedHours": 0,
          "calculatedCost": 0
        }
      ]
    }
  ],
  "stages": [
    {
      "id": "MC0208-null",
      "code": "MC0208-null",
      "number": 1,
      "name": "Conferencia de acessos enviados",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0.01,
      "value": 0.01,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "MC0208-null",
      "code": "MC0208-null",
      "number": 1,
      "name": "Resposta a seguidores - Semana 1",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 5,
      "executionDeadlineHours": 96,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "MC0208-null",
      "code": "MC0208-null",
      "number": 1,
      "name": "Resposta a seguidores - Semana 3",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 15,
      "executionDeadlineHours": 360,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "MC0208-null",
      "code": "MC0208-null",
      "number": 1,
      "name": "Resposta a seguidores - Semana 2",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 10,
      "executionDeadlineHours": 240,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "MC0208-null",
      "code": "MC0208-null",
      "number": 1,
      "name": "Resposta a seguidores - Semana 4",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 20,
      "executionDeadlineHours": 480,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "MC0208-MC0208_1",
      "code": "MC0208-MC0208_1",
      "number": 1,
      "name": "Verificação de acessos",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [
        "Verifiquei todos os acessos enviados pela agência e estão corretos."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "MC0208-DM0184",
      "code": "MC0208-DM0184",
      "number": 2,
      "name": "Layout de Redes Sociais",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 2,
      "executionDeadlineHours": 24,
      "executionHours": 2,
      "value": 25,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "Verifiquei o briefing detalhamente para averiguar como foi pedido o layout de redes sociais na descrição da tarefa",
        "O layout realizado está dentro do que foi solicitado no briefing.",
        "Confirmei que o layout foi enviada em um arquivo PDF, contendo o layout no mockup e solto de cada rede social pedida",
        "Avaliei o design visual do layout. Ele é atraente, impactante e alinhado com a identidade visual da marca ou do projeto.",
        "Confirmei que o layout é legível em diferentes redes sociais e se a logo e as informações ficam legíveis em cada aplicação e se a imagem está bem centrada e adequadamente enquadrada",
        "Certifiquei de que ela represente de forma clara e visualmente apropriada a marca ou empresa que está sendo retratada.",
        "Revisei o conteúdo para verificar se foi inserido o conteúdo descrito no briefing",
        "Todas as informações essenciais estão presentes no layout, como logo, ícones, frase de efeito, número de telefone, endereço de e-mail etc.",
        "Verifiquei o briefing detalhadamente para averiguar como foi pedido o layout de redes sociais na descrição da tarefa.",
        "O layout realizado está dentro do que foi solicitado no briefing.",
        "Confirmei que o layout foi enviado em um arquivo PDF, contendo o layout no mockup e solto de cada rede social pedida.",
        "Avaliei o design visual do layout. Ele é atraente, impactante e alinhado com a identidade visual da marca ou do projeto.",
        "Confirmei que o layout é legível em diferentes redes sociais e se a logo e as informações ficam legíveis em cada aplicação e se a imagem está bem centrada e adequadamente enquadrada.",
        "Certifiquei de que ele represente de forma clara e visualmente apropriada a marca ou empresa que está sendo retratada.",
        "Revisei o conteúdo para verificar se foi inserido o conteúdo descrito no briefing.",
        "Todas as informações essenciais estão presentes no layout, como logo, ícones, frase de efeito, número de telefone, endereço de e-mail etc."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "MC0208-MC0208_3 (310)",
      "code": "MC0208-MC0208_3 (310)",
      "number": 3,
      "name": "Configuração de conta nas Redes Sociais (até 3 redes)",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 2,
      "executionDeadlineHours": 24,
      "executionHours": 3,
      "value": 37.5,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": false,
      "requiresFinalFiles": false,
      "checklist": [
        "Todas as informações estão no arquivo e na formatação padrão.",
        "As sugestões estão dentro do que foi solicitado no briefing.",
        "As sugestões de hashtags, bio, CTA’s, entre outras otimizações estão coerentes com os objetivos de comunicação e com o formato de cada rede social.",
        "As sugestões de hashtags, bio, CTA’s, entre outras otimizações estão coerentes com os objetivos de comunicação e com o formato de cada rede social.",
        "Gramática, ortografia, coesão e coerência, erros de digitação, tudo ok",
        "Após aprovação do cliente, todas as mudanças foram aplicadas nas redes sociais.",
        "Todas as informações estão no arquivo e na formatação padrão.",
        "As sugestões estão dentro do que foi solicitado no briefing.",
        "As sugestões de hashtags, bio, CTA’s, entre outras otimizações estão coerentes com os objetivos de comunicação e com o formato de cada rede social.",
        "Gramática, ortografia, coesão e coerência, erros de digitação, tudo ok.",
        "Após aprovação do cliente, todas as mudanças foram aplicadas nas redes sociais."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "MC0208-MC0208_4",
      "code": "MC0208-MC0208_4",
      "number": 4,
      "name": "Remoção de acessos",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Mídias e Conteúdo",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [
        "Removi os acessos do nômade liberados na primeira etapa da tarefa."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    }
  ],
  "questionnaire": {
    "id": "MC0208-Q",
    "code": "MC0119",
    "title": "Legendas para Redes Sociais 1 unidade",
    "questions": [
      {
        "id": "MC0208-Q01",
        "question": "Qual o objetivo da legenda?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualOObjetivoDaLegenda",
        "placeholder": "Ex: Informar e gerar engajamento"
      },
      {
        "id": "MC0208-Q02",
        "question": "Tem alguma referência?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "temAlgumaReferencia",
        "placeholder": "Ex: Aqui na rede social tem o tom de voz que usamos, link tal"
      },
      {
        "id": "MC0208-Q03",
        "question": "Quais suas redes sociais?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "quaisSuasRedesSociais",
        "placeholder": "Ex: Link do insta, link do face"
      },
      {
        "id": "MC0208-Q04",
        "question": "Qual a ideia, o conteúdo e a aplicação da legenda 1?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "qualAIdeiaOConteudoEAAplicacaoDaLegenda1",
        "placeholder": "Legenda 1: Falar sobre os 30 anos do laboratório. No site temos a história, contar um pouco e agradecer os pacientes pela confiança. Aplicação: Insta e face"
      },
      {
        "id": "MC0208-Q05",
        "question": "Público-alvo:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "publicoAlvo",
        "placeholder": "Homens e mulheres 25+ que estão preocupados com a saúde."
      },
      {
        "id": "MC0208-Q06",
        "question": "CTA:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "cta",
        "placeholder": "Ir até o laboratório ou entrar em contato para mais informações."
      },
      {
        "id": "MC0208-Q07",
        "question": "Hashtags para as legendas:",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "hashtagsParaAsLegendas",
        "placeholder": "relacionadas a saúde, laboratório de análises clínicas"
      }
    ]
  },
  "questionnairesExtra": [
    {
      "code": "MC0121",
      "title": "Layout e Configuração de Redes Sociais (até 3 redes)",
      "observation": "OBS: O cliente deve passar os acessos nas redes sociais para que todas as configurações sejam efetuadas nesta tarefa.",
      "questions": [
        {
          "id": "MC0208-Q01",
          "question": "Insira os links das suas redes sociais abaixo.",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "insiraOsLinksDasSuasRedesSociaisAbaixo",
          "placeholder": "Ex: Segue o link do meu instagram e facebook..."
        },
        {
          "id": "MC0208-Q02",
          "question": "Qual resultado esperado para sua rede social?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "qualResultadoEsperadoParaSuaRedeSocial",
          "placeholder": "Ex: Atualizar, faz tempo que fotos de capa e perfil são as mesmas."
        },
        {
          "id": "MC0208-Q03",
          "question": "Quais itens quer otimizar ou destacar em sua página?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "quaisItensQuerOtimizarOuDestacarEmSuaPag",
          "placeholder": "Ex: Quero pesquisa e perfil de diagnóstico de concorrentes, inclusão de informações nas páginas, layout completo, sugestões de temas de postagens, melhores hashtags para eu usar."
        },
        {
          "id": "MC0208-Q04",
          "question": "O que imagina para o layout de suas redes sociais?",
          "type": "text",
          "required": true,
          "options": [
            "Sim",
            "Não"
          ],
          "attachmentEnabled": true,
          "briefingKey": "oQueImaginaParaOLayoutDeSuasRedesSociais",
          "placeholder": "Ex: Quero algo rosa seguindo o meu logo, mas na capa colocando alguns dos serviços que prestamos, como gerenciamento de redes, criação de banners, sites e logotipos."
        },
        {
          "id": "MC0208-Q05",
          "question": "Tem alguma referência?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "temAlgumaReferencia",
          "placeholder": "Ex: Sim, gosto desse estilo que anexei na tarefa e enviei no link a seguir..."
        },
        {
          "id": "MC0208-Q06",
          "question": "Que links podem ser úteis pra nossa execução?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "queLinksPodemSerUteisPraNossaExecucao",
          "placeholder": "Ex: Segue o link do site e link do whatsapp."
        },
        {
          "id": "MC0208-Q07",
          "question": "Quais seus concorrentes?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "quaisSeusConcorrentes",
          "placeholder": "Ex: Segue links dessas 2 agências concorrentes..."
        },
        {
          "id": "MC0208-Q08",
          "question": "Quem é seu público-alvo?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "quemESeuPublicoAlvo",
          "placeholder": "Ex: Pequenos e médios empresários que precisam do marketing digital, qualquer serviço."
        },
        {
          "id": "MC0208-Q09",
          "question": "Pode nos descrever o negócio e atuação?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "podeNosDescreverONegocioEAtuacao",
          "placeholder": "Ex: Estamos há 5 anos no mercado do marketing digital, meus diferenciais são e minha área de atuação é..."
        },
        {
          "id": "MC0208-Q10",
          "question": "Quais as informações de funcionamento e meios de contato?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "quaisAsInformacoesDeFuncionamentoEMeiosD",
          "placeholder": "Ex: o funcionamento das 8 as 18 horas e o Endereço Av. Sapopemba, 1456\nTelefones..."
        },
        {
          "id": "MC0208-Q11",
          "question": "Alguma chamada (CTA)?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "algumaChamadaCta",
          "placeholder": "Ex: Sim, fale conosco, saiba mais sobre a agência."
        },
        {
          "id": "MC0208-Q12",
          "question": "Alguma observação?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "algumaObservacao",
          "placeholder": "Ex: Não, já passei tudo."
        },
        {
          "id": "MC0208-Q13",
          "question": "Por favor, anexe o logotipo renderizado. Se você tiver o Manual da Marca, também gostaríamos de recebê-lo anexado.",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "porFavorAnexeOLogotipoRenderizadoSeVoceT",
          "placeholder": "Ex: Sim, anexei o manual da marca."
        },
        {
          "id": "MC0208-Q14",
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
  console.log("▶ Seeding MC0208 — Layout e Configuração de Redes Sociais (até 3 redes) (piloto de migração)...");

  const existing = await p.product.findUnique({ where: { id: PRODUCT_ID } });
  if (existing) {
    await p.productAddon.deleteMany({ where: { product_id: PRODUCT_ID } });
    await p.productVariation.deleteMany({ where: { product_id: PRODUCT_ID } });
    console.log("  ✓ Relações anteriores removidas (variações + addons)");
  }

  const base = {
    name: "Layout e Configuração de Redes Sociais (até 3 redes)",
    description: "• Primeira impressão: otimizar a biografia, escolher imagens de perfil e capa atraentes e garantir que as informações principais estejam claras torna mais provável que os visitantes se interessem e sigam sua conta.\n• Atrair o público-alvo: levamos em consideração o público-alvo e suas preferências. Isso inclui a seleção de palavras-chave relevantes, o uso de hashtags apropriadas e a personalização das configurações de privacidade, permitindo que o conteúdo alcance e atraia o público certo.\n• Melhoria da descoberta de conteúdo: com a análise de postagens anteriores e otimização da conta, é possível melhorar a descoberta do conteúdo pelos usuários. Isso pode incluir a identificação dos tipos de postagens que geraram maior engajamento no passado e a implementação de estratégias para aumentar a visibilidade e o alcance do conteúdo atual.\n• Consistência de marca: é importante garantir que a identidade visual, a voz e a mensagem da marca sejam consistentes em todas as redes sociais. Isso ajuda a construir reconhecimento da marca e a fortalecer a presença online de forma coerente.",
    short_description: "• Para este serviço, o cliente deve liberar os acessos de até 3 redes sociais para otimização e configuração.\n• Será desenvolvido um layout adaptado para até 3 redes, entregue em arquivo aberto e fechado, viabilizando alterações futuras pelo cliente.\n• Após aprovação do layout, um analista de mídias vai fazer uma verificação completa e entregar um arquivo PDF com todas as recomendações de configuração e alterações de texto.\n• É importante que o cliente já tenha criado a sua p",
    category: "Mídias e Conteúdo",
    tags: JSON.stringify([
  "Rede social",
  "Instagram",
  "Facebook",
  "Linkedin",
  "X (Twitter)",
  "Thread",
  "Otimização para rede",
  "Otimização para página",
  "Concorrência",
  "Arte para perfil",
  "Arte para destaque",
  "Arte para capa",
  "Criação de página",
  "Criação de perfil",
  "Criação de rede social"
]),
    base_price: 272.16,
    complexity: "basic",
    visibility: JSON.stringify({ company: true, agency: true, partner: false, inHouse: false }),
    image: null,
    demonstrations: JSON.stringify([]),
    completion_time: "20 dias",
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
      id: "LEGACY-IMPORT-MC0208-V01",
      product_id: PRODUCT_ID,
      name: "Contratação Padrão",
      description: "• Para este serviço, o cliente deve liberar os acessos de até 3 redes sociais para otimização e configuração.\n• Será desenvolvido um layout adaptado para até 3 redes, entregue em arquivo aberto e fechado, viabilizando alterações futuras pelo cliente.\n• Após aprovação do layout, um analista de mídias vai fazer uma verificação completa e entregar um arquivo PDF com todas as recomendações de configuração e alterações de texto.\n• É importante que o cliente já tenha criado a sua p",
      price: 272.16,
      price_modifier: 0,
      deadline_days: 20,
      scope_description: "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      features: JSON.stringify([
  "Configuração e otimização da conta.",
  "Pesquisa e análise de concorrentes.",
  "Edição e inclusão de informações.",
  "Melhor escolha e definição de categorias.",
  "Configurações de atendimento (horário de funcionamento, área de atendimento, telefone, endereço, etc.).",
  "Segmentação demográfica e territorial.",
  "Layout completo do perfil ou página com todos os elementos visuais (troca de capa, foto de perfil, etc.).",
  "Relatório analítico com as alterações e análises solicitadas."
]),
      sort_order: 1,
      is_active: true,
    },
  });
  console.log("  ✓ Variação LEGACY-IMPORT-MC0208-V01 criada");

  console.log("✅ MC0208 — Layout e Configuração de Redes Sociais (até 3 redes) seeded (PILOTO, revisar campos marcados).");
  await p.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erro no seed MC0208:", e.message);
  p.$disconnect();
  process.exit(1);
});
