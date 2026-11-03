# Auditoria do fluxo de cadastro de produtos

Data: 03/11/2026. Ambiente: somente local, navegador interno, Admin Vinicius Guardia.

**Itens 1 e 2 implementados após aprovação:** no fluxo novo, Salvar e voltar às etapas retorna à lista após sucesso, sem segundo Concluir; a escolha de alcance de modelo permanece. Entregáveis criados/editados dentro da etapa agora usam Adicionar à etapa / Aplicar alterações à etapa e Manter incompleto na etapa, com nota de que gravar no servidor exige salvar a etapa. Confirmados em 99 testes direcionados e no navegador local no SEO003/V2. Item temporário descartado, sem publicação. Restam seis recomendações de usabilidade (3–8) abaixo; a descrição original dos passos preserva o histórico anterior à correção.

**Atualização após pedido de correção:** o erro funcional do rodapé descrito abaixo foi corrigido no local. Rodapé com altura adaptável, grupos e textos que quebram linha sem sobreposição. Reteste real: zero interseções ou botões fora do rodapé no passo 2 em 360, 390, 402, 768 e 1280 px; avanço Produto → Configurações em 402×668 e Configurações → Conferência em 360×800 funcionou sem abrir Travar edição. Em 1280 px permanece com 52 px de altura. Testes do editor 17/17 e typecheck frontend limpo. Não houve deploy ou alteração de dados. As observações abaixo preservam o resultado original da auditoria; as oito recomendações de usabilidade continuam pendentes.

O fluxo novo permite avançar de Produto para Configurações da tarefa e etapas e depois para Conferência, preço e publicação. No cadastro SEO já preenchido, consegui chegar à conferência sem retornar ao primeiro passo para resolver dependências. Ainda não considero o cadastro pronto para uma pessoa sem treinamento: há um erro responsivo reproduzido e decisões de salvamento e rótulos que confundem.

## Escopo e preservação dos dados

- Produto 003, SEO — Otimização para Buscadores, tarefa ID 05, quatro etapas. URL: http://localhost:8082/admin/cadastro-produtos/3.
- Usei a V2 em rascunho que já existia. Não criei versão nem publiquei. Não acionei edição da V1 publicada.
- Testei gravação real de uma observação do produto e das instruções da etapa 2 com marcadores temporários. Restaurei os dois textos originais e confirmei na interface. Datas e histórico de edição podem refletir esses salvamentos.
- Um entregável temporário ficou apenas no formulário da etapa; descartei-o e confirmei sua ausência ao reabrir. Não gravei um novo entregável no servidor.
- Preços, horas, prazos, especialidades e opções comerciais existentes não foram alterados. A simulação não equivale a compra ou alteração do produto.
- Não executei IA paga, upload, compra, lançamento, publicação, commit, push, deploy ou espelho. Nenhum código da aplicação foi modificado.
- Esta é uma auditoria do cadastro existente e de edições pontuais, não uma homologação de criação de produto vazio, de todos os tipos de campo ou do fluxo de execução contratado.

## Conferência passo a passo

