FROM node:22-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends ca-certificates openssl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/backend/package.json apps/backend/package.json
COPY apps/frontend/package.json apps/frontend/package.json

RUN npm install --include=dev

COPY apps/backend apps/backend
COPY apps/frontend/dev-mocks apps/frontend/dev-mocks

WORKDIR /repo/apps/backend

RUN npx prisma generate

EXPOSE 3001

CMD ["npm", "run", "dev"]