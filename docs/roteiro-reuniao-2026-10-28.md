# Allka reunião de 28 de outubro e testes de validação

Este roteiro reúne os 38 itens da reunião e a conferência manual dos ajustes locais. Comece pelo Produto 2. A matriz, as pessoas e os contratos existentes foram preservados; os testes automáticos usam bancos descartáveis.

## Antes de começar

1. Abra **http://localhost:8082/** para seguir o roteiro com os preenchimentos locais. Atualização de 28/10 à noite: o código também foi publicado em **https://allka.store/** (`deploy-2026-10-28-2`), mas o novo espelho dos dados/anexos ainda aguarda confirmação. Até concluir o espelho, os cadastros do QA podem diferir do local.
2. Navegador A: entre como **Vinicius Guardia**, administrador. Navegador B, em outro perfil ou janela anônima: entre como **Lamego Academy**, empresa Agência Partner de número 001. Use suas senhas atuais; não houve redefinição.
3. Produto de referência: **002 — Manutenção e Alteração de Site ou Loja Virtual**, em http://localhost:8082/admin/cadastro-produtos/2. A versão publicada é V1; V2 permanece em rascunho. A compra usa a publicada, não o rascunho.
4. Existe o consultor **Teste**, vinculado à Lamego Academy, e há dois clientes locais. Não recrie cadastros que já aparecem. Pesquise e selecione o cliente realmente vinculado à empresa.
5. **Antes de testar o encaminhamento:** não há Líder ativo nem cadastro operacional de Nômade no banco local. O usuário Reynário tem perfil de acesso de nômade, mas isso não substitui o cadastro operacional. Pelo Admin, cadastre ou complete conscientemente as pessoas de teste, com perfil/área/especialidade corretos. Não transforme Vinicius ou Eron em líderes. Use dados e contas autorizados, não documentos pessoais inventados.
6. Faça a conferência da V2 e salve como rascunho. Só publique quando decidir conscientemente que a configuração está pronta. Não remova dados reais necessários para simular um erro.
7. Em cada teste, anote horário, conta, resultado e print quando falhar. Pare no primeiro resultado diferente: não tente corrigir por exclusões em cascata.

## Farol completo

🟢 confirmado ou decisão preservada · 🟡 implementado, falta sua validação ou decisão indicada · ⏸ depende de pessoas, informação ou autorização. Código dos ajustes publicado no QA; espelho dos preenchimentos ainda pendente.

