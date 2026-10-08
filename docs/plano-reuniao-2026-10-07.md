# Planejamento — reunião de 07/10/2026

Legenda: 🟢 feito (falta só conferir) · 🟡 existe em parte / precisa verificar ou ajustar · 🔴 não feito / precisa investigar · ⏸ de outra pessoa ou adiado.
Status levantado a partir do código e do registro de continuidade (nada foi alterado nesta etapa).

## Decisões
| # | Decisão | Farol | Situação atual |
|---|---|---|---|
| D-1 | Produto para todos os níveis de agência ou níveis específicos (ex.: só Gold) | 🟢 | Feito em 07/10: níveis Bronze, Silver, Gold, Platinum e Diamond no cartão "Quem pode ver este produto"; vale na lista, detalhe, cotação, cesta e IA; só limita agências. Aguardando conferência visual. |
| D-2 | "Sobre consulta" abre questionário de orçamento (não contrata direto); vira tarefa após aprovar o valor | 🟡 | 🟢 | Feito: pedido sob consulta → orçamento → cliente aprova → a EQUIPE clica em “Gerar contratação” (cotação travada no valor aprovado, vale 7 dias) → cliente paga no checkout → projeto/tarefa nascem e as respostas do questionário viram o briefing. Automático no futuro. Falta só o usuário ver a tela. 
| D-3 | Manter executor humano / IA / híbrido nas etapas | 🟢 | Já existia (A4c); conferido em 07/10. |
| D-4 | Etapa aprovada libera a próxima sozinha, sem botão manual | 🟢 | Feito em 07/10: sempre automático; removidos a opção, o botão e a rota manual. |
| D-5 | Qualificação do líder e do especialista como opções separadas | 🟢 | Feito em 07/10: opção própria por etapa (com escolha do especialista); ordem líder → especialista → cliente; só o especialista escolhido decide; histórico e aviso próprios. |
| D-6 | Evidências obrigatórias (prints/vídeo) antes da aprovação do cliente | 🟢 | Feito em 07/10: a regra agora vale para qualquer executor (nômade, líder, interno): sem o anexo de entrega da etapa ela não é entregue. |
| D-7 | Botão de IA que gera o questionário a partir dos campos do produto | 🟢 | Feito e testado com a IA REAL (Gemini): 9 a 14 perguntas coerentes com o cadastro, sem pedir senha; só sugere, o administrador revisa. |
| D-8 | Editar etapa: atualizar o modelo global ou criar novo ID só para o produto | 🟢 | Já existia (A15); testes de modelos de tarefa passam. |
| D-9 | Preferir o mesmo executor, com rodízio se não aceitar no prazo | 🟢 | Já existia (A8b-3); testes passam (aceite padrão 120 min). |

