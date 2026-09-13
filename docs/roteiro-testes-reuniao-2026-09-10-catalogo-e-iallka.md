# Roteiro de validação pós-deploy — Catálogo e IAllka

Este roteiro valida os ajustes da reunião de 10/09/2026 depois da publicação
no **allka.store**. Cada pessoa testa somente o seu perfil. Não é necessário
alterar dados reais, publicar produtos, concluir compras ou criar projetos.

## Antes de começar

1. Entre normalmente no allka.store com a conta indicada.
2. Anote navegador e horário.
3. Se algo sair diferente, tire um print antes de tentar de novo.
4. Marque cada item como **Funcionou** ou **Não funcionou** e descreva em uma
   frase o que apareceu.

> Os 36 produtos do Catalog2 continuam em preparação. No Admin Master eles
> aparecem para conferência, sempre identificados quando algum dado for
> provisório. Eles não devem aparecer como contratáveis para clientes até a
> revisão comercial definitiva.

---

## Admin Master — `cp@lamego.com.vc`

| # | Onde ir | O que fazer | Resultado esperado | Funcionou? |
|---|---|---|---|---|
| 1 | Dashboard | Abra o painel e navegue pelo menu lateral | Cabeçalho, sidebar e container branco aparecem sem cortes ou sobreposições | ☐ Sim ☐ Não |
| 2 | Produtos → Cadastro de Produtos | Abra a tela | Aparecem 36 produtos novos; a fixture `[TESTE LOCAL]` fica separada e não entra na contagem dos 36 | ☐ Sim ☐ Não |
| 3 | Cadastro de Produtos | Teste busca, categoria, pendências, ordenação e alternância Lista/Grade/colunas | Cada controle funciona e a lista nunca fica vazia com contador diferente da quantidade exibida | ☐ Sim ☐ Não |
| 4 | Cadastro → um produto | Abra um produto | O detalhe abre dentro do container padrão, com fechar e fixar na bandeja; imagem, tarefas, etapas, preço, prazo e avisos provisórios aparecem claramente | ☐ Sim ☐ Não |
| 5 | Detalhe do produto | Troque uma variação e marque/desmarque um adicional | Preço e prazo de simulação se atualizam; o produto continua marcado como preparação/provisório quando aplicável e não libera contratação | ☐ Sim ☐ Não |
| 6 | Produtos → Catálogo de Produtos | Abra a tela | Busca, Filtros, ordenação, contador e visualização ficam na mesma linha; categorias aparecem abaixo como badges | ☐ Sim ☐ Não |
| 7 | Catálogo de Produtos | Clique no card/linha e também em Escolher | A área livre abre o detalhe; Escolher abre diretamente o detalhe comercial completo | ☐ Sim ☐ Não |
| 8 | Catálogo → detalhes | Passe o mouse ou use Tab no ícone de informação | Código interno aparece somente no ícone, sem poluir o card; foco de teclado fica visível | ☐ Sim ☐ Não |
| 9 | Qualquer tela | Use a IAllka e pergunte sobre um produto ou sobre os 4Fs | O painel abre dentro do padrão visual, responde de forma contextual e mostra as fontes usadas; valores provisórios, se citados, vêm identificados | ☐ Sim ☐ Não |
| 10 | Ícone da IAllka | Passe o mouse sobre o avatar e depois abra o painel | A Aura aprovada aparece ampliada no hover/foco; ao clicar, a conversa abre dentro do container branco da página, sem cobrir sidebar e cabeçalho | ☐ Sim ☐ Não |
| 11 | IAllka | Peça uma sugestão de produto novo para um objetivo | Sugestões do Catalog2 aparecem em uma caixa própria. Produto em preparação informa que ainda não gera orçamento, cesta ou projeto | ☐ Sim ☐ Não |
| 12 | Configurações → Base de Conhecimento da IA | Abra a aba | Categorias e documentos aparecem; controles de edição, ativação e substituição ficam disponíveis para Master | ☐ Sim ☐ Não |

---

## Agência — `gabriel@lamego.com.vc`

| # | Onde ir | O que fazer | Resultado esperado | Funcionou? |
|---|---|---|---|---|
| 1 | Dashboard e menu | Navegue entre telas da Agência | Layout abre dentro do container, sem elementos sobrepostos | ☐ Sim ☐ Não |
| 2 | Catálogo | Procure os produtos novos | Produtos em preparação não aparecem como disponíveis para contratar | ☐ Sim ☐ Não |
| 3 | Qualquer tela | Abra a IAllka e peça orientação sobre um objetivo de marketing | A IAllka abre e responde; não trata produto provisório como oferta contratável | ☐ Sim ☐ Não |
| 4 | Projetos | Abra um projeto da própria Agência e pergunte à IAllka sobre “este projeto” | A resposta usa somente o contexto daquele projeto; ao fechar/trocar o projeto, não mistura informações | ☐ Sim ☐ Não |
| 5 | Ícone da IAllka | Passe o mouse/foco sobre o avatar e abra o assistente | A Aura aparece ampliada e o painel permanece no container branco da tela, sem ocupar a plataforma inteira | ☐ Sim ☐ Não |
| 6 | Base de Conhecimento | Se a tela estiver disponível para leitura, abra-a | Pode consultar; comandos de criar, ativar, desativar ou substituir não aparecem para perfil não Master | ☐ Sim ☐ Não |

---

## Partner/Agência — `valderio@lamego.com.vc`

| # | Onde ir | O que fazer | Resultado esperado | Funcionou? |
|---|---|---|---|---|
| 1 | Dashboard e Projetos | Navegue normalmente | Só dados da própria Agência/Partner aparecem | ☐ Sim ☐ Não |
| 2 | Catálogo | Verifique produtos disponíveis | Não aparecem como contratáveis os produtos ainda em preparação | ☐ Sim ☐ Não |
| 3 | IAllka | Faça uma pergunta de orientação comercial | Ícone e painel funcionam; a resposta não mostra dados de outra agência nem dados provisórios como preço final | ☐ Sim ☐ Não |
| 4 | Base de Conhecimento | Procure ações de edição | Não pode editar, ativar, substituir ou excluir documentos | ☐ Sim ☐ Não |

---

## Nômade — `nomad@allka.com.vc`

| # | Onde ir | O que fazer | Resultado esperado | Funcionou? |
|---|---|---|---|---|
| 1 | Dashboard e Minhas Tarefas | Navegue pelas tarefas | Lista, detalhe e estados das tarefas abrem normalmente dentro do container | ☐ Sim ☐ Não |
| 2 | Catálogo/Produtos | Procure ação de contratação | Não existe caminho para contratar produto pelo perfil Nômade | ☐ Sim ☐ Não |
| 3 | IAllka | Verifique a barra de ícones | O ícone não aparece para Nômade, pois este perfil não monta nem contrata projetos | ☐ Sim ☐ Não |

---

## Registro de falha

Ao reportar algo, envie junto:

- Perfil e número do teste;
- print da tela;
- navegador e horário;
- o que era esperado e o que aconteceu.

Não tente publicar produto, preencher preço definitivo, concluir checkout ou
alterar documentos durante este roteiro.