| Item | Assunto | Farol | Situação e próximo teste |
|---|---|---|---|
| 1 | Líder específico e líder da área | 🟢 | Homologado. Só perfil Líder ativo; administradores não aparecem como líderes. Cadastro local de líderes ainda precisa ser preenchido para a execução real. |
| 2 | Conferência final somente leitura | 🟢 | Homologado. Corrigir bloco retorna à edição sem perder preenchimento. |
| 3 | Entregáveis removidos e aprovação antiga | 🟢 | Homologado. Removido não conta como pendência; contratado continua protegido. |
| 4 | Reutilizar arquivo salvo | 🟡 | Biblioteca por nome/origem; escolher não grava antes de salvar o cadastro. Teste 4. |
| 5 | Permitir múltiplas contratações | 🟡 | Flag por versão, limite no servidor e proteção contra compras concorrentes. Teste 5. |
| 6 | Uma tarefa ou tarefas separadas | 🟡 | Organização por lotes preservada; nomes deixam claro que não escolhe profissional na compra. Teste 6. |
| 7 | Implantação por nova demanda | 🟡 | Opção por versão para repetir a implantação em cada contratação; renovação não repete. Teste 7. |
| 8 | Prazo percentual por unidade extra | 🟡 | Campo no produto e na etapa; zero/vazio mantém regra anterior. Teste 8. |
| 9 | Desconto progressivo | 🟡 | Faixas explícitas, não cumulativas; configuração inválida e venda abaixo do custo são bloqueadas. Teste 9. |
| 10 | Remuneração do executor | 🟡 | Referência privada de horas/valor congelada na cotação; desconto por quantidade acompanha repasse humano, sem crédito duplicado. Teste 10. |
| 11 | Complexidade da divisão entre profissionais | ⏸ | A reunião deixou a experiência para reavaliação. Organização de tarefas funciona; não foi criada escolha de pessoas no checkout nem removida a divisão existente sem decisão. |
| 12 | Aceite automático por silêncio | 🟢 | Confirmado nesta conversa: somente ofertas obrigatórias. Ofertas normais continuam o rodízio. |
| 13 | Rodízio e recusas | 🟡 | Fluxo existente conferido automaticamente, incluindo escalonamento e idempotência. Teste 13. |
| 14 | Primeira execução e recorrência | 🟡 | Compatibilidade preservada. Corrigido retorno indevido de tarefas formadas só por implantação. Teste 14. |
| 15 | Etapas internas e externas | 🟡 | Cliente não vê nem aprova etapa interna, salvo encaminhamento explícito previsto. Teste 15. |
| 16 | Aprovação e refação | 🟡 | Prazos, ajustes, reprovação e motivo conferidos; reteste com os perfis reais. Teste 16. |
| 17 | Explicações simples do cadastro | 🟡 | Ajuda dos novos campos, resumos e distinção entre esforço/prazo/desconto. Teste 17. |
| 18 | Checklists por IA | 🟡 | Geração e revisão existentes conferidas em testes; chamada real depende do provedor configurado. Teste 18. |
| 19 | POP e evidência obrigatória | 🟡 | Conclusão sem anexo exigido é recusada. Teste 19. |
| 20 | Entregáveis por etapa | 🟡 | Vínculo, ordem, exclusão protegida e resumo conferidos. Teste 20. |
| 21 | Especialidade e custo por hora | 🟡 | Motor de custo existente conferido; não foram inventadas tarifas. Teste 21. |
| 22 | Questionários por IA | 🟡 | Contexto do produto e salvamento após revisão conferidos; provedor real deve ser testado pelo usuário. Teste 22. |
| 23 | Resumo de acessos | 🟡 | Permissões, exigências por etapa e respostas conferidas. Teste 23. |
| 24 | Contratação completa | 🟡 | Rotas de compra/projeto/pagamento/geração conferidas; formulário real e sessão da Agência exigem teste manual. Teste 24. |
| 25 | Capital e créditos | 🟡 | Auditoria somente leitura: carteira da Agência corresponde ao extrato; existem carteiras antigas sem lastro completo no histórico. Não representar esses saldos como capital real nem ajustar sem origem/autorizações. Teste 25. |
| 26 | Pré cotação e validade | 🟡 | Validade de 72 horas; proteção de preço é regra distinta. Teste 26. |
| 27 | Modalidades e descontos por período | 🟡 | Usam configuração real do produto/período; não foram ativados planos ou descontos automaticamente. Teste 27. |
| 28 | Cadastro autônomo por Gabriel e Rose | ⏸ | Roteiro preparado; depende de contas autorizadas e realização por eles. Perfis atuais não foram promovidos a Admin/Master. |
| 29 | Produto real para testar | 🟢 | Produto 002 identificado; nenhum produto fictício foi incluído no catálogo real. |
| 30 | Gravar o cadastro e notas maiores | ⏸ | Orientação preparada; gravação precisa ser iniciada pelos participantes. |
| 31 | Sessão sem mediação | ⏸ | Depende de Gabriel/Rose, horário e acessos; não houve convite ou agendamento externo automático. |
| 32 | Gerar e encaminhar tarefas | 🟡 | Testes de servidor conferem IDs novos, regras, condições, liberação e isolamento. Execução real requer completar Líder/Nômade. Teste 32. |
| 33 | GitHub e deploy espelhado | 🟡 | Código d74183c e duas migrations publicados no QA; site/API e conteúdo das imagens conferidos. Backup e ensaio do novo espelho aprovados; substituição dos dados aguarda confirmação atual. CI amplo ainda falha nos mesmos 8 arquivos conhecidos; login por senha e teste visual pendentes. |
| 34 | Rever condições após testes | ⏸ | Fazer com os resultados de amanhã, sem mudar valores comerciais no escuro. |
| 35 | Qualidade das entregas para Cris | ⏸ | Ação operacional: revisar a entrega, os critérios e a qualificação com a equipe. Não se resolve com aprovação automática. |
| 36 | Créditos de Cris | ⏸ | Requer decisão sobre valor, motivo, saldo e mensalidades; nenhum crédito, estorno ou cobrança foi executado. |
| 37 | Manter ou retirar SDR | ⏸ | Decisão condicionada à viabilidade/qualidade. Produto não foi apagado ou despublicado automaticamente. |
| 38 | Solicitações de Dani | ⏸ | Lista concreta não consta da reunião; precisa ser fornecida para implementar sem inventar demandas. |

