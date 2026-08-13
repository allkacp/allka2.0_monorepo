import { z } from "zod";

/**
 * Versioned contract between the Allka platform (this repo) and the
 * Roadmap service (allka-roadmap). Nothing here is wired to a live route
 * yet — it exists so both repositories agree on shapes before the real
 * server-to-server integration is built. See
 * docs/roadmap-integration-contract-v1.md for the full narrative (auth
 * model, error codes, "never send" list, diagram). The original narrative
 * also still lives at entregas/CONTRATO-INTEGRACAO-ROADMAP-V1.md — that
 * copy is kept as-is; docs/ is the versioned, tracked source of truth.
 *
 * Mirrored, byte-for-byte compatible, in allka-roadmap at
 * apps/backend/src/contracts/allka-integration.ts. Bump both together.
 *
 * allka-roadmap validates these shapes with vitest
 * (allka-integration.contract.test.ts). This repo's apps/backend has no
 * test runner wired into package.json for anything else, so this contract
 * gets its own minimal one: roadmap-integration-contract.test.ts, run with
 * `npm run test:roadmap-contract --workspace apps/backend` via
 * `tsx --test` + node:assert/strict — no new test framework dependency.
 *
 * 1.1.0: added optional identity.displayName/userCode (still no email,
 * password, or token — see the "never send" list); added the HMAC signed-
 * request header shapes. Every 1.0.0 field/shape is unchanged, so a 1.0.0
 * caller remains valid against this schema.
 */
export const CONTRACT_VERSION = "1.1.0";
export const CONTRACT_API_PREFIX = "/api/v1/integrations";

// ---------------------------------------------------------------------------
// Shared primitives
// ---------------------------------------------------------------------------

/** ALK-123 style protocol handed back to the requesting user. */
export const ProtocolSchema = z.string().regex(/^ALK-\d+$/);

/** The identity the Allka platform vouches for. The Roadmap never sees an
 * Allka session, cookie, or JWT — only this stable external id, derived
 * server-side by Allka from its own authenticated session. Allka must
 * never forward an externalUserId supplied by the browser. */
