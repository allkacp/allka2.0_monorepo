# Regressão final — 92 suítes de integração do backend

Executada em 2026-10-01 (17:26 → 18:30) no estado exato que será commitado (nenhuma alteração de código depois da execução).

**Total: 1290 testes — 1279 passam, 11 falham, em 7 suítes (todas pré-existentes). Nenhuma falha nova.**

| Suíte | Resultado | Situação |
|---|---|---|
| alert-images-schedules | pass=24 fail=1 | #11 usa a data fixa 2026-08-30 (já passou). Mesma falha no código original (HEAD). |
| catalog2-catalog | pass=26 fail=1 | 3b ('[TESTE LOCAL]' na listagem). Pré-existente, comprovada contra o código original na rodada anterior. |
| catalog2-import | pass=11 fail=2 | #25/#30. Pré-existentes, comprovadas contra o código original na rodada anterior. |
| catalog2-product-history | pass=7 fail=1 | #1 ('Situação alterada' × 'Status alterado'). Pré-existente, comprovada na rodada anterior. |
| delete-security | pass=26 fail=1 | #8 espera 409 e recebe 204. Mesma falha no código original (HEAD). |
| project-admin-responsible | pass=18 fail=3 | Pré-existentes, comprovadas na rodada anterior. |
| project-edit-admin-responsible | pass=13 fail=2 | Pré-existentes, comprovadas na rodada anterior. |

As outras 85 suítes passam com 0 falhas (inclui connections 38/38, seed-qa-demo 6/6, catalog2-universal-structure 22/22, catalog2-implementation-billing 12/12).

## Comparação real com o código original (HEAD b9a1033, checkout descartável com cliente Prisma e base descartável próprios)

| Suíte | Resultado original | Resultado atual | Mesma mensagem | Mesma causa | Regressão nova? |
|---|---|---|---|---|---|
| delete-security | 26 passam / 1 falha (#8: actual 204, expected 409) | 26 passam / 1 falha (#8: actual 204, expected 409) | sim | sim (relação ProjectProduct.product é onDelete SetNull também no original; a exclusão não é bloqueada) | não |
| alert-images-schedules | 24 passam / 1 falha (#11/14: actual null, expected 2026-08-30T13:00:00.000Z) | 24 passam / 1 falha (#11/14: idem) | sim | sim (data fixa no passado) | não |
