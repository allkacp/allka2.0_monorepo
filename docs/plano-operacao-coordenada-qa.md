# Plano — operação coordenada de desenvolvimento e validação

Atualizado em 26/10/2026. Este plano é **somente local**. Não autoriza deploy, publicação, alteração de produtos reais, pagamentos reais ou uso de dados de clientes.

## Resultado do primeiro bloco (26/10)

- Concluído via API local: Agência QA criou/selecionou projeto, contratou produto QA e pagou no sandbox; Admin conferiu o mesmo projeto. Pedido mais recente: `proj_954`, R$ 294,84 (cotação = projeto = pagamento), 2 tarefas e 3 etapas. Retry não duplicou pedido/pagamento; outra conta não acessou.
- Corrigido: servidor agora exige projeto prévio; retry não revela pedido de outra conta; projeto reservado transacionalmente; período da cesta preservado na cotação.
- Testes aprovados: 26 de checkout, 10 cenários E2E backend, 10 de componentes frontend. O painel de Novo Projeto é simulado nos testes de componentes, portanto não é homologação visual do formulário completo.
- **Pendente:** navegador local desativado nas configurações do app. Não contornar. Quando habilitado, testar criação real no painel do checkout, seleção de volta, conexões no lançamento e conferência visual do Admin.
- Não houve envio ao Claude, commit, push, deploy ou alteração online neste bloco. Os registros QA criados ficam locais e identificados; não limpar dados automaticamente.

## Objetivo

### Teste manual contratado pelo usuário em 26/10 — Agência 1 / Produto 2

**Escopo desta entrega:** contratação inicial, com pagador Agência ou Cliente final e comissão percentual sobre o preço da plataforma. Parar quando as tarefas estiverem disponíveis para lançamento. Não lançar e não testar distribuição para líder/nômade neste bloco.

1. Entre localmente com o usuário da **Agência ID 1 (Lamego Academy)**.
2. Anote o saldo atual da carteira. Abra Catálogo e o **Produto ID 2 (Manutenção e Alteração de Site ou Loja Virtual)**, já publicado. Não altere o cadastro do produto.
3. Escolha quantidade, variações/adicionais e uma modalidade que o produto ofereça. Confira preço/prazo e adicione à cesta.
4. Abra a cesta e avance em **Gerar cotação e continuar**. Confira se a modalidade foi mantida.
5. Escolha um projeto livre ou use **Criar projeto**, sem sair do checkout. Desde a correção de 28/10, o formulário abre em **Painel Moldura**, com sidebar descoberta e overlay atrás. Preencha nome e selecione **cadastros reais** de consultor e cliente da própria empresa; e-mail do consultor vem automático/readonly. Se não existirem, Cadastrar consultor/cliente abre Janela Moldura, grava o cadastro e o vínculo na API e retorna selecionado. Sem IDs válidos não salva. Para reaproveitar um cliente já existente mas sem vínculo, vincule esse cadastro pelo Admin, não crie duplicata. Clique **Salvar projeto**: rascunho volta selecionado à mesma compra. Não abre outro catálogo. Cancelar/X conserva cotação e não confirma pedido.
6. Para testar o cliente final, escolha **Cliente final paga por link**. Informe o percentual desejado. Confira base da plataforma, sua comissão e total do cliente. O percentual é acréscimo sobre a base, não dedução da base (comissão = base × percentual / 100, por item arredondado em centavos).
7. Aceite os termos de teste e confirme o pedido. Copie/abra o link. **Antes do pagamento não deve haver tarefas de execução criadas nem crédito de comissão.**
8. A página pública deve mostrar produtos e **total final**, sem comissão separada, preço interno ou dados de acesso. Não exige conta/login do cliente. Link válido por 24h, vinculado aos valores do pedido.
9. No ambiente local, selecione o cartão sandbox recusado para testar o erro: nenhuma comissão/tarefa deve surgir. Depois escolha o aprovado e simule o pagamento. Não digite cartão real.
10. Volte à aba da Agência e use **Consultar pagamento**. Abra **Ver tarefas para lançar**; as tarefas devem estar aguardando lançamento. **Pare aqui: NÃO clique em Lançar.**
11. Confira a carteira: deve aumentar só pelo valor da comissão. Atualizar a página/repetir a confirmação não pode duplicar comissão, pedido ou tarefas.
12. No Admin, consulte o mesmo projeto/código: deve estar pago, com total final e produtos/tarefas corretos. Não lançar pelo Admin.
13. Para testar **A agência paga**, faça uma nova contratação em outro projeto livre. Sem comissão e sem link do cliente; simule pagamento no checkout. Confira as tarefas disponíveis e pare novamente antes de lançar.

