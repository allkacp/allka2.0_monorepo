# Roteiro de testes do QA — por perfil de usuário

Use as contas de `docs/qa-contas-teste.md`. Para cada linha da tabela: faça
a ação, marque se funcionou, e escreva uma observação curta se algo saiu
diferente do esperado.

**Antes de começar, em cada teste:**
- anote o **navegador** que você está usando (Chrome, Safari, Edge...) e o
  **horário** em que testou;
- se algo não funcionar, **tire um print da tela** antes de continuar;
- não é preciso saber nada técnico — só descrever o que você viu.

---

## Admin Master

Conta: `qa-admin-master@allka-qa.test`

| # | Caminho | Ação | Resultado esperado | Funcionou? | Observação |
|---|---|---|---|---|---|
| 1 | Tela de login | Entrar com a conta de Admin Master | Cai no painel principal do Admin | ☐ Sim ☐ Não | |
| 2 | Painel principal | Olhar o dashboard | Números e gráficos aparecem sem erro na tela | ☐ Sim ☐ Não | |
| 3 | Menu do avatar → Meu Perfil | Abrir "Meu Perfil" | Abre dentro do quadro branco da plataforma, com menu lateral e cabeçalho visíveis, sem cortar nem sobrepor nada | ☐ Sim ☐ Não | |
| 4 | Usuários | Abrir a lista de usuários | Lista carrega, é possível abrir um usuário | ☐ Sim ☐ Não | |
| 5 | Empresas | Abrir a lista de empresas | Lista carrega, aparece a empresa `[TESTE QA] Empresa` | ☐ Sim ☐ Não | |
| 6 | Produtos (catálogo atual) | Abrir a lista de produtos | Os produtos de sempre continuam aparecendo normalmente | ☐ Sim ☐ Não | |
| 7 | Legacy | Abrir a tela "Legacy" | Abre uma área só de consulta, com aviso de "somente leitura" | ☐ Sim ☐ Não | |
| 8 | Novo catálogo | Abrir o novo catálogo (produtos) | Lista os 36 produtos novos, todos marcados como rascunho | ☐ Sim ☐ Não | |
| 9 | Novo catálogo → Pré-visualizar como cliente | Abrir um dos 36 em modo pré-visualização | Abre com aviso de que é uma pré-visualização, não permite comprar | ☐ Sim ☐ Não | |
| 10 | Catálogo do cliente (teste) | Abrir o produto `[TESTE QA] Serviço Completo` | Aparece normalmente, sem aviso de rascunho | ☐ Sim ☐ Não | |
| 11 | Checkout de teste | Repetir o fluxo de compra do produto de teste | Cotação, cesta e checkout funcionam do início ao fim | ☐ Sim ☐ Não | |
| 12 | Projeto de teste | Abrir o pedido/projeto criado pelo seed de QA | Projeto abre com produto, valor e tarefas visíveis | ☐ Sim ☐ Não | |
| 13 | Aba Tarefas do projeto de teste | Olhar as duas tarefas | Ambas aparecem listadas | ☐ Sim ☐ Não | |
| 14 | Tarefa "Produzir e entregar" | Tentar liberar essa tarefa antes de concluir "Alinhar briefing" | Sistema recusa e explica que depende da outra tarefa | ☐ Sim ☐ Não | |
| 15 | Tarefa "Alinhar briefing" | Concluir essa tarefa | Tarefa muda de status sem erro | ☐ Sim ☐ Não | |
| 16 | Tarefa "Produzir e entregar" | Tentar liberar de novo | Agora funciona | ☐ Sim ☐ Não | |
| 17 | Aba Aditivos do projeto de teste | Abrir a aba | Aparece 1 aditivo com status "em análise" | ☐ Sim ☐ Não | |
| 18 | Aditivo | Aprovar o aditivo | Muda para "aprovado — aguardando pagamento" | ☐ Sim ☐ Não | |
| 19 | Sino de alertas | Abrir alertas | Aparece o alerta de demonstração do QA | ☐ Sim ☐ Não | |
| 20 | Sino de notificações | Abrir notificações | Aparece a notificação de demonstração do QA | ☐ Sim ☐ Não | |
| 21 | Permissões | Abrir a tela de permissões | Abre normalmente, é possível ver os perfis de acesso | ☐ Sim ☐ Não | |

## Admin comum

Conta: `qa-admin@allka-qa.test`

| # | Caminho | Ação | Resultado esperado | Funcionou? | Observação |
|---|---|---|---|---|---|
| 1 | Login | Entrar | Cai no painel do Admin | ☐ Sim ☐ Não | |
| 2 | Meu Perfil | Abrir | Abre certinho, dentro do quadro da plataforma | ☐ Sim ☐ Não | |
| 3 | Telas do dia a dia | Navegar por projetos, tarefas, usuários | Tudo abre normalmente | ☐ Sim ☐ Não | |
| 4 | Legacy | Tentar abrir a tela "Legacy" pelo menu | **Não deve aparecer** no menu para este usuário | ☐ Sim ☐ Não | |
| 5 | Configurações de Master | Procurar configurações exclusivas de Master (governança de alertas, etc.) | **Não devem aparecer** para este usuário | ☐ Sim ☐ Não | |

## Company (Empresa)

Conta: `qa-company@allka-qa.test`

