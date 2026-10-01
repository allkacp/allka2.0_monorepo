# Integrações externas — etapa futura para o QA

Nada disso foi configurado nesta rodada (nenhuma credencial real).

## Estado de cada parte
| Parte | Estrutura pronta | Integração simulada aprovada | Integração real |
|---|---|---|---|
| Catálogo global de tipos, exigências, contratação, pendências, pausa/SLA, auditoria | sim | sim (38 testes, demo 15/15, visual 27/27) | n/a (não depende de terceiros) |
| Cofre de segredos (AES-256-GCM, chave META_TOKEN_ENCRYPTION_KEY) | sim | sim | precisa de chave própria do QA |
| WordPress (usuário temporário / senha de aplicação) | sim | sim (respostas simuladas 200/401/503/queda) | falta um WordPress de teste |
| Google OAuth (GA4, GTM, Search Console, Business Profile) | sim (URL, menor privilégio, troca de código, verificação) | sim (respostas simuladas do provedor) | não configurado |
| Google Ads (conta gerenciadora, vínculo, aceite) | sim (estados pendente/ativo/recusado/removido) | sim (respostas simuladas) | não configurado |
| Meta (empresa parceira, portfólio, conta de anúncios, página, Instagram, pixel) | sim, com validação humana | parcial (cai em "não configurado") | não configurado |
| IA orientadora | sim (perfil de QA sem vínculo; texto determinístico) | sim (adaptador simulado) | provedor real só com CONNECTIONS_AI_GUIDANCE=true |

## A fazer no QA (nesta ordem)
1. **Google Cloud e OAuth**: projeto, tela de consentimento, GOOGLE_OAUTH_CLIENT_ID e GOOGLE_OAUTH_CLIENT_SECRET.
2. **URLs de callback**: CONNECTIONS_OAUTH_REDIRECT_URI (padrão {PUBLIC_API_URL}/api/connections/oauth/callback) cadastrada no provedor; PUBLIC_API_URL e FRONTEND_URL do QA.
3. **Conta gerenciadora do Google Ads**: GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_MANAGER_CUSTOMER_ID e GOOGLE_ADS_MANAGER_ACCESS_TOKEN.
4. **Meta Business**: META_APP_ID, META_APP_SECRET e ALLKA_META_BUSINESS_ID (portfólio da Allka).
5. **WordPress de teste** com API REST ativa e um usuário temporário/senha de aplicação.
6. **Provedor de IA**: chave real e decisão sobre habilitar CONNECTIONS_AI_GUIDANCE (custo e envio de texto sem segredos).
7. **Armazenamento de segredos**: chave de cifragem própria do QA, fora do repositório.
8. **Smoke tests reais**: conectar, validar, usar, expirar, revogar e retomar, com contas de teste.
9. **Revogação e expiração**: conferir que o provedor também revoga e que a manutenção (a cada 5 min) pausa só as atividades afetadas.