**Limites explícitos:** tudo local/sandbox. Link localhost só funciona no computador/ambiente local; não enviar para um cliente real. Split nesta entrega é contábil e transacional no ledger da Allka, sem repasse bancário real. Cobrança recorrente futura com comissão, estorno/cancelamento de comissão e integração real com gateway não foram implementados neste bloco. Não houve migração nem alteração da Agência 1/Produto 2. Homologação visual real continua pendente porque o navegador está desativado no app.

**Implementação:** `catalog2-checkout` congela pagador/percentual/total nos snapshots existentes; `agency-checkout.ts` assina/verifica links (HMAC com finalidade distinta de sessão, expiração e hash dos itens); rota pública `agency-payment-link.ts` devolve somente dados comerciais e simula pagamento exclusivamente fora de produção com gateway FakeSandbox; `confirm-payment.ts` confirma e credita comissão/plataforma na mesma transação, com chaves idempotentes e bloqueio das carteiras. O cliente nunca envia preço/valor do split.

Quando o administrador pedir uma mudança, a operação deve seguir um fluxo único:

1. Um agente implementa uma parte delimitada do código.
2. O ambiente local integra a alteração.
3. Cenários reais de teste validam a mesma regra pelos papéis certos: Admin, Agência, Empresa, Nômade e Líder.
4. A operação entrega evidências curtas: o que passou, o que falhou, prints quando necessário e o próximo ajuste.

O administrador não precisa alternar manualmente entre quem desenvolve e quem testa.

## Limite entre Cloud e computador local

- O Cloud trabalha em uma alteração isolada de código.
- O computador local é a referência de dados, Docker, banco e navegação de teste.
- A validação final acontece localmente, com dados de QA reversíveis.
- Nenhuma conta real, pagamento real ou dado de cliente é usado para teste.
- Código só vai ao ar e dados só são transferidos com ordem explícita do administrador.

## O que já existe

- Contas de QA para Admin Master, Admin, Empresa, Agência, Partner, Nômade e Líder.
- Produto de QA publicado, próprio para catálogo, configuração, cesta, checkout, projeto, tarefas e aditivos.
- Script seguro para criar/remover dados de QA apenas em ambiente local/QA.
- Testes de integração para catálogo, preço, contratação, projetos, tarefas e recorrência.
- Navegador local isolado para automações de teste.
- Roteiro por perfil em `docs/qa-roteiro-testes-por-perfil.md`.

## Primeiro cenário automatizado — Agência contrata um produto

### Preparar

1. Confirmar que Docker, API e frontend locais estão ativos.
2. Criar ou conferir os dados de QA sem tocar nos produtos reais.
3. Conferir que a Agência de QA vê somente os próprios dados.

### Executar como Agência

1. Entrar com a Agência de QA.
2. Abrir o catálogo e localizar somente o produto de QA publicado.
3. Escolher variação e adicional.
4. Confirmar que preço e prazo são recalculados.
5. Adicionar à cesta e finalizar checkout de teste.
6. Confirmar pedido, projeto e tarefas criados.

### Conferir como Admin

1. Abrir o pedido/projeto recém-criado.
2. Conferir produto, valor, prazo e escolhas feitas pela Agência.
3. Conferir tarefas e dependências.
4. Concluir a primeira tarefa e confirmar a liberação da próxima.
5. Conferir que os dados da Agência não vazaram para a Empresa de QA.

### Resultado esperado

- Relatório com cada passo: passou, falhou ou bloqueado.
- Captura somente em caso de erro visual ou divergência.
- Se falhar, pedido técnico objetivo para correção, com o passo exato e a evidência.

## Rotina para cada pedido futuro

1. **Entender a regra:** transformar o pedido do administrador em critérios claros de aceite.
2. **Delegar a implementação:** enviar uma tarefa limitada ao agente de implementação.
3. **Integrar com segurança:** revisar a alteração, sem mexer em dados reais.
4. **Executar o cenário adequado:** por exemplo, Agência contrata; Admin aprova; Nômade executa.
5. **Validar isolamento:** cada papel vê somente o que deveria ver.
6. **Entregar relatório:** resultado em linguagem simples, evidências e pendências.
7. **Só depois de aprovação:** preparar deploy ou transferência de dados, sempre como uma operação separada.

## Ordem de implantação

1. Rodar manualmente o primeiro cenário de Agência uma vez e registrar os pontos de quebra.
2. Transformar esse cenário em teste automatizado repetível, sem pagamento real.
3. Acrescentar a conferência administrativa automática.
4. Criar a mesma cobertura para Empresa, Nômade, Líder e Partner.
5. Criar um relatório único de execução que reúna resultado, evidências e tarefa de correção.

## Como pedir a partir de amanhã

Exemplo de pedido curto:

> “Ariel, ajuste a regra de contratação do produto X e valide como Agência e Admin.”

A resposta operacional deverá devolver:

- regra entendida;
- alteração feita;
- cenários executados;
- resultado de cada perfil;
- o que aguarda teste do administrador;
- o que não foi enviado ao ar.

