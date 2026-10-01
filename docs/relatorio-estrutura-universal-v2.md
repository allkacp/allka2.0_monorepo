# Relatório final — Estrutura universal do cadastro de produtos (v2)

Ambiente: **somente local** (MySQL local, backend 3001, frontend 8082). Nada foi enviado a allka.store, teste online ou produção.

## 1. Resumo executivo
- A estrutura universal foi corrigida e completada no backend, no banco (migração aditiva com rollback) e nas telas. Vale para os 36 produtos e para os futuros.
- Os 36 produtos continuam **Em preparação**, com **V1 em rascunho**, sem tarefas, sem publicação, sem ativação e sem campos comerciais preenchidos.
- Testes novos: 22 (8 de cobrança + 14 de cadastro universal), todos passando. Regressão: só as falhas que já existiam.

## 2. Backup e restauração
- Backup completo antes: `backups/estrutura-universal-20260930-1814/allka-local-COMPLETO-antes.sql.gz` + contagens e hashes.
- A migração foi validada numa **cópia** do banco (contagens, `prisma migrate diff`, aplicação e rollback com esquema idêntico). Não repeti uma restauração separada do arquivo `.sql.gz` em outra base além dessa cópia.

## 3. Arquivos e migração
- Migração: `apps/backend/prisma/migrations/20260930160000_universal_structure_v2/{migration.sql,rollback.sql}` (só colunas/tabelas novas; desfaz também a correção de acentos dos 4F).
- Backend novo: `catalog2-commercial-fields.ts`, `catalog2-question-types.ts`, `catalog2-ai-providers.ts`; alterados `catalog2-pricing/periods/client/checkout/service/models/change-summary`, `catalog2-subscription*`, `task-ai`, `task-deliverables`, `project-dependencies`, rotas `catalog2-admin` e `project-tasks`.
- Frontend: `catalog2-commercial-ui`, `catalog2-questions-ui`, `catalog2-ai-profiles-ui` (novos) e ajustes em editor, escolhas, modelos, memória de cálculo, detalhe do cliente, dependências e entregáveis.
- Testes: `catalog2-implementation-billing` e `catalog2-universal-structure`.

## 4. Correções
Publicar ≠ ativar · campos aceitos e descartados agora gravam · limites 500/4000 iguais em tela e API · classificação não apaga por omissão · publicação barra ciclo de dependência, auto-dependência, modelo inativo, cobrança apontando para tarefa inexistente e IA sem perfil utilizável · acentos dos 4F corrigidos.

## 5. Implantação
Separada da mensalidade em todos os pontos: preço, cotação, contrato (`implementation_price_snapshot`), assinatura (`implementation_amount`, data, motivo) e fatura. Regras `first_only`, `always`, `on_revalidation` e histórico do cliente respeitados; recontratação com implantação concluída não cobra nem gera de novo.

## 6. Primeira cobrança
`primeira_cobrança = implantação aplicável + mensalidade do 1º ciclo (+ cobranças únicas)`; `avulso = implantação + um ciclo + variações + adicionais`. A assinatura guarda a composição (`first_charge_json`).

## 7. Renovações
`renovação = só a mensalidade recorrente do ciclo`, calculada pelo cronograma congelado (`renewal_components_json`): tarefas "só na 1ª vez", "a cada N ciclos" e janelas de adicionais entram ou saem no ciclo certo. A implantação não volta.

## 8. Campos adicionados
Escopo de cobrança (`one_time`, `first_cycle`, `recurring`, `per_cycle`, `per_quantity` + início/fim/quantidade/tarefa de referência) em adicionais, efeitos e condições; 11 campos comerciais na versão (público-alvo, promessa, escopo, itens incluídos/não incluídos, requisitos, informações do cliente, observações internas, resumo dos entregáveis, aviso de resultados, política de alterações) com visibilidade interna/equipe/cliente; perguntas com tipo/ajuda/opções/padrão/validação/visibilidade/uso; perfil de IA com formatos, limites, falha, revisão e versão de prompt; liberação manual e versão de entregável.

## 9. Tarefas e etapas
Criar tarefa/etapa com checagem de nomes parecidos; alterar só o produto (padrão) ou o modelo global (exige confirmação).

## 10. Modelos por ID
"Selecionar existente" × "criar novo"; busca por #ID, nome, especialidade, executor, ciclo/finalidade, status; cartão mostra Modelo #ID, etapas, nº de produtos, revisão. `check_similar` é **opt-in na API** (a tela sempre envia); integrações que não enviam continuam como antes.

