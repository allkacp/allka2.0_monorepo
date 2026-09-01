FROM node:22-bookworm-slim AS build

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace apps/backend --ignore-scripts

COPY apps/backend apps/backend
WORKDIR /app/apps/backend
RUN npx prisma generate
RUN npm run build

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates dumb-init openssl \
  && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json
RUN npm ci --workspace apps/backend --omit=dev --ignore-scripts \
  && npm cache clean --force

COPY --from=build /app/node_modules/.prisma /app/node_modules/.prisma
COPY --from=build /app/node_modules/@prisma/client /app/node_modules/@prisma/client
COPY --from=build /app/apps/backend/dist /app/apps/backend/dist
COPY --from=build /app/apps/backend/prisma /app/apps/backend/prisma
# Cliente Prisma do Legacy (schema separado, gerado por `db:legacy:generate`
# durante o build acima) sai em src/legacy/generated/ -- tsc nunca copia isso
# pra dist/ (não é .ts, então não passa pela compilação). dist/legacy/
# legacy-prisma.js faz `require("./generated")` esperando encontrar em
# dist/legacy/generated -- sem esta linha o backend crasha no boot com
# "Cannot find module './generated'" (visto em produção: run 33509916614).
COPY --from=build /app/apps/backend/src/legacy/generated /app/apps/backend/dist/legacy/generated
COPY apps/backend/reset-users-password.cjs /app/apps/backend/reset-users-password.cjs

WORKDIR /app/apps/backend
EXPOSE 3001

CMD ["dumb-init", "npm", "run", "start"]