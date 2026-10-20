# Relatório — consistência da aprovação da etapa e dos entregáveis

## Problema confirmado

O Produto 1 tinha a Etapa 2 no comportamento legado de aprovação da própria etapa e, ao mesmo tempo, o entregável **Plano estratégico inicial de mídia paga** marcado para aprovação. Isso deixava duas fontes de bloqueio.

## Regra implementada

A etapa passa a validar os quatro modos de aprovação. Aprovação por entregáveis exige pelo menos um item selecionado; os outros modos não aceitam entregáveis bloqueantes. No modo por entregáveis, a etapa só avança após a aprovação de todos os itens selecionados e não aceita uma decisão duplicada da própria etapa.

## Produto ID 1

Etapa 2: **Analisar o cenário e elaborar o plano mensal de mídia**.

- Aprovação por entregável.
- Entregável selecionado: **Plano estratégico inicial de mídia paga**.
- Prazo do cliente: **16 horas úteis**.
- Prazo de refação: **8 horas úteis**.
- Pedido de ajuste para o executor da etapa.
- Etapa não interna; execução por etapa; sem qualificação.
- Próxima etapa bloqueada até a aprovação do plano.

## Migração e preservação dos dados

Backup local criado em `backups/aprovacao-entregaveis-20261019-0940/`. IDs, etapas e entregáveis foram preservados. A conferência posterior encontrou uma única ocorrência do plano e uma única aprovação selecionada na Etapa 2. Nada foi publicado ou enviado para ambiente externo.

## Estados do rascunho

O selo sem pendências foi substituído por **Rascunho pronto para concluir**. A tela também apresenta conflitos de aprovação de maneira acionável.

## Testes

- Compilação do backend e do frontend concluída sem erro.
- Teste unitário de integridade da etapa: 10 verificações aprovadas.
- Teste de integração iniciado em banco temporário descartável, separado do banco local de trabalho.
- Conferência direta no banco local: modo `deliverables`, 16 h, 8 h, não interna, sem qualificação, um entregável aprovado configurado e sem duplicidade.

## Validação visual

Teste manual pendente no editor local: abrir a Etapa 2, conferir o resumo, alternar os tipos de aprovação e confirmar que o conflito mostra as ações de corrigir. O teste de tela completo depende do ambiente de interface local que já possui uma falha anterior de resolução de componente nos testes automatizados.

## Arquivos alterados

- `apps/backend/src/lib/stage-engine.ts`
- `apps/backend/src/routes/project-tasks.ts`
- `apps/backend/src/routes/catalog2-admin.ts`
- `apps/frontend/app/admin/produtos/novo-catalogo/client-approval.tsx`
- `apps/frontend/app/admin/produtos/novo-catalogo/step-completeness.ts`
- `apps/frontend/app/admin/produtos/novo-catalogo/product-editor.tsx`
- `apps/frontend/app/admin/produtos/novo-catalogo/step-row-universal.test.tsx`
- `docs/regras-de-negocio.md`

## Estado final

Correção local aplicada; nenhum produto foi publicado.

Correção concluída. A Etapa 2 utiliza aprovação pelo entregável Plano estratégico inicial de mídia paga, sem dupla aprovação, e está pronta para o teste manual.
