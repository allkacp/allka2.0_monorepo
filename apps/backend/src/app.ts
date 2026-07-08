import "dotenv/config";
import express from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import clientsRouter from "./routes/clients";
import clientRecordsRouter from "./routes/client-records";
import projectsRouter from "./routes/projects";
import tasksRouter from "./routes/tasks";
import dashboardRouter from "./routes/dashboard";
import nomadesRouter from "./routes/nomades";
import nomadeLevelsRouter from "./routes/nomade-levels";
import agenciesRouter from "./routes/agencies";
import productsRouter from "./routes/products";
import specialtiesRouter from "./routes/specialties";
import financialRouter from "./routes/financial";
import billingRouter from "./routes/billing";
import termsRouter from "./routes/terms";
import chatRouter from "./routes/chat";
import allkademyRouter from "./routes/allkademy";
import partnersRouter from "./routes/partners";
import campaignsRouter from "./routes/campaigns";
import couponsRouter from "./routes/coupons";
import permissionsRouter from "./routes/permissions";
import reportsRouter from "./routes/reports";
import adminReportsRouter from "./routes/admin-reports";
import adminSeedRouter from "./routes/admin-seed";
import levelsRouter from "./routes/levels";
import taskTemplatesRouter from "./routes/task-templates";
import projectProductsRouter from "./routes/project-products";
import projectTasksRouter from "./routes/project-tasks";
import systemAlertsRouter from "./routes/system-alerts";
import paymentsRouter from "./routes/payments";
import liderRouter from "./routes/lider";
import habilidadesRouter from "./routes/habilidades";
import shareRouter from "./routes/share";
import expensesRouter from "./routes/expenses";
import walletsRouter from "./routes/wallets";
import squadRouter from "./routes/squad";
import { prisma } from "./lib/prisma";
import { errorHandler } from "./middleware/error";

const app = express();

// ─── Global Middleware ────────────────────────────────────────────────────────

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, Postman)
      if (!origin) return callback(null, true);
      const allowed = [
        "https://dev.allka.com.vc",
        process.env.FRONTEND_URL ?? "",
      ].filter(Boolean);
      // Allow any localhost port in development
      if (/^http:\/\/localhost:\d+$/.test(origin) || allowed.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`CORS: origin '${origin}' not allowed`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ─── Health Check ─────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── Admin Data Health Check (requer autenticação via token) ──────────────────
// Retorna contagens das entidades principais para detectar perda de dados.
app.get("/api/admin/health-check", async (_req, res, next) => {
  try {
    const [products, projects, catalogTasks, projectTasks, companies, nomades] =
      await Promise.all([
        prisma.product.count({ where: { is_active: true } }),
        prisma.project.count(),
        prisma.catalogTask.count({ where: { is_active: true } }),
        prisma.projectTask.count(),
        prisma.company.count(),
        prisma.nomade.count(),
      ]);

    const warnings: string[] = [];
    if (products === 0) warnings.push("Nenhum produto ativo no banco");
    if (catalogTasks === 0) warnings.push("Nenhum modelo de tarefa ativo no banco");
    if (projectTasks === 0 && projects > 0) warnings.push("Projetos sem tarefas operacionais");

    res.json({
      status: warnings.length === 0 ? "ok" : "warning",
      timestamp: new Date().toISOString(),
      counts: { products, projects, catalogTasks, projectTasks, companies, nomades },
      warnings,
      restore_commands: warnings.length > 0 ? [
        "cd apps/backend && npx tsx seed-all-products.ts",
        "cd apps/backend && npx tsx migrate-tasks.ts",
        "cd apps/backend && node seed-in-progress.cjs",
      ] : [],
    });
  } catch (err) {
    next(err);
  }
});

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/clients", clientsRouter);
// Rota nova e paralela da entidade real Client (separada de Company).
// /api/clients continua intocado, servindo o legado (Company).
app.use("/api/client-records", clientRecordsRouter);
app.use("/api/projects", projectsRouter);
app.use("/api/tasks", tasksRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/nomades", nomadesRouter);
app.use("/api/nomade-levels", nomadeLevelsRouter);
app.use("/api/agencies", agenciesRouter);
app.use("/api/products", productsRouter);
app.use("/api/specialties", specialtiesRouter);
app.use("/api/financial", financialRouter);
app.use("/api/billing", billingRouter);
app.use("/api/terms", termsRouter);
app.use("/api/chat", chatRouter);
app.use("/api/allkademy", allkademyRouter);
app.use("/api/partners", partnersRouter);
app.use("/api/campaigns", campaignsRouter);
app.use("/api/coupons", couponsRouter);
app.use("/api/permissions", permissionsRouter);
app.use("/api/reports", reportsRouter);
// Admin report CRUD + permission management
app.use("/api/admin/reports", adminReportsRouter);
// Admin seed — creates company@allka.test test data (idempotent)
app.use("/api/admin/seed", adminSeedRouter);
app.use("/api/levels", levelsRouter);
app.use("/api/task-templates", taskTemplatesRouter);
// project-products também serve /api/project-products/tasks (sub-rota do mesmo router)
app.use("/api/project-products", projectProductsRouter);
// Canonical CRUD for operational execution tasks
app.use("/api/project-tasks", projectTasksRouter);
// Admin system alerts (nomad not found, etc.)
app.use("/api/system-alerts", systemAlertsRouter);
// Payments — sandbox/fake checkout + real gateway future
app.use("/api/payments", paymentsRouter);
// Lider — task qualification and approval flow
app.use("/api/lider", liderRouter);
// Habilidades — nomad skills and leader area CRUD
app.use("/api/habilidades", habilidadesRouter);
// Share links — public endpoint (no auth required)
app.use("/api/share", shareRouter);
// Expenses — operational expenses of Allka (separate from CMV/costs)
app.use("/api/expenses", expensesRouter);
// Wallets — unified ledger for company/agency/nomad/partner/platform accounts
app.use("/api/wallets", walletsRouter);
// Squad — plano pós-pago com limite de crédito
app.use("/api/squad", squadRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

export default app;
