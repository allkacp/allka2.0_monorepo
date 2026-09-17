# Publicação — diagnóstico do VPS em 17/09/2026

## Retomada pelo Codex

Solicitação: continuar a publicação da PR #24 e a transferência dos 36 produtos após o limite do agente anterior. Nenhuma importação, migration, reinicialização ou cancelamento foi executado nesta retomada.

- PR #24 mesclada, SHA `55adf2e6f89c6e858e6d534d267582261740ebe9`.
- Deploy `35271612588`, tentativa 2, ainda em execução na etapa remota na última consulta desta seção.
- Tentativa 1: imagem baixada, etapa remota terminou com código 255. O log disponível não demonstra a causa raiz desse término.
- Diagnóstico somente leitura `35275540702`: sucesso. Executado com a branch da PR #25, sem merge/deploy dessa branch.
- Backend real ainda na imagem `7a2f00f`, running, zero reinícios, iniciado em `2026-09-17T19:33:47.58404389Z`.
- API pública e acesso Caddy→backend: HTTP 200.
- Mount confirmado: volume `allka-2026_backend_uploads` em `/app/apps/backend/uploads`.
- Docker responde a inspect direto, logs diretos e exec direto, mas listagem (`docker ps` e Compose) excede 30–45 segundos.
- Memória disponível: 1938 MiB de 3915 MiB. Disco: 20 GiB disponíveis, 59% usado; inodes 14% usados. Não há evidência de memória/disco esgotados nesta amostra.
- Duas amostras de vmstat: coluna `st` em 81% e 80%. Indício de espera no hipervisor, não prova de política específica do provedor nem justificativa automática para upgrade. Solicitada confirmação por amostra mais longa e painel do VPS.

## Melhorias do diagnóstico (PR #25)

Grupo de concorrência separado `diagnose-vps-readonly`: mantém diagnósticos serializados entre si, mas permite observar um deploy travado. Nenhuma trava dos workflows de escrita foi removida. Coleta recursos sem argumentos de processos/ambiente; mantém sanitização de saída, inspeciona imagem/mount reais e usa logs/exec diretos para evitar depender da listagem travada. Timeout na leitura adicional do Caddy gera aviso, preservando o resultado principal.

Validação: parse YAML e sintaxe dos cinco blocos Bash aprovados; execução real do diagnóstico aprovada. CI do commit `f59fe06` falhou em `components/alerts-floating-icon.test.tsx:148` (1150/1151 testes aprovados); não corrigida nem classificada como flakiness sem investigação. CI do commit seguinte deve ser conferida separadamente.

## Pendências

Segunda coleta `35275960284`, em 17/09 às 21:19 UTC: 1 CPU disponível; dez amostras consecutivas com `st` de 79–80%; pressão de CPU `some avg10=53.25`, `avg60=54.58`, `avg300=54.88`; pressão de memória/IO próxima de zero, 1928 MiB disponíveis. Listagens Docker continuam excedendo timeout; imagem permanece `7a2f00f`, zero reinícios, API 200. O alto steal sustentado exige verificar limitação/contenda no provedor; não permite afirmar a causa específica nem que reiniciar Docker resolverá. Solicitada captura do painel do VPS, sem pedir upgrade/reinício. Deploy ainda em andamento na consulta de 21:22 UTC; nenhuma nova tentativa iniciada pelo Codex.

- Identificar a causa da lentidão/bloqueio do Docker antes de reiniciar o daemon ou repetir o deploy. Reiniciar Docker pode interromper também MySQL e outros serviços; não executado às cegas.
- Publicar efetivamente `55adf2e`, validar saúde, backup, pacote e dry-run antes da transferência.
- Corrigir contador administrativo: `Todos os produtos` usa `final_imported_products`, enquanto a API já fornece `counts.products`; a inconsistência foi confirmada no código, não corrigida nesta etapa operacional.
- Os 36 produtos continuam sem importação nesta retomada; não declarar conclusão com base apenas em HTTP 200.

Referências: [diagnóstico real](https://github.com/allkacp/allka2.0_monorepo/actions/runs/35275540702), [deploy em acompanhamento](https://github.com/allkacp/allka2.0_monorepo/actions/runs/35271612588), [semântica de steal no Linux](https://docs.kernel.org/filesystems/proc.html).
