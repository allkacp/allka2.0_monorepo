# Integridade dos 36 produtos e dos cadastros globais
Gerado em 2026-10-01T21:32:57.110Z — comparação: base principal × backup restaurado.

**Resultado geral: APROVADO**

| ID | Verificação | Resultado |
|---|---|---|
| P1 | existem exatamente 36 produtos | ✅  |
| P2 | cada produto manteve o mesmo ID | ✅  |
| P3 | cada produto manteve o mesmo número sequencial e nome | ✅  |
| P4 | cada produto tem exatamente uma versão, e ela é a V1 | ✅  |
| P5 | todas as V1 continuam em rascunho | ✅  |
| P6 | todos continuam em em_preparacao | ✅  |
| P7 | nenhum possui versão publicada | ✅  |
| P8 | nenhuma tarefa foi vinculada | ✅  |
| P9 | nenhuma etapa foi vinculada | ✅  |
| P10 | nenhum preço foi definido (modo calculado, sem preço fixo) | ✅  |
| P11 | nenhum prazo foi definido | ✅  |
| P12 | nenhuma modalidade foi habilitada (avulso/assinatura/implantação/período) | ✅  |
| P13 | nenhuma classificação foi preenchida (pilar, categoria, 4F) | ✅  |
| P14 | nenhum campo comercial estruturado preenchido | ✅  |
| P15 | nenhum adicional, variação, condição, cotação, dependência ou entregável de produto | ✅  |
| P16 | V1 idêntica ao backup (título, descrições, prazo, modalidades) | ✅  |
| P17 | nenhum dos 36 aparece no catálogo do cliente | ✅  |
| P18 | nenhum dos 36 pode ser aberto/contratado pelo cliente (404) | ✅  |
| G1 | 107 modelos de tarefa preservados | ✅  |
| G2 | 109 modelos de etapa preservados | ✅  |
| G3 | mesmos IDs de modelos de tarefa e etapa | ✅  |
| G4 | mesmos hashes funcionais dos modelos de tarefa | ✅  |
| G5 | mesmos hashes funcionais dos modelos de etapa | ✅  |
| G6 | especialidades, pilares, categorias, 4F e precificação inalterados | ✅  |
| G7 | questionários e perguntas inalterados (nenhum de teste a mais) | ✅  |
| G8 | perfis de IA definitivos continuam em zero (nenhum perfil de teste restou; só o perfil de sistema do orientador de conexões pode existir) | ✅  |
| G9 | nenhuma criação acidental de modelo (registro de criações de modelo vazio) | ✅  |
| C1 | o módulo de conexões está disponível mas DESATIVADO em todas as versões dos 36 produtos | ✅  |
| C2 | nenhum dos 36 produtos recebeu exigência de conexão (nem dependência de tarefa/etapa) | ✅  |
| C3 | nenhuma conexão, segredo, exigência de contratação, regra de dependência ou escolha de cotação foi criada automaticamente | ✅  |
| C4 | catálogo global de tipos de conexão disponível (21 tipos iniciais) | ✅  |
| C5 | o perfil de IA de QA (orientador de conexões) existe no máximo uma vez, exige revisão humana e NÃO está vinculado a nenhuma tarefa de produto oficial | ✅  |