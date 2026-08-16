import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Load .env from the backend/ root regardless of cwd
dotenv.config({ path: path.join(__dirname, "..", ".env") });

const baseEnvSchema = z.object({
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
  // Explicit only — never inferred from NODE_ENV. This project's own
  // NODE_ENV is "production" on the QA VPS too (there's no separate "qa"
  // NODE_ENV value), so inferring the integration's reported environment
  // from NODE_ENV would silently mislabel every QA-created ticket as
  // "production" in the Roadmap.
  PRODUCT_FEEDBACK_ENVIRONMENT: z.enum(["local", "qa", "production"]).optional(),
  ROADMAP_API_URL: z.string().optional(),
  ROADMAP_HMAC_KEY_ID: z.string().optional(),
  ROADMAP_HMAC_SECRET: z.string().optional(),
  ROADMAP_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
  ROADMAP_INTERNAL_URL: z.string().optional(),
  // Purpose-separated from ROADMAP_HMAC_* — only ever signs the SSO
  // handoff (POST .../allka/sso/tickets on the Roadmap), never ticket
  // creation/lookup. Deliberately optional: lib/roadmap-client.ts falls
  // back to ROADMAP_HMAC_KEY_ID/SECRET whenever these are unset, so
  // introducing or rotating this secret is a pure config change, not a
  // coordinated "both sides at once" step.
  ROADMAP_SSO_HMAC_KEY_ID: z.string().optional(),
  ROADMAP_SSO_HMAC_SECRET: z.string().optional(),

  // ── Conexões do projeto — Meta Ads (fase 1 de 6 canais) ──────────────────
  // Todos opcionais de propósito: sem gate cruzado (superRefine) — o único
  // portão é isMetaIntegrationConfigured() em lib/meta-ads-client.ts,
  // checado por cada rota, não no boot. A plataforma inteira continua
  // funcionando com estes 5 em branco; a aba "Conexões" só mostra os cards
  // "Em breve" nesse caso.
  META_APP_ID: z.string().optional(),
  META_APP_SECRET: z.string().optional(),
  META_REDIRECT_URI: z.string().optional(),
  // openssl rand -hex 32 — cifra ProjectConnection.access_token_encrypted.
  META_TOKEN_ENCRYPTION_KEY: z.string().optional(),
  // openssl rand -hex 32 — assina o `state` do fluxo OAuth (CSRF). Par
  // dedicado, nunca reaproveita JWT_SECRET nem a chave acima.
  META_OAUTH_STATE_SECRET: z.string().optional(),
});

// Cross-field: the individual fields above are all .optional() (so the
// integration can stay fully unconfigured in an environment that never
// turns it on), but the moment PRODUCT_FEEDBACK_ENABLED=true, every one of
// them becomes mandatory and must be well-formed — a half-configured
// integration must refuse to boot, not silently run in a broken state.
// Exported so tests can exercise the cross-field validation directly with
// synthetic input, without needing to spawn a subprocess with different
// real environment variables to observe the process.exit(1) below.
export const envSchema = baseEnvSchema.superRefine((data, ctx) => {
  if (!data.PRODUCT_FEEDBACK_ENABLED) return;

  if (!data.PRODUCT_FEEDBACK_ENVIRONMENT) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["PRODUCT_FEEDBACK_ENVIRONMENT"],
      message:
        "obrigatório (local|qa|production) quando PRODUCT_FEEDBACK_ENABLED=true — nunca inferido de NODE_ENV",
    });
  }

  if (!data.ROADMAP_API_URL || !/^https?:\/\/.+/.test(data.ROADMAP_API_URL)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ROADMAP_API_URL"],
      message: "obrigatório e deve ser uma URL http(s) válida quando PRODUCT_FEEDBACK_ENABLED=true",
    });
  }

  if (!data.ROADMAP_HMAC_KEY_ID || data.ROADMAP_HMAC_KEY_ID.trim().length === 0) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ROADMAP_HMAC_KEY_ID"],
      message: "obrigatório quando PRODUCT_FEEDBACK_ENABLED=true",
    });
  }

  if (!data.ROADMAP_HMAC_SECRET || Buffer.byteLength(data.ROADMAP_HMAC_SECRET, "utf8") < 32) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["ROADMAP_HMAC_SECRET"],
      message: "obrigatório e deve ter pelo menos 32 bytes quando PRODUCT_FEEDBACK_ENABLED=true",
    });
  }

  // Never required (falls back to ROADMAP_HMAC_* — see roadmap-client.ts),
  // but if only one half of the pair was set, fail fast with a clear boot
  // error instead of every SSO request quietly failing with a confusing
  // SIGNATURE_MISMATCH later.
  const ssoKeyIdSet = Boolean(data.ROADMAP_SSO_HMAC_KEY_ID?.trim());
  const ssoSecretSet = Boolean(data.ROADMAP_SSO_HMAC_SECRET?.trim());
  if (ssoKeyIdSet || ssoSecretSet) {
    if (!ssoKeyIdSet) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ROADMAP_SSO_HMAC_KEY_ID"],
        message: "obrigatório quando ROADMAP_SSO_HMAC_SECRET está definido",
      });
    }
    if (!ssoSecretSet || Buffer.byteLength(data.ROADMAP_SSO_HMAC_SECRET ?? "", "utf8") < 32) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["ROADMAP_SSO_HMAC_SECRET"],
        message: "obrigatório e deve ter pelo menos 32 bytes quando ROADMAP_SSO_HMAC_KEY_ID está definido",
      });
    }
  }
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
