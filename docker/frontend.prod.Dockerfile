FROM node:22-bookworm-slim AS build

WORKDIR /app

ARG VITE_API_URL=https://api-dev.allka.com.vc/api
ARG VITE_USE_MOCKS=false
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_USE_MOCKS=${VITE_USE_MOCKS}

COPY package.json package-lock.json ./
COPY apps/frontend/package.json apps/frontend/package.json
COPY apps/backend/package.json apps/backend/package.json
RUN npm ci --workspace apps/frontend

COPY apps/frontend apps/frontend
WORKDIR /app/apps/frontend
RUN npm run build

FROM nginx:1.27-alpine AS runtime

COPY infra/nginx/frontend.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/apps/frontend/dist /usr/share/nginx/html

EXPOSE 80