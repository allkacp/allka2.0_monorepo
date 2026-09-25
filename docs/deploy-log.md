# Registro de deploys

Mais recente primeiro. Cada entrada diz o que subiu, por pasta, e o que NÃO subiu.

## Pendente de deploy (local, ainda NÃO subiu)
- **Frontend** `apps/frontend/app/admin/produtos/page.tsx` — Cadastro de Produtos: cabeçalhos clicáveis para ordenar (#, Produto, Categoria, Preço, Status; clica de novo inverte) e fundo lilás para diferenciar do Catálogo de Produtos.
- **Backend** `apps/backend/src/routes/catalog2-admin.ts` — novas ordenações da listagem de produtos (por # de importação, categoria, status e preço; preço usa o mesmo valor mostrado na coluna) e desempate estável.
- Nenhuma migration nem dado envolvido.

## Já no ar (deploy de 2026-09-25)
- Backend: script `baseline-cleanup.ts` e workflows manuais `prod-data-inspect.yml` / `prod-baseline-cleanup.yml` (só rodam quando disparados).

## deploy-2026-09-24-1 (commits 6771aba → e598977)
**Backend (`apps/backend`)**
- Contratação do admin em nome de empresa/agência (carteira allkoin, brinde, link de pagamento) com motivo obrigatório e aviso ao dono da conta.
- Erros de pagamento sempre com motivo em português; correção de vínculo empresa/agência nas contas de teste.
- Banco (migrations aplicadas no servidor): grupos de entrega catalog2, número sequencial de produto, controles de roteamento de tarefas, link de pagamento em fatura, sincronização do schema.
**Frontend (`apps/frontend`)**
- Tela de conclusão da contratação (link do projeto, copiar link, fatura em PDF), badge "Em breve" no Legacy, ajustes de layout do catálogo/cesta/checkout, estatísticas do topo ao lado da busca.
**Docs/infra**
- Removidas referências aos endereços antigos; criados `CLAUDE.md` e este registro.
**NÃO subiu (dados):** a limpeza local para 16 usuários. O banco do servidor continua com os dados antigos até um procedimento de limpeza específico ser autorizado.

## Problemas conhecidos (não bloqueiam deploy)
- CI (`ci.yml`): testes de frontend desatualizados depois da reforma de telas (ex.: catálogo/produtos: "Serviço Demo", "Todos os pilares", "a partir de BRL 300.00", contagens 36/162). Os testes esperam o layout antigo; precisam ser reescritos para o layout novo. O deploy roda independente do CI.
- Limpeza do banco do servidor: FEITA em 2026-09-25 (1061 -> 16 usuários; backup no servidor: backups/allka-pre-cleanup-20260925T000121Z.sql.gz).
- Produtos: a fonte da verdade é o computador LOCAL (decisão 2026-09-25, revisada). O usuário edita local e pede "sobe os produtos"; não existe fluxo de puxar do servidor. Ver README, seção Dados.
- Quando o usuário disser "terminei todos os produtos": apagar o produto de teste [TESTE LOCAL] (local e servidor), com backup + simulação + confirmação. Ver README, seção Dados.
