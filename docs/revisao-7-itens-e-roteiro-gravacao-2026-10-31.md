# Revisão dos 7 ajustes do cadastro + roteiro da nova gravação (31/10/2026) — SOMENTE LOCAL

> Pedido do usuário (31/10): corrigir os sete pontos levantados na avaliação do vídeo do SEO ID 003, registrar tudo para o Codex continuar
> e preparar o roteiro para **refazer a demonstração do cadastro** antes do produto com ciclos.
> **Nada foi publicado, commitado, enviado ao GitHub, ao QA ou à allka.store. Nenhum dado do banco foi alterado nesta rodada.**
> Todas as mudanças são de tela (frontend). O servidor (backend), o banco e as migrações não mudaram.

Endereço local: `http://localhost:8082` · Produto teste: `/admin/cadastro-produtos/<ID>?editor=teste`

> **2ª rodada (31/10, tarde) — validação técnica pedida pelo Codex:** testes de SALVAMENTO dos formulários alterados (API simulada),
> caso de **5%** com gravação real em banco descartável, classificação das falhas antigas com evidência, typecheck + build.
> Só arquivos de TESTE mudaram nesta rodada (nenhum código de tela/servidor). Detalhes na **seção 5**. Nenhum dos 7 itens foi aprovado pelo usuário ainda.

---

## 1. Revisão final dos sete itens

| # | Item | O que mudou | Arquivos | Teste automático | Visual (navegador) | Aprovação do usuário |
|---|---|---|---|---|---|---|
| 1 | IA contextual (público-alvo e textos comerciais) | Contexto das tarefas/etapas mais rico (nome, descrição, critério, quem recebe, entregáveis — sem horas/preço/pessoas/acessos). Bloco "Contexto que a IA lê (não altera)" separa **Quem pode ver/contratar (permissão)** de **Público-alvo (texto comercial)**. Atalho "Sugerir público-alvo e textos comerciais" (só propõe os vazios; revisão + confirmação continuam) | `product-ai-inventory.tsx`, `catalog2-product-ai-chat.tsx`, `product-editor.tsx` | `ai-audience-context.test.tsx` (3) + IA existentes (12) ✅ | ⏸ não conferido (não houve chamada real à IA) | 🟡 pendente |
| 2 | Status no cabeçalho | Produto teste mostra **um** status principal (ex.: "Rascunho v2" ou "Ativo"); clique abre versão, publicação, catálogo e a troca de status comercial de sempre | `product-editor.tsx` (`HeaderStatusSummary`, `headerStatusSummary`) | `header-status-summary.test.ts` (3) + rodapé/status (2) ✅ | ✅ Produto 3: "Ativo" + detalhes conferidos | 🟡 pendente |
| 3 | Botões e salvamento | Produto teste: em edição o avançar vira **"Salvar e continuar: <próximo passo>"** (já gravava o pendente; erro mantém passo/texto). "Salvar rascunho" fica secundário (grava e fica). No último passo some o avançar e **Publicar** é a única principal. Editor atual intacto | `product-editor.tsx` (rodapé) | `product-editor-typing.test.tsx` (+2) ✅ | ✅ Produto 3 em leitura mostra "Passo 2" (só navegação); edição não aberta | 🟡 pendente |
| 4 | Valor/hora do especialista | Na etapa o valor/hora é **referência somente leitura** + link "Ver na Precificação" (nova aba). Removido o "Editar valor/hora" que gravava a tarifa global pela etapa. Tarifa e rota da Precificação intactas | `product-editor.tsx` (bloco 2 da etapa; removido `SpecialtyRateRow`) | `step-row-universal.test.tsx` (+1) ✅ | ⏸ visto só em leitura | 🟡 pendente |
| 5 | Entregáveis × aprovação | **Causa real encontrada:** entregável novo nascia com "Aprovação do cliente" marcada; o servidor recusa entregável com aprovação quando a etapa não aprova "por entregáveis" (inclui tarefa sem execução por etapa — caso do SEO — e etapa interna). A tela só checava um caso. Agora: entregável novo nasce sem aprovação quando a etapa não permite; o campo explica e não deixa marcar; aviso no bloco Entregáveis com os nomes e botões explícitos ("Desmarcar a aprovação…" / "Usar aprovação por entregáveis"); pendência antes de salvar. Regra do servidor intacta | `step-completeness.ts`, `step-deliverables-editor.tsx`, `deliverable-modal.tsx`, `product-editor.tsx` | `step-row-universal.test.tsx` (+3; 5 antigos ajustados porque montavam cadastro que o servidor recusa) ✅ | ⏸ não reproduzido em rascunho real | 🟡 pendente |
| 6 | Preço e prazo das variações | O resumo "Preço/Prazo/Etapas/Entregáveis" parecia campo mas não editava; agora cada item **abre o campo certo** (tipo já escolhido). Impactos em português ("Prazo: +2 dia(s)"), botão "Adicionar" visível, explicação **calculado** (horas × valor/hora) × **informado** (valor fixo/percentual/dias) e aviso de cobrança dobrada. Em versão publicada continua só leitura (bloqueio legítimo) | `product-editor.tsx` (`OptionImpactSummary`, `EffectList`, `effectHumanLabel`, `VariationOptionRow`) | `option-impacts-editing.test.tsx` (4) + variações (7) ✅; servidor `catalog2-universal-v2-pricing` 29/29 ✅ | ✅ Produto 3 (leitura): "Preço: Calculado pelas horas extras" | 🟡 pendente |
| 7 | Desconto mensal 5% | Servidor **já aplicava** o desconto no Mensal (suíte `catalog2-periods` 8/8 ✅, cenário de 5%). Divergência era a tela: o ⓘ do Mensal dizia "sem desconto de período". Agora mostra a conta **base − % = total** em cada período autorizado e explica que o desconto vale só sobre a mensalidade (implantação não tem desconto); página do produto do cliente mostra "Mensalidade sem desconto" + "−N% na mensalidade". Fórmula do servidor intacta | `product-periods-inline.tsx`, `components/catalog2-product-detail.tsx` | `product-periods-inline.test.tsx` (+3) ✅ | ✅ Produto 2: "R$ 292,85/mês − 2% = R$ 286,99/mês" etc. | 🟡 pendente |

