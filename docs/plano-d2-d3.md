# Plano D2 (tarefas internas para agências) e D3 (navegador seguro por tempo)

Data: 2026-10-06 · Tudo LOCAL, em blocos pequenos e testáveis, no mesmo padrão de hoje (migração aditiva com rollback, testes, registro de continuidade, farol).

## Ordem sugerida
1. **D2 primeiro** (menor risco, reaproveita tarefas/prazos/alertas/PLAC).
2. **D3 em 3 degraus**: (a) base de acesso por tempo + auditoria (sem navegador), (b) protótipo do navegador no servidor com 1 serviço, (c) endurecimento. Só avançamos de degrau com a sua conferência.

## D2 — Tarefas internas da agência
**Pronto quando:** a agência cria/atribui/acompanha as próprias tarefas internas, em quadro, com prazo e alertas; a administração enxerga e pode cobrar.
| Bloco | Entrega | Testes |
|---|---|---|
| D2-1 | Modelo de dados (tarefa interna da agência, responsável, prazo, status, comentários, checklist) + migração | integração |
| D2-2 | API com permissões por agência (quem vê/cria/edita; admin vê tudo) | integração |
| D2-3 | Tela da agência: quadro (A fazer / Fazendo / Feito) + lista + criar/editar + filtros | interface |
| D2-4 | Alertas de atraso e resumo no painel da agência; ligação com os passos PLAC (passo vira tarefa interna) | integração |
| D2-5 | Configuração: quem pode usar (Todas / Agency / Agency Partner / Company — mesma marcação) | integração |
Decisões com padrão sugerido: vale para **agências (comum e partner)**; sem pagamento/rodízio; visível à administração.

## D3 — Navegador seguro com acesso por tempo
**Pronto quando:** o profissional abre uma sessão do navegador (rodando no servidor) numa conta do cliente por tempo limitado, sem ver senha/cookie; tudo auditado; expira sozinho.
| Bloco | Entrega | Observação |
|---|---|---|
| D3-1 | **Autorização por tempo**: cliente/agência autoriza "quem, qual conta, quanto tempo" (reaproveita o grant das conexões) + janela de uso + expiração automática + auditoria | sem navegador ainda; já testável |
| D3-2 | **Cofre do perfil de navegador** (cookies/sessão cifrados, nunca devolvidos) + consentimento do cliente registrado | exige a chave do cofre configurada |
| D3-3 | **Protótipo do navegador**: contêiner Chromium isolado por sessão, exibido na plataforma, um serviço por vez, tempo ocioso, uma sessão por conta | roda no Docker local para provar o conceito |
| D3-4 | **Segurança de uso**: bloqueio de copiar/colar/baixar, marca d'água com o usuário, encerrar pelo admin, fila de espera | |
| D3-5 | **Tela**: abrir sessão, contador regressivo, encerrar; central de sessões ativas e histórico para a administração | |
| D3-6 | **Endurecimento**: limites de recurso, limpeza de contêiner, monitoramento, relatório de custo por sessão | antes de qualquer uso real |
Riscos que seguem abertos até testar com conta real: bloqueio de contas por login compartilhado (Google/Meta), 2FA, custo de servidor, termos/LGPD.

## O que preciso de você para começar (com o padrão que eu uso se não responder)
1. **Começar por D2** — padrão: sim.
2. **D2 vale para:** padrão = todas as agências (comum e partner).
3. **D3, primeiro serviço do protótipo:** padrão = um serviço de teste (não Google/Meta), para medir sem risco de bloquear conta.
4. **D3, quem usa o navegador:** padrão = nômades e líderes designados pela agência/administração.
5. **Servidor do D3:** o protótipo roda no Docker local; para uso real precisa de máquina própria (decidir depois do protótipo).
6. **Consentimento do cliente:** padrão = aceite explícito registrado na tela de conexão antes de guardar a sessão.

## Ritmo
Cada bloco entra no registro de continuidade e no farol, com testes e resumo em linguagem simples. Nada é publicado; entra no espelho final (A12) junto com o resto.
