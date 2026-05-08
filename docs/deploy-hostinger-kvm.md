# Deploy Hostinger KVM

Este projeto publica duas imagens no GHCR e faz deploy no VPS por SSH usando Docker Compose:

- `dev.allka.com.vc`: frontend Nginx servido pelo Caddy.
- `api-dev.allka.com.vc`: backend Express servido pelo Caddy.
- `mysql`: MySQL 8.4 em volume Docker no mesmo VPS.

## DNS

Crie registros `A` apontando para o IP do KVM:

- `dev.allka.com.vc`
- `api-dev.allka.com.vc`

## Preparar o VPS

No Ubuntu 24 LTS, execute:

```bash
curl -fsSL https://raw.githubusercontent.com/OWNER/REPO/main/installer/vps-setup.sh -o vps-setup.sh
bash vps-setup.sh
```

Se o usuario foi adicionado ao grupo `docker`, saia e entre novamente no SSH.

## Secrets do GitHub

Configure em `Settings > Secrets and variables > Actions`:

- `VPS_HOST`: IP ou host do KVM.
- `VPS_USER`: usuario SSH.
- `VPS_SSH_KEY`: chave privada SSH autorizada no VPS.
- `MYSQL_PASSWORD`: senha do usuario MySQL da aplicacao.
- `MYSQL_ROOT_PASSWORD`: senha root do MySQL.
- `JWT_SECRET`: segredo JWT com pelo menos 32 caracteres.

Opcionais:

- `VPS_SSH_PORT`: padrao `22`.
- `VPS_DEPLOY_PATH`: padrao `/opt/allka-2026`.
- `MYSQL_DATABASE`: padrao `allka`.
- `MYSQL_USER`: padrao `allka`.
- `VITE_API_URL`: padrao `https://api-dev.allka.com.vc/api`.
- `GHCR_PAT`: token com permissao de leitura de packages se o pacote GHCR ficar privado.

Use senhas MySQL sem caracteres de URL como `@`, `/`, `:` e `#`, pois elas entram na `DATABASE_URL` do Prisma.

## Deploy

Ao fazer push em `main` ou `master`, a workflow `.github/workflows/deploy.yml`:

1. Builda backend e frontend.
2. Publica as imagens no GitHub Container Registry.
3. Envia `docker-compose.yml`, `.env`, `.env.backend` e `Caddyfile` para o VPS.
4. Executa migrations Prisma MySQL.
5. Sobe `mysql`, `backend`, `frontend` e `caddy`.

Tambem e possivel disparar manualmente por `workflow_dispatch`.