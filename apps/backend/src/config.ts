import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Load .env from the backend/ root regardless of cwd
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(8),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PRODUCT_FEEDBACK_ENABLED: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  ROADMAP_API_URL: z.string().optional(),
  ROADMAP_HMAC_KEY_ID: z.string().optional(),
  ROADMAP_HMAC_SECRET: z.string().optional(),
  ROADMAP_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  ROADMAP_INTERNAL_URL: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(
    "❌ Variáveis de ambiente inválidas:",
    parsed.error.flatten().fieldErrors
  );
  process.exit(1);
}

export const config = parsed.data;