## 11. Continuidade
Já existente e validado pelas suítes `catalog2-continuity` e e2e (manter mesmo nômade, redistribuir, escolha do líder, fallback, cópia de contexto). Restrição por plano **não** implementada (evolução futura).

## 12. Acessos
Dispensa da etapa de acessos vira etapa concluída (não some) + registro com motivo; troca de executor reabre quando a regra manda (`client-assets`, e2e 5).

## 13. Dependências
Produto→produto, tarefa→tarefa, etapa, entregável, aprovações, ativo; bloqueia início/final, exige antes da entrega ou só alerta. A tela mostra o que bloqueia, origem, entregável esperado, responsável e atualização automática. Liberação manual: só líder/admin, justificativa ≥10 caracteres, fica no histórico e a regra não some. Ciclos e auto-dependência recusados.

## 14. Entregáveis
Versão, histórico de substituições, motivo de rejeição, tarefa/etapa produtora, tarefas consumidoras, quem enviou/aprovou; obrigatório bloqueia a conclusão da etapa. Cliente não vê histórico interno.

## 15. IA
Criar/editar/ativar/inativar, provedor+modelo, instrução-base, formatos, custo, limites, falha/humano, revisão obrigatória, versões de prompt, teste de conexão e de execução (descartável, nada gravado), histórico de execuções. Publicação exige perfil ativo, provedor configurado, modelo disponível, instruções, revisão configurada (se exigida) e custo calculável. **Nenhum perfil definitivo foi cadastrado**; nenhum teste deixou dado.

## 16. Validação visual
Feita no Chrome local (headless, login por token de desenvolvimento) em `/admin/cadastro-produtos` do produto #1, **sem salvar nada**: cabeçalho com os chips (status, versão, publicação, ativação, preço "≈ R$ 0,00"), contador 0/4000, card "Informações comerciais", diálogo "Não é possível publicar ainda". **Não** validei visualmente: "Como cobrar", memória de cálculo com primeira cobrança × renovação, editor de tipos de pergunta, gerenciador de perfis de IA, diálogo de dois botões (Publicar versão / Publicar e ativar), dependências e entregáveis — esses foram verificados por compilação e testes de API, não por tela. As ferramentas do navegador embutido não estavam disponíveis.

## 17. Testes
- Novos: billing 8/8; universal 14/14 (publicar sem/com ativação, campo comercial, rejeição de campo inválido, escopo de cobrança, questionários, perfis de IA, IA sem/ com perfil, modelos por ID e sem duplicidade, integridade/ciclos, liberação manual, revisão→qualificação→aprovação com rejeição e retrabalho, entregável versionado).
- Existentes rodados (42 suítes): passam, exceto as pré-existentes: `catalog2-import` (2), `catalog2-product-history` (1, texto "Situação alterada"), `project-admin-responsible` (3), `project-edit-admin-responsible` (2), `catalog2-catalog` 3b (1). Frontend: 109 falhas = mesma contagem de antes.
- Ajustes em testes antigos (não enfraquecidos): fixtures passaram a pedir `activate: true` ao publicar; dois testes de `scope: "model"` mandam `confirm_model_update`; duas fixtures ganharam modalidade/etapa com horas.
- Dos 30 pedidos: os de continuidade, redistribuição, dispensa de acessos, reabertura por troca de executor e dependência por entregável são cobertos por suítes que já existiam (`catalog2-continuity`, `client-assets`, e2e 5 e 7) e continuam passando. "36 produtos inalterados" e "modelos globais inalterados" foram conferidos por consulta ao banco (contagens idênticas, 107 modelos de tarefa e 109 de etapa), **não** por teste automatizado nem pelos hashes antigos.

## 18. Contagens antes/depois
Todas as 198 tabelas idênticas. Diferenças: `_prisma_migrations` 144→145; tabelas novas vazias `catalog2_ai_profile_prompt_versions` e `project_task_deliverable_versions`.

## 19. Os 36 em V1 limpa
36 produtos `em_preparacao`; 36 versões, todas V1 `rascunho`; 0 com versão publicada; 0 tarefas; 0 avisos de ativação; 0 campos comerciais preenchidos.

## 20. Limitações
- Custo de produto indeterminado continua publicável como "A definir" (decisão anterior); prazo indeterminado bloqueia.
- `check_similar` opt-in na API.
- Restrição por plano: não implementada.
- Vários múltiplos qualificadores: estrutura do banco preservada, um qualificador basta.
- Sem testes de tela (vitest) para os componentes novos.

## 21. Declaração
Nenhum produto foi preenchido, publicado ou ativado. Nada foi enviado ao servidor, allka.store ou produção.