| # | Caminho | Ação | Resultado esperado | Funcionou? | Observação |
|---|---|---|---|---|---|
| 1 | Login | Entrar | Cai no painel da Empresa | ☐ Sim ☐ Não | |
| 2 | Meu Perfil | Abrir | Abre dentro do quadro da plataforma, mostra só os dados desta empresa | ☐ Sim ☐ Não | |
| 3 | Meu Perfil → aba Permissões | Verificar se essa aba aparece | **Não deve aparecer** — é só do Admin | ☐ Sim ☐ Não | |
| 4 | Catálogo atual | Abrir a lista de produtos de sempre | Continua funcionando normalmente | ☐ Sim ☐ Não | |
| 5 | Novo catálogo | Abrir | Aparece só o produto `[TESTE QA] Serviço Completo` publicado — **nenhum dos 36 rascunhos** aparece | ☐ Sim ☐ Não | |
| 6 | Produto de teste | Abrir o detalhe | Mostra preço, prazo, variações e adicional | ☐ Sim ☐ Não | |
| 7 | Configurar produto | Escolher a variação "Uso de IA" e um adicional | Preço/prazo recalculam na tela | ☐ Sim ☐ Não | |
| 8 | Cesta | Adicionar à cesta | Aparece "já está na cesta" se tentar de novo | ☐ Sim ☐ Não | |
| 9 | Checkout | Finalizar a compra | Chega até a tela de sucesso com número do pedido | ☐ Sim ☐ Não | |
| 10 | Meus projetos | Abrir o pedido | Projeto aparece com as tarefas | ☐ Sim ☐ Não | |
| 11 | Aditivo | Ir na aba Aditivos do projeto de teste e solicitar um adicional | Solicitação é enviada e aparece "em análise" | ☐ Sim ☐ Não | |
| 12 | Aditivo aprovado | Depois que o Admin aprovar, pagar o aditivo | Aditivo muda para "pago e aplicado" | ☐ Sim ☐ Não | |
| 13 | Alertas | Abrir o sino | Só aparecem alertas desta empresa | ☐ Sim ☐ Não | |

## Agency (Agência)

Conta: `qa-agency@allka-qa.test`

| # | Caminho | Ação | Resultado esperado | Funcionou? | Observação |
|---|---|---|---|---|---|
| 1 | Login | Entrar | Cai no painel da Agência | ☐ Sim ☐ Não | |
| 2 | Meu Perfil | Abrir | Mostra os dados desta agência | ☐ Sim ☐ Não | |
| 3 | Catálogo/checkout/projeto/aditivo | Repetir os mesmos passos da Empresa (itens 4–12 acima) | Tudo funciona do mesmo jeito, do lado da Agência | ☐ Sim ☐ Não | |
| 4 | Isolamento | Verificar se aparece algum dado da `[TESTE QA] Empresa` | **Não deve aparecer nada** da empresa — são contas separadas | ☐ Sim ☐ Não | |

## Partner

Conta: `qa-partner@allka-qa.test`

| # | Caminho | Ação | Resultado esperado | Funcionou? | Observação |
|---|---|---|---|---|---|
| 1 | Login | Entrar | Cai no painel de Partner/Agência | ☐ Sim ☐ Não | |
| 2 | Meu Perfil | Abrir | Mostra os dados da agência-partner de teste | ☐ Sim ☐ Não | |
| 3 | Catálogo | Ver o que este perfil pode ver | Segue a permissão já existente para Partner | ☐ Sim ☐ Não | |
| 4 | Ações bloqueadas | Tentar uma ação que Partner não deveria fazer (conforme já definido no sistema) | Sistema bloqueia com uma mensagem clara | ☐ Sim ☐ Não | |

## Nômade

Conta: `qa-nomad@allka-qa.test`

| # | Caminho | Ação | Resultado esperado | Funcionou? | Observação |
|---|---|---|---|---|---|
| 1 | Login | Entrar | Cai no painel do Nômade | ☐ Sim ☐ Não | |
| 2 | Meu Perfil | Abrir | Mostra dados pessoais, endereço, PIX, habilidades | ☐ Sim ☐ Não | |
| 3 | Catálogo de contratação | Procurar alguma forma de comprar um produto | **Não deve existir** — Nômade não contrata | ☐ Sim ☐ Não | |
| 4 | Minhas tarefas | Abrir a lista | Consegue ver tarefas disponíveis | ☐ Sim ☐ Não | |
| 5 | Alertas | Abrir o sino | Só alertas relacionados a este Nômade aparecem | ☐ Sim ☐ Não | |

## Líder

Conta: `qa-leader@allka-qa.test`

| # | Caminho | Ação | Resultado esperado | Funcionou? | Observação |
|---|---|---|---|---|---|
| 1 | Login | Entrar | Cai no painel do Líder | ☐ Sim ☐ Não | |
| 2 | Meu Perfil | Abrir | Mostra dados pessoais e a área de atuação `[TESTE QA] Design` | ☐ Sim ☐ Não | |
| 3 | Catálogo | Abrir o novo catálogo | Consegue visualizar, mas **não** consegue contratar | ☐ Sim ☐ Não | |
| 4 | Projetos/tarefas | Abrir a lista de acompanhamento | Consegue ver, conforme a permissão já existente | ☐ Sim ☐ Não | |

---

## Se algo der errado

1. Tire um print da tela.
2. Anote: nome do teste (número + perfil), navegador, horário.
3. Escreva o que você esperava e o que aconteceu de diferente.
4. Envie para quem está coordenando o QA — não precisa tentar consertar
   nem investigar o motivo técnico.