## Testes do cadastro

Use o navegador A. Base para os testes 1 a 23: Produto 002 → V2 Rascunho → Editar → Entrega → tarefa Alteração de Website ou Loja Virtual → etapa desejada.

### Teste 1 Líder

Abra Quem faz e quanto tempo leva. Escolha Líder e depois pessoa específica. Vinicius/Eron não devem aparecer. Sem líder cadastrado, a tela explica a ausência. Depois de cadastrar um usuário realmente Líder e habilitá-lo na área, repita a busca. Mudar para automático não deve continuar exigindo o nome antigo.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 2 Conferência

Clique Conferir etapa. Nome, esforço, custo, qualificação e aprovações aparecem como leitura, não como formulário. Clique Corrigir bloco, altere um texto de teste e volte à conferência: o valor deve continuar e ser identificado como não salvo.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 3 Remoção

Em Entregáveis desta etapa, use apenas um entregável de teste dispensável. Remova, confirme e salve a etapa. Reabra: não pode reaparecer no resumo ou bloquear pela aprovação antiga. Se já contratado, a exclusão deve ser recusada com explicação, sem apagar histórico.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 4 Arquivo reutilizado

Edite um entregável → Arquivo modelo → Escolher arquivo salvo. Pesquise, confira origem e use um arquivo já salvo. Salve o entregável e a etapa. Reabra e baixe o arquivo. Remover a referência do segundo entregável não pode apagar o arquivo usado no primeiro. Cancelar a escolha mantém o anexo anterior.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 5 Múltiplas contratações

Abra Entrega comercial → Modalidade → Permitir múltiplas contratações. Desligue e clique Salvar rascunho na própria janela. Feche/reabra: deve continuar desligado. Ligue e repita. O ícone de ajuda explica uma contratação vigente por produto/projeto, não um limite global para toda a empresa.

Depois de publicar conscientemente a versão de teste: desligado limita a quantidade a 1 e impede segunda contratação vigente do mesmo produto no mesmo projeto, inclusive por aditivo. Outro projeto não é bloqueado. Ligado permite novas compras. Retry do mesmo pedido não duplica.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 6 Organização das unidades

No navegador B, abra o produto publicado e selecione quantidade maior que 1, se a matriz permitir. Use Uma tarefa com todas as unidades e depois Tarefas separadas. Distribua as quantidades entre as tarefas; a soma precisa corresponder ao total. Não se escolhe pessoa aqui. O preço/prazo é recalculado pelo servidor. Após pagar, confira quantidade e IDs das novas tarefas, ainda sem lançá-las.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 7 Implantação de nova demanda

No Admin → Entrega comercial → Regras para compras em quantidade, marque Nova contratação inclui implantação somente se isso representar o serviço. Marque uma etapa de implantação como Só na primeira execução. Salve e publique quando a configuração estiver correta. A compra inicial e uma nova contratação do mesmo produto no projeto devem ter sua própria implantação. A renovação do contrato não deve repeti-la. Com a opção desligada, mantém-se o histórico de primeira execução do produto no projeto.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 8 Prazo por quantidade

No mesmo quadro comercial, cadastre um percentual de teste escolhido por você. Na etapa → Quem faz e quanto tempo leva, deixe o percentual específico vazio para herdar ou cadastre o percentual específico. Salve e reabra para conferir. O maior percentual ativo orienta a promessa comercial; cada etapa usa seu próprio percentual, ou herda o produto.

Exemplo apenas matemático: base 5 dias, lote de 3 unidades e 20% por extra resultam em 7 dias; três lotes de 1 não recebem esse acréscimo. O esforço de três unidades continua sendo o de três unidades, não o prazo do lote. Nenhum desses números foi colocado no Produto 002 automaticamente.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 9 Desconto progressivo