## 22. INFORMAÇÕES PARA O CADASTRO DO PRIMEIRO PRODUTO
- Produto #1: id `cmtd7galw000jp8t8b8c1quh2` ("Gestão de Tráfego Pago (Google Ads / Meta Ads)"), V1 `cmuol8onu000211d91zq8of13` (rascunho). Base `/api/admin/catalog2` (Admin Master).
- Especialidades: gestor_trafego `cmtd415l9000e171x591kizme` (R$100/h), desenvolvedor_web `cmtd415lm000f171xaltzcr2d` (200), especialista_seo_geo `cmtd415lw000g171xveut1g3w` (85), redator `cmtd415m5000h171xot43110q` (80), designer `cmtd415mf000i171xc8bncu3w` (90), editor_video `cmtd415mo000j171xrrryhl7m` (95), especialista_automacao `cmtd415mz000k171xfakk98ns` (123).
- Pilares: presenca_digital `cmtd415gq0000171xdrl9iy73`, captacao_leads `cmtd415hc0001171xw5r4grem`, redes_conteudo `cmtd415hl0002171x3nhahceh`, branding_design `cmtd415hw0003171xxkx41ml3`, campanhas_offline `cmtd415i60004171xxbiiryh1`.
- Categorias: performance `cmtd415jp0009171xbxwyo40y`, solucoes_web `cmtd415k5000a171xhb6qijqb`, vendas_automacoes `cmtd415ke000b171xfe7taoe4`, redacao `cmtd415kp000c171xy4mwo9v7`, design `cmtd415l0000d171xtcxj9v8i`.
- 4F: fundacao `cmtd415ih0005171x8en6y4yw`, fluxo `cmtd415iv0006171xr7gvfxo2`, forca `cmtd415j50007171xspxor044`, fidelizacao `cmtd415jf0008171xudhzlq2g`.
- Modelos globais: tarefas #1–#107, etapas #1–#109 (busca: `GET /task-models?q=#ID|nome&specialty_id&execution_mode&cycle_type&status`, `GET /step-models`; semelhantes: `GET /task-models/similar?name=`).
- Enums: escopo de cobrança `one_time|first_cycle|recurring|per_cycle|per_quantity`; `implementation_rule` `first_only|always|on_revalidation`; ciclo `implementacao|recorrente|revalidacao|avulso|sob_demanda`; repetição `first_only|all_cycles|every_n_cycles|on_condition|manual`; continuidade `not_allowed|allowed|recommended|required`; `asset_rule` `always|first_only|every_x_days|on_executor_change|on_client_change|none_while_valid|light_check`; dependência alvo `product|task|step|deliverable|internal_approval|client_approval|info_asset`, comportamento `block_start|block_final|require_before_delivery|alert_only`, `applies_to` `all|implementacao|recorrencia|revalidacao`; entregável tipo `arquivo|link|texto|registro_sistema|outro`, responsável `executor|lider|agencia|cliente|sistema`; perguntas `texto_curto|texto_longo|numero|moeda|data|sim_nao|selecao_unica|selecao_multipla|url|email|telefone|arquivo|acesso_ativo`; IA modo `autonoma|rascunho|auxilia`, gatilho `manual|automatica|so_rascunho`; visibilidade dos campos comerciais `internal|team|client`.
- Ordem segura: (1) `PATCH /products/:id/classifications` (pilar, categoria, 4F); (2) `PUT /versions/:id` (título, descrições ≤500/≤4000, campos comerciais, modalidades `accepts_one_time/accepts_recurring`, implantação); (3) tarefas: `GET /task-models/similar` → `POST /versions/:id/tasks/from-model` (ou `POST /versions/:id/tasks` com `check_similar:true`); (4) etapas: `/tasks/:id/steps/from-model`; (5) entregáveis da tarefa; (6) questionário (`POST /questionnaires`, `/questionnaires/:id/questions`, `PUT /tasks/:id/questionnaire`); (7) variações/adicionais/condições com `charge_scope`; (8) períodos (`PUT /products/:id/periods/mensal`, só se houver assinatura); (9) `GET /versions/:id/validate` e `POST /versions/:id/simulate`; (10) `POST /versions/:id/publish` (sem `activate`) — ativar só com `activate:true` + `confirm_activation:true` ou pelo status no cabeçalho.

## Atualização 2026-10-01 (rodada final)
Ver docs/evidencias-estrutura-universal/: 01-restauracao-backup.md, integridade-36-produtos.md, matriz-30-testes.md (30/30), validacao-visual.md (30/30).
Falhas restantes: apenas as pré-existentes comprovadas contra o HEAD (import #25/#30, history #1, project-admin 3, project-edit 2, catalog 3b).
