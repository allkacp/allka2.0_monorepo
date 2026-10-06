# Navegador seguro (D3): Chromium real em contêiner isolado, controlado pelo backend e transmitido por WebSocket.
# A versão do Playwright PRECISA ser a mesma da imagem base (v1.49.1).
FROM mcr.microsoft.com/playwright:v1.49.1-jammy
WORKDIR /app
COPY docker/browser-runner/package.json ./package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY docker/browser-runner/server.js ./server.js
ENV NODE_ENV=production PORT=7000
EXPOSE 7000
USER pwuser
CMD ["node", "server.js"]