**Faltam 0 de 7 para implementar; 7 de 7 aguardam teste/aprovação do usuário.**

**Farol após a 2ª rodada (31/10, tarde):**

| # | Automático | Salvamento | Visual | Usuário | Farol |
|---|---|---|---|---|---|
| 1 IA | ✅ | ✅ simulado (contexto, proteção dos preenchidos, prévia, confirmação, sem gravar sozinha) | ⏸ sem chamada real | ⏸ | 🟡 |
| 2 Status | ✅ | — (só visual) | ✅ leitura | ⏸ | 🟡 |
| 3 Salvar e continuar | ✅ | ✅ simulado (sucesso avança 1 gravação; clique duplo não duplica; erro mantém passo/texto; tentar de novo grava) | ✅ leitura | ⏸ | 🟡 |
| 4 Valor/hora | ✅ | ✅ simulado (não grava tarifa) + banco local sem mudança | ⏸ só leitura | ⏸ | 🟡 |
| 5 Entregáveis | ✅ | ✅ simulado (novo → salvar → recarregar → alterar → cancelar; clique duplo não duplica) | ⏸ não reproduzido em V2 real | ⏸ | 🟡 |
| 6 Variações | ✅ | ✅ simulado (atalho Preço → salvar 1 vez → reabrir com retorno do servidor) | ✅ leitura | ⏸ | 🟡 |
| 7 Desconto 5% | ✅ | ✅ **REAL em banco descartável** (configurar → recarregar → cliente → cotação → pagamento → renovação) | ✅ leitura (Produto 2, 2%) | ⏸ | 🟡 |

Legenda: ✅ feito · ⏸ falta · 🟡 aguarda o usuário. "Simulado" = API falsa no teste (prova o que a tela envia e como reage; **não** prova gravação no banco).

## 2. Outros achados da gravação (separados dos 7)