Entrega comercial → Desconto progressivo → Adicionar faixa. Cadastre faixas e percentuais aprovados para o teste; não use exemplos como preço comercial definitivo. Salve/reabra. Na compra, varie a quantidade abaixo, dentro e acima da faixa. Deve valer a maior faixa alcançada, sem somar descontos de faixas. Percentual negativo, 100%, quantidade mínima menor que 2 ou faixas repetidas devem ser recusados. Desconto que deixe preço abaixo do custo direto bloqueia a cotação.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 10 Remuneração

Depois de uma compra de teste paga, confira a referência de custo/repasse como Admin. O repasse humano acompanha quantidade e desconto por quantidade, sem reduzir as horas de esforço. Alterar a tarifa global depois não deve alterar a referência congelada desta contratação. Quando concluir e aprovar conscientemente a etapa de teste, deve haver um crédito, não dois ao repetir/reabrir. Não alterar a tarifa global só para experimentar sem registrar e restaurar a configuração aprovada.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 11 Divisão entre profissionais

Confira o texto da compra: ele fala de tarefas/lotes e explica que o executor será definido no lançamento. Anote se o controle está claro ou se prefere simplificá-lo. A decisão de retirar ou redesenhar essa divisão não foi presumida.

Resultado: ☐ passou ☐ falhou. Decisão:

### Teste 12 Aceite obrigatório

Na execução de teste, uma oferta normal sem resposta continua no rodízio. Somente uma oferta obrigatória sem recusa deve ser aceita automaticamente ao vencer o prazo configurado, normalmente 1 hora. Não altere o relógio do computador nem cadastros reais para acelerar isso. A recusa explícita deve continuar disponível.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 13 Rodízio

Com os profissionais de teste habilitados e online, ofereça uma tarefa de teste. Recuse com motivo em uma conta elegível e confira a próxima oferta. Sem ninguém elegível, deve existir aviso/escalonamento ao responsável, não atribuição a um administrador fingindo ser nômade.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 14 Recorrência

Compare primeira cobrança e renovação na simulação. Etapa só de primeira execução entra na implantação, não na mensalidade seguinte. Uma tarefa composta apenas dessas etapas não deve ressurgir com uma etapa substituta na renovação. Etapas recorrentes continuam gerando novos registros por ciclo.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 15 Visibilidade

Compare a mesma tarefa como Admin e comprador. Etapa interna não aparece nem pede aprovação ao cliente. Etapa externa respeita a visibilidade configurada. Um cliente de outro projeto não pode ler dados desta tarefa.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 16 Refação

Em uma entrega de teste que exige aprovação, reprove com motivo. A etapa deve retornar ao executor previsto, contar a rodada e usar o prazo de refação configurado. A etapa seguinte continua bloqueada até a aprovação necessária. Aprovação interna e do cliente não podem ser confundidas.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 17 Ajuda e linguagem

Passe o mouse nos ícones de ajuda dos novos campos e leia a conferência final. Deve ficar claro o que é prazo, esforço, preço, desconto e implantação. A explicação não deve usar uma pessoa administradora como líder. Registre o nome exato de qualquer campo que continue confuso.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 18 Checklist por IA

Na etapa → Checklist, orientações e evidência, peça sugestões para execução e qualificação/aprovação. Revise antes de aceitar. A sugestão não pode substituir ou salvar silenciosamente o cadastro. Se o provedor estiver indisponível, deve aparecer erro claro e o preenchimento manual continuar preservado.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 19 POP e evidência

Cadastre uma orientação curta e exija evidência em uma etapa de teste. Na execução autorizada, tente concluir sem anexar: deve bloquear e explicar. Anexe uma evidência válida e repita. Cliente só vê as orientações/evidências permitidas pela configuração.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 20 Entregáveis

Confira criação, edição, vínculo à etapa certa, ordenação e resumo geral da tarefa. Salve a etapa e reabra. Um entregável não pode ir para etapa de outra tarefa indevidamente, e um removido não continua pendente.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 21 Especialidade e custo

Leia especialidade, horas e valor/hora já cadastrados. Mantenha os valores reais se estiverem corretos. A estimativa deve corresponder à hora técnica e ao tempo; ausência de tarifa deve aparecer como pendência, não virar custo zero silencioso. Configuração global é compartilhada: altere apenas se esse for o objetivo consciente.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 22 Questionário por IA

Na tarefa, gere uma sugestão de questionário e revise perguntas, obrigatoriedade e ordem antes de salvar. Compre em teste e responda o briefing. Reabra para conferir respostas. Alteração posterior do modelo não deve reescrever as respostas/estrutura de contratos anteriores.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 23 Acessos