export const ExternalIdentitySchema = z
  .object({
    externalUserId: z.string().min(1).max(191),
    /** Optional, for display in the Roadmap's internal panel only — never
     * used for authorization or lookup. No email, no token. */
    displayName: z.string().min(1).max(200).optional(),
    /** Optional short public-facing code (e.g. an internal employee code),
     * distinct from externalUserId. Display only. */
    userCode: z.string().min(1).max(50).optional(),
    externalWorkspaceContext: z
      .object({
        companyId: z.string().max(191).optional(),
        agencyId: z.string().max(191).optional(),
        portal: z.string().max(100).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

// ---------------------------------------------------------------------------
// HMAC request signing (v1.1.0) — see docs/roadmap-integration-contract-v1.md
// for the full canonical-string spec. These schemas describe the three
// header values as they arrive over the wire; they don't validate the
// signature itself (that's lib/roadmap-hmac.ts's job).
// ---------------------------------------------------------------------------

export const HmacHeadersSchema = z.object({
  "x-allka-key-id": z.string().min(1).max(100),
  "x-allka-timestamp": z.string().regex(/^\d+$/),
  "x-allka-signature": z.string().regex(/^v1=[0-9a-f]{64}$/i),
});

/** Where the user was, described safely: sanitized pathname only — never a
 * full URL, never a fragment, never a raw querystring. */
export const PageContextSchema = z
  .object({
    pathname: z.string().min(1).max(500),
    pageTitle: z.string().max(200).optional(),
    environment: z.enum(["production", "qa", "local"]),
    frontendVersion: z.string().max(100).optional(),
  })
  .strict();

export const AttachmentRefSchema = z
  .object({
    fileName: z.string().min(1).max(200),
    mimeType: z.string().min(1).max(100),
    sizeBytes: z
      .number()
      .int()
      .positive()
      .max(10 * 1024 * 1024),
    storageRef: z.string().min(1),
  })
  .strict();

// ---------------------------------------------------------------------------
// Contextual creation (Allka -> Roadmap)
// ---------------------------------------------------------------------------

export const WorkItemContextualCreateRequestSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    correlationId: z.string().uuid(),
    type: z.enum(["PROBLEM", "IDEA", "IMPROVEMENT"]),
    title: z.string().min(3).max(200),
    description: z.string().min(3).max(5000),
    identity: ExternalIdentitySchema,
    page: PageContextSchema,
    steps: z.string().max(2000).optional(),
    expectedResult: z.string().max(1000).optional(),
    actualResult: z.string().max(1000).optional(),
    impact: z.string().max(1000).optional(),
    attachment: AttachmentRefSchema.optional(),
  })
  .strict();
export type WorkItemContextualCreateRequest = z.infer<
  typeof WorkItemContextualCreateRequestSchema
>;

export const WorkItemContextualCreateResponseSchema = z
  .object({
    ok: z.literal(true),
    protocol: ProtocolSchema,
  })
  .strict();

// ---------------------------------------------------------------------------
// Query and status (Allka -> Roadmap, on behalf of the logged-in user)
// ---------------------------------------------------------------------------

/** Deliberately smaller than the Roadmap's internal 15-value WorkItemStatus
 * enum — the public vocabulary a common user is shown. */
export const PublicStatusSchema = z.enum([
  "RECEIVED",
  "IN_PROGRESS",
  "IN_VALIDATION",
  "RESOLVED",
  "REOPENED",
  "CANCELLED",
]);

export const PublicCommentSchema = z
  .object({
    author: z.string().min(1).max(120),
    content: z.string().min(1).max(2000),
    createdAt: z.string().datetime(),
  })
  .strict();

export const WorkItemPublicStatusSchema = z
  .object({
    protocol: ProtocolSchema,
    status: PublicStatusSchema,
    updatedAt: z.string().datetime(),
    solutionSummary: z.string().max(2000).nullable(),
    release: z
      .object({ version: z.string().max(50), name: z.string().max(200) })
      .strict()
      .nullable(),
    validated: z.boolean(),
    publicComments: z.array(PublicCommentSchema).max(200),
  })
  .strict();

export const WorkItemListQuerySchema = z
  .object({
    identity: ExternalIdentitySchema,
    updatedSince: z.string().datetime().optional(),
    cursor: z.string().optional(),
    limit: z.number().int().positive().max(100).default(20),
  })
  .strict();

// ---------------------------------------------------------------------------
// Durable events (outbox on both sides)
// ---------------------------------------------------------------------------

export const IntegrationEventTypeSchema = z.enum([
  "work_item.created",
  "work_item.updated",
  "work_item.status_changed",
  "work_item.resolved",
  "work_item.reopened",
  "release.published",
]);

export const IntegrationEventEnvelopeSchema = z
  .object({
    eventId: z.string().uuid(),
    eventType: IntegrationEventTypeSchema,
    occurredAt: z.string().datetime(),
    correlationId: z.string().uuid(),
    source: z.enum(["allka-roadmap", "allka-platform"]),
    signatureKeyId: z.string().min(1),
    payload: z.record(z.string(), z.unknown()),
  })
  .strict();
export type IntegrationEventEnvelope = z.infer<
  typeof IntegrationEventEnvelopeSchema
>;

// ---------------------------------------------------------------------------
// GitHub / deploy linkage (informational only — never auto-closes an item)
// ---------------------------------------------------------------------------

export const GithubLinkEventSchema = z
  .object({
    protocol: ProtocolSchema,
    githubEvent: z.enum(["pr_opened", "pr_merged", "deploy_succeeded"]),
    repo: z.string().min(1).max(200),
    ref: z.string().min(1).max(200),
    occurredAt: z.string().datetime(),
  })
  .strict();

// ---------------------------------------------------------------------------
// Error envelope shared by every integration endpoint
// ---------------------------------------------------------------------------

export const IntegrationErrorCodeSchema = z.enum([
  "INVALID_PAYLOAD",
  "INVALID_SIGNATURE",
  "IDEMPOTENCY_CONFLICT",
  "UNKNOWN_EXTERNAL_USER",
  "RATE_LIMITED",
  "INTEGRATION_DISABLED",
]);

export const IntegrationErrorResponseSchema = z
  .object({
    ok: z.literal(false),
    code: IntegrationErrorCodeSchema,
    message: z.string(),
  })
  .strict();