## Próximas etapas
| # | Item | Quem | Farol | Situação |
|---|---|---|---|---|
| P-2 | Testar o Neko (navegador interno) — **fica por último** | Vinicius | 🟡 | Prova de conceito no ar em `http://localhost:8095/?usr=teste&pwd=poc-admin`; aguarda o teste, que fica para o final. |
| P-4 | Persistir visibilidade + bug "edição exige salvar antes" | Vinicius | 🟡 | Visibilidade e níveis agora salvam sozinhos ~0,8 s depois de marcar (e ao trocar de aba, as abas ficam montadas). O bug de "editar exige salvar antes" não foi reproduzido: falta saber em qual tela acontece. |
| P-5 | Tooltips (i) em todos os campos do sistema | Vinicius | 🟡 | Editor de produto + Navegador seguro, Tarefas internas, Configurações e PLAC ganharam os ícones (i) por tela (dicionário por tela). CAMADA GERAL (08/10): `GlobalScreenHelp` em App.tsx cobre as ~100 telas com um dicionário de ~70 campos comuns (nome, e-mail, CNPJ, endereço, valor, prazo…); dicionário próprio da tela vence; só rótulos inteiros ganham (i). Campos sem texto no dicionário geral ficam sem (i) até serem adicionados. |
| P-6 | Padronizar tamanho dos campos e barras de rolagem | Vinicius | 🟡 | Padrão de altura mínima dos campos e áreas de texto com rolagem aplicado nas mesmas telas (e no editor). Padrão GERAL aplicado a todas as telas: altura mínima igual dos campos (fora de tabelas) e áreas de texto com limite e rolagem. |
| P-7 | Accordions de itens e requisitos fechados por padrão | Vinicius | 🟢 | Feito em 07/10: "Itens" e "Requisitos e resumo dos entregáveis" são acordeões de verdade, fechados por padrão. |
| P-8 | IA global preenche o produto inteiro por chat | Vinicius | 🟢 | Feito e testado com a IA REAL (Gemini): conversa, ajuste e tarefas sugeridas em ~15 s. Achado e corrigido: uma chamada grande fazia a IA entrar em repetição; agora são chamadas pequenas. |
| P-9 | Corrigir "adicionar acesso" (refletir na interface) | Vinicius | 🟢 | Causa achada: o selo e o checklist só contavam os acessos fixos, ignorando os adicionados pelo catálogo; o cartão ficava fechado. Corrigido. |
| P-10 | Campos digitáveis com IA em todas as etapas | Grupo | 🟢 | Feito: descrição e critério de conclusão da etapa têm botão de IA. |
| P-11 | Precificação por tokens (média de custo) | Grupo | 🟡 | Feito: painel de preço por tokens + COBRANÇA: 1ª alteração grátis (regra global, ou valor próprio do produto no editor); depois debita do saldo da carteira; sem saldo recusa e avisa quanto falta. Tela do cliente PRONTA (08/10): painel "Alterações por IA" na aba Aditivos do projeto (`catalog2-ai-changes-panel.tsx`) mostra as grátis restantes; acabando, botão "Contratar mais uma alteração" debita do saldo; sem saldo avisa quanto falta. Falta só a recarga de crédito (cartão/Pix) pelo cliente, que ainda não existe. |
| P-12 | Reestruturar etapas/acessos ligados à tarefa; remover redundâncias e modelos obsoletos da entrega comercial | Grupo | 🟢 | Feito (08/10): (1) acessos com cadastro ÚNICO (exigências de conexão) e cada etapa escolhe quais usa (padrão / todos / só os escolhidos); lista antiga removida, dados antigos copiados pela migração; (2) camada de dados provisórios removida (nada de preço/prazo/imagem inventados; produto sem preço mostra “a definir”); (3) pendências da importação antiga e (4) simulação de preço removidas. Mantidos: registro de modelos globais, marcador de histórico e gatilhos de conexão. |
| P-13 | Erro no campo de aprovação da etapa | Vinicius | 🟡 | Causa provável corrigida: prazos de aprovação/refação/aceite recusavam valor inválido em silêncio; agora explicam. Não consegui reproduzir o erro exato que apareceu na reunião: se repetir, me diga a mensagem. |
| P-14 | Melhorar fluxo de aprovação e múltipla escolha de qualificação | Grupo | 🟢 | Feito: seletor único “Quem aprova esta etapa” (líder / especialista / líder e depois especialista). Etapa feita por IA ou híbrida SEMPRE tem qualificador (editor, servidor e geração das etapas). |
| P-15 | Configurações de execução e aprovação dentro da aba editar | Vinicius | 🟢 | Feito: os prazos e opções da etapa ficam só dentro de "Editar"; a lista mostra um resumo. |
| P-16 | Finalizar a Etapa 2 (precedência e executor) | Vinicius | 🟡 | — |

## Detalhes citados fora das listas
| Item | Farol | Situação |
|---|---|---|
| Remover da tela geral os campos de executor/especialidade da tarefa | 🟡 | Movido para as etapas; confirmar que sumiu da tela geral. |
| Aviso quando um conector (ex.: WordPress) desconectar | 🔴 | Não localizado. |
| SLA: prazo estimado × real da etapa | 🟢 | Feito (A15). |
| Resumo visual do fluxo de etapas | 🟢 | Feito. |
| Prazo comercial de segurança | 🟢 | Feito (B1). |
| Navegador seguro com validade configurável | 🟡 | Validade do login até 240 min; velocidade pendente do Neko. |

## Ordem sugerida
1. **Bugs que travam o cadastro:** P-4, P-13, P-9, P-7, P-6.
2. **Decisões de fluxo:** D-4, D-5, D-6 (bloquear aprovação sem evidência), D-2, D-1.
3. **IA:** D-7, P-8, P-10, P-11.
4. **Resto:** P-5, P-12, P-14, P-15, P-16, conexões desconectadas, Neko (P-2).