| Achado | Situação |
|---|---|
| Resumo da tarefa SEO R$595 × composição R$510 | 🟢 **Corrigido**: o resumo somava a 1h do Líder; agora segue a regra do servidor (Líder/equipe interna sem custo). Produto 3 mostra **R$ 510,00**. Teste `summary-cost.test.ts` (2). Preço cobrado não mudou |
| Rótulo "Quantidade de campanhas" no simulador | 🟢 **Corrigido** para "Quantidade contratada" (não existe campo de unidade por produto; texto era fixo para todos) |
| Nenhum Líder ativo para lançamento | ⏸ **Não feito por regra**: não cadastrar/promover ninguém automaticamente. Precisa de decisão do usuário antes de testar lançamento |
| Conferência 11/11 ≠ homologação de compra/distribuição/aprovação/execução | ⏸ continua verdade: nada disso foi testado nesta rodada |
| SEO sem imagem | ⏸ **não inserida** imagem aleatória (precisa da imagem real) |

## 3. Roteiro de HOMOLOGAÇÃO — testes manuais (um por item, numerados)

> Isto é para o usuário **aprovar item a item** (não é o roteiro do vídeo). O vídeo está na seção 4.

> Use **Produto 3** para olhar (V1 publicada = só leitura) e, para editar, crie a V2 pelo botão **Editar** do próprio Produto 3 (fluxo normal: vira rascunho, a V1 continua igual). **Não publique.** Para o item 7 use o **Produto 2** só olhando (ele já tem períodos com desconto).

**Item 1 — IA**
1. Produto 3 → Editar (V2 rascunho) → ícone ✨ no cabeçalho.
2. Esperado: blocos "Já informado", "A IA pode completar" e o novo **"Contexto que a IA lê (não altera)"** com "Quem pode ver" marcado "permissão · não altera" e "Tarefas e etapas · 1 tarefa(s), 4 etapa(s)".
3. Se houver campo comercial vazio, aparece **"Sugerir público-alvo e textos comerciais"**. Clicar gera proposta (chamada real da IA — só se você autorizar); nada é aplicado sem "Aplicar" + "Confirmar".

**Item 2 — Status**
1. `/admin/cadastro-produtos/3?editor=teste` → cabeçalho mostra só **"Ativo"** (antes: Ativo + Publicado v1 + Versão v1 publicada + Ativo).
2. Clicar em "Ativo": aparecem Status do produto, Versão aberta, Publicação, No catálogo e a lista "Mudar status comercial". Fechar com Esc (não escolha nada).
3. Na V2 rascunho o principal vira **"Rascunho v2"**.

**Item 3 — Botões**
1. Produto 3 → Editar (V2) → rodapé: **"Salvar e continuar: Configurações da tarefa e etapas"** é o único botão com degradê; "Salvar rascunho" e "Publicar" ficam claros (secundários).
2. Ir ao passo 3: o avançar some; **Publicar** vira o principal. Não clique em Publicar.
3. Editor atual (`/admin/cadastro-produtos/3` sem `?editor=teste`) continua igual.

**Item 4 — Valor/hora**
1. V2 → passo 2 → Ver tarefa → Etapas e fluxo → Editar a etapa "Auditar SEO…".
2. Esperado: "Valor de referência da hora de Especialista em SEO/GEO: R$ 85,00 por hora · padrão da especialidade…" e o link **Ver na Precificação** (abre outra aba). **Não** há mais "Editar valor/hora".

**Item 5 — Entregáveis**
1. V2 → etapa "Revisar e entregar relatório" (tarefa sem execução por etapa) → Entregáveis → **Novo entregável**.
2. Esperado: "Aprovação do cliente" vem **desmarcada e bloqueada**, com a explicação "Esta tarefa não executa por etapa…". Obrigatório/Evidência/Qualificação continuam livres.
3. Cancelar o entregável novo (não salvar). Nada é gravado até salvar a etapa.

**Item 6 — Variações**
1. V2 → Ver tarefa → aba Variações → Ver → "Configurar impactos" da opção "até 10 páginas".
2. Esperado: resumo com **Preço: Calculado pelas horas extras**; clicar em **Prazo** abre a área de impactos com "Adicionar dias ao prazo" já escolhido; clicar em **Preço** escolhe "Adicionar valor fixo" e mostra o aviso de cobrança dobrada (a opção já tem +2h).
3. Não adicione nada (ou, se adicionar para testar, remova depois — fica só no rascunho V2).

