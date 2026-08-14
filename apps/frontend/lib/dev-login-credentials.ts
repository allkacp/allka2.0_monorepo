/**
 * Local-dev-only login prefill for the login pages (Admin/Nomad/Agency/
 * Company/Leader). Values come from
 * `.env.local` (gitignored — see `.env.local.example` in this folder for
 * the variable names, never a real value) and this function only ever
 * returns something when BOTH are true:
 *
 *   1. `import.meta.env.DEV` — a build-time constant. `vite build`
 *      (production) always compiles this to `false`, so this whole branch
 *      is dead code in a production bundle no matter what's in `.env.local`.
 *   2. the page is actually being viewed from localhost/127.0.0.1 — so
 *      even a misconfigured dev server exposed on a LAN/tunnel won't leak
 *      prefilled credentials to someone else's browser.
 *
 * `.env.local` never exists on a CI or production build machine (it's
 * gitignored and developer-machine-only), so the real email/password
 * strings never reach a built bundle in the first place — see
 * scripts/scan-build-for-credentials.mjs for the automated proof.
 *
 * Also excludes vitest (`import.meta.env.MODE === "test"`): vitest runs
 * with DEV=true and jsdom's default hostname is "localhost", so without
 * this guard any login-page test would silently get real prefilled values
 * instead of starting from an empty field (caught the hard way on the
 * Roadmap side's LoginPage.test.tsx — see the matching guard there).
 */
export function devLoginPrefill(key: string): { email: string; password: string } | undefined {
  const isLocalDev =
    import.meta.env.DEV &&
    import.meta.env.MODE !== "test" &&
    typeof window !== "undefined" &&
    (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");
  if (!isLocalDev) return undefined;

  const env = import.meta.env as unknown as Record<string, string | undefined>;
  const email = env[`VITE_DEV_LOGIN_${key}_EMAIL`];
  const password = env[`VITE_DEV_LOGIN_${key}_PASSWORD`] ?? env.VITE_DEV_LOGIN_PASSWORD;
  if (!email) return undefined;
  return { email, password: password ?? "" };
}
