# Instruções para agentes de IA

**Leia e siga a seção "Operação e deploy — LEIA ANTES DE QUALQUER TRABALHO" do [README.md](./README.md).**
Ela define os endereços reais, a regra código x dado, o protocolo de deploy, o registro em `docs/deploy-log.md` e o procedimento de produtos/limpeza de dados. Não duplique regras aqui: a fonte única é o README.

## ⭐ Retomar o trabalho ("bom dia", "vamos continuar", "leia os documentos")
**Leia primeiro [docs/RETOMAR-AQUI.md](./docs/RETOMAR-AQUI.md)**: onde paramos, o que está pronto/pendente, o que não pode ser feito sem ordem do usuário e como testar.

## Leitura por tipo de tarefa (atualizado em 2026-10-16)
- **Qualquer tarefa:** README.md → seção "Estado atual" e "Operação e deploy".
- **Qualquer coisa de produto (entender, cadastrar, alterar o editor, montar a ficha de um produto novo):** `docs/cadastro-produto-passo-a-passo.md` (cadastro item por item) e a seção "Cadastro de produtos (catalog2)" de `docs/regras-de-negocio.md`. O texto do ícone "i" de cada campo é a definição oficial: `apps/frontend/app/admin/produtos/novo-catalogo/field-help.ts`. `docs/produtos.md` é **legado**.
- **Retomar de onde paramos / o que está pronto ou pendente:** `documentos/Registro de Continuidade Produtos Allka.md` (fonte: `documentos/registro-continuidade.json`; regenerar com `node scripts/create_continuity_document.cjs`).
- **Quer que a IA monte o cadastro de um produto novo:** use o prompt pronto em `docs/prompt-codex-cadastro-produto.md` (modo leitura; entrega fichas em `entregas/produtos/<produto>/`).
- **Regras fixas do usuário:** o computador local é a referência; nada vai ao ar (`allka.store`, QA) nem sobe dado sem ordem explícita dele; ele não é técnico — fechar cada tarefa com resumo em linguagem leiga e a tabela de farol (🟢🟡🔴⏸); nunca inventar preço/hora/prazo; nunca pedir nem guardar senha de cliente.
