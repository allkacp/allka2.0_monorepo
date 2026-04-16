import { config } from "./config";
import app from "./app";
import { prisma } from "./lib/prisma";

async function main() {
  // Verify DB connection on startup
  await prisma.$connect();
  console.log("✅ Banco de dados conectado");

  // Passenger/cPanel sets PORT as a socket path or port number
  // Use process.env.PORT directly to support both TCP and Unix socket
  const port = process.env.PORT || config.PORT;

  app.listen(port, () => {
    console.log(`🚀 Servidor Allka rodando na porta/socket: ${port}`);
    console.log(`   Ambiente: ${config.NODE_ENV}`);
  });
}

main().catch((err) => {
  console.error("❌ Falha ao iniciar o servidor:", err);
  process.exit(1);
});
