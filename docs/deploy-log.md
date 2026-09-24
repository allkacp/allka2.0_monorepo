# Registro de deploys

Mais recente primeiro. Cada entrada diz o que subiu, por pasta, e o que NÃO subiu.

## Pendente de deploy
(nada pendente — atualizar aqui a cada alteração feita depois do último deploy)

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
