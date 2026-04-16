// Phusion Passenger / cPanel entrypoint
// Passenger expects app.js at the application root to export an Express app
// or call app.listen() on the port/socket Passenger provides via process.env.PORT

const { config } = require("./dist/config");
const { default: app } = require("./dist/app");
const { prisma } = require("./dist/lib/prisma");

async function start() {
  await prisma.$connect();
  console.log("✅ Banco de dados conectado");

  const port = process.env.PORT || config.PORT || 3001;

  app.listen(port, () => {
    console.log(`🚀 Servidor Allka rodando na porta/socket: ${port}`);
    console.log(`   Ambiente: ${config.NODE_ENV}`);
  });
}

start().catch((err) => {
  console.error("❌ Falha ao iniciar o servidor:", err);
  process.exit(1);
});
