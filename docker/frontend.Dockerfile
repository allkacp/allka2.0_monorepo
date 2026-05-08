FROM node:22-alpine

WORKDIR /repo

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json

RUN npm install --include=dev

COPY apps/frontend apps/frontend

WORKDIR /repo/apps/frontend

EXPOSE 8080

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]