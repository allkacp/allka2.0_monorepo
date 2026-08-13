import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONTRACT_API_PREFIX,
  CONTRACT_VERSION,
  GithubLinkEventSchema,
  IntegrationErrorResponseSchema,
  IntegrationEventEnvelopeSchema,
  ProtocolSchema,
  WorkItemContextualCreateRequestSchema,
  WorkItemContextualCreateResponseSchema,
  WorkItemListQuerySchema,
  WorkItemPublicStatusSchema,
} from "./roadmap-integration-contract.js";

// Mirrors allka-roadmap's apps/backend/src/contracts/allka-integration.contract.test.ts
// (same fixtures, same claims) using node:test + node:assert/strict instead
// of vitest, since this repo's apps/backend has no test framework wired up
// yet. Run with: npm run test:roadmap-contract --workspace apps/backend
// (tsx --test under the hood). No network, no database, no live route.

const validCreateRequest = {
  idempotencyKey: "6c1f7c3e-5a4b-4b8e-9c2d-0a1b2c3d4e5f",
  correlationId: "b2e6a1f0-1234-4abc-8def-9876543210ab",
  type: "PROBLEM" as const,
  title: "O botão de salvar não responde",
  description: "Ao clicar em salvar, nada acontece e o formulário some.",
  identity: { externalUserId: "user-12345" },
  page: {
    pathname: "/empresas/123/produtos",
    environment: "production" as const,
  },
};

describe("contract version and prefix", () => {
  it("exposes CONTRACT_VERSION 1.0.0", () => {
    assert.equal(CONTRACT_VERSION, "1.0.0");
  });

  it("exposes the /api/v1/integrations prefix", () => {
    assert.equal(CONTRACT_API_PREFIX, "/api/v1/integrations");
  });
});

describe("ProtocolSchema", () => {
  it("accepts an ALK-123 style protocol", () => {
    assert.doesNotThrow(() => ProtocolSchema.parse("ALK-482"));
  });

  it("rejects a protocol without the ALK- prefix", () => {
    assert.throws(() => ProtocolSchema.parse("482"));
  });
});

describe("WorkItemContextualCreateRequestSchema", () => {
  it("accepts a minimal valid contextual creation request", () => {
    assert.doesNotThrow(() => WorkItemContextualCreateRequestSchema.parse(validCreateRequest));
  });

  it("accepts qa as a page.environment value (this project's real test environment name)", () => {
    const withQa = {
      ...validCreateRequest,
      page: { ...validCreateRequest.page, environment: "qa" as const },
    };
    assert.doesNotThrow(() => WorkItemContextualCreateRequestSchema.parse(withQa));
  });

  it("rejects homolog as a page.environment value", () => {
    const withHomolog = {
      ...validCreateRequest,
      page: { ...validCreateRequest.page, environment: "homolog" },
    };
    assert.throws(() => WorkItemContextualCreateRequestSchema.parse(withHomolog));
  });

  it("rejects a request carrying an extra field (.strict())", () => {
    const withCookie = { ...validCreateRequest, cookie: "session=abc123" };
    assert.throws(() => WorkItemContextualCreateRequestSchema.parse(withCookie));
  });

  it("rejects a missing idempotencyKey", () => {
    const withoutKey: Record<string, unknown> = { ...validCreateRequest };
    delete withoutKey.idempotencyKey;
    assert.throws(() => WorkItemContextualCreateRequestSchema.parse(withoutKey));
  });

  it("rejects an unknown work item type", () => {
    const badType = { ...validCreateRequest, type: "BUG" };
    assert.throws(() => WorkItemContextualCreateRequestSchema.parse(badType));
  });
});

describe("WorkItemContextualCreateResponseSchema", () => {
  it("accepts a valid ALK-123 protocol response", () => {
    assert.doesNotThrow(() =>
      WorkItemContextualCreateResponseSchema.parse({ ok: true, protocol: "ALK-482" }),
    );
  });
});

describe("WorkItemPublicStatusSchema and WorkItemListQuerySchema", () => {
  const validStatus = {
    protocol: "ALK-482",
    status: "IN_PROGRESS" as const,
    updatedAt: "2026-08-13T10:00:00.000Z",
    solutionSummary: null,
    release: null,
    validated: false,
    publicComments: [],
  };

  it("accepts a valid public status view", () => {
    assert.doesNotThrow(() => WorkItemPublicStatusSchema.parse(validStatus));
  });

  it("rejects an internal-only status value leaking into the public view", () => {
    assert.throws(() => WorkItemPublicStatusSchema.parse({ ...validStatus, status: "IN_REVIEW" }));
  });

  it("applies the default limit of 20 when omitted", () => {
    const parsed = WorkItemListQuerySchema.parse({ identity: { externalUserId: "user-12345" } });
    assert.equal(parsed.limit, 20);
  });

  it("rejects a limit above 100", () => {
    assert.throws(() =>
      WorkItemListQuerySchema.parse({ identity: { externalUserId: "user-12345" }, limit: 500 }),
    );
  });
});

describe("IntegrationEventEnvelopeSchema", () => {
  const validEvent = {
    eventId: "6c1f7c3e-5a4b-4b8e-9c2d-0a1b2c3d4e5f",
    eventType: "work_item.status_changed" as const,
    occurredAt: "2026-08-13T10:00:00.000Z",
    correlationId: "b2e6a1f0-1234-4abc-8def-9876543210ab",
    source: "allka-roadmap" as const,
    signatureKeyId: "key-2026-08",
    payload: { protocol: "ALK-482", from: "IN_DEVELOPMENT", to: "IN_VALIDATION" },
  };

  it("accepts a valid event envelope", () => {
    assert.doesNotThrow(() => IntegrationEventEnvelopeSchema.parse(validEvent));
  });

  it("rejects an unknown eventType", () => {
    assert.throws(() =>
      IntegrationEventEnvelopeSchema.parse({ ...validEvent, eventType: "work_item.deleted" }),
    );
  });
});

describe("GithubLinkEventSchema", () => {
  it("accepts a pr_merged event", () => {
    assert.doesNotThrow(() =>
      GithubLinkEventSchema.parse({
        protocol: "ALK-482",
        githubEvent: "pr_merged",
        repo: "allkacp/allka-roadmap",
        ref: "6cb6df0",
        occurredAt: "2026-08-13T10:00:00.000Z",
      }),
    );
  });

  it("rejects an unknown githubEvent", () => {
    assert.throws(() =>
      GithubLinkEventSchema.parse({
        protocol: "ALK-482",
        githubEvent: "pr_closed",
        repo: "allkacp/allka-roadmap",
        ref: "6cb6df0",
        occurredAt: "2026-08-13T10:00:00.000Z",
      }),
    );
  });
});

describe("IntegrationErrorResponseSchema", () => {
  it("accepts every documented error code", () => {
    const codes = [
      "INVALID_PAYLOAD",
      "INVALID_SIGNATURE",
      "IDEMPOTENCY_CONFLICT",
      "UNKNOWN_EXTERNAL_USER",
      "RATE_LIMITED",
      "INTEGRATION_DISABLED",
    ] as const;
    for (const code of codes) {
      assert.doesNotThrow(() =>
        IntegrationErrorResponseSchema.parse({ ok: false, code, message: "x" }),
      );
    }
  });

  it("rejects an undocumented error code", () => {
    assert.throws(() =>
      IntegrationErrorResponseSchema.parse({ ok: false, code: "SERVER_ERROR", message: "x" }),
    );
  });
});