Confira o resumo de acessos da tarefa e os pedidos de cada etapa. Cadastre vínculos/permissões, nunca senhas no texto. A conexão solicitada deve respeitar as condições da seleção e só ser acessível aos perfis autorizados. Um acesso incompleto deve ter pendência clara.

Resultado: ☐ passou ☐ falhou. Observação:

## Testes de compra e operação

### Teste 24 Compra completa da Agência

1. Navegador B: entre como Lamego Academy e abra Catálogo.
2. Escolha Produto 002 publicado, suas opções, quantidade e modalidade. Adicione à cesta.
3. Finalizar compra: confira nome, seleção, preço, desconto e prazo.
4. Projeto: selecione um elegível ou Criar projeto. Nomeie conscientemente o projeto de teste.
5. Pesquise o consultor Teste vinculado à Lamego Academy; e-mail deve vir do cadastro. Pesquise o cliente vinculado. Se faltar, cadastre pelo botão próprio e retorne sem perder a compra.
6. Informe orçamento previsto e descrição apenas se necessários. Orçamento previsto é referência, não substitui preço dos produtos.
7. Salvar projeto deve fechar só a criação e selecionar o novo projeto no checkout, mantendo cesta/comissão/termos.
8. Teste primeiro quem paga = Agência, usando o método de teste/creditado conscientemente escolhido. Não use cartão real.
9. Como Admin, confira pedido, pagamento, projeto e tarefas. Elas devem ficar Para lançamento, sem executar automaticamente.
10. Em outra compra controlada, teste Cliente final paga por link, com comissão sobre total ou por produto. Cliente vê valor final; confirmar pagamento de teste uma vez deve creditar a comissão uma vez. Não clicar em pagamento real. Link sandbox não deve ser confundido com pagamento de produção.
11. Projeto já contratado recebe compra adicional pelo fluxo de aditivo. O checkout inicial continua exigindo projeto elegível, sem pedido anterior.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 25 Carteira e capital

No perfil da Agência, compare saldo com o extrato antes/depois da operação de teste. Não trate Allkoins, receita confirmada e capital da empresa como a mesma coisa. A auditoria local identificou saldos antigos com histórico insuficiente em duas carteiras; não fez ajuste financeiro. Essas diferenças precisam de origem/saldo inicial validado antes de correção. Carteira da Agência passou na conferência aritmética disponível.

Resultado: ☐ passou ☐ falhou. Decisão financeira:

### Teste 26 Pré cotação

Gere uma cotação e confira data/hora de validade: 72 horas. Salve/abra de novo e confirme preço/seleção. Não confunda validade de três dias com a proteção de preço já existente para alterações comerciais. Para testar expiração, não mude o relógio nem o banco real; os testes automáticos exercitam o prazo vencido em banco descartável.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 27 Modalidades

No cadastro, confira Avulso e Assinatura mensal. Só ofereça períodos efetivamente configurados. No catálogo compare o preço calculado para cada período e seu desconto informado. A compra deve conservar o período escolhido até o contrato/fatura; mensalidade recorrente não pode cobrar implantação outra vez.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 28 Gabriel e Rose

Prepare contas próprias, autorizadas para o cadastro, sem compartilhar a senha pessoal do Vinicius. Cada pessoa deve seguir o cadastro sem ajuda verbal, registrando onde hesitou. Não houve promoção automática de perfis de Agência/Company para Admin Master.

Resultado: ☐ concluído ☐ pendente. Observação:

### Teste 29 Produto escolhido

Confirme que o teste está no Produto 002 e que o catálogo real não ganhou um produto fictício dos testes automáticos. Não exclua os outros produtos reais.

Resultado: ☐ passou ☐ falhou. Observação:

### Teste 30 Gravação

Antes do cadastro autônomo, os participantes iniciam gravação no aplicativo usado pela equipe e selecionam o tamanho máximo/maior das anotações. Usem somente contas/dados autorizados e evitem gravar senhas. Guarde o link para rever as dificuldades.

Resultado: ☐ concluído ☐ pendente. Link:

### Teste 31 Sessão autônoma

