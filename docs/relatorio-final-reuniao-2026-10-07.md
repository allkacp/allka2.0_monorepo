# Relatório final — reunião de 07/10/2026 (posição em 08/10/2026)

Tudo abaixo está **somente no ambiente local** (nada publicado online). Legenda: 🟢 pronto · 🟡 pronto em parte / depende de teste ou informação · 🔴 não feito · ⏸ adiado por decisão sua.

Endereço local: http://localhost:8082 · Usuário de teste admin: `teste.local@allka.test` (senha em `apps/backend/.test-login.local`) · Usuário de teste empresa: `empresa.teste@allka.test` (senha em `apps/backend/.test-login-empresa.local`).

---

## 1. Decisões (D-1 a D-9)

| # | O que foi decidido | O que o sistema faz agora | Onde ver | Estado |
|---|---|---|---|---|
| D-1 | Produto para todos os níveis de agência ou só alguns | Cartão "Quem pode ver este produto" com os níveis Bronze, Silver, Gold, Platinum e Diamond. Vale na lista, detalhe, cotação, cesta e nas recomendações da IA. Só limita agências. | Editor de produto, aba Informações | 🟢 (falta você ver na tela) |
| D-2 | "Sob consulta" abre questionário de orçamento; vira tarefa depois de aprovado | Pedido sob consulta → orçamento → cliente aprova o valor → a EQUIPE clica "Gerar contratação" (cotação travada no valor aprovado, vale 7 dias) → cliente paga no checkout normal → nascem projeto e tarefa; respostas do questionário viram o briefing. Automático no futuro. | Admin → Pedidos comerciais | 🟢 |
| D-3 | Manter executor humano, IA ou híbrido nas etapas | Já existia; conferido. | Editor, etapas | 🟢 |
| D-4 | Etapa aprovada libera a próxima sozinha | Sempre automático. Removidos a opção, o botão e a rota manual. | Execução das tarefas | 🟢 |
| D-5 | Qualificação do líder e do especialista separadas | Opção própria por etapa; ordem líder → especialista → cliente; só o especialista escolhido decide; histórico e aviso próprios. | Editor, etapas | 🟢 |
| D-6 | Evidências obrigatórias antes da aprovação do cliente | Para qualquer executor (nômade, líder, interno): sem o anexo de entrega, a etapa não é entregue. | Execução das tarefas | 🟢 |
| D-7 | Botão de IA que gera o questionário a partir do produto | Testado com a IA real: 9 a 14 perguntas coerentes, sem pedir senha. Só sugere; o administrador revisa. | Editor, questionário | 🟢 |
| D-8 | Editar etapa: atualizar o modelo global ou criar ID novo só para o produto | Já existia; testes passam. | Editor, etapas | 🟢 |
| D-9 | Preferir o mesmo executor, com rodízio se não aceitar no prazo | Já existia (aceite padrão de 120 min); testes passam. | Distribuição de tarefas | 🟢 |

## 2. Próximas etapas (P-2 a P-16)

| # | Pedido | O que o sistema faz agora | Estado |
|---|---|---|---|
| P-2 | Testar o Neko (navegador interno) | Prova de conceito pronta, mas o container está desligado porque a porta UDP 52059 está ocupada por outro programa. Fica para o final, como você pediu. | ⏸ |
| P-4 | Salvar visibilidade; bug "editar exige salvar antes" | Visibilidade e níveis salvam sozinhos ~1 s depois de marcar e ao trocar de aba. **Segundo bug não reproduzido.** Observação: o editor abre travado de propósito (só o botão "Editar" libera), e isso pode ser o que parece "exigir" algo antes de editar. Se for isso, é só dizer e abrimos já editável em produto ainda em rascunho. | 🟡 |
| P-5 | Ícone (i) com explicação nos campos | Em todas as telas logadas, para os campos comuns (nome, e-mail, CNPJ, endereço, status, prazo, valor…). Telas com dicionário próprio (editor de produto, Navegador seguro, Tarefas internas, Configurações, PLAC) usam o texto específico. Campo sem texto fica sem (i): avise o nome e a tela e eu acrescento. | 🟢 |
| P-6 | Padronizar tamanho dos campos e rolagem | Todas as telas: mesma altura mínima nos campos (fora de tabelas); áreas de texto com altura máxima e rolagem interna. | 🟢 |
| P-7 | Acordeões "Itens" e "Requisitos" fechados por padrão | Acordeões de verdade, fechados ao abrir. | 🟢 |
| P-8 | IA global preenche o produto inteiro por chat | Testado com a IA real: conversa, ajuste e tarefas sugeridas em ~15 s. Corrigido um caso em que a IA entrava em repetição. | 🟢 |
| P-9 | Corrigir "adicionar acesso" | O selo e o checklist agora contam também os acessos adicionados pelo catálogo. | 🟢 |
| P-10 | IA nos campos digitáveis das etapas | Descrição e critério de conclusão da etapa têm botão de IA. | 🟢 |
| P-11 | Cobrança das alterações por IA | Cada produto inclui N alterações grátis (regra global ou valor do produto, no editor). Acabando, o cliente "contrata mais": cada alteração extra é debitada do saldo da carteira (preço pela média de tokens). Sem saldo: botão travado e aviso de quanto falta. **Recarga:** cartão ou Pix pelo cliente, hoje com pagamento de teste (cartão final 0002 simula recusa). Para trocar pelo gateway real (Mercado Pago, Asaas, PagBank, Stripe) basta um adaptador novo; o Pix real vai precisar de um aviso automático (webhook). Testado de ponta a ponta no navegador como empresa. | 🟢 (gateway real ⏸) |
| P-12 | Remover redundâncias e modelos obsoletos | (1) Acessos com cadastro único e cada etapa escolhe quais usa; (2) removida a camada de dados provisórios; (3) removidas as pendências da importação antiga; (4) removida a simulação de preço (o preço vem só das configurações de precificação; se faltar dado, a mensagem diz qual). Mantidos: registro de modelos globais, marcador de histórico e gatilhos de conexão. | 🟢 |
| P-13 | Erro no campo de aprovação da etapa | Os prazos de aprovação, refação e aceite recusavam valor inválido em silêncio; agora explicam. O erro exato da reunião não foi reproduzido. | 🟡 |
| P-14 | Fluxo de aprovação e qualificação | Seletor único "Quem aprova esta etapa". Etapa feita por IA ou híbrida sempre tem qualificador. | 🟢 |
| P-15 | Configurações de execução dentro de "Editar" | Prazos e opções da etapa só dentro de "Editar"; a lista mostra um resumo. | 🟢 |
| P-16 | Finalizar a "Etapa 2" (precedência e executor) | Não há detalhe do que seria; você não lembra. Fica para o próximo teste. | 🟡 |

