# Relatório de situação — 36 produtos importados do Catálogo 2.0

Gerado em 2026-09-01, dados lidos diretamente do banco local (`catalog2_product_import_origins` + estrutura de cada produto). **Nenhum dos 36 está pronto para lançamento.** Nenhum foi publicado. Nada aqui foi inventado — preço, prazo, tarefas e portfólio ausentes ficam explicitamente marcados como pendentes, nunca preenchidos com valor fictício.

## Confirmações agregadas (contra os números já esperados)

| Item | Valor confirmado |
|---|---|
| Identidades importadas | **36 / 36** |
| Revisados pela Rose (`rose_reviewed=true`) | **21** |
| Sem revisão da Rose | **15** |
| Divergências de categoria × área (`classification_decision_pending`) | **5** — #14, #19, #20, #22, #23 (ver seção própria) |
| Publicados | **0** |
| Com pelo menos 1 tarefa estruturada | **0** |
| Com prazo comercial base definido | **0** |
| Com preço comercial calculável | **0** (motor bloqueia por falta de tarefa/prazo, nunca inventa) |
| Com portfólio anexado | **0** |
| `review_state` de todos os 36 | `content_review_pending` (nenhum chegou a `ready_for_final_review`/`ready_for_publication`) |

Todo produto carrega, no mínimo, estas 4 pendências bloqueadoras (motor de precificação/publicação já recusaria qualquer tentativa de tornar contratável): `content_review_pending`, `price_pending`, `deadline_pending`, `portfolio_pending`. Os que ainda não passaram pela Rose somam mais uma: `rose_review_pending`. Os 5 com divergência de classificação somam `classification_decision_pending` no lugar de `rose_review_pending` (já foram revisados, a pendência é de decisão de categoria, não de revisão).

## Tabela individual (as 36)