**Item 7 — Desconto**
1. `/admin/cadastro-produtos/2?editor=teste` → passo 3 → "Períodos que o cliente pode escolher".
2. Esperado sob cada período: **"R$ 292,85/mês − 2% = R$ 286,99/mês"** (e os longos com meses). O ⓘ do Mensal fala do desconto e de que implantação não tem desconto.
3. Para conferir 5%: só em produto de teste ou numa V2 sua — não altere o Produto 2 sem querer.

## 4. Roteiro do VÍDEO — cadastro natural e contínuo (para o Codex executar com o usuário)

> Objetivo do vídeo: mostrar que **cadastrar é fácil e corrido**, de cima para baixo, sem idas e voltas — não uma visita aos 7 ajustes.
> Regra de ouro: **cada campo dependente é configurado no mesmo lugar em que nasce** (desconto junto do período, aprovação junto do
> entregável, preço/prazo junto da opção, valor/hora visto dentro da etapa). Os 7 ajustes aparecem naturalmente no caminho.

**Produto e versão:** SEO ID 003 → botão **Editar** cria a **V2 rascunho** (cópia da V1; a V1 publicada não muda). **Quem clica em Editar é o usuário**, durante a gravação. Não publicar. Parâmetros fictícios autorizados valem **só** para o SEO. Tudo o que for acrescentado fica na V2 rascunho e só é apagado com ordem do usuário. Alternativa (produto do zero, IDs 4–12): exige parâmetros/autorização novos.

**Antes de gravar (sem câmera):** confirmar Docker ligado e `http://localhost:8082/admin/cadastro-produtos/3?editor=teste` abrindo; decidir com o usuário se a IA real pode ser chamada (se não, o passo 2 mostra só a janela, sem gerar).

Sequência (narrar como quem está cadastrando):
1. **Abrir o produto** → o cabeçalho mostra um status só ("Ativo"); clicar e mostrar que os detalhes estão ali → **Editar** → vira "Rascunho v2".
2. **Passo 1 · Produto** — revisar título e descrição; em Público-alvo, abrir a IA ✨ ali mesmo: ela mostra o que já está preenchido, o que lê como contexto (tarefas/etapas) e que "Quem pode ver" é **permissão**, não público. Gerar (se autorizado) → revisar a prévia → **Aplicar** → **Confirmar**; campos já preenchidos ficam protegidos.
3. Ainda no Passo 1, **Modalidades**: mostrar como o produto é vendido (avulso/assinatura) sem alterar. O desconto do período fica no Passo 3, junto do preço (passo 9).
4. **Salvar e continuar** (único botão principal) → Passo 2.
5. **Passo 2 · Tarefa e etapas** — abrir a tarefa → etapa "Auditar SEO": especialidade escolhida e, logo abaixo, o **valor/hora de referência** (só leitura, com link para a Precificação). Fechar sem alterar.
6. Na etapa "Revisar e entregar relatório" → **Entregáveis** → **Novo entregável** "Checklist final de SEO" (fictício): a aprovação do cliente já vem coerente com a etapa e explica o porquê → salvar o entregável → **Concluir e salvar etapa**. Mostrar que salvou na primeira tentativa.
7. Aba **Variações** → opção "até 10 páginas" → no resumo da opção clicar **Prazo** → informar **+1 dia** → **Adicionar**. Mostrar que o preço da opção vem das horas extras (calculado) e o aviso de cobrança dobrada se tentar informar valor fixo.
8. Resumo da tarefa: **Custo total estimado R$ 510,00** coerente com a composição.
9. **Salvar e continuar** → Passo 3 · Conferência: simulação ("Quantidade contratada"), preço e prazo do servidor e, no mesmo bloco, "Períodos que o cliente pode escolher" com a conta "base − % = total" (se o SEO não tiver assinatura, mostrar no Produto 2 só olhando). **Publicar** é o principal, mas **não clicar**.
10. Encerrar com **Travar edição**. A V2 fica em rascunho (com o entregável e o +1 dia do passo 6–7).

**Se algo falhar na gravação:** parar, anotar o minuto e a mensagem exata; não repetir cliques nem contornar o erro.

Só depois desta gravação: produto com ciclos (ainda não começado; confirmar produto e parâmetros antes).

## 5. Verificação técnica desta rodada

