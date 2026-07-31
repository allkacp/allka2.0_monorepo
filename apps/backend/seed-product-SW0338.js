// seed-product-SW0338.js — Construção de Loja Virtual Woocommerce (layout+construção)
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
// Uso: node seed-product-SW0338.js

const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const PRODUCT_ID = "LEGACY-IMPORT-SW0338";

const meta = {
  "_origem": "Importado do dump da plataforma antiga (produtos-modelos-questionarios.json), piloto de migração — revisar campos marcados como dado não disponível. ID do produto é PROVISÓRIO (prefixo LEGACY-IMPORT-), ainda não segue a convenção definitiva do modelo novo.",
  "recurrence": "Avulso e Mensal",
  "deliveryDays": 9,
  "summaryDescription": "• A tarefa só será executada após o envio dos acessos na plataforma.\n• Após o envio para execução não será permitido enviar novos materiais ou efetuar alterações nos materiais ou briefing já enviados, a menos que haja solicitação da Allka.\n• O produto atende exclusivamente a criação de lojas virtuais na plataforma Wordpress utilizando o plugin Woocommerce.\n• O modelo selecionado será customizado com a identidade visual e material do cliente, sem alteração de suas características.\n• Integrações com API’s, dropshipping, marketplaces ou plataformas devem ser contratadas no produto “Integração de Loja Virtual” por integração.\n• O cliente deve possuir domínio registrado e configurado na plataforma.\n• O cliente deve possuir conta ativa e configurada nos serviços de pagamento e logística selecionados. Credenciais de acesso ou tokens precisam ser informadas.\n• O cliente pode optar por não solicitar algum item incluso no produto.\n• Data Analytics será apenas inserido na loja, se compatível com a plataforma e plano contratado. Nenhuma configuração será realizada nas plataformas analíticas.\n• Somente serão configurados na loja serviços disponibilizados no plano contratado junto à plataforma.\n• Caso o material solicitado para construção não seja entregue ou seja feito de forma parcial, utilizaremos de recursos fictícios para a construção da loja virtual. Futuramente o cliente poderá realizar a alterações por conta própria.\n• A inclusão de novos materiais, conteúdo ou produtos (limitado a 10) será realizada somente após a construção da loja, mediante contratação do produto “Alteração de Website ou Loja Virtual”.\n• Este produto não contempla a configuração e/ou suporte em serviços e plataformas externas utilizados na Loja Virtual.",
  "finalPrice": 910.22,
  "itemLimit": 1,
  "totalExecutionHours": 20,
  "stepsEnabled": true,
  "taskModel": {
    "objective": "Criação e loja Virtual completa no Wordpress",
    "creator": "Consultor/Agência",
    "responsible": "Líder de Web",
    "executor": "Nômade Especialista",
    "requiresAccess": true,
    "itemLimit": 1,
    "totalDeadlineDays": 9
  },
  "warnings": [
    {
      "level": "info",
      "message": "• Todos os elementos utilizados devem ser criados pelo Nômade ou captados de bancos de imagens/fontes que permitam o uso comercial dos mesmos, de acordo com os termos da Lei Federal Nº9.610/98 (Lei de Direito Autorais). Caso desrespeite essa determinação, diante qualquer problema, o Nômade será responsabilizado legalmente.\r\n• Após receber a tarefa, o Nômade precisa verificar se há dúvidas ou possíveis falhas, como falta de informações ou link com defeito. Todos os apontamentos devem ser feitos até o fim do mesmo dia do recebimento. Se o Nômade questionar qualquer informação após este período, o prazo da tarefa não será alterado, ou seja, manteremos as regras e políticas de atraso normais da plataforma."
    },
    {
      "level": "warning",
      "message": "Quanto maior o detalhamento de informações, mais fiel e qualitativa será a entrega."
    },
    {
      "level": "warning",
      "message": "A tarefa só será executada após o envio dos acessos e todas as informações necessárias para desenvolvimento."
    },
    {
      "level": "warning",
      "message": "A allka não se responsabiliza por atualizações ou mudanças que sejam diretamente gerenciadas pela plataforma wordpress ou de terceiros."
    },
    {
      "level": "warning",
      "message": "Todos os elementos e conteúdos enviados ou de propriedade do (a) CLIENTE, devem respeitar os temos da Lei Federal N° 9.610/98 (Lei de Direitos Autorais), qualquer problema legal diante aos itens fornecidos que desrespeitam esta, a allka estará ISENTA e o CLIENTE terá a responsabilidade legal."
    }
  ],
  "accessInstructions": {
    "steps": [
      "Caso o cliente opte pelo serviço de hospedagem gratuita que oferecemos como cortesia por 60 dias, será necessário acessar o seu domínio (por exemplo: www.seudominio.com.br). Para isso, precisamos acessar o servidor de hospedagem onde você registrou o domínio. Existem duas maneiras de fazer isso:",
      "Fornecer Acesso Total: Você pode nos fornecer o seu login e senha. Essas informações devem ser inseridas no cofre da tarefa, garantindo a segurança dos seus dados.",
      "Criar um Usuário de Suporte: Outra opção é criar um usuário com perfil de suporte. Com isso, poderemos acessar e configurar o apontamento do domínio para o local correto."
    ],
    "note": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
  },
  "rawExecutionRules": "Construção de Loja Virtual Wordpress\n• Criador: Consultor/Agência\n• Responsável: Líder de Web\n• Executor: Nômade Especialista\n• Objetivo: Construção de loja virtual Woocommerce\nExecução:\n• O executor deve construir a loja virtual utilizando o tema, as referências informadas e anexadas na tarefa e builder próprio disponibilizados na plataforma WordPress.\n• O executor deve garantir que a loja seja totalmente responsiva, proporcionando uma experiência de usuário consistente em todos os dispositivos.\n• O executor deve observar que alterações de estilo e outras modificações não serão executadas após o envio da tarefa para execução. Qualquer modificação adicional deverá ser contratada como um produto adicional denominado \"Alteração de website ou loja virtual\".\n• O executor deve realizar a configuração completa da loja com base nas informações do briefing.\n• O executor deve informar imediatamente na tarefa caso alguma configuração não possa ser realizada devido a limitações técnicas da plataforma ou plano contratado.\n• O executor deve cadastrar até 10 produtos fornecidos pelo cliente, garantindo que todas as informações (descrições, preços, imagens, categorias, etc.) estejam corretamente preenchidas e apresentadas de forma atraente.\n• O executor deve configurar o menu de navegação da loja de acordo com as especificações do cliente, garantindo fácil acesso às principais categorias e páginas do site.\n• O executor deve integrar e ativar as redes sociais da loja, conforme informado pelo cliente, para facilitar o compartilhamento de produtos e aumentar o engajamento com os clientes.\n• O executor deve nomear as slugs das páginas de maneira clara e amigável para SEO (Search Engine Optimization), utilizando palavras-chave relevantes e evitando o uso de caracteres especiais ou espaços.\n• O executor deve garantir que todas as configurações do WordPress estejam completamente preenchidas, incluindo: Informações gerais do site (título, tagline, URL, etc.). - Configurações de leitura e escrita. - Configurações de permalinks. - Configurações de mídia. - Integrações com plugins essenciais.\n• O executor deve configurar os métodos de pagamento de acordo com as instruções fornecidas pelo cliente, incluindo opções como cartão de crédito, PayPal, transferência bancária, etc.\n• O executor deve garantir que todas as configurações estejam funcionando corretamente e que os pagamentos possam ser processados sem problemas.\n• O executor deve configurar as opções de entrega, incluindo frete, retirada na loja, etc., conforme especificado pelo cliente.\n• O executor deve certificar-se de que todas as taxas de envio e métodos de entrega estejam corretos e funcionando como esperado.\n• O executor deve configurar as ferramentas de análise de dados, como Google Analytics, para monitorar o tráfego e o desempenho da loja, caso os dados de acesso sejam fornecidos pelo cliente.\n• O executor deve garantir que todas as tags de rastreamento e códigos de monitoramento estejam corretamente implementadas no site.\n• O executor deve implementar todas as medidas de segurança recomendadas para proteger a loja virtual, incluindo: - Instalação e configuração de plugins de segurança.-  Utilização de certificados SSL para garantir conexões seguras (HTTPS). - Configuração de backups regulares e sistemas de recuperação de desastres. - Monitoramento de atividades suspeitas e aplicação de atualizações de segurança.\n• O executor deve aplicar técnicas de conversão, efeitos visuais e outras inovações que possam gerar mais resultados para o cliente.\n• O executor deve garantir que a entrega não contenha erros de digitação, erros graves de diagramação (como fontes ilegíveis ou cortadas na tela), imagens cortadas ou sem qualidade, ou falta de conteúdo solicitado.\n• O executor deve estar ciente de que, caso a tarefa seja entregue com esses problemas, ela será devolvida para correção sem alteração do prazo inicial.\n• O executor deve realizar as correções até o prazo final, caso contrário, a tarefa poderá ser cancelada e penalizações aplicadas.\n• O executor deve tentar implantar todas as aplicações solicitadas pelo cliente, desde que sejam suportadas pela plataforma e pelo template.\n• O executor deve buscar soluções alternativas e relatar o problema ao cliente caso encontre dificuldades.\n• O executor deve submeter a tarefa para aprovação após a execução, informando o endereço da loja virtual e clicando em \"Enviar\" para avaliação.]\n• O executor deve inserir na tarefa o arquivo final com o kit de instalação da loja após a aprovação.\n• O executor deve manter uma comunicação clara e contínua com o responsável e o cliente para garantir o sucesso do projeto.\n• O executor deve inovar dentro das possibilidades da plataforma e buscar sempre as melhores práticas de desenvolvimento web.\n• O executor deve manter o foco na usabilidade e na experiência do usuário final.",
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
    "tagline": "• Colocar sua empresa para vender online todos os dias, em qualquer horário e com diversas condições de pagamento e frete já não é uma inovação, é uma necessidade!\n• O Wordpress é uma das plataformas mais usadas no mundo para desenvolvimento de websites e lojas virtuais através do Woocommerce. Com ele, é possível construir a loja do seus sonhos, hospedada onde você desejar, sob seu total controle.\n• Esta plataforma é indicada para quem deseja profissionalizar ainda mais suas vendas online, e ter liberdade e controle total para gerenciar sua loja. Para você começar a vender profissionalmente, nós apresentamos uma solução completa de desenvolvimento de loja com todos os recursos que o Woocommerce oferece.\n• Criação de layout e estruturação de loja virtual com todos os recursos e aplicações apresentados na solicitação. É importante que as solicitações sejam disponibilizadas pelo cliente para implementação no Woocommerce. Realizaremos o cadastro e a configuração de até 10 produtos e enviaremos instruções detalhadas para que o cliente possa cadastrar os demais produtos e gerenciar a loja virtual. Caso o cliente necessite, poderá contratar o serviço adicional \"Alteração de Website ou Loja Virtual\", sendo que cada contratação adicional permitirá o cadastro de até mais 10 produtos extras.\n• Após conclusão do processo de criação e aprovação final, o cliente irá receber o produto (arquivos + base de dados) em formato zip e php junto com instruções de instalação, permitindo assim que sua Loja Virtual seja instalada no provedor de hospedagem de sua escolha.\n• Você ganha 60 dias de hospedagem do site na Allka ao contratar este produto. Caso queira manter hospedado junto à Allka, basta contratar o produto “Gerenciamento e Hospedagem de Website”.",
    "highlights": [
      "Criação e configuração da loja virtual no Woocommerce",
      "Cadastro de até 10 produtos",
      "Criação de até 3 banners",
      "Adequação da loja para dispositivos móveis",
      "Criação de formulários de contato",
      "Configuração do Google Analytics, tags e pixel (enviados pelo cliente);",
      "Contato via Whatsapp (se solicitado);",
      "Avaliação de produtos",
      "Controle de estoque",
      "Produtos variáveis",
      "Produtos relacionados",
      "Venda cruzada",
      "Lista de desejos",
      "Pesquisa e filtros",
      "Cupons de desconto",
      "Promoções",
      "Configuração de 1 forma de pagamento (Mercado Pago, Pagseguro, Paypal)",
      "Configuração de 1 forma de entrega (Correios, Melhor Envio, Frenet)",
      "Kit de instalação"
    ],
    "targetAudience": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "whatIsIncluded": [
      {
        "title": "Criação e configuração da loja virtual no Woocommerce",
        "description": ""
      },
      {
        "title": "Cadastro de até 10 produtos",
        "description": ""
      },
      {
        "title": "Criação de até 3 banners",
        "description": ""
      },
      {
        "title": "Adequação da loja para dispositivos móveis",
        "description": ""
      },
      {
        "title": "Criação de formulários de contato",
        "description": ""
      },
      {
        "title": "Configuração do Google Analytics, tags e pixel (enviados pelo cliente);",
        "description": ""
      },
      {
        "title": "Contato via Whatsapp (se solicitado);",
        "description": ""
      },
      {
        "title": "Avaliação de produtos",
        "description": ""
      },
      {
        "title": "Controle de estoque",
        "description": ""
      },
      {
        "title": "Produtos variáveis",
        "description": ""
      },
      {
        "title": "Produtos relacionados",
        "description": ""
      },
      {
        "title": "Venda cruzada",
        "description": ""
      },
      {
        "title": "Lista de desejos",
        "description": ""
      },
      {
        "title": "Pesquisa e filtros",
        "description": ""
      },
      {
        "title": "Cupons de desconto",
        "description": ""
      },
      {
        "title": "Promoções",
        "description": ""
      },
      {
        "title": "Configuração de 1 forma de pagamento (Mercado Pago, Pagseguro, Paypal)",
        "description": ""
      },
      {
        "title": "Configuração de 1 forma de entrega (Correios, Melhor Envio, Frenet)",
        "description": ""
      },
      {
        "title": "Kit de instalação",
        "description": ""
      }
    ],
    "notIncluded": [
      "Criação de conteúdo",
      "Registro e configuração de Domínio",
      "Hospedagem",
      "Revisão do conteúdo enviado pelo cliente",
      "Licenças de temas, plugins e/ou plataformas",
      "Alteração de temas",
      "Criação de funcionalidades",
      "Criação ou configuração de Api e integrações",
      "Criação de Dashboard",
      "Suporte técnico nas plataformas"
    ],
    "benefits": [
      "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    ],
    "deliverables": [
      "Criação e configuração da loja virtual no Woocommerce",
      "Cadastro de até 10 produtos",
      "Criação de até 3 banners",
      "Adequação da loja para dispositivos móveis",
      "Criação de formulários de contato",
      "Configuração do Google Analytics, tags e pixel (enviados pelo cliente);",
      "Contato via Whatsapp (se solicitado);",
      "Avaliação de produtos",
      "Controle de estoque",
      "Produtos variáveis",
      "Produtos relacionados",
      "Venda cruzada",
      "Lista de desejos",
      "Pesquisa e filtros",
      "Cupons de desconto",
      "Promoções",
      "Configuração de 1 forma de pagamento (Mercado Pago, Pagseguro, Paypal)",
      "Configuração de 1 forma de entrega (Correios, Melhor Envio, Frenet)",
      "Kit de instalação"
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
      }
    ]
  },
  "baseFeatures": [
    "Criação e configuração da loja virtual no Woocommerce",
    "Cadastro de até 10 produtos",
    "Criação de até 3 banners",
    "Adequação da loja para dispositivos móveis",
    "Criação de formulários de contato",
    "Configuração do Google Analytics, tags e pixel (enviados pelo cliente);",
    "Contato via Whatsapp (se solicitado);",
    "Avaliação de produtos",
    "Controle de estoque",
    "Produtos variáveis",
    "Produtos relacionados",
    "Venda cruzada",
    "Lista de desejos",
    "Pesquisa e filtros",
    "Cupons de desconto",
    "Promoções",
    "Configuração de 1 forma de pagamento (Mercado Pago, Pagseguro, Paypal)",
    "Configuração de 1 forma de entrega (Correios, Melhor Envio, Frenet)",
    "Kit de instalação"
  ],
  "tasks": [
    {
      "id": "SW0338",
      "name": "Loja Virtual Wordpress",
      "description": "Objetivo: Criação e loja Virtual completa no Wordpress\n• A tarefa só será executada após o envio dos acessos na plataforma.\n• Após o envio para execução não será permitido enviar novos materiais ou efetuar alterações nos materiais ou briefing já enviados, a menos que haja solicitação da Allka.\n• O produto atende exclusivamente a criação de lojas virtuais na plataforma Wordpress utilizando o plugin Woocommerce.\n• O modelo selecionado será customizado com a identidade visual e material do cliente, sem alteração de suas características.\n• Integrações com API’s, dropshipping, marketplaces ou plataformas devem ser contratadas no produto “Integração de Loja Virtual” por integração.\n• O cliente deve possuir domínio registrado e configurado na plataforma.\n• O cliente deve possuir conta ativa e configurada nos serviços de pagamento e logística selecionados. Credenciais de acesso ou tokens precisam ser informadas.\n• O cliente pode optar por não solicitar algum item incluso no produto.\n• Data Analytics será apenas inserido na loja, se compatível com a plataforma e plano contratado. Nenhuma configuração será realizada nas plataformas analíticas.\n• Somente serão configurados na loja serviços disponibilizados no plano contratado junto à plataforma.\n• Caso o material solicitado para construção não seja entregue ou seja feito de forma parcial, utilizaremos de recursos fictícios para a construção da loja virtual. Futuramente o cliente poderá realizar a alterações por conta própria.\n• A inclusão de novos materiais, conteúdo ou produtos (limitado a 10) será realizada somente após a construção da loja, mediante contratação do produto “Alteração de Website ou Loja Virtual”.\n• Este produto não contempla a configuração e/ou suporte em serviços e plataformas externas utilizados na Loja Virtual.",
      "category": "Soluções Web",
      "objective": "Criação e loja Virtual completa no Wordpress",
      "dependencies": [],
      "requiresAccess": true,
      "calculatedCost": 250,
      "checklist": [],
      "steps": [
        {
          "id": "SW0338-SW0270_1",
          "name": "Análise de Briefing e Ativação de Hospedagem",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 0,
          "calculatedCost": 0
        },
        {
          "id": "SW0338-null",
          "name": "Análise de Briefing e Ativação de Hospedagem",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 0,
          "calculatedCost": 0
        },
        {
          "id": "SW0338-null",
          "name": "Análise de Briefing e Ativação de Hospedagem",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 1,
          "estimatedHours": 0,
          "calculatedCost": 0
        },
        {
          "id": "SW0338-SW0338_2",
          "name": "Construção de Loja Virtual Woocommerce ",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 2,
          "estimatedHours": 20,
          "calculatedCost": 250
        },
        {
          "id": "SW0338-SW020_3",
          "name": "Finalização de Migração (etapa interna)",
          "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
          "order": 3,
          "estimatedHours": 0,
          "calculatedCost": 0
        },
        {
          "id": "SW0338-SW0270_4",
          "name": "Desativação da Hospedagem Gratuita ",
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
      "id": "SW0338-SW0270_1",
      "code": "SW0338-SW0270_1",
      "number": 1,
      "name": "Análise de Briefing e Ativação de Hospedagem",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Soluções Web",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [
        "O questionário foi preenchido corretamente com informações claras e completas.",
        "O material disponibilizado foi anexado e/ou compartilhado corretamente com todos os acessos liberados e sem erros.",
        "Todos os acessos foram anexados na tarefa ou compartilhados, e estão corretos."
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "SW0338-null",
      "code": "SW0338-null",
      "number": 1,
      "name": "Análise de Briefing e Ativação de Hospedagem",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Soluções Web",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "SW0338-null",
      "code": "SW0338-null",
      "number": 1,
      "name": "Análise de Briefing e Ativação de Hospedagem",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Soluções Web",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "SW0338-SW0338_2",
      "code": "SW0338-SW0338_2",
      "number": 2,
      "name": "Construção de Loja Virtual Woocommerce ",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Soluções Web",
      "deliveryDeadlineDays": 9,
      "executionDeadlineHours": 144,
      "executionHours": 20,
      "value": 250,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": true,
      "checklist": [
        "O layout foi criado conforme solicitado no briefing.",
        "A estrutura do layout está clara e bem organizada, com elementos posicionados de forma lógica e intuitiva, facilitando a navegação do usuário e, sem alterar a estrutura do tema.",
        "O layout criado é responsivo e está adaptado para diferentes dispositivos, como desktops, tablets e smartphones. Os elementos são exibidos de forma adequada em diferentes tamanhos de tela.",
        "O layout segue uma identidade visual consistente com a marca ou projeto e possui detalhamento dos elementos das páginas, existe coerência de cores, tipografia, estilos de botões e elementos gráficos em toda a página.",
        "Configurados nome da loja, logo e ícone",
        "Configurado Url da loja com https (caso cliente possua certificado)",
        "Configurado fuso horário São Paulo, data formato d/m/Y (se permitido pela plataforma)",
        "Logomarca linkada com a loja",
        "Menus, links, botões e CTA funcionando corretamente",
        "Layout construído conforme aprovação e devidamente ajustado de forma responsiva",
        "Loja construída de acordo com todos os itens e solicitações no briefing",
        "Configurações gerais (Endereço da Loja, produtos, entrega, cupons, endpoints...)",
        "Produtos e categorias cadastrados",
        "Pesquisa e filtros ativos e funcionais",
        "Gateway de pagamento configurado e validado",
        "Métodos de entrega e logística configurados e validados",
        "Formulários validados",
        "Carrinho de compras funcional",
        "Finalização de compra validada e funcional",
        "Loja funcionando corretamente, bom desempenho, imagens otimizadas"
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "SW0338-SW020_3",
      "code": "SW0338-SW020_3",
      "number": 3,
      "name": "Finalização de Migração (etapa interna)",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Soluções Web",
      "deliveryDeadlineDays": 1,
      "executionDeadlineHours": 4,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [
        "Removi/alterei os acessos liberados para o nômade na execução"
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    },
    {
      "id": "SW0338-SW0270_4",
      "code": "SW0338-SW0270_4",
      "number": 4,
      "name": "Desativação da Hospedagem Gratuita ",
      "description": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      "category": "Soluções Web",
      "deliveryDeadlineDays": 45,
      "executionDeadlineHours": 1080,
      "executionHours": 0,
      "value": 0,
      "itemLimit": 1,
      "isInternal": false,
      "delegateToLeader": true,
      "requiresFinalFiles": false,
      "checklist": [
        "Verificar se a hospedagem foi cancelada ou se ainda foi feita a contratação para manter em nossa platafoma",
        "Backup do site feito",
        "Desativei a hospedagem gratuita",
        "Backup enviado com informações para a agência poder instalar em sua hospedagem"
      ],
      "internalGuidance": "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
    }
  ],
  "questionnaire": {
    "id": "SW0338-Q",
    "code": "SW0178",
    "title": "Loja Virtual (NuvemShop / Wix / Tray) ",
    "questions": [
      {
        "id": "SW0338-Q01",
        "question": "Qual domínio será utilizado no sua loja?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualDominioSeraUtilizadoNoSuaLoja",
        "placeholder": "Ex: Vou utilizar o domínio www.minhaloja.com.br."
      },
      {
        "id": "SW0338-Q02",
        "question": "Quais os dados de acesso da sua conta na plataforma:",
        "type": "select",
        "required": true,
        "options": [
          "Os dados de acesso foram anexados no cofre da tarefa."
        ],
        "attachmentEnabled": false,
        "briefingKey": "quaisOsDadosDeAcessoDaSuaContaNaPlatafor",
        "placeholder": "Ex: Os dados de acesso foram anexados no cofre da tarefa.\n"
      },
      {
        "id": "SW0338-Q03",
        "question": "Qual foi o tema escolhido?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "qualFoiOTemaEscolhido",
        "placeholder": "Ex: A loja será criada utilizando o modelo do tema…"
      },
      {
        "id": "SW0338-Q04",
        "question": "Qual é o principal objetivo da loja?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualEOPrincipalObjetivoDaLoja",
        "placeholder": "Ex: O objetivo principal é promover a venda online da nossa linha de produtos esportivos para corrida.\n"
      },
      {
        "id": "SW0338-Q05",
        "question": "Pode descrever brevemente o seu negócio?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "podeDescreverBrevementeOSeuNegocio",
        "placeholder": "Ex: Nosso negócio é uma loja online que vende roupas e acessórios esportivos."
      },
      {
        "id": "SW0338-Q06",
        "question": "Você tem alguma referência específica de outros lojas que gostaria de compartilhar conosco?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "voceTemAlgumaReferenciaEspecificaDeOutro",
        "placeholder": "Ex: Sim, eu gostaria de compartilhar o link de uma loja concorrente: www.materiaisesportivos.com.br"
      },
      {
        "id": "SW0338-Q07",
        "question": "Você tem preferência por estilos de fontes, cores e formas para o design?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "voceTemPreferenciaPorEstilosDeFontesCore",
        "placeholder": "Ex: Gostaria de algo moderno e vibrante, com cores que remetam à energia e ao dinamismo do esporte. Nesse link está o manual da nossa marca…"
      },
      {
        "id": "SW0338-Q08",
        "question": "Poderia fornecer a logo e manual da marca?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "poderiaFornecerALogoEManualDaMarca",
        "placeholder": "Ex: Nesse link/anexo estão as variações da nossa logo e manual de marca."
      },
      {
        "id": "SW0338-Q09",
        "question": "Você gostaria de manter o menu da loja no padrão do tema escolhido ou gostaria de renomear?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "voceGostariaDeManterOMenuDaLojaNoPadraoD",
        "placeholder": "Ex: Gostaria que manter no padrão do tema pois as páginas criadas seguirão a mesma ideia."
      },
      {
        "id": "SW0338-Q10",
        "question": "Poderia informar os dados de até 10 produtos e suas categorias para serem cadastrados na loja?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "poderiaInformarOsDadosDeAte10ProdutosESu",
        "placeholder": "Ex: Os dados, características, categorias, imagens e todas as informações dos produtos estão no arquivo em anexo/link."
      },
      {
        "id": "SW0338-Q11",
        "question": "Qual ideia para a primeira página da Loja?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualIdeiaParaAPrimeiraPaginaDaLoja",
        "placeholder": "Ex: Ao acessar a loja nossos produtos devem ser destacados conforme demonstrado no tema escolhido."
      },
      {
        "id": "SW0338-Q12",
        "question": "Qual ideia ou conteúdo para a segunda página?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualIdeiaOuConteudoParaASegundaPagina",
        "placeholder": "Ex: A página vai manter a estrutura do tema escolhido."
      },
      {
        "id": "SW0338-Q13",
        "question": "Qual ideia ou conteúdo para a terceira página?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualIdeiaOuConteudoParaATerceiraPagina",
        "placeholder": "Ex:  A página vai manter a estrutura do tema escolhido."
      },
      {
        "id": "SW0338-Q14",
        "question": "Qual ideia ou conteúdo para a quarta página?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualIdeiaOuConteudoParaAQuartaPagina",
        "placeholder": "Ex:  A página vai manter a estrutura do tema escolhido."
      },
      {
        "id": "SW0338-Q15",
        "question": "Qual ideia para a quinta página?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualIdeiaParaAQuintaPagina",
        "placeholder": "Ex:  A página vai manter a estrutura do tema escolhido."
      },
      {
        "id": "SW0338-Q16",
        "question": "Poderia anexar o conteúdo completo das páginas?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "poderiaAnexarOConteudoCompletoDasPaginas",
        "placeholder": "Ex: O material completo e orientações para customização do tema estão anexados no arquivo/link."
      },
      {
        "id": "SW0338-Q17",
        "question": "Qual forma de pagamento será utilizada?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualFormaDePagamentoSeraUtilizada",
        "placeholder": "Ex: Vamos trabalhar com Mercado Pago. As credenciais para configuração estão anexadas no arquivo/link."
      },
      {
        "id": "SW0338-Q18",
        "question": "Qual forma de entrega será utilizada?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "qualFormaDeEntregaSeraUtilizada",
        "placeholder": "Ex: Os produtos serão enviados via correios sedex."
      },
      {
        "id": "SW0338-Q19",
        "question": "Você tem ideias específicas ou conteúdo para até 3 banners rotativos?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "voceTemIdeiasEspecificasOuConteudoParaAt",
        "placeholder": "Ex: Sim, gostaria de destacar nossos principais produtos e promoções, juntamente com uma chamada para ação e ver mais informações sobre o produto."
      },
      {
        "id": "SW0338-Q20",
        "question": "Você deseja incluir uma galeria de imagens e vídeos na sua loja? Se sim, pode fornecer mais detalhes?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "voceDesejaIncluirUmaGaleriaDeImagensEVid",
        "placeholder": "Ex: Sim, gostaria de incluir uma galeria de imagens mostrando em cada um dos nossos produtos. Nesse link está o conteúdo e orientações."
      },
      {
        "id": "SW0338-Q21",
        "question": "Quais são as informações de contato?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "quaisSaoAsInformacoesDeContato",
        "placeholder": "Ex: Endereço de e-mail e número de telefone. Os dados são..."
      },
      {
        "id": "SW0338-Q22",
        "question": "Sua loja possui perfis em redes sociais?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "suaLojaPossuiPerfisEmRedesSociais",
        "placeholder": "Ex: Sim, gostaria de vincular nossos perfis no Instagram, Facebook e Twitter. Os links são…"
      },
      {
        "id": "SW0338-Q23",
        "question": "Você gostaria de incluir um formulário de contato na loja? Se sim, que tipo de campos você gostaria de incluir?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": false,
        "briefingKey": "voceGostariaDeIncluirUmFormularioDeConta",
        "placeholder": "Ex: Sim, gostaria de incluir campos para nome, e-mail e mensagem. As mensagens recebida pelo formulário devem ser encaminhadas ao e-mail contato@minhaloja.com"
      },
      {
        "id": "SW0338-Q24",
        "question": "Você possui Data Analytics, Tag Manager ou Pixel para inserir na loja?",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "vocePossuiDataAnalyticsTagManagerOuPixel",
        "placeholder": "Ex: Sim, gostaria de incluir o Google Analytics para acompanhar o desempenho da loja. Esse é o código..."
      },
      {
        "id": "SW0338-Q25",
        "question": "Quais políticas e termos para incluir na loja? ",
        "type": "text",
        "required": true,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "quaisPoliticasETermosParaIncluirNaLoja",
        "placeholder": "Ex: Não será necessário incluir as políticas da nossa loja na loja."
      },
      {
        "id": "SW0338-Q26",
        "question": "Você tem alguma consideração ou tem outras observações que gostaria de compartilhar conosco?",
        "type": "text",
        "required": false,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "voceTemAlgumaConsideracaoOuTemOutrasObse",
        "placeholder": "Ex: Gostaria que a loja seja totalmente responsiva e otimizada para dispositivos móveis."
      },
      {
        "id": "SW0338-Q27",
        "question": "Você possui materiais diversos que gostaria de incluir, como documentos ou downloads? Se sim, quais são eles? Você pode compartilhar o link ou se desejar, anexe todos na tarefa.",
        "type": "text",
        "required": false,
        "options": [],
        "attachmentEnabled": true,
        "briefingKey": "vocePossuiMateriaisDiversosQueGostariaDe",
        "placeholder": "Ex: Sim, gostaria de incluir um catálogo de produtos em PDF para auxiliar na construção, além do material com todo o conteúdo da loja. O link é..."
      }
    ]
  },
  "questionnairesExtra": [
    {
      "code": "SW0179",
      "title": "Loja Virtual Wordpress",
      "questions": [
        {
          "id": "SW0338-Q01",
          "question": "Qual domínio será utilizado no sua loja?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "qualDominioSeraUtilizadoNoSuaLoja",
          "placeholder": "Ex: Vou utilizar o domínio www.minhaloja.com.br.\n"
        },
        {
          "id": "SW0338-Q02",
          "question": "Você deseja criar a loja a partir de algum tema específico?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "voceDesejaCriarALojaAPartirDeAlgumTemaEs",
          "placeholder": "Ex: Sim. Segue anexo o tema adquirido do Wordpress.\n"
        },
        {
          "id": "SW0338-Q03",
          "question": "Qual é o principal objetivo da loja?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "qualEOPrincipalObjetivoDaLoja",
          "placeholder": "Ex: O objetivo principal é promover a venda online da nossa linha de produtos esportivos para corrida.\n"
        },
        {
          "id": "SW0338-Q04",
          "question": "Pode descrever brevemente o seu negócio?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "podeDescreverBrevementeOSeuNegocio",
          "placeholder": "Ex: Nosso negócio é uma loja online que vende roupas e acessórios esportivos.\n"
        },
        {
          "id": "SW0338-Q05",
          "question": "Você tem alguma referência específica de outras lojas que gostaria de compartilhar conosco?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "voceTemAlgumaReferenciaEspecificaDeOutra",
          "placeholder": "Ex: Sim, eu gostaria de compartilhar o link de uma loja concorrente: www.materiaisesportivos.com.br\n"
        },
        {
          "id": "SW0338-Q06",
          "question": "Você tem preferência por estilos de fontes, cores e formas para o design?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "voceTemPreferenciaPorEstilosDeFontesCore",
          "placeholder": "Ex: Gostaria de algo moderno e vibrante, com cores que remetam à energia e ao dinamismo do esporte. Nesse link está o manual da nossa marca…\n"
        },
        {
          "id": "SW0338-Q07",
          "question": "Poderia fornecer a logo e manual da marca?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "poderiaFornecerALogoEManualDaMarca",
          "placeholder": "Ex: Nesse link/anexo estão as variações da nossa logo e manual de marca.\n"
        },
        {
          "id": "SW0338-Q08",
          "question": "Você gostaria de manter o menu da loja no padrão do tema escolhido ou gostaria de renomear?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "voceGostariaDeManterOMenuDaLojaNoPadraoD",
          "placeholder": "Ex: Gostaria de manter no padrão do tema pois as páginas criadas seguirão a mesma ideia.\n"
        },
        {
          "id": "SW0338-Q09",
          "question": "Poderia informar os dados de até 10 produtos e suas categorias para serem cadastrados na loja?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "poderiaInformarOsDadosDeAte10ProdutosESu",
          "placeholder": "Ex: Os dados, características, categorias, imagens e todas as informações dos produtos estão no arquivo em anexo/link.\n"
        },
        {
          "id": "SW0338-Q10",
          "question": "Qual ideia para a primeira página da Loja?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "qualIdeiaParaAPrimeiraPaginaDaLoja",
          "placeholder": "Ex: Ao acessar a loja nossos produtos devem ser destacados conforme demonstrado no tema escolhido.\n"
        },
        {
          "id": "SW0338-Q11",
          "question": "Qual nome, ideia ou conteúdo para a segunda página?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "qualNomeIdeiaOuConteudoParaASegundaPagin",
          "placeholder": "Ex: Página Produtos. A página vai manter a estrutura da loja apresentada como referência\n"
        },
        {
          "id": "SW0338-Q12",
          "question": "Qual nome, ideia ou conteúdo para a terceira página?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "qualNomeIdeiaOuConteudoParaATerceiraPagi",
          "placeholder": "Ex: Página Promoções. A página vai manter a estrutura da loja apresentada como referência\n"
        },
        {
          "id": "SW0338-Q13",
          "question": "Qual nome, ideia ou conteúdo para a quarta página?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "qualNomeIdeiaOuConteudoParaAQuartaPagina",
          "placeholder": "Ex: Página Quem Somos. A página vai manter a estrutura da loja apresentada como referência\n"
        },
        {
          "id": "SW0338-Q14",
          "question": "Qual nome, ideia ou conteúdo para a quinta página?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "qualNomeIdeiaOuConteudoParaAQuintaPagina",
          "placeholder": "Ex: Página Contato. A página vai manter a estrutura da loja apresentada como referência.\n"
        },
        {
          "id": "SW0338-Q15",
          "question": "Poderia anexar o conteúdo completo das páginas?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "poderiaAnexarOConteudoCompletoDasPaginas",
          "placeholder": "Ex: O material completo e orientações para customização do tema estão anexados no arquivo/link.\n"
        },
        {
          "id": "SW0338-Q16",
          "question": "Qual forma de pagamento será utilizada?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "qualFormaDePagamentoSeraUtilizada",
          "placeholder": "Ex: Vamos trabalhar com Mercado Pago. As credenciais para configuração estão anexadas no arquivo/link. \n"
        },
        {
          "id": "SW0338-Q17",
          "question": "Qual forma de entrega será utilizada?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "qualFormaDeEntregaSeraUtilizada",
          "placeholder": "Ex: Os produtos serão enviados via correios sedex.\n"
        },
        {
          "id": "SW0338-Q18",
          "question": "Você tem ideias específicas ou conteúdo para até 3 banners rotativos?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "voceTemIdeiasEspecificasOuConteudoParaAt",
          "placeholder": "Ex: Sim, gostaria de destacar nossos principais produtos e promoções, juntamente com uma chamada para ação e ver mais informações sobre o produto.\n"
        },
        {
          "id": "SW0338-Q19",
          "question": "Você deseja incluir uma galeria de imagens e vídeos na sua loja? Se sim, pode fornecer mais detalhes?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "voceDesejaIncluirUmaGaleriaDeImagensEVid",
          "placeholder": "Ex: Sim, gostaria de incluir uma galeria de imagens mostrando em cada um dos nossos produtos. Nesse link está o conteúdo e orientações.\n"
        },
        {
          "id": "SW0338-Q20",
          "question": "Quais são as informações de contato?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "quaisSaoAsInformacoesDeContato",
          "placeholder": "Ex: Endereço de e-mail e número de telefone. Os dados são...\n"
        },
        {
          "id": "SW0338-Q21",
          "question": "Sua loja possui perfis em redes sociais?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "suaLojaPossuiPerfisEmRedesSociais",
          "placeholder": "Ex: Sim, gostaria de vincular nossos perfis no Instagram, Facebook e Twitter. Os links são…\n"
        },
        {
          "id": "SW0338-Q22",
          "question": "Você gostaria de incluir um formulário de contato na loja? Se sim, que tipo de campos você gostaria de incluir?",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "voceGostariaDeIncluirUmFormularioDeConta",
          "placeholder": "Ex: Sim, gostaria de incluir campos para nome, e-mail e mensagem. As mensagens recebida pelo formulário devem ser encaminhadas ao e-mail contato@minhaloja.com\n"
        },
        {
          "id": "SW0338-Q23",
          "question": "Você possui Data Analytics, Tag Manager ou Pixel para inserir na loja?  Se sim, anexar as informações e script de integração. ",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "vocePossuiDataAnalyticsTagManagerOuPixel",
          "placeholder": "Ex: Sim, gostaria de incluir o Google Analytics para acompanhar o desempenho da loja. Esse é o código...\n"
        },
        {
          "id": "SW0338-Q24",
          "question": "Quais políticas e termos para incluir na loja? ",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": false,
          "briefingKey": "quaisPoliticasETermosParaIncluirNaLoja",
          "placeholder": "Ex: Não será necessário incluir as políticas da nossa loja na loja.\n"
        },
        {
          "id": "SW0338-Q25",
          "question": "Você tem alguma consideração ou tem outras observações que gostaria de compartilhar conosco?",
          "type": "text",
          "required": false,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "voceTemAlgumaConsideracaoOuTemOutrasObse",
          "placeholder": "Ex: Gostaria que a loja seja totalmente responsiva e otimizada para dispositivos móveis.\n"
        },
        {
          "id": "SW0338-Q26",
          "question": "Você possui materiais diversos que gostaria de incluir, como documentos ou downloads? Se sim, quais são eles? Você pode compartilhar o link ou se desejar, anexe todos na tarefa.",
          "type": "text",
          "required": false,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "vocePossuiMateriaisDiversosQueGostariaDe",
          "placeholder": "Ex: Sim, gostaria de incluir um catálogo de produtos em PDF para auxiliar na construção, além do material com todo o conteúdo da loja. O link é...\n"
        },
        {
          "id": "SW0338-Q27",
          "question": "Por favor, anexe o logotipo renderizado. Se você tiver o Manual da Marca, também gostaríamos de recebê-lo anexado.",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "porFavorAnexeOLogotipoRenderizadoSeVoceT",
          "placeholder": "Ex: Sim, anexei o manual da marca.\n"
        },
        {
          "id": "SW0338-Q28",
          "question": "Você possui um banco de imagens pago que possa compartilhar? Se sim, por favor, informe o nome do banco e o plano contratado. Caso contrário, usaremos bancos gratuitos para a produção.",
          "type": "text",
          "required": true,
          "options": [],
          "attachmentEnabled": true,
          "briefingKey": "vocePossuiUmBancoDeImagensPagoQuePossaCo",
          "placeholder": "Ex: Sim, o Getty Images. Após aprovação, enviarei a imagem comprada.\n"
        }
      ]
    }
  ],
  "portfolioImages": [
    "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]"
  ]
};

async function main() {
  console.log("▶ Seeding SW0338 — Construção de Loja Virtual Woocommerce (layout+construção) (piloto de migração)...");

  const existing = await p.product.findUnique({ where: { id: PRODUCT_ID } });
  if (existing) {
    await p.productAddon.deleteMany({ where: { product_id: PRODUCT_ID } });
    await p.productVariation.deleteMany({ where: { product_id: PRODUCT_ID } });
    console.log("  ✓ Relações anteriores removidas (variações + addons)");
  }

  const base = {
    name: "Construção de Loja Virtual Woocommerce (layout+construção)",
    description: "• Liberdade: O cliente tem total autonomia para gerenciar a loja, adicionar novos produtos, formas de pagamento, logística, páginas e muitas outras funcionalidades.\n• Responsividade: Se adapta a diferentes dispositivos e tamanhos de tela.\n• Facilidade de uso: Interface intuitiva para gerenciamento da loja.\n• Integrações: Possui suporte a diversas plataformas do mercado, para automatização de vendas\n• Documentação: Ampla documentação oficial da plataforma.\n• Plataforma Open Source: Permite criar soluções e recursos próprios no futuro, contratando uma equipe de desenvolvimento.\n• Plataforma livre: Sem vínculos ou limitações, permitindo a migração livre entre provedores de hospedagem, atualizações e inclusão de novos recursos.\n• Hospedagem bônus: Você terá 60 dias de hospedagem na plataforma Allka exclusivamente para o website desenvolvido, permitindo que você faça a migração com tranquilidade.",
    short_description: "• A tarefa só será executada após o envio dos acessos na plataforma.\n• Após o envio para execução não será permitido enviar novos materiais ou efetuar alterações nos materiais ou briefing já enviados, a menos que haja solicitação da Allka.\n• O produto atende exclusivamente a criação de lojas virtuais na plataforma Wordpress utilizando o plugin Woocommerce.\n• O modelo selecionado será customizado com a identidade visual e material do cliente, sem alteração de suas característi",
    category: "Soluções Web",
    tags: JSON.stringify([
  "Woocommerce",
  "Loja virtual",
  "E-commerce",
  "Comércio eletrônico",
  "Vendas",
  "Produtos online",
  "Catálogo de produto",
  "Plataforma de e-commerce",
  "Loja virtual online",
  "Venda de produtos online"
]),
    base_price: 910.22,
    complexity: "basic",
    visibility: JSON.stringify({ company: true, agency: true, partner: false, inHouse: false }),
    image: null,
    demonstrations: JSON.stringify([]),
    completion_time: "9 dias",
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
      id: "LEGACY-IMPORT-SW0338-V01",
      product_id: PRODUCT_ID,
      name: "Contratação Padrão",
      description: "• A tarefa só será executada após o envio dos acessos na plataforma.\n• Após o envio para execução não será permitido enviar novos materiais ou efetuar alterações nos materiais ou briefing já enviados, a menos que haja solicitação da Allka.\n• O produto atende exclusivamente a criação de lojas virtuais na plataforma Wordpress utilizando o plugin Woocommerce.\n• O modelo selecionado será customizado com a identidade visual e material do cliente, sem alteração de suas característi",
      price: 910.22,
      price_modifier: 0,
      deadline_days: 9,
      scope_description: "[DADO NÃO DISPONÍVEL NA BASE ANTIGA — completar manualmente]",
      features: JSON.stringify([
  "Criação e configuração da loja virtual no Woocommerce",
  "Cadastro de até 10 produtos",
  "Criação de até 3 banners",
  "Adequação da loja para dispositivos móveis",
  "Criação de formulários de contato",
  "Configuração do Google Analytics, tags e pixel (enviados pelo cliente);",
  "Contato via Whatsapp (se solicitado);",
  "Avaliação de produtos",
  "Controle de estoque",
  "Produtos variáveis",
  "Produtos relacionados",
  "Venda cruzada",
  "Lista de desejos",
  "Pesquisa e filtros",
  "Cupons de desconto",
  "Promoções",
  "Configuração de 1 forma de pagamento (Mercado Pago, Pagseguro, Paypal)",
  "Configuração de 1 forma de entrega (Correios, Melhor Envio, Frenet)",
  "Kit de instalação"
]),
      sort_order: 1,
      is_active: true,
    },
  });
  console.log("  ✓ Variação LEGACY-IMPORT-SW0338-V01 criada");

  console.log("✅ SW0338 — Construção de Loja Virtual Woocommerce (layout+construção) seeded (PILOTO, revisar campos marcados).");
  await p.$disconnect();
}

main().catch((e) => {
  console.error("❌ Erro no seed SW0338:", e.message);
  p.$disconnect();
  process.exit(1);
});
