# Memória de lançamento Allka 2.0 — setembro de 2026

## Uso obrigatório desta memória

Esta é a referência de continuidade do lançamento. Antes de abrir uma nova frente, recomendar deploy ou reordenar tarefas, leia este arquivo e a planilha fonte: `Roadmap Allka 2.0 — Lançamento.xlsx`.

## Data e regra de publicação

- **Meta interna de prontidão:** **30 de setembro de 2026**.
- **Primeira publicação online:** somente depois que todos os itens **VS1** abaixo passarem pelo fluxo real e pela homologação de produção.
- **VS2 não bloqueia o lançamento inicial.** Quando for exibido para o público, deve aparecer como **“Em breve”**, sem prometer funcionalidade que ainda não existe.
- A planilha não traz uma data de lançamento externa. Portanto, 30/09/2026 é o prazo de trabalho para concluir o VS1; a liberação pública depende do aceite dos critérios de saída.

## Ordem de foco até 30/09

1. **Eliminar bloqueadores técnicos reais de VS1**: execução real do nômade, cobrança recorrente, migração do catálogo, precificação persistida, consulta ao legado e suporte em produção.
2. **Fechar o catálogo comercial de lançamento**: 39 produtos reduzidos, variações, adicionais, combos, modelos de tarefa, preço e conteúdos operacionais.
3. **Homologar a jornada ponta a ponta**: login → catálogo → contratação/checkout → projeto → tarefas → aceite/entrega → financeiro/saque.
4. **Preparar operação e comunicação**: nômades habilitados, documentação, portfólio, tutoriais, site, apresentações, FAQ e campanha.
5. **Executar o portão de produção**: backup, migrations, persistência de uploads, saúde do VPS/containers, domínio, permissões e smoke test por portal.

## Bloqueadores conhecidos da planilha

Estes itens não podem ser tratados como prontos só porque existe tela ou protótipo:

| Item | Situação descrita na planilha | Decisão antes do go-live |
| --- | --- | --- |
| Desenvolvimento 5 | Precificação automatizada: tela existe; persistência real ainda precisa de confirmação. | Confirmar gravação, cálculo e leitura reais. |
| Desenvolvimento 6 | Migração dos 39 produtos: rollout em andamento para Empresa e Agência. | Concluir importação e validar vitrine nos dois portais. |
| Desenvolvimento 11 | Cobrança recorrente: não existe gateway automático. | Ligar gateway ou definir processo manual explícito, seguro e operacionalmente aprovado. |
| Desenvolvimento 20 | Execução pelo nômade: tela usa dados fixos, sem ligação real com API. | **Bloqueador crítico.** Conectar API e testar aceitar, recusar e entregar anexos. |
| Desenvolvimento 29 | Consulta ao legado: falta banco em produção. | Configurar acesso somente leitura e testar sem risco de escrita. |
| Desenvolvimento 30 | Canal de suporte: roda só em teste. | Publicar e testar abertura e acompanhamento de chamado. |
| Especialistas 1–4 | Estão em andamento. | Concluir antes da abertura comercial: descritivos, portfólio/vídeo e cobertura mínima de nômades. |

## Escopo técnico de lançamento — Time de Desenvolvimento (VS1)

| Nº | Área | Item | Prontidão técnica registrada |
| --- | --- | --- | --- |
| 1 | Catálogo e precificação | Catálogo de produtos (vitrine, busca, filtros, cesta) | Pronto |
| 2 | Catálogo e precificação | Cadastro de produtos, variações e adicionais | Pronto |
| 3 | Catálogo e precificação | Combos de produtos | Pronto |
| 4 | Catálogo e precificação | Modelos de tarefa vinculados a cada produto (etapas, checklist, briefing) | Pronto |
| 5 | Catálogo e precificação | Precificação automatizada por tarefa (comissões, taxas e impostos) | Em desenvolvimento; persistência real a confirmar |
| 6 | Catálogo e precificação | Migração completa do catálogo reduzido (39 produtos) para a vitrine nova | Em desenvolvimento; rollout em Empresa e Agência |
| 7 | Projetos e carteira | Criação, edição, cancelamento e arquivamento de projetos | Pronto |
| 8 | Projetos e carteira | Contratação e checkout do projeto | Pronto |
| 9 | Projetos e carteira | Carteira (saldo, extrato, projeções) | Pronto |
| 10 | Projetos e carteira | Contratação de planos de crédito | Pronto |
| 11 | Projetos e carteira | Cobrança recorrente automatizada | Não existe ainda; pagamento é manual após checkout |
| 12 | Projetos e carteira | Faturas, DRE e conciliação bancária | Pronto |
| 13 | Projetos e carteira | Saques de nômades e parceiros (aprovar, pagar via PIX) | Pronto |
| 14 | Tarefas e execução | Lançamento e geração automática de tarefas a partir dos modelos do produto | Pronto |
| 15 | Tarefas e execução | Gestor de tarefas com atribuição automática de líder e nômade por especialidade | Pronto |
| 16 | Tarefas e execução | Gestão de entregas: recompra, transferência, limite de alterações e taxa emergencial | Pronto |
| 17 | Tarefas e execução | Fila de qualificação: líder aprova ou devolve briefing | Pronto |
| 18 | Tarefas e execução | Aprovação/reprovação cadenciada com filtro de qualidade antes do cliente ver entrega | Pronto |
| 19 | Tarefas e execução | Assistente de IA para briefing de tarefas | Pronto; disponível em Admin e Agência |
| 20 | Tarefas e execução | Execução pelo nômade: ver disponíveis, aceitar, entregar anexos | Não existe ainda; tela sem ligação real com API |
| 21 | Acesso e operação | Login por portal, primeiro acesso e troca de senha | Pronto |
| 22 | Acesso e operação | Cadastro e gestão de empresas, agências e clientes | Pronto |
| 23 | Acesso e operação | Cadastro e aprovação de nômades | Pronto |
| 24 | Acesso e operação | Dashboards e relatórios por perfil | Pronto |
| 25 | Acesso e operação | Central de alertas automáticos | Pronto |
| 26 | Nômades e parceiros | Critérios de habilitação e níveis, com revisão trimestral | Pronto; validação prática depende do item 20 |
| 27 | Nômades e parceiros | Tutoriais e trilha de formação para nômades | Pronto |
| 28 | Nômades e parceiros | CRM de leads e projetos com distribuição, acompanhamento e comissão | Pronto |
| 29 | Suporte e migração | Consulta somente leitura à plataforma antiga | Em desenvolvimento; falta banco em produção |
| 30 | Suporte e migração | Canal de suporte para abrir e acompanhar chamados | Em desenvolvimento; hoje só em teste |