- Frontend: `npx tsc --noEmit -p .` limpo; `npx vitest run app/admin/produtos/novo-catalogo` → **465 passaram, 1 falhou** (antiga: layout de 3 colunas dos períodos, causada pelo ajuste "Entrega comercial em uma coluna" de 29/10 ainda sem commit; não relacionada).
- `app/admin/produtos/page.test.tsx`: 35 falhas **antigas** (mesma contagem registrada antes). `components/catalog2-product-detail.test.tsx`: 7 falhas **antigas** (mesma lista de 26/10).
- Backend (sem alteração de código): `catalog2-universal-v2-pricing` 29/29 e `catalog2-periods` 8/8 em banco descartável (`allka_test_*`, removido pelo runner).
- Navegador (somente leitura, nenhum salvamento): Produto 3 status único e detalhes; resumo R$ 510,00; impactos "Calculado pelas horas extras"; Produto 2 conta dos períodos.
- Não executado: salvar em V2, chamada real da IA, compra/lançamento, publicação.

### 5.1 Segunda rodada (31/10, tarde) — validação de salvamento, 5% e falhas antigas

**Só arquivos de teste mudaram.** Comandos (frontend em `apps/frontend`, backend em `apps/backend` com `TEST_DATABASE_ADMIN_URL`/`TEST_DATABASE_URL` apontando para `allka_test`; o runner cria e apaga um banco `allka_test_*` descartável):

| Comando | Resultado |
|---|---|
| `npx tsc -p tsconfig.json --noEmit` (frontend) | ✅ limpo |
| `npx vite build --outDir <pasta temporária>` (frontend; não tocou o `dist` local) | ✅ gerado (só o aviso de pacote > 500 kB, que já existia) |
| `npx vitest run app/admin/produtos/novo-catalogo components/catalog2-product-detail.test.tsx` | 476 passaram · 7 falharam (todas antigas, ver abaixo) · 0 no editor |
| `npx tsc -p tsconfig.json --noEmit` (backend) | ✅ limpo |
| `tsx scripts/run-db-tests.ts …catalog2-periods` | ✅ 8/8 |
| `tsx scripts/run-db-tests.ts …catalog2-universal-v2-pricing` | ✅ 29/29 |
| `tsx scripts/run-db-tests.ts …catalog2-implementation-billing` | ✅ novo **3b (5%)** passou · 8 falhas antigas (ver abaixo) |

**Testes novos de salvamento (API SIMULADA — provam o que a tela envia e como reage; não provam gravação no banco):**
- `product-editor-typing.test.tsx`: Salvar e continuar com sucesso (1 gravação mesmo com clique duplo, avança, não cria versão); com erro (mantém passo, texto e mensagem; nova tentativa grava); IA no editor (manda etapas/entregáveis como contexto sem horas/pessoas, prévia, "Voltar à revisão" não aplica, aplica só após confirmar, campo preenchido protegido, nada gravado sozinho, 1 chamada).
- `step-row-universal.test.tsx`: entregável no caso do vídeo — novo → salvar (criado 1 vez, sem aprovação, já ligado à etapa) → recarregar (mesmo registro, sem conflito) → alterar → cancelar (pede para descartar; nada gravado).
- `option-impacts-editing.test.tsx`: atalho Preço → R$ 50 → Adicionar (1 gravação; 2º clique não envia) → reabrir com o retorno do servidor → "Preço informado: + R$ 50,00" e "Prazo: +3 dia(s)" na lista.

**5% com gravação REAL (banco descartável, nunca o Produto 2):** `catalog2-implementation-billing.integration.test.ts` › 3b. Produto de teste com implantação separada (P = preço da implantação = preço da mensalidade base). Configura 5% pela rota do admin → relê pela rota e no banco (5%, ativo) → página do cliente: base sem desconto = P, implantação = P sem desconto, renovação = 0,95·P, **1ª cobrança = P + 0,95·P** → confere que **não** é P + 0,9025·P (desconto duplo) nem 0,95·2P (implantação na base) → cotação igual à página → checkout + pagamento falso: cobrado = 1ª cobrança; assinatura congela 0,95·P e implantação P → renovação emitida = 0,95·P, sem implantação.
Para isso o teste escolhe o projeto antes da compra (regra de 26/10) só neste cenário.

**Falhas que continuam (nenhuma é regressão desta rodada):** evidência = mesmos testes rodados numa cópia do commit `6d83ca8` (29/10, antes de 31/10), em pasta temporária.