Gabriel e Rose combinam o horário e executam sem mediação do Vinicius. Registrem o tempo, os campos que exigiram explicação e o ponto em que conseguiram salvar/concluir. Nenhum convite externo foi enviado automaticamente.

Resultado: ☐ concluído ☐ pendente. Observação:

### Teste 32 Lançamento e encaminhamento

Só comece depois de conferir as tarefas Para lançamento do teste 24 e completar as pessoas operacionais do preparo inicial.

1. Como Agência, abra Tarefas e selecione a tarefa da contratação, não a tarefa matriz do produto.
2. Confira briefing, acessos e condições exigidos. Abra o lançamento e revise antes de confirmar.
3. Como Líder de teste, acompanhe a etapa destinada ao líder. Como Nômade habilitado e online, acompanhe a oferta/etapa que realmente lhe pertence.
4. A etapa seguinte só abre após as regras anteriores; etapas paralelas configuradas podem começar juntas.
5. Conclua conscientemente a etapa de teste com evidência e as aprovações necessárias.
6. Compare IDs/histórico entre duas contratações: cada compra possui suas tarefas/etapas; a matriz não foi alterada. Etapa condicional desligada não pode nascer no pedido.
7. Repita a consulta e confira que não houve duplicação de tarefas, repasses ou aprovações.

Resultado: ☐ passou ☐ falhou. Observação:

## Ações depois dos testes

### Item 33 Deploy

Usuário autorizou deploy/espelho; código d74183c publicado no GitHub e QA, com duas migrations aditivas após backup. Código não transfere preenchimento do banco. Novo espelho privado ensaiado: 264 vínculos íntegros, 8 usuários/2 empresas/2 clientes/3 projetos/37 produtos, 131 anexos (QA tem 129). A confirmação atual de substituir os dados foi solicitada e ainda está pendente; não reutilizar a confirmação anterior. Depois de aplicado, comparar Produto 002/V1/V2, entregáveis, vínculo do cliente e anexos entre local e QA. CI amplo não está integralmente verde; detalhes no deploy-log. Não presumir pagamento real ou integrações configuradas pelo espelho.

### Item 34 Condições comerciais

Reunir os resultados 5 a 10 e 24 a 27. Aprovar percentuais, descontos, prazos e modalidade. Os campos foram disponibilizados, não preenchidos com taxas inventadas.

### Item 35 Qualidade para Cris

Revisar entrega reprovada, critérios de conclusão, evidências e responsável pela qualificação. Definir com a equipe o plano de correção e prazo autorizado. Não aprovar automaticamente uma entrega inadequada.

### Item 36 Créditos para Cris

Decidir valor, motivo, quem autoriza e relação com mensalidades em aberto. Conferir extrato antes de qualquer crédito/estorno. Não foi realizada movimentação de dinheiro.

### Item 37 SDR

Validar capacidade de execução, qualidade e viabilidade. Só depois decidir manter, suspender ou retirar a oferta. Não houve exclusão automática.

### Item 38 Dani

Fornecer a lista concreta de solicitações para transformar em itens verificáveis. A transcrição cita a lista, mas não enumera seu conteúdo.

## Extras para retestar

- Link interno sem sessão: abra o link direto de produto/tarefa autorizado em janela anônima, faça login e confira retorno ao mesmo endereço, não ao dashboard.
- F5 no entregável: digite sem salvar, recarregue e confira recuperação de formulário/blocos/rolagem. Referência de arquivo já enviado é recuperável; arquivo ainda apenas escolhido no computador não é.
- Overlay: compare o fundo escuro do bloco da etapa com o Painel Moldura. Sidebar e seus controles continuam acima e clicáveis; o restante do fundo não pode receber cliques.

## Registro técnico

Foram aprovados 267 cenários de servidor em 25 suítes direcionadas ao longo da revisão e 214 cenários de interface em 22 arquivos. As verificações de código e builds passaram. Isso não substitui a conferência visual nem o cadastro com as contas reais: os testes usam bancos descartáveis e as sugestões de IA foram exercitadas com provedor simulado.

Os resultados finais, limites e comandos de reprodução ficam em docs/deploy-log.md, entrada deploy-2026-10-28-2 e histórico da preparação, e o ponto de retomada em docs/RETOMAR-AQUI.md. Testes automatizados não substituem a conferência visual nem a experiência autônoma de Gabriel/Rose.