| Passo | O que fiz na tela | Resultado |
| --- | --- | --- |
| 1 | Abri a configuração pela entrada normal e selecionei a V2 existente | Fluxo novo, três passos, V2 rascunho separada da V1 publicada. |
| 2 | Entrei em edição e conferi dados principais, classificação, público e informações comerciais | Campos disponíveis no mesmo passo. Não foi necessário navegar a outra tela para localizar esses dados. |
| 3 | Alterei temporariamente Observações internas e cliquei em Salvar e continuar com 402 × 668 px | **Falhou:** abriu a confirmação de travar edição, não o próximo passo. Os botões se sobrepõem nessa largura. |
| 4 | Salvei pelo diálogo aberto e atualizei a página | A observação temporária persistiu. O problema anterior não foi perda de gravação. |
| 5 | Em 1280 × 900 px, restaurei a observação original e usei Salvar e continuar | Informações salvas e passo 2 aberto corretamente. F5 preservou passo, V2 e modo de edição. |
| 6 | Abri Ver tarefa | Expansão abaixo da tarefa, no próprio cadastro, com abas internas. Resumo calculado e somente leitura: quatro etapas, 7 h e R$ 510,00. |
| 7 | Abri a etapa 2 e percorri seus campos | Formulário A–F aberto. Referência de especialidade R$ 85/h sem edição da tarifa global ali. Acessos existentes podem ser reutilizados. |
| 8 | Marquei que a etapa tem entregáveis | O formulário apareceu ali mesmo, já associado à etapa. Nome e descrição obrigatórios ficaram indicados antes de concluir a etapa. |
| 9 | Preenchi um entregável temporário e usei Salvar dentro dele | Passou a constar como Novo — ainda não salvo. A aprovação pelo cliente ficou desmarcada e bloqueada com explicação, conforme a configuração da tarefa. |
| 10 | Cancelei a etapa e escolhi Descartar alterações; reabri | Entregável temporário ausente. A confirmação protege o formulário, mas o Salvar do entregável não é uma gravação definitiva no servidor. |
| 11 | Editei temporariamente as instruções da etapa 2 e concluí | Abriu escolha entre novo modelo, edição global e alteração só neste produto. Escolhi **Alterar somente neste produto**. Texto persistiu no resumo e em Editar de novo. |
| 12 | Restaurei as instruções originais e concluí novamente, só neste produto | Texto original voltou ao resumo. Não escolhi edição global nem novo modelo. A interface ainda pede outro Concluir após salvar. |
| 13 | Abri Questionário e sua prévia | Briefing de três perguntas no próprio passo 2. Conferir pendências identificou as duas perguntas obrigatórias vazias; a terceira é opcional. Prévia informa que não salva respostas. |
| 14 | Abri Entregáveis da tarefa | Resumo dos dois entregáveis existentes na etapa 4, com atalho para a etapa de origem. Não confundidos com o entregável temporário descartado. |
| 15 | Abri Variações e os impactos da opção Até 10 páginas | Horas extras e prazo configurados visíveis. Campo para informar impacto disponível no rascunho; selecionei Adicionar valor fixo apenas para inspecionar o formulário, sem adicionar impacto ou salvar valor. |
| 16 | Abri o adicional existente | Nome, cobrança, seleção e vínculo com tarefa e etapa presentes. Porém a lista mostra R$ 0,00 e o resumo de impactos diz apenas Impacto, pouco esclarecedor para um adicional calculado por esforço. |
| 17 | Abri Prazos e condições | Emergência, condições, aprovações e prazos no mesmo passo, sem voltar a Produto. Nenhuma regra nova foi gravada. |
| 18 | Usei Salvar e continuar para a conferência | Avançou. A tela informou Sem bloqueios e V2 rascunho pronta. Não cliquei em Publicar. |
| 19 | Abri Composição do preço, custos e memória | Preço final R$ 933,47. Custo humano R$ 510,00; memória informa etapas recorrentes + qualificação R$ 586,50. O acréscimo de R$ 76,50 não tem linha própria na lista resumida de custos. |
| 20 | Simulei opção padrão e depois Até 10 páginas + adicional | Base: R$ 933,47, esforço 1 dia e prazo 5 dias. Escolhas: R$ 1.400,20, esforço 2 dias e prazo 6 dias. A simulação respondeu às escolhas. Não homologa checkout nem arredondamento de todos os cenários. |
| 21 | Atualizei a página na conferência e voltei a Produto para conferir a observação | V2 e conferência retomadas, Rascunho salvo. Observação igual à original. Deixei novamente na conferência final e restaurei o tamanho normal do navegador. |

## Erro reproduzido que deve ser corrigido primeiro

### Rodapé sobreposto em tela estreita

Em 402 × 668 px, Salvar e continuar acionou a confirmação de travar edição. Em modo leitura, medi a mesma sobreposição entre Passo 2 e Editar: o primeiro ocupa x=43,75 até 319,58; o segundo começa em x=281,51, ambos na mesma altura. Há aproximadamente 38 px de interseção. Em 1280 px o avanço funcionou.

Correção proposta: rodapé responsivo com áreas que não se sobreponham; ação principal em linha própria quando necessário. Testar cliques reais no centro e nas extremidades de cada botão em 360, 390, 402, 768 e 1280 px. O próximo passo nunca deve abrir a confirmação de travar edição.

Evidência: `03-11-cadastro-01-avancar-dialogo-travar.png` na pasta local de evidências indicada ao fim.

## Melhorias propostas em ordem de prioridade