| # | Nome | Pilar | Categoria | 4F | Origem | Rose | Var. | Adic. | Bloqueador extra |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Gestão de Tráfego Pago (Google Ads / Meta Ads) | A. Presença Digital | Performance | Fluxo,Força,Fidelização | existente | ✅ | 2 | 3 | — |
| 2 | Manutenção e Alteração de Site ou Loja Virtual | A. Presença Digital | Soluções Web | Fundação,Fidelização | existente | ✅ | 1 | 2 | — |
| 3 | SEO — Otimização para Buscadores (renomeado p/ **SEO + GEO**) | A. Presença Digital | Performance | Fundação,Fluxo,Força,Fidelização | existente | ✅ | 1 | 2 | — |
| 4 | Hospedagem e Manutenção Mensal de Site | A. Presença Digital | Soluções Web | Fundação,Fidelização | existente | ✅ | 1 | 2 | — |
| 5 | Criação de Site Institucional (múltiplas plataformas) | A. Presença Digital | Soluções Web | Fundação | existente | ✅ | 2 | 2 | — |
| 6 | Landing Page de Alta Conversão | A. Presença Digital | Soluções Web | Fundação,Fluxo,Força | existente | ✅ | 0 | 2 | — |
| 7 | Implantação de Data Analytics (Google Analytics) | A. Presença Digital | Performance | Fundação,Fluxo | existente | ✅ | 0 | 1 | — |
| 8 | Diagnóstico Gratuito de Presença Digital | A. Presença Digital | Performance | Fundação,Fluxo | existente | ❌ | 0 | 1 | rose_review_pending |
| 9 | Configuração de Perfil no Google Meu Negócio | A. Presença Digital | Soluções Web | Fundação | existente | ❌ | 0 | 1 | rose_review_pending |
| 10 | Criação de Loja Virtual / E-commerce | A. Presença Digital | Soluções Web | Fundação | existente | ✅ | 0 | 2 | — |
| 11 | Configuração de Domínio em Hospedagem de Terceiros | A. Presença Digital | Soluções Web | Fundação | **novo** | ❌ | 0 | 1 | rose_review_pending |
| 12 | Planejamento e Config. de Contas de Anúncio | A. Presença Digital | Performance | Fundação,Fluxo | **novo** | ❌ | 1 | 1 | rose_review_pending |
| 13 | Criação de E-mail Marketing (Arte + Texto) | B. Captação de Leads | Vendas e Automações | Força,Fidelização | existente | ❌ | 0 | 1 | rose_review_pending |
| 14 | E-book / Material Rico para Captação de Leads | B. Captação de Leads | Redação | Fundação,Fluxo,Força | existente | ✅ | 1 | 2 | **classification_decision_pending** (área Rose: Mídias) |
| 15 | Prospecção de Leads com IA | B. Captação de Leads | Vendas e Automações | Fluxo,Força | existente | ❌ | 0 | 1 | rose_review_pending |
| 16 | Implantação de CRM, Funil de Vendas e Automação | B. Captação de Leads | Vendas e Automações | Fundação,Fluxo,Força,Fidelização | existente | ❌ | 0 | 1 | rose_review_pending |
| 17 | Chatbot de Atendimento e Qualificação (WhatsApp) | B. Captação de Leads | Vendas e Automações | Fluxo,Força,Fidelização | **novo** | ❌ | 1 | 1 | rose_review_pending |
| 18 | Gestão de Reputação Online | B. Captação de Leads | Vendas e Automações | Fidelização | **novo** | ❌ | 0 | 1 | rose_review_pending |
| 19 | **Card Post (Arte, Copy e Legenda)** | C. Redes Sociais | Design | Fluxo,Força,Fidelização | existente | ✅ | 4 | 2 | **classification_decision_pending** (área Rose: Mídias) + autorização de IA |
| 20 | Criação de Conteúdo para Blog e **SEO+GEO** | C. Redes Sociais | Redação | Fundação,Fluxo,Força,Fidelização | existente | ✅ | 1 | 1 | **classification_decision_pending** (área Rose: Mídias) |
| 21 | Gestão de Comentários e Mensagens | C. Redes Sociais | Vendas e Automações | Fidelização | existente | ❌ | 1 | 1 | rose_review_pending |
| 22 | Planejamento de Pauta e Calendário de Conteúdo | C. Redes Sociais | Redação | Fluxo,Força,Fidelização | existente | ✅ | 1 | 1 | **classification_decision_pending** (área Rose: Mídias) |
| 23 | Copywriting para Páginas e Anúncios | C. Redes Sociais | Redação | Fluxo,Força | existente | ✅ | 1 | 1 | **classification_decision_pending** (área Rose: Mídias) |
| 24 | Copy para E-mail e WhatsApp | C. Redes Sociais | Redação | Força,Fidelização | existente | ❌ | 0 | 1 | rose_review_pending |
| 25 | Criação e Config. de Perfis em Redes Sociais | C. Redes Sociais | Soluções Web | Fundação | existente | ❌ | 0 | 1 | rose_review_pending |
| 26 | Edição de Vídeo (Cortes, Decupagem, Campanha) | D. Branding e Design | Design | Fluxo,Força,Fidelização | existente | ✅ | 2 | 2 | — |
| 27 | KV (Key Visual) — Template Editável | D. Branding e Design | Design | Fluxo,Força | existente | ✅ | 1 | 1 | — |
| 28 | Apresentação Institucional / Pitch Deck | D. Branding e Design | Design | Fundação,Fluxo | existente | ✅ | 1 | 1 | — |
| 29 | Criação de Identidade Visual (Logo + Manual) | D. Branding e Design | Design | Fundação | existente | ✅ | 0 | 2 | — |
| 30 | Redimensionamento de Criativos | D. Branding e Design | Design | Força,Fidelização | existente | ✅ | 0 | 1 | — |
| 31 | Folder ou Catálogo Digital | D. Branding e Design | Design | Fundação,Fluxo | existente | ✅ | 1 | 1 | — |
| 32 | Vídeo com IA — Roteiro, Personagens e Animação | D. Branding e Design | Design | Fundação,Fluxo | existente | ❌ | 0 | 2 | rose_review_pending |
| 33 | Tratamento e Retoque de Imagens | D. Branding e Design | Design | Fundação,Fluxo,Fidelização | **reativado** | ❌ | 0 | 1 | rose_review_pending |
| 34 | Papelaria e Materiais de Identidade Impressa | E. Campanhas Offline | Design | Fundação | existente | ✅ | 1 | 1 | — |
| 35 | Comunicação Visual, PDV e Projeto Cenográfico | E. Campanhas Offline | Design | Força,Fidelização | existente | ❌ | 0 | 1 | rose_review_pending |
| 36 | Criativos para Impressão Gráfica e Mídia Externa | E. Campanhas Offline | Design | Fluxo,Força | **novo** | ✅ | 0 | 1 | — |

