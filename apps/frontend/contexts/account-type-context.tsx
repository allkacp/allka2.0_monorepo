"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

export type AccountType =
  | "empresas"
  | "agencias"
  | "nomades"
  | "admin"
  | "parceiro"
  | "lider";
export type AccountSubType = "company" | "in-house" | null;

interface AccountTypeContextType {
  accountType: AccountType;
  accountSubType: AccountSubType;
  setAccountType: (type: AccountType, subType?: AccountSubType) => void;
  isLocked: boolean;
  lockAccountType: () => void;
  unlockAccountType: () => void;
  /** Nome do usuário de preview (só em dev). Null quando não definido. */
  previewUserName: string | null;
  /** Email do usuário de preview (só em dev). Null quando não definido. */
  previewUserEmail: string | null;
  setPreviewUser: (name: string, email: string) => void;
}

const AccountTypeContext = createContext<AccountTypeContextType | undefined>(
  undefined,
);

/** Dedicated localStorage key for persisting the active dev profile. */
const PROFILE_KEY = "dev_active_profile";

/**
 * Infer account type from the current URL path.
 * Used as a last-resort fallback when localStorage has no stored profile.
 */
function inferFromPath(path: string): {
  accountType: AccountType;
  accountSubType: AccountSubType;
} {
  if (path.startsWith("/nomades"))
    return { accountType: "nomades", accountSubType: null };
  if (path.startsWith("/lider"))
    return { accountType: "lider", accountSubType: null };
  if (path.startsWith("/company"))
    return { accountType: "empresas", accountSubType: "company" };
  if (path.startsWith("/agencia"))
    return { accountType: "agencias", accountSubType: null };
  if (path.startsWith("/parceiro"))
    return { accountType: "parceiro", accountSubType: null };
  return { accountType: "admin", accountSubType: null };
}

/**
 * Read the persisted profile synchronously.
 * Order of priority:
 *   1. Dedicated PROFILE_KEY (always up-to-date)
 *   2. Legacy simulatedUser (backward compat)
 *   3. URL-based inference (handles first load with no storage)
 */
function loadStoredProfile(): {
  accountType: AccountType;
  accountSubType: AccountSubType;
  previewUserName: string | null;
  previewUserEmail: string | null;
} {
  try {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.accountType)
        return {
          accountType: p.accountType,
          accountSubType: p.accountSubType ?? null,
          previewUserName: p.previewUserName ?? null,
          previewUserEmail: p.previewUserEmail ?? null,
        };
    }
  } catch {}
  try {
    const raw = localStorage.getItem("simulatedUser");
    if (raw) {
      const p = JSON.parse(raw);
      if (p.accountType)
        return {
          accountType: p.accountType,
          accountSubType: p.accountSubType ?? null,
          previewUserName: p.previewUserName ?? null,
          previewUserEmail: p.previewUserEmail ?? null,
        };
    }
  } catch {}
  const inferred = inferFromPath(window.location.pathname);
  return { ...inferred, previewUserName: null, previewUserEmail: null };
}

export function AccountTypeProvider({ children }: { children: ReactNode }) {
  // Lazy initializer: reads localStorage synchronously on first render.
  // This means the FIRST render already has the correct profile — no flash.
  const stored = loadStoredProfile();
  const [accountType, setAccountTypeState] = useState<AccountType>(
    () => stored.accountType,
  );
  const [accountSubType, setAccountSubType] = useState<AccountSubType>(
    () => stored.accountSubType,
  );
  const [previewUserName, setPreviewUserName] = useState<string | null>(
    () => loadStoredProfile().previewUserName,
  );
  const [previewUserEmail, setPreviewUserEmail] = useState<string | null>(
    () => loadStoredProfile().previewUserEmail,
  );
  const [isLocked, setIsLocked] = useState(false);

  const setAccountType = (
    type: AccountType,
    subType: AccountSubType = null,
  ) => {
    setAccountTypeState(type);
    setAccountSubType(subType);

    // Re-read current preview user values before persisting (they may already
    // be updated by setPreviewUser called in the same event handler).
    // We persist them via setPreviewUser, so here just persist accountType.
    const raw = localStorage.getItem(PROFILE_KEY);
    let stored: Record<string, unknown> = {};
    try {
      stored = raw ? JSON.parse(raw) : {};
    } catch {}
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        ...stored,
        accountType: type,
        accountSubType: subType,
      }),
    );

    // Also keep simulatedUser in sync for backward compatibility.
    try {
      const su = localStorage.getItem("simulatedUser");
      if (su) {
        const user = JSON.parse(su);
        user.accountType = type;
        user.accountSubType = subType;
        localStorage.setItem("simulatedUser", JSON.stringify(user));
      }
    } catch {
      // simulatedUser absent or corrupt — ignore, PROFILE_KEY is the source of truth
    }
  };

  const setPreviewUser = (name: string, email: string) => {
    setPreviewUserName(name);
    setPreviewUserEmail(email);
    // Persist alongside accountType so F5 restores the name too
    const raw = localStorage.getItem(PROFILE_KEY);
    let stored: Record<string, unknown> = {};
    try {
      stored = raw ? JSON.parse(raw) : {};
    } catch {}
    localStorage.setItem(
      PROFILE_KEY,
      JSON.stringify({
        ...stored,
        previewUserName: name,
        previewUserEmail: email,
      }),
    );
  };

  const lockAccountType = () => setIsLocked(true);
  const unlockAccountType = () => setIsLocked(false);

  return (
    <AccountTypeContext.Provider
      value={{
        accountType,
        accountSubType,
        setAccountType,
        isLocked,
        lockAccountType,
        unlockAccountType,
        previewUserName,
        previewUserEmail,
        setPreviewUser,
      }}
    >
      {children}
    </AccountTypeContext.Provider>
  );
}

export function useAccountType() {
  const context = useContext(AccountTypeContext);
  if (context === undefined) {
    throw new Error(
      "useAccountType must be used within an AccountTypeProvider",
    );
  }
  return context;
}
