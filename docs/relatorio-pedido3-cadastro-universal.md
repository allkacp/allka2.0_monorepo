# Relatório — Pedido 3: cadastro universal de produtos (2026-09-30)

Tudo foi feito **só no ambiente local**. Nada foi para servidor, produção, catálogo real ou checkout real. Nenhum produto foi criado, preenchido, publicado ou ativado. O produto "Gestão de Tráfego Pago" não foi tocado.

## 1. O que foi melhorado sem alterar dados

- As mudanças de banco são só aditivas (colunas novas com valor padrão seguro e tabelas novas). Cada uma foi testada antes numa **cópia** do banco local, com comparação de contagens, e só então aplicada.
- **Prova 1 — dados existentes:** 13 grupos de tabelas (produtos, versões, tarefas, etapas, modelos de tarefa e de etapa, variações, opções, adicionais, períodos, preços globais, especialidades, projetos, usuários) têm o mesmo "carimbo" (hash) antes e depois do pedido.
- **Prova 2 — preço e prazo:** o preço e o prazo das 47 versões existentes (36 produtos) foram calculados antes e depois. O resultado é idêntico, byte a byte.
- Contagens no banco local: 36 produtos, 47 versões, 145 tarefas, 147 etapas, 107 modelos de tarefa, 109 modelos de etapa, 35 variações, 67 adicionais. Nada mudou.
- IDs de modelos (Tarefa #ID, Etapa #ID) continuam permanentes; nada foi apagado ou renumerado.
- Versões já publicadas não obedecem às regras novas de modalidade de venda (campo `sale_modes_enforced` = falso nelas). Só versões novas ou clonadas obedecem.

## 2. Implementado integralmente (tela + regra + execução + teste)

1. Campos operacionais de tarefa e etapa com visibilidade por campo e por perfil.
2. Designação de qualificador, filtro de ciclo nos modelos, validação de condições e controles de variação (uma/várias/quantidade) e de adicional.
3. Revisão com efeito real (situação própria "Aguardando revisão").
4. Entregáveis e anexos estruturados, e dependências (por entregável aprovado, por tipo de ciclo, dentro do mesmo produto).
5. Contratação: avulso, assinatura mensal contínua (uma fatura por mês), "só em pacote", e os seis estados de assinatura.
6. IA: perfis autorizados, três modos, registro completo, saída rastreável, encaminhamento ao humano.
7. Visibilidade por perfil do fluxo, histórico, dependências e continuidade; aviso de mudança de acesso pelo cliente.
8. Custos: IA pelo perfil, tempo e custo de revisão, demonstrativo por tarefa, custos realizados.
9. Dez cenários ponta a ponta.

## 3. Parcial

- **IA "executa sozinha":** roda quando alguém autorizado aciona (botão/rota). Não existe agendador que dispare sozinho quando a tarefa é liberada. A chamada real ao Gemini não foi exercitada nos testes (usa-se um modelo simulado, como combinado).
- **Simulação de custos:** continua valendo a "Simulação para teste" já existente (agora com IA e revisão) e a previsão de custo por execução no cadastro da IA. Não criei um simulador separado de cenários.
- **Prints para auditoria:** a ferramenta de navegador não estava disponível nesta sessão. As telas foram validadas por compilação e por testes da API, mas não tenho capturas de tela.
- **Períodos trimestral, semestral e anual:** prontos e travados (como decidido em 18/09). O teste confirma que a cotação trimestral é recusada. A liberação depende da chave de ambiente `CATALOG2_ENABLE_MULTI_PERIOD_CONTRACTS`.

## 4. Não implementado

- Cobrança real em gateway (segue o gateway de teste "sandbox").
- Agendador automático da IA autônoma.
- Ação irreversível por IA (por decisão: a IA só escreve texto).
- Migração de dados antigos para os campos novos (campos novos nascem vazios, de propósito).

## 5. Telas e campos do cadastro universal

Editor de produto, em passos:

- **1. Informações:** título, resumo, descrição, modalidades (avulso, recorrente mensal, implementação inicial e sua regra, bloqueio da operação até concluir a implantação, venda "somente em pacote"), prazo comercial base, pré-requisitos do produto (agora permitem esperar uma tarefa do próprio produto).
- **2. Entrega:** tarefas e etapas; prazos e condições.
- **3. Classificação e opções:** classificação, variações (uma, várias, quantidade; ativa; padrão; ordem; texto de ajuda), opções, adicionais (custo, padrão, ativo, vínculo informativo).
- **4. Custos e preço:** memória de cálculo com IA por tarefa, revisão por tarefa e demonstrativo por tarefa.
- **5. Revisão e publicação:** pré-visualização como o cliente vê, publicação e versões, histórico.

Telas novas de execução: cartões de orientações, revisão, entregáveis, IA, situação/acessos/continuidade (no painel da tarefa, na tela do nômade e na do cliente) e cartão de assinaturas em Faturas da empresa.

## 6. Campos completos de tarefas e etapas

**Tarefa:** nome, descrição, executor (humano, IA, humano ou IA), especialidade, tempo, condicional, tipo de ciclo (implementação, recorrente, revalidação, avulso, sob demanda), regra de repetição, continuidade do executor, regra de acessos (e dias de revalidação), exige revisão (revisor, tempo e especialidade da revisão), exige qualificação (qualificador designado), exige aprovação do cliente; guia operacional (objetivo, instruções, entradas, saída esperada, critério de aceite, riscos, cada um com "quem vê"); entregáveis; configuração de IA.

**Etapa:** nome, descrição, tempo, especialidade, finalidade, executor, critério de conclusão, "só na 1ª execução", "dispensável se for o mesmo executor", instruções, evidência obrigatória (com dica) e visibilidade.

**Entregável:** nome, tipo (arquivo/link/texto/registro do sistema/outro), quem envia (executor/líder/agência/cliente/sistema), etapa vinculada, obrigatório, exige aprovação, quem vê.

## 7. Regras de execução humana, IA e humano + IA

- **Humano:** fluxo de sempre.
- **IA (perfil autorizado, ativo):** três modos.
  - *Executa sozinha:* executa a etapa aberta, grava a saída como entregável rastreável, conclui a etapa; a tarefa vai para a revisão humana (salvo se o cadastro desligar).
  - *Rascunho:* a IA escreve; um humano autorizado adota (podendo editar) ou descarta.
  - *Auxilia:* só sugere; nada é criado nem concluído.
- **Quem aciona:** administração; líder e/ou executor da tarefa, conforme o perfil de IA.
- **Registro de cada execução:** instruções, contexto, entradas (com senhas redigidas), saída, tokens, custo, data, versão do prompt, perfil, modelo, modo, decisão humana.
- **Falta de informação ou erro:** vira "encaminhada", o líder é avisado, a etapa não é concluída.
- **Nunca** ação irreversível: a IA só escreve texto.
- Publicar uma tarefa de IA exige perfil de IA ativo.

## 8. Regras de revisão, qualificação, aprovação e devolução

Ordem: execução, **revisão** (nova), qualificação, aprovação da agência, aprovação do cliente, concluída. Só o revisor designado (ou administração) decide. Reprovar ou pedir ajustes exige comentário, volta ao executor e não consome as alterações grátis do cliente. A cada nova entrega há nova rodada de revisão. Tempo gasto na revisão é registrado. O cliente não enxerga a revisão interna (vê "em execução").

## 9. Regras de recorrência, implantação, continuidade e ciclos

- Assinatura mensal contínua: nasce no pagamento do 1º mês; a fatura do mês seguinte sai 5 dias antes do fim do período; as tarefas do mês só nascem quando a fatura é paga.
- Estados: ativa; aguardando renovação (fatura emitida); inadimplente (vencida e com 3 dias de tolerância); pausada (devolve o tempo já pago ao retomar); cancelada (vale até o fim do mês pago); encerrada.
- Implantação não se repete nos meses seguintes; a operação espera a implantação quando o produto pede.
- Continuidade do executor (permitida/recomendada/obrigatória): o cliente escolhe manter ou redistribuir; contexto do ciclo anterior preservado.

## 10. Acessos, ativos e revalidação

- O cliente informa mudança de acesso (novo identificador e/ou explicação, nunca senha): o ativo volta para "revalidar", o contrato pede revalidação, o histórico registra, o líder é avisado; a equipe revalida.
- Troca de executor reabre a validação quando a regra do produto é "revalidar se houver troca de executor".
- Só a equipe (líder/administração) valida; o cliente nunca valida o próprio acesso.

## 11. Dependências, pacotes, entregáveis e anexos

- Dependência por entregável específico (só libera quando **aprovado**, não basta enviar), por tarefa, etapa, aprovação, ativo e produto.
- Regra vale para todos os ciclos ou só implantação, rotina ou revalidação.
- Regra entre tarefas do mesmo produto (resolve a tarefa irmã da mesma contratação e do mesmo ciclo).
- Pacote: dois ou mais produtos no mesmo pedido; "só em pacote" exige todos os produtos do pacote ativo no mesmo pedido.
- Entregável obrigatório trava a conclusão da etapa; envio por tipo (link/texto), nunca senha.

## 12. Variações, adicionais, condições, preço e prazo

- Variação: uma, várias ou quantidade (quantidade multiplica dias; valor fixo e percentual).
- Adicional com custo e prazo. Condições só aceitam chaves reais de opção/adicional.
- IA: preço por mil tokens e custo fixo vêm do **perfil**; sem perfil vale o preço da própria tarefa.
- Revisão: minutos × valor/hora da especialidade de revisão; tarefas sem tempo de revisão seguem o percentual de sempre.
- Nada de custo interno, perfil de IA ou minutos de revisão chega ao cliente.

## 13. Resultado dos testes

**Suítes novas (todas passando):** campos operacionais 6/6; revisão 6/6; entregáveis 6/6; assinaturas e modalidades 8/8; IA 7/7; visibilidade 4/4; custos 6/6; **cenários ponta a ponta 10/10**.

**Suítes antigas conferidas:** recorrência/ciclos/continuidade/ativos/pacotes/modelos/qualificação, admin, inativação, períodos, proteção de preço, simulação de preço, histórico 71, release/rotação de tarefas, alertas de tarefa, financeiro, arquivamento — passando.

**Corrigidas por estarem desatualizadas (tarefa de teste sem etapa com especialidade/horas, regra que já existia):** builder, catálogo, checkout, inativação, períodos, proteção de preço (2), notificações, histórico 72, dependências de tarefa, ciclos de entrega.

**Falhas que já existiam antes do pedido (mesma contagem no código de antes), sem relação com estas mudanças e não alteradas:** frontend 109 testes em 9 arquivos; backend: importação (2), histórico do produto (texto da mensagem), exclusão de produto vinculado (1), responsável admin do projeto (3 + 2).

Compilação do backend e do frontend: sem erros.

## 14. Prints para auditoria

Não gerados (navegador indisponível na sessão). Telas para o usuário conferir, na ordem do roteiro sugerido: editor de produto (tarefa → guia, revisão, entregáveis, IA), prévia como cliente, memória de cálculo (IA/revisão/demonstrativo), painel da tarefa (entregáveis, IA, revisão, situação/acessos/continuidade), tela do cliente (tarefas e faturas/assinaturas), tela do nômade.

## 15. Decisões de negócio pendentes

1. "Só em pacote" exige o pacote ativo **inteiro** no pedido. Confirmar se basta ter outro produto do pacote.
2. Fatura da assinatura sai 5 dias antes do fim do mês; tolerância de 3 dias antes de marcar inadimplente (valores padrão escolhidos por mim).
3. Cliente e agência continuam vendo o nome do executor anterior na escolha de continuidade (comportamento antigo). Ocultar?
4. IA autônoma: rodar automaticamente quando a tarefa for liberada (agendador) ou só quando alguém acionar?
5. Produtos já publicados seguem sem aplicar avulso/recorrente/"só em pacote"; aplicar só ao republicar versão nova — confirmar.
6. Liberação de trimestral/semestral/anual (continuam travados).
7. Valor/hora da especialidade de revisão: usa a especialidade de revisão da tarefa ou a da própria tarefa.

## 16. Confirmação

**A estrutura está pronta para receber o preenchimento do primeiro produto.**

Ressalvas de honestidade: as telas foram validadas por compilação e por testes da API (sem prints), e há falhas antigas de testes que não tiveram relação com este pedido. Nada foi enviado ao servidor. Aguardando a próxima instrução.
