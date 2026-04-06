import { config } from "./config";
import app from "./app";
import { prisma } from "./lib/prisma";

async function main() {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log("✅ Banco de dados conectado");

  app.listen(config.PORT, () => {
    console.log(`🚀 Servidor Allka rodando em http://localhost:${config.PORT}`);
    console.log(`   Health: http://localhost:${config.PORT}/api/health`);
    console.log(`   Ambiente: ${config.NODE_ENV}`);
  });
}

main().catch((err) => {
  console.error("❌ Falha ao iniciar o servidor:", err);
  process.exit(1);
});