Todos os 36, sem exceção, também têm: **0 tarefas estruturadas**, **0 etapas**, **preço "A definir"**, **prazo "A definir"**, **portfólio ausente** — colunas omitidas da tabela acima por serem idênticas em toda a linha, não por terem sido preenchidas.

## As 5 divergências de categoria × área (nunca resolvidas por escolha automática)

| # | Produto | Categoria no catálogo | Área da Rose | Situação |
|---|---|---|---|---|
| 14 | E-book / Material Rico | Redação | Mídias | Aguarda decisão humana — categoria não foi trocada |
| 19 | Card Post (Arte, Copy e Legenda) | Design | Mídias | Idem — **também** aguarda a autorização de IA (abaixo) |
| 20 | Blog e SEO+GEO | Redação | Mídias | Idem |
| 22 | Planejamento de Pauta | Redação | Mídias | Idem |
| 23 | Copywriting para Páginas e Anúncios | Redação | Mídias | Idem |

Nenhuma dessas 5 teve a categoria alterada automaticamente — a divergência fica registrada e visível na aba "Origem e revisão" do construtor admin, aguardando decisão humana.

## Pontos específicos confirmados

- **E-book (#14):** variações já batem entre a planilha principal e a Rose ("até 50 páginas" / "até 150 páginas"); a única pendência é a classificação (Redação vs. Mídias), não o conteúdo da oferta em si.
- **SEO + GEO:** a renomeação de "SEO" para "SEO + GEO" foi aplicada em 2 produtos (#3 e #20), preservando o nome anterior no histórico de auditoria da importação — não é uma divergência de categoria, é atualização de nome sugerida pela Rose.
- **Card Post e autorização de IA (#19):** o produto já tem a variação obrigatória "Uso de IA na produção" (Autorizado / Não autorizado) modelada desde a importação — sem efeito automático de preço, exatamente como definido na ata. Continua sem tarefas/preço/prazo como os demais.
- **Portfólio:** confirmado ausente nos 36 (nenhum arquivo/link anexado) — situação idêntica à constatada na importação original, não mudou.

## Bloqueadores que impedem qualquer um dos 36 de virar contratável hoje

Por ordem de exigência do motor (nenhum aceita valor forjado):
1. **Conteúdo** — revisão humana da Rose pendente em 15 produtos.
2. **Classificação** — decisão de categoria×área pendente em 5 produtos.
3. **Tarefas** — nenhum dos 36 tem `Catalog2Task` cadastrada; sem isso, não há esforço/preço/tarefa calculável nem materializável num pedido.
4. **Prazo comercial base** — não definido em nenhum; sem ele, o motor nunca mostra prazo, mesmo com tarefas.
5. **Preço** — consequência direta de (3): sem tarefa com duração e especialidade, o custo direto é zero/indefinido, e o motor recusa fechar preço comercial.
6. **Portfólio** — ausente nos 36; bloqueia a etapa de prontidão, mesmo que as demais estivessem completas.
7. **Publicação** — nenhuma versão foi publicada; mesmo que tudo acima fosse resolvido, publicar é uma ação humana explícita e distinta.

## Decisões humanas necessárias antes de qualquer avanço comercial

- Resolver as 5 divergências de categoria×área (aceitar a área da Rose, manter a atual, ou uma 3ª classificação).
- Revisar os 15 produtos que a Rose ainda não viu.
- Definir, produto a produto: tarefas reais (com especialidade e duração), prazo comercial base, e os percentuais comerciais (imposto/comissão/taxa/margem — hoje nulos na configuração global, sinalizados como "aguardando definição comercial").
- Levantar/produzir portfólio real para cada produto.
- Só depois disso um Admin Master pode considerar publicar — e mesmo publicar não implica cutover (são decisões e lotes distintos).

**Nenhum dos 36 é declarado pronto para lançamento neste relatório.**
