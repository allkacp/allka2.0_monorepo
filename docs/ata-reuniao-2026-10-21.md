# Ata da reunião de 21/10/2026 — ajustes enumerados e farol

> Fonte: ata colada pelo usuário em 21/10. Cada item tem um código **R21-NN** para o usuário mandar "faz o R21-05". Farol: 🟢 pronto · 🟡 aguardando teste / conferir · 🔴 não deu certo · ⏸ ainda não iniciado. **Nada abaixo foi enviado ao servidor.**

## A. Decisões fechadas
| Cód. | Ajuste | Farol |
|---|---|---|
| R21-01 | **Alterações grátis por IA POR ETAPA** (não no produto inteiro). A tela principal mostra um resumo consolidado e um alerta de erro se houver etapa sem esse campo preenchido. | 🟡 feito em 21/10 — o campo por etapa já existia; agora o resumo do produto mostra **alerta vermelho** listando as etapas sem o número (não trava a publicação — decisão sua, ver revisão R21-24). Aguardando seu teste |
| R21-02 | **Perguntas condicionais no questionário** (liberar campo conforme resposta anterior). | 🟡 já existia (construtor desde 17/10, 9 operadores); testes verdes em 21/10 — falta só você conferir na tela |
| R21-03 | **Flag "dependente de variação/adicional" na etapa** + vínculo obrigatório na variação/adicional + erro se a etapa marcada ficar sem vínculo. | 🟡 feito em 21/10 — aguardando seu teste (caixa na etapa + seletor "Incluir etapa" + bloqueio de publicação) |
| R21-04 | **Entrega rápida como condição de produto** (impacta preço e prazo de TODAS as etapas). | 🟡 feito em 21/10 — Entrega emergencial agora escolhe **"Por etapa" ou "Condição do produto inteiro"** (% de redução do prazo + % de adicional em todas as etapas); entra no preço e no prazo. Aguardando seu teste |
| R21-05 | **Adicionais e condições contratáveis antes E depois da execução.** | 🟡 feito em 21/10 — adicional tem **"Quando o cliente pode contratar"** (antes · depois · ambos); a compra esconde os "só depois". **Limite:** condições ainda não têm esse campo e a tela do cliente para contratar *depois* depende do R21-20 |

## B. Próximas etapas do Vinicius
| Cód. | Ajuste | Farol |
|---|---|---|
| R21-06 | Resumo de entregáveis nas etapas mostrando corretamente os arquivos anexados. | 🟡 feito em 21/10 — a linha do entregável mostra o selo roxo **"arquivo anexado"** sem precisar abrir; ao abrir, ícone com ver/baixar. Aguardando seu teste |
| R21-07 | Anexos como **ícone roxo clicável** (ver, baixar, substituir), sem o nome completo na tela. | 🟡 feito em 21/10 — aguardando seu teste |
| R21-08 | Ao editar uma etapa, abrir **quadro separado** (não listar tudo na vertical). | 🟡 feito: etapa abre em Painel Moldura; lista de etapas em "Ver etapas" |
| R21-09 | **Resumo de entregáveis sem botão de editar**; só um botão que leva à etapa de origem. | 🟡 feito em 21/10 — aguardando seu teste |
| R21-10 | **Interface de impactos de etapas dentro da variação**, trocando "tarefa" por "etapa" na linguagem. | 🟡 feito em 21/10 — aguardando seu teste (janela "Configurar impactos" sem a palavra "tarefa") |
| R21-11 | **Fluxo de contratação pós-compra**: profissional é notificado para aceitar/recusar a entrega rápida; recusou → estorno; mostra o novo prazo e o valor adicional. | 🟡 feito em 21/10 no servidor e na tarefa — produto pode **exigir o aceite** (prazo de resposta); aceitar comprime o prazo; recusar ou ficar sem resposta cancela o valor. **Limite:** valor já pago não é devolvido sozinho (fica "ESTORNO PENDENTE" + aviso ao admin). Aguardando seu teste |
| R21-12 | Documentos de consulta da IA (método PLA etc.) — **responsável: Gabriel**. | ⏸ (aguarda arquivos Word do Gabriel) |

