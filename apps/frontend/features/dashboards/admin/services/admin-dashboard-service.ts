// @ts-nocheck
import type { ShareConfig } from "../types/admin-dashboard.types";

// ─── Share token generation ───────────────────────────────────────────────────

export const generatePublicToken = (
  config: ShareConfig,
  extras?: { profile?: string; period?: object; allowFilterChanges?: boolean },
): string => {
  const payload = {
    target: config.target,
    permission: config.permission,
    pin: config.pin ?? null,
    expiry: config.expiry ? config.expiry.toISOString() : null,
    issued: new Date().toISOString(),
    ...(extras?.profile ? { profile: extras.profile } : {}),
    ...(extras?.period ? { period: extras.period } : {}),
    ...(extras?.allowFilterChanges !== undefined ? { allowFilterChanges: extras.allowFilterChanges } : {}),
    v: 2,
  };
  return btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
};