## 3. Detalhes citados fora das listas

| Item | Estado | Observação |
|---|---|---|
| Campos de executor/especialidade fora da tela geral da tarefa | 🟡 | Movidos para as etapas; falta conferir visualmente. |
| Aviso quando um conector (ex.: WordPress) desconectar | 🟡 | Existe parte: conexão que vence passa a "expirada", registra evento e dispara os lembretes de pendência, e o painel de conexões mostra "Reconectar". **Falta** a checagem ativa (testar o WordPress de tempos em tempos e avisar na hora se parou). |
| SLA: prazo estimado × real da etapa | 🟢 | Feito. |
| Resumo visual do fluxo de etapas | 🟢 | Feito. |
| Prazo comercial de segurança | 🟢 | Feito. |
| Navegador seguro com validade configurável | 🟡 | Validade do login até 240 min; a velocidade depende do teste do Neko. |

## 4. O que ficou pendente e quem resolve

| Pendência | Quem | Como destravar |
|---|---|---|
| P-4 (segundo bug), P-13 (erro exato), P-16 (Etapa 2) | Você, no próximo teste | Ao ver o problema, anote a tela e a frase que aparece. |
| Gateway de pagamento real + Pix real (webhook) | Você (contas) + eu | Quando tiver as contas, trocar só o adaptador. |
| Checagem ativa de conectores desconectados | Eu | Feita quando você mandar. |
| Conferência visual de todas as telas | Você + eu | Percorrer tela a tela no teste. |
| Neko (P-2), GitHub, A10, A12 | Por decisão sua | Adiados. |

## 5. Como testar o que ficou pronto hoje (P-11)

1. Entre como empresa de teste e abra **Projetos → [TESTE] Projeto de alterações por IA → aba Aditivos**.
2. Peça as alterações grátis até acabarem.
3. Tente a extra sem saldo: o botão fica travado e mostra quanto falta.
4. **Adicionar crédito** → cartão (qualquer número comum aprova; final 0002 recusa) ou Pix (gerar código e "Simular pagamento").
5. Contrate a alteração extra e confira que o saldo diminuiu.

---

## 6. Gateways de pagamento trocáveis (08/10, local)

- **Tela:** Admin → Configurações → aba **Pagamentos** (só Admin Master). Lista os gateways, guarda as chaves cifradas (nunca voltam para a tela), "Testar conexão", "Ativar" (pede a senha do Master e o teste aprovado) e histórico de trocas.
- **Gateway principal: PagBank** (adaptador escrito: Pix e página segura de cartão). Asaas, Mercado Pago e Stripe estão **reservados** na lista; cada um vira um adaptador novo (uma classe + uma linha em `apps/backend/src/lib/payment-gateways/registry.ts`).
- **Troca:** vale na hora, sem reiniciar. Cobranças novas saem pelo gateway novo; as já geradas continuam no antigo.
- **Aviso automático:** `POST /api/payment-webhooks/<gateway>` confere a assinatura do gateway e credita a recarga uma única vez.
- **Estado:** estrutura e testes automáticos (5) passam. O PagBank real respondeu ao "Testar conexão" no sandbox (recusou um token falso, como esperado). **Falta provar com o token de teste de verdade:** testar conexão, gerar um Pix e pagar no sandbox. Até lá o adaptador aparece como "ainda não comprovado".
- **Migration:** `20261008200000_payment_gateways` (só cria 3 tabelas; `rollback.sql` ao lado).
- **Ainda não feito:** cobrança recorrente automática com cartão guardado no gateway (o aviso "recadastrar cartão" ao trocar), e os adaptadores de Asaas/Mercado Pago/Stripe.