## C. Detalhes e sugestões citados na reunião
| Cód. | Ajuste | Farol |
|---|---|---|
| R21-13 | **Visibilidade por público**: remover a opção "Todos" e virar seleção múltipla (company, agency, equipe interna). Revisar se a regra chega no back-end. | 🟡 feito em 21/10 nos 5 lugares (produto com atalho "Todos"; campos de Informações comerciais; tarefa/etapa; entregáveis; perguntas) — aguardando seu teste |
| R21-14 | **Botão "Preencher com IA" abre caixa de diálogo** (anexar escopo/explicações); a IA pergunta nas ambiguidades; vale também para produto já publicado, sem sobrescrever tudo. | 🟡 feito em 21/10 — a caixa de diálogo agora aceita **anexar .txt/.md/.csv/.json**, a IA **pergunta nas ambiguidades** e há a opção **"só completar o vazio"** (ligada por padrão, não sobrescreve). Aguardando seu teste |
| R21-15 | **Prazo comercial com seletor de unidade** (minutos/horas/dias) e conversão automática para horas. | 🟡 feito em 21/10 — aguardando seu teste (minutos sobem para hora inteira) |
| R21-16 | **Resumo da tarefa**: corrigir textos sobrepostos e ampliar a exibição das somas de horas. | 🟡 feito em 21/10 — indicadores do Resumo da tarefa maiores e com texto que quebra linha (nada cortado). Aguardando seu teste |
| R21-17 | **Questionário em sessões (acordeão)** e reordenar perguntas por arrastar e soltar. | 🟡 feito em 21/10 — com sessões cadastradas, as perguntas aparecem em **acordeão por sessão** (abrir/fechar); arrastar continua. Aguardando seu teste |
| R21-18 | **Área de instruções de preenchimento para a IA** (anexar guias e métodos). | 🟡 feito em 21/10 — dentro de "Preencher com IA": painel **"Guias e métodos que a IA consulta"** (colar ou anexar texto, ativar/desativar, apagar); a IA segue os guias ativos. Aguardando seu teste |
| R21-19 | **Entrega emergencial — regras**: limite para pedido no mesmo dia e **antecedência mínima** antes do fim da tarefa; tela de configuração (horas reduzidas e valor por etapa). | 🟡 feito em 21/10 — **horário-limite no mesmo dia** e **antecedência mínima** cadastrados no produto e **aplicados no servidor** ao pedir. Aguardando seu teste |
| R21-20 | **Caixa de diálogo de pagamento** para o cliente comprar adicional durante a execução (ex.: +10 dias de aprovação). | 🔴 **não feito** — a caixa de pagamento para comprar adicional durante a execução depende de decisões de preço/prazo/gateway (ver revisão R21-24, item 4). O cadastro (R21-05) já deixa tudo pronto |
| R21-21 | **Continuidade do executor**: prazo (horas) para o preferencial aceitar; vencido → líder ou rede nômade. | 🟢 já funcionava e foi **reconferido em 21/10**: 17 testes automáticos verdes (oferta com prazo de aceite; vencido → fila normal ou líder decide) |
| R21-22 | **Cobrança estimada**: etapas dispensáveis no ciclo seguinte abatem o valor da renovação. | 🟢 já funcionava e foi **reconferido em 21/10**: etapa dispensável não é cobrada e o crédito abate a próxima fatura (testes 3, 4, 11 da continuidade) |
| R21-23 | **Definições (glossário)**: Variações = escolhas exclusivas que definem o produto; Adicionais = opcionais complementares no carrinho; Condições = alterações globais de execução (prazo/percentual em todas as etapas). Registrar nos docs. | 🟡 feito em 21/10 — glossário nos "i" das abas e em docs/regras-de-negocio.md |
| R21-24 | **Revisar regras de prazos, condições e aprovações** já definidas (Vinicius se comprometeu a andar ainda hoje). | 🟡 feito em 21/10 — documento **docs/revisao-prazos-condicoes-aprovacoes-2026-10-21.md** com o que já vale e **6 decisões que dependem de você** |
| R21-25 | (Gabriel) Painel de notificações via WhatsApp com a API Brevo e assistente de IA que gera as regras; **mapear custos** de produção. | ⏸ (informativo / Gabriel) |

## D. Pendências técnicas anteriores (para não perder)
| Cód. | Item | Farol |
|---|---|---|
| R21-26 | Espelho dos dados local → servidor (bloqueado pelo sistema de permissões em 21/10) | 🔴 aguarda decisão do usuário |
| R21-27 | Velocidade em produção (fontes próprias; Maps só em 3 telas) | ⏸ aguarda decisão |
| R21-28 | Tela Moldura Clara/Escura: virar constante compartilhada | 🟡 feito em 21/10 — constantes `STANDARD_SHELL_PANEL_DARK_CLASS` / `STANDARD_SHELL_DARK_BG_CLASS` em `components/standard-page-shell.tsx` (visual igual; Cadastro de Produtos já usa) |
