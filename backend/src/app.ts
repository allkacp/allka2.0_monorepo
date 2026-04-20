import "dotenv/config";
import express from "express";
import cors from "cors";

import authRouter from "./routes/auth";
import usersRouter from "./routes/users";
import clientsRouter from "./routes/clients";
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
import permissionsRouter from "./routes/permissions";
import reportsRouter from "./routes/reports";
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

// ─── Routes ───────────────────────────────────────────────────────────────────

app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/clients", clientsRouter);
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
app.use("/api/permissions", permissionsRouter);
app.use("/api/reports", reportsRouter);

// ─── 404 Handler ──────────────────────────────────────────────────────────────

app.use((_req, res) => {
  res.status(404).json({ error: "Rota não encontrada" });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────

app.use(errorHandler);

export default app;