| Arquivo | Falhas | Tipo | Evidência / causa | Toca o que mudou em 31/10? |
|---|---|---|---|---|
| `app/admin/produtos/page.test.tsx` (lista de produtos) | 35 | falha anterior independente | mesma lista exata no commit de 29/10; teste espera a lista antiga (cabeçalho "Produto", busca "Buscar por nome…") | Não (31/10 não mexeu nessa tela; o `page.test.tsx` do editor passa 2/2) |
| `components/catalog2-product-detail.test.tsx` | 7 | falha anterior independente | mesmas 7 no commit de 29/10, sem o ajuste do item 7; causas: título repetido na página ("Found multiple elements"), rótulo "funcional para teste" e chamada de simulação diferente | Mesmo arquivo de tela (item 7 só acrescentou 2 linhas no quadro de períodos), mas nenhum dos 7 testes olha esse quadro e todos já falhavam sem a mudança |
| `catalog2-implementation-billing.integration.test.ts` testes 1–7 e 9 | 8 | teste desatualizado (fora do escopo) | checkout responde 422 `project_required`: regra "escolher projeto antes de contratar" (já no commit de 29/10); o arquivo não informa projeto | Não (só o 3b novo informa projeto) |
| `product-periods-inline.test.tsx` "3 colunas" | 1 → **0** | teste desatualizado → **corrigido** | esperava `md:col-span-3`; requisito aprovado é uma coluna. Agora confere a faixa inteira no bloco de preço **e** a responsividade dos cartões (1 → 2 → 3 por linha, sem estourar) | Sim (expectativa ajustada ao requisito) |

Correção do registro anterior: o "page.test.tsx 35 falhas" é o da **lista de produtos** (`app/admin/produtos/page.test.tsx`), não o do editor.

**Dados reais (banco local `allka`, só leitura):** última alteração em especialidades/tarifas 28/10, precificação global 25/09, períodos 25/10 (Produto 2 Mensal 2%), versões 30/10 (SEO V1 publicada; não existe V2), tarefas de execução 28/10. **Nada foi alterado em 31/10.**
**Navegador (só leitura):** `/admin/cadastro-produtos/3?editor=teste` (status único "Ativo", aviso do layout teste) e `/admin/cadastro-produtos/3` (editor atual com "Editar" e "Passo 2: Entrega", sem o status novo); sem erro no console.

**Ainda não homologado (precisa do usuário):** salvar de verdade numa V2 (criada pelo usuário com Editar), chamada real da IA, entregável/variação gravados no banco real, compra/lançamento.

### 5.2 Teste real pela interface — Codex, 31/10

Por ordem explícita do usuário ("quero que você teste [...] abra e teste"), foi executado SOMENTE o teste do item 3, no navegador integrado visível, Produto SEO 003, `?editor=teste`.

- Editar criou **V2 rascunho** a partir da V1 publicada.
- Descrição curta recebeu temporariamente a frase **Teste de salvamento.**
- **Salvar e continuar: Configurações da tarefa e etapas** exibiu "Informações salvas" e avançou ao passo 2.
- Após recarregar, manteve passo 2 e V2. Ao retornar a Produto, a frase estava gravada (221/500).
- Frase removida, **Salvar rascunho** confirmou sucesso. Novo recarregamento manteve o texto original (200/500).
- V1 aberta pelo seletor: continuava publicada; título, descrição curta e descrição completa conferidos pela interface contra os valores anteriores. Não houve comparação de impressão digital no banco nesta sessão.
- Retornou à V2 e travou a edição. **V2 não publicada**. Nenhum código alterado, compra, IA real, deploy ou exclusão.

**Farol: item 3 verde (testado pelo Codex na tela); itens 1, 2, 4, 5, 6 e 7 amarelos para validação dedicada. Restam 6/7.** Não iniciar os próximos sem o usuário pedir. Observação visual separada: na largura muito estreita do navegador integrado, ações do rodapé se sobrepõem; o salvamento passou, mas essa responsividade não está aprovada.

Os registros acima de "nenhuma V2" e de proibição de criar V2 descrevem o estado anterior a esta nova autorização.

### 5.3 Conferência real dos sete pontos pela tela — Codex, 31/10

