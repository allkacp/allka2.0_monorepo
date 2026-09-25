# Registro de deploys

Mais recente primeiro. Cada entrada diz o que subiu, por pasta, e o que NÃO subiu.

## Pendente de deploy
- Backend: novo script `baseline-cleanup.ts` (limpeza do banco ao modelo limpo, em transação única) e workflows `prod-data-inspect.yml` / `prod-baseline-cleanup.yml` (manuais). Só rodam quando disparados; nao mudam o comportamento do sistema.

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