## Escopo operacional de lançamento — Equipe de Especialistas (VS1)

| Nº | Área | Item | Situação registrada |
| --- | --- | --- | --- |
| 1 | Documentação e habilitação dos produtos | Descritivos dos produtos-motor: regras, etapas, tempo, humano ou IA | Em andamento. Prioridade: Card Post, Blog/SEO, Edição de Vídeo, Tráfego Pago, Manutenção de Site e SEO. |
| 2 | Documentação e habilitação dos produtos | Descritivos dos produtos de sustentação | Em andamento. KV, E-mail Marketing, Pauta, Pitch Deck, Hospedagem, Site Institucional e Gestão de Comentários. |
| 3 | Documentação e habilitação dos produtos | Portfólio real e vídeo curto de execução dos produtos acima | Em andamento; alinhar tarefas com Caio. |
| 4 | Nômades | Captação por especialidade: mínimo de 3 nômades por tarefa | Em andamento. Começar em Design e Redação, depois Performance e Soluções Web. |
| 5 | Nômades | Critérios e teste prático de habilitação por tarefa | Não iniciado |
| 6 | Nômades | Aviso e re-habilitação dos nômades que já atendem na 1.0 | Não iniciado |
| 7 | Lançamento e comunicação | Vídeo de apresentação da Allka 2.0 | Não iniciado |
| 8 | Lançamento e comunicação | Tutoriais de cada portal | Não iniciado. Empresa, Agência, Nômade, Líder e Parceiro. |
| 9 | Lançamento e comunicação | Atualização do site com proposta nova e catálogo reduzido | Não iniciado |
| 10 | Lançamento e comunicação | Atualização do pitch institucional e de vendas | Não iniciado |
| 11 | Lançamento e comunicação | Campanha para a base atual de clientes e agências | Não iniciado. Comunicar prazos e mudanças no dia a dia. |
| 12 | Lançamento e comunicação | FAQ e central de dúvidas da transição | Não iniciado |

## VS2 — explicitamente fora do bloqueio do primeiro lançamento

Não deslocar tempo de VS1 para estes itens antes do aceite de lançamento: IA avançada (itens 31–34), conexões Meta/Google/WhatsApp/NF (35–38), notificações/chat/multiusuário/perfis internos (39–42), relatórios avançados e gamificação completa (43 e 46), cauda longa do catálogo e programa aprofundado de nômades (Especialistas 13–19).

Os itens técnicos 44 (Projetos Squad) e 45 (níveis de nômades/agências) já estão prontos e podem ser promovidos para VS1 somente se isso não aumentar o risco de homologação.

## Portão de saída: o que precisa estar verdadeiro para publicar

1. Os 30 itens técnicos VS1 estão funcionais em ambiente de produção ou possuem procedimento operacional aprovado e testado para a lacuna explicitamente aceita.
2. O item 20 tem API real, persistência e teste completo com nômade. Sem isso, não há abertura comercial que dependa de execução por nômades.
3. Os 39 produtos reduzidos aparecem corretamente no catálogo novo, com preço, variações, adicionais, tarefas e status comercial revisados.
4. Pelo menos os produtos-motor possuem descritivo operacional, portfólio/vídeo e capacidade mínima de três nômades habilitados por tarefa.
5. A jornada de contratação foi testada em todos os perfis aplicáveis, incluindo financeiro, geração de tarefas, qualificação, entrega e aprovação.
6. Migração/consulta do legado, suporte, backups, banco, uploads persistentes, domínio, containers e alertas foram verificados em produção.
7. Site, apresentações, tutoriais, FAQ e comunicação da virada estão prontos para a base atual.

## Orientação para próximos agentes e desenvolvedores

- Não declare um item pronto baseado apenas em tela, mock, dado fixo ou teste local.
- Preservar a separação: **VS1 é lançamento**; **VS2 é “Em breve”**.
- Ao concluir ou descobrir um bloqueio, atualizar a planilha de origem (Status, Responsável e Atualizado em) e esta memória quando a decisão mudar o escopo ou o portão de lançamento.
- Sempre validar a integração real e produção antes de recomendar publicação.