Usuário pediu conferir tudo usando o computador. Navegador integrado voltou a funcionar. Utilizada a **V2 já existente do SEO 003**, sem criar versão adicional. Nenhum código alterado, publicação, compra ou deploy.

| Item | Resultado observado |
|---|---|
| 1 IA | **VERMELHO.** Contexto mostra 14 campos preenchidos, zero vazios, permissão separada do público-alvo, 1 tarefa e 4 etapas. Usuário autorizou uma proposta real. Enviado pedido de melhorar somente público-alvo com os dados existentes, sem aplicar. Após carregar, retornou **"A IA devolveu uma resposta incompleta. Tente de novo ou detalhe menos o pedido."** Nenhuma proposta apareceu; Aplicar ficou desabilitado. Não repetida chamada paga, nada aplicado. Causa não diagnosticada pelo código nesta rodada. |
| 2 Status | **VERDE na interface.** Um status Rascunho v2; clique abriu status comercial Ativo, versão aberta V2 e V1 publicada usada pelo catálogo. Nenhum status alterado. |
| 3 Salvamento | **VERDE nos caminhos testados.** Mantido teste da seção 5.2; também chegou ao último passo e confirmou ausência do avançar e presença de publicação, sem clicar. Edição travada ao final. |
| 4 Valor/hora | **VERDE no editor da etapa.** Auditoria: 2h, referência R$85/h, custo R$170; tarifa não é editável e há link Ver na Precificação. Não alterada tarifa nem testada edição na outra tela. |
| 5 Entregáveis | **VERDE no cenário testado.** Criado **Checklist final de SEO — validação local**, descrição preenchida. Antes disso, pendências de nome/descrição apareciam imediatamente. Aprovação do cliente veio desmarcada e bloqueada com justificativa porque a tarefa não executa por etapa. Salvar formulário → Concluir e salvar etapa → **Alterar somente neste produto** (não globalmente). Toast Etapa concluída e salva. Recarregou e reabriu: item Salvo no servidor; etapa agora tem 2 entregáveis. Mantido só na V2 de demonstração. Não cobre todos os modos de aprovação. |
| 6 Variações | **VERDE no cenário testado.** Opção até 10 páginas: Prazo abriu Adicionar dias ao prazo; adicionado **+1 dia**. Preço abriu Adicionar valor fixo e aviso de cobrança além das 2h extras. Inserido **R$50 temporários**, recarregou e reabriu: +1 dia e +R$50 persistiram. Removido somente o impacto temporário R$50; confirmou Impacto removido e retorno a Calculado pelas horas extras, depois Salvar rascunho. Mantido +1 dia na V2 de demonstração. |
| 7 Desconto | **AMARELO, parcial.** Produto 2 publicado somente leitura: admin mostra R$292,85 −2% = R$286,99; prévia comercial da V1, selecionando Mensal (−2%), mostra primeira cobrança e renovações R$286,99, base R$292,85. Nenhum dado alterado. Não testados os 5% exatos na interface, nem checkout/pagamento/renovação real. O teste automático de 5% da seção 5.1 continua evidência separada, não teste visual desta sessão. |

**Farol atual: 5 verdes (2–6), 1 vermelho (1), 1 amarelo (7).** Não equivale à aprovação do usuário nem homologação geral da plataforma. Próximos: corrigir/diagnosticar IA com pedido do usuário e retestar; validar 5% em rascunho autorizado, sem mudar publicação.

Observações secundárias não corrigidas: na auditoria há Google Search Console usado na etapa, mas o Resumo da etapa dizia Nenhum acesso configurado ainda; no SEO avulso a linha Modalidades por período trazia Mensal. Precisam conferência específica antes de afirmar defeito na regra. Escape no menu de versões chegou a fechar o painel do produto. Nenhuma dessas observações foi contornada com alteração de código.

Evidências locais: `auditoria-ia-resposta-incompleta.png` e `auditoria-desconto-mensal-cliente.png`, na pasta privada de visualizações da sessão `019ff5b6-bd52-7670-bec9-b64609421f78`.

## 6. Não autorizado / não feito

Commit, push, deploy, espelho, QA/allka.store, publicação adicional, criação de V2 pelo assistente, compra/cotação/lançamento, chamada paga de IA, cadastro/promoção de Líder, imagem aleatória no SEO, exclusão de dados.
