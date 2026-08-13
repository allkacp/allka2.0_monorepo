import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { decideProductFeedbackAccess } from "./product-feedback-access-decision";

const NOW = new Date("2026-08-14T12:00:00Z");
const YESTERDAY = new Date("2026-08-13T12:00:00Z");
const TOMORROW = new Date("2026-08-15T12:00:00Z");

const activeUser = { id: "user-1", isActive: true, status: "ativo" };
const inactiveUser = { id: "user-2", isActive: false, status: "ativo" };
const suspendedUser = { id: "user-3", isActive: true, status: "suspenso" };
const pausedUser = { id: "user-4", isActive: true, status: "pausado" };

const enabledConfig = {
  enabled: true,
  defaultPolicy: "ALLOW_ALL_ACTIVE" as const,
  technicallyConfigured: true,
};

describe("decideProductFeedbackAccess", () => {
  it("denies when not authenticated", () => {
    const result = decideProductFeedbackAccess({
      authenticated: false,
      user: null,
      config: enabledConfig,
      memberGroups: [],
      now: NOW,
    });
    assert.equal(result.canUse, false);
    assert.equal(result.source, "not_authenticated");
  });

  for (const [label, user] of [
    ["inactive", inactiveUser],
    ["suspended", suspendedUser],
    ["paused", pausedUser],
  ] as const) {
    it(`denies a ${label} user even with ALLOW_ALL_ACTIVE`, () => {
      const result = decideProductFeedbackAccess({
        authenticated: true,
        user,
        config: enabledConfig,
        memberGroups: [],
        now: NOW,
      });
      assert.equal(result.canUse, false);
      assert.equal(result.source, "user_inactive");
    });
  }

  it("denies when the technical integration isn't configured", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: { ...enabledConfig, technicallyConfigured: false },
      memberGroups: [],
      now: NOW,
    });
    assert.equal(result.canUse, false);
    assert.equal(result.source, "tech_disabled");
  });

  it("denies when the global product config is disabled, even if technically configured", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: { ...enabledConfig, enabled: false },
      memberGroups: [],
      now: NOW,
    });
    assert.equal(result.canUse, false);
    assert.equal(result.source, "global_disabled");
  });

  it("allows an active user under ALLOW_ALL_ACTIVE with no other rules", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [],
      now: NOW,
    });
    assert.equal(result.canUse, true);
    assert.equal(result.source, "default_policy");
  });

  it("denies under DENY_ALL_EXCEPT_ALLOWED with no other rules", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: { ...enabledConfig, defaultPolicy: "DENY_ALL_EXCEPT_ALLOWED" },
      memberGroups: [],
      now: NOW,
    });
    assert.equal(result.canUse, false);
    assert.equal(result.source, "default_policy");
  });

  it("an ALLOW group overrides a DENY_ALL_EXCEPT_ALLOWED default", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: { ...enabledConfig, defaultPolicy: "DENY_ALL_EXCEPT_ALLOWED" },
      memberGroups: [{ id: "g1", effect: "ALLOW", priority: 1, active: true, expiresAt: null }],
      now: NOW,
    });
    assert.equal(result.canUse, true);
    assert.equal(result.source, "group");
  });

  it("a DENY group overrides an ALLOW_ALL_ACTIVE default", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [{ id: "g1", effect: "DENY", priority: 1, active: true, expiresAt: null }],
      now: NOW,
    });
    assert.equal(result.canUse, false);
    assert.equal(result.source, "group");
  });

  it("higher priority group wins over a lower priority one, regardless of effect", () => {
    const groups = [
      { id: "low-allow", effect: "ALLOW" as const, priority: 1, active: true, expiresAt: null },
      { id: "high-deny", effect: "DENY" as const, priority: 10, active: true, expiresAt: null },
    ];
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: groups,
      now: NOW,
    });
    assert.equal(result.canUse, false);
  });

  it("on a priority tie, DENY wins — order A then B", () => {
    const groups = [
      { id: "allow", effect: "ALLOW" as const, priority: 5, active: true, expiresAt: null },
      { id: "deny", effect: "DENY" as const, priority: 5, active: true, expiresAt: null },
    ];
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: groups,
      now: NOW,
    });
    assert.equal(result.canUse, false);
  });

  it("on a priority tie, DENY wins — order B then A (proves it's not database-order-dependent)", () => {
    const groups = [
      { id: "deny", effect: "DENY" as const, priority: 5, active: true, expiresAt: null },
      { id: "allow", effect: "ALLOW" as const, priority: 5, active: true, expiresAt: null },
    ];
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: groups,
      now: NOW,
    });
    assert.equal(result.canUse, false);
  });

  it("on a priority tie with three groups shuffled every possible way, DENY always wins", () => {
    const allow1 = { id: "a1", effect: "ALLOW" as const, priority: 3, active: true, expiresAt: null };
    const allow2 = { id: "a2", effect: "ALLOW" as const, priority: 3, active: true, expiresAt: null };
    const deny = { id: "d1", effect: "DENY" as const, priority: 3, active: true, expiresAt: null };
    const permutations = [
      [allow1, allow2, deny],
      [allow1, deny, allow2],
      [deny, allow1, allow2],
      [deny, allow2, allow1],
      [allow2, deny, allow1],
      [allow2, allow1, deny],
    ];
    for (const memberGroups of permutations) {
      const result = decideProductFeedbackAccess({
        authenticated: true,
        user: activeUser,
        config: enabledConfig,
        memberGroups,
        now: NOW,
      });
      assert.equal(result.canUse, false, `expected DENY regardless of order: ${memberGroups.map((g) => g.id).join(",")}`);
    }
  });

  it("individual ALLOW override beats a group DENY", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [{ id: "g1", effect: "DENY", priority: 100, active: true, expiresAt: null }],
      override: { effect: "ALLOW", active: true, expiresAt: null },
      now: NOW,
    });
    assert.equal(result.canUse, true);
    assert.equal(result.source, "override");
  });

  it("individual DENY override beats ALLOW_ALL_ACTIVE default", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [],
      override: { effect: "DENY", active: true, expiresAt: null },
      now: NOW,
    });
    assert.equal(result.canUse, false);
    assert.equal(result.source, "override");
  });

  it("an INHERIT override falls through to group/default rules", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [],
      override: { effect: "INHERIT", active: true, expiresAt: null },
      now: NOW,
    });
    assert.equal(result.canUse, true);
    assert.equal(result.source, "default_policy");
  });

  it("an expired override is ignored", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [],
      override: { effect: "DENY", active: true, expiresAt: YESTERDAY },
      now: NOW,
    });
    assert.equal(result.canUse, true);
    assert.equal(result.source, "default_policy");
  });

  it("a not-yet-expired override (expires tomorrow) still applies", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [],
      override: { effect: "DENY", active: true, expiresAt: TOMORROW },
      now: NOW,
    });
    assert.equal(result.canUse, false);
    assert.equal(result.source, "override");
  });

  it("an expired group membership is ignored, falling through to default", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [{ id: "g1", effect: "DENY", priority: 1, active: true, expiresAt: YESTERDAY }],
      now: NOW,
    });
    assert.equal(result.canUse, true);
    assert.equal(result.source, "default_policy");
  });

  it("an inactive (disabled) group is ignored even if not expired", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [{ id: "g1", effect: "DENY", priority: 1, active: false, expiresAt: null }],
      now: NOW,
    });
    assert.equal(result.canUse, true);
    assert.equal(result.source, "default_policy");
  });

  it("an inactive override is ignored", () => {
    const result = decideProductFeedbackAccess({
      authenticated: true,
      user: activeUser,
      config: enabledConfig,
      memberGroups: [],
      override: { effect: "DENY", active: false, expiresAt: null },
      now: NOW,
    });
    assert.equal(result.canUse, true);
    assert.equal(result.source, "default_policy");
  });
});
