# Instruções para agentes de IA

**Leia e siga a seção "Operação e deploy — LEIA ANTES DE QUALQUER TRABALHO" do [README.md](./README.md).**
Ela define os endereços reais, a regra código x dado, o protocolo de deploy, o registro em `docs/deploy-log.md` e o procedimento de produtos/limpeza de dados. Não duplique regras aqui: a fonte única é o README.

## ⭐ Retomar o trabalho ("bom dia", "vamos continuar", "leia os documentos")
**Leia primeiro [docs/RETOMAR-AQUI.md](./docs/RETOMAR-AQUI.md)**: onde paramos, o que está pronto/pendente, o que não pode ser feito sem ordem do usuário e como testar. Funciona para qualquer IA.

## Documento de continuidade (Claude + ChatGPT)
Antes de continuar o cadastro de produtos, leia `documentos/Registro de Continuidade Produtos Allka.md` (mesmo conteúdo do .docx). Ao concluir um bloco, atualize `documentos/registro-continuidade.json` e rode `node scripts/create_continuity_document.cjs`.

## Para entender o produto e o cadastro (atualizado em 2026-10-16)
Leia `docs/cadastro-produto-passo-a-passo.md` (cadastro item por item) e a seção "Cadastro de produtos (catalog2)" de `docs/regras-de-negocio.md`. Mais detalhes por tipo de tarefa em [AGENTS.md](./AGENTS.md). Prompt pronto para a IA montar a ficha de um produto novo: `docs/prompt-codex-cadastro-produto.md`.

## Padrões globais (nomes fixos)
O usuário dá nomes a padrões de tela (ex.: **Painel Moldura**). Catálogo e como aplicar: [docs/padroes-globais.md](./docs/padroes-globais.md). Quando ele disser "transforme em <nome>", use a peça reutilizável indicada lá; quando disser "isso vira padrão", registre o novo padrão nesse arquivo.