1. **Simplificar a conclusão da etapa.** Hoje Concluir e salvar etapa → escolha de alcance → resumo → Concluir. Manter a proteção contra alteração global, mas oferecer Salvar e voltar à lista e uma conferência opcional. O selo Configuração específica deste produto deve combinar com a opção padrão de gravação, sem tornar a edição global implícita.
2. **Distinguir adicionar ao formulário de salvar no servidor.** O Salvar do entregável pode virar Adicionar à etapa. Depois, uma ação principal clara salva a etapa inteira e mostra o estado persistido. Manter a confirmação ao descartar.
3. **Alinhar a sequência da etapa.** Os blocos A–F aparecem em uma ordem, mas a numeração e o resumo mantêm outra: finalização, checklist, entregáveis e acessos. Os controles Bloco 1 de 6 e próximo/anterior também convivem com todos os blocos abertos. Usar uma única ordem e nomenclatura, sem reintroduzir múltiplos accordions internos.
4. **Deixar a aprovação de entregáveis autoexplicativa.** A proteção funcionou, mas a orientação cita dados da tarefa e caixa de qualificação acima, enquanto o resumo da tarefa não apresenta essa configuração de forma evidente. Usar um atalho direto ao controle correto ou explicar a incompatibilidade localmente.
5. **Mostrar impactos concretos dos adicionais.** Trocar Impacto por algo como +1 h de esforço e Preço calculado, quando aplicável. R$ 0,00 sozinho sugere gratuidade, mesmo quando o simulador cobra o esforço adicional. Não alterar o cálculo para apenas maquiar o rótulo.
6. **Completar o resumo da composição de preço.** Acrescentar Qualificação R$ 76,50 neste cenário ou mostrar essa parcela dentro do custo com abertura direta. Os custos exibidos no resumo somam R$ 856,97; com os R$ 76,50 mencionados na memória chegam aos R$ 933,47. Não há evidência suficiente aqui para afirmar erro no cálculo; o problema comprovado é a falta dessa parcela no resumo.
7. **Separar resumo comercial de configuração operacional.** Requisitos e resumo comercial dos entregáveis aparecem no passo Produto antes de criar acessos e entregáveis reais. Sugerir esses textos a partir do cadastro operacional na conferência, mantendo edição do texto comercial e os vínculos separados, reduz repetição sem apagar campos.
8. **Limpar avisos e textos repetidos.** A conferência aceita ausência de alterações grátis de IA por usar regra global, mas simultaneamente orienta preencher as quatro etapas. Dizer claramente se é informativo, opcional ou bloqueante. Prazos e condições também repete títulos de seção; reduzir sem remover regras.

## Avaliação do fluxo

**Melhorou:** tarefa abre no lugar, entregável nasce dentro da etapa, questionário e opções estão no passo 2, e o preço fica na conferência final. Neste cadastro existente, avancei pelos três passos sem uma dependência obrigar retorno ao passo 1.

**Ainda exige trabalho:** ações de salvamento se multiplicam dentro da etapa; os resumos comerciais podem pedir texto antes de existir a configuração que deveriam resumir; alguns rótulos escondem o que realmente será cobrado. Portanto a recomendação é corrigir o rodapé primeiro e depois reduzir essas decisões antes da nova gravação.

**Farol desta auditoria:** avanço e persistência no desktop 🟢; entregáveis e descarte local 🟢; questionário e simulação 🟢 nos cenários acima; rodapé estreito 🔴; clareza e sequência 🟡. Criação de produto vazio, ciclos, IA real, desconto mensal, publicação, contratação e execução ficam fora desta rodada. O farol macro anterior não muda por este teste.

## Evidências e continuidade

Pasta local, fora do Git: `C:/Users/Teste/.codex/visualizations/2026/08/12/019ff5b6-bd52-7670-bec9-b64609421f78/`.

- `03-11-cadastro-01-avancar-dialogo-travar.png`: confirmação incorreta ao avançar na largura estreita.
- `03-11-cadastro-02-composicao-preco.png`: composição do preço, custos e memória.
- `03-11-cadastro-03-conferencia-final.png`: V2 rascunho na conferência, sem publicação.

Próxima rodada sugerida: corrigir o rodapé e os itens de clareza aprovados pelo usuário; repetir o cadastro em produto vazio com parâmetros autorizados, primeiro avulso e depois com ciclos. Não publicar nem espelhar dados como consequência automática desta auditoria.
