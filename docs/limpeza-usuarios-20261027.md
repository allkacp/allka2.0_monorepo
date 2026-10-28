# Limpeza local de usuários — 27/10/2026

Autorização: usuário pediu manter IDs públicos antigos 1,2,4,5,7,9,11, excluir os demais e renumerar. Após explicar os vínculos impeditivos, confirmou também remover as duas agências QA, os projetos QA 953/954 e registros de chat dos usuários removidos.

## Resultado

| Antes | Agora | Nome | Login preservado |
|---|---|---|---|
| 1 | 1 | Vinicius Guardia | cp@lamego.com.vc |
| 2 | 2 | Rose Bonifácio | rose@lamego.com.vc |
| 4 | 3 | Valdério Santos | valderio@lamego.com.vc |
| 5 | 4 | Reynário Nunes | reynario@lamego.com.vc |
| 7 | 5 | Gabriel Franco | gabriel@lamego.com.vc |
| 9 | 6 | Eron Nascimento | eron@lamego.com.vc |
| 11 | 7 | Lamego Academy | contato@lamego.com.vc |

- 27 → 7 usuários; 20 removidos. Só `user_code` dos mantidos foi renumerado; IDs internos, senha/hash, permissões, vínculos e dados pessoais comparados e preservados.
- Removidas agências `qa-agency` e `qa-partner-agency` e projetos `proj_953`/`proj_954`, incluindo tarefas, etapas, dois pagamentos FakeSandbox, duas faturas e dependentes. Um registro de mensagem e um de participação no chat dos excluídos removidos.
- Perfis de nômade ligados aos usuários removidos foram inativados e perderam o vínculo de login pela FK normal; não se apagou seu histórico financeiro/operacional.
- Produtos e matrizes completos (incluindo versões, tarefas e etapas) comparados por hash antes/depois: idênticos. Carteiras comparadas por hash: idênticas. Nenhum responsável foi substituído silenciosamente.
- Lamego Academy e seus vínculos preservados. Projetos `proj_951 — Teste` e `proj_952` preservados. Demais empresas/cadastros fora desse escopo não foram limpos.
- Produtos 1 e 2 sinalizam líder específico indisponível até o administrador escolher o novo responsável ou mudar explicitamente a regra. Não houve alteração da matriz publicada.

## Segurança e conferência

1. Simulação do escopo fixo via `apps/backend/src/scripts/cleanup-users-20261027.ts`.
2. Backup anterior restaurado com sucesso na base temporária `allka_cleanup_rehearsal_20261027`; limpeza ensaiada e todos os invariantes passaram. Base de ensaio removida após conferência.
3. Backend pausado para impedir workers/requisições concorrentes. Novo backup completo antes da aplicação; servidor voltou ao final.
4. Aplicação em transação com FKs ligadas. Qualquer falha/invariante divergente teria desfeito a operação; nenhuma checagem de FK foi desabilitada.
5. API real `/api/admin/users?limit=100`: HTTP 200, total 7, códigos 1..7 corretos. Próximo código calculado por `generateNextUserCode`: `user_8`, sem criar conta. Dashboard stats: HTTP 200.
6. API do detalhe dos Produtos 1 e 2: HTTP 200, um aviso nominal em cada um. 95 relações de chave estrangeira do grafo afetado conferidas: zero órfãos.

## Recuperação

Backup final completo: `backups/limpeza-usuarios-autorizada-20261027-160715/allka.sql`.

- Tamanho: 1.708.913 bytes.
- SHA256: `3F52897E8A928AEE2DD1B869730A8B3173DA1770C4C65690DF9E4F6F60448247`.
- Há também backup anterior `backups/antes-limpeza-usuarios-20261027-155641/allka.sql`, cujo restauro foi usado no ensaio.
- Arquivos de banco estão ignorados pelo Git e ficam só no computador. Recuperação é possível pelo backup, mas restaurar o banco completo substituiria alterações posteriores: exigir nova autorização e novo backup antes de restaurar.

## Próximo passo

Usuário confere a lista. Se a sessão Admin Test foi encerrada, entrar com um usuário mantido (administrador Vinicius). Não recriar QA por seed. O roteiro anterior de contratação precisa ser refeito quando solicitado, pois os logins QA antigos não existem mais. Sem commit, push, deploy, espelho ou alteração em allka.store/QA.
