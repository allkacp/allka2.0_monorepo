import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  evaluateRetainedAccount,
  RETAINED_ACCOUNT_EMAILS,
  RawAccountRows,
  RetentionManifestError,
} from "./retention-manifest";

function emptyRaw(overrides: Partial<RawAccountRows> = {}): RawAccountRows {
  return {
    user: null,
    memberAgency: null,
    ownedAgency: null,
    memberCompany: null,
    ownedCompany: null,
    adminProfile: null,
    nomade: null,
    partnerProfile: null,
    ...overrides,
  };
}

describe("RETAINED_ACCOUNT_EMAILS", () => {
  it("is exactly the four emails from the request, in order", () => {
    assert.deepEqual(RETAINED_ACCOUNT_EMAILS, [
      "cp@lamego.com.vc",
      "gabriel@lamego.com.vc",
      "valderio@lamego.com.vc",
      "nomad@allka.com.vc",
    ]);
  });
});

describe("evaluateRetainedAccount", () => {
  it("resolves an admin account (cp@lamego.com.vc shape) with its admin profile as the minimal set", () => {
    const raw = emptyRaw({
      user: {
        id: "u-admin",
        email: "cp@lamego.com.vc",
        name: "Vinicius Guardia",
        role: "admin",
        account_type: "admin",
        status: "ativo",
        is_active: true,
        company_id: null,
        agency_id: null,
        admin_profile_id: "ap-master",
      },
      adminProfile: { id: "ap-master", name: "Master" },
    });

    const result = evaluateRetainedAccount("cp@lamego.com.vc", raw);

    assert.equal(result.user_id, "u-admin");
    assert.equal(result.role, "admin");
    assert.deepEqual(result.minimal_required_records, [
      "users.u-admin (cp@lamego.com.vc) — identidade e autenticação",
      "admin_profiles.ap-master (Master) — permissão de admin (estrutural, compartilhado)",
    ]);
    assert.ok(result.not_automatically_retained.length > 0);
    assert.ok(result.not_automatically_retained.some((s) => /projetos/i.test(s)));
  });

  it("resolves an agency-owner account (gabriel@lamego.com.vc shape) with its owned agency", () => {
    const raw = emptyRaw({
      user: {
        id: "u-gabriel",
        email: "gabriel@lamego.com.vc",
        name: "Gabriel Franco",
        role: "agency_admin",
        account_type: "agencias",
        status: "ativo",
        is_active: true,
        company_id: null,
        agency_id: "ag-gabriel",
        admin_profile_id: null,
      },
      memberAgency: { id: "ag-gabriel", name: "Gabriel Franco Agency", status: "ativo" },
      ownedAgency: { id: "ag-gabriel", name: "Gabriel Franco Agency", status: "ativo" },
    });

    const result = evaluateRetainedAccount("gabriel@lamego.com.vc", raw);
    assert.deepEqual(result.minimal_required_records, [
      "users.u-gabriel (gabriel@lamego.com.vc) — identidade e autenticação",
      "agencies.ag-gabriel (Gabriel Franco Agency) — vínculo de dono",
    ]);
  });

  it("resolves an agency-owner with a partner profile (valderio@lamego.com.vc shape)", () => {
    const raw = emptyRaw({
      user: {
        id: "u-valderio",
        email: "valderio@lamego.com.vc",
        name: "Valdério Santos",
        role: "agency_admin",
        account_type: "agencias",
        status: "ativo",
        is_active: true,
        company_id: null,
        agency_id: "ag-valderio",
        admin_profile_id: null,
      },
      memberAgency: { id: "ag-valderio", name: "Valdério Santos Parcerias", status: "ativo" },
      ownedAgency: { id: "ag-valderio", name: "Valdério Santos Parcerias", status: "ativo" },
      partnerProfile: { id: "pp-valderio", agency_id: "ag-valderio", status: "active" },
    });

    const result = evaluateRetainedAccount("valderio@lamego.com.vc", raw);
    assert.deepEqual(result.minimal_required_records, [
      "users.u-valderio (valderio@lamego.com.vc) — identidade e autenticação",
      "agencies.ag-valderio (Valdério Santos Parcerias) — vínculo de dono",
      "partner_profiles.pp-valderio — vínculo de parceiro da agência retida",
    ]);
  });

  it("resolves a nomad account (nomad@allka.com.vc shape) without dragging in business history", () => {
    const raw = emptyRaw({
      user: {
        id: "u-nomad",
        email: "nomad@allka.com.vc",
        name: "[TESTE LOCAL] Nômade QA",
        role: "nomad",
        account_type: "nomades",
        status: "ativo",
        is_active: true,
        company_id: null,
        agency_id: null,
        admin_profile_id: null,
      },
      nomade: { id: "nm-qa", name: "[TESTE LOCAL] Nômade QA", status: "ativo" },
    });

    const result = evaluateRetainedAccount("nomad@allka.com.vc", raw);
    assert.deepEqual(result.minimal_required_records, [
      "users.u-nomad (nomad@allka.com.vc) — identidade e autenticação",
      "nomades.nm-qa ([TESTE LOCAL] Nômade QA) — perfil de nômade (só identidade, sem histórico/carteira)",
    ]);
    // Wallet/qualifications/habilidades/task history never appear anywhere in the result.
    assert.ok(!JSON.stringify(result).match(/wallet|qualification|habilidade|task/i));
  });

  it("throws RetentionManifestError, naming the email, when the account does not exist", () => {
    assert.throws(
      () => evaluateRetainedAccount("nao-existe@lamego.com.vc", emptyRaw()),
      (err: unknown) => err instanceof RetentionManifestError && /nao-existe@lamego.com.vc/.test(err.message),
    );
  });

  it("throws when company_id and agency_id are both set (violates the at-most-one invariant)", () => {
    const raw = emptyRaw({
      user: {
        id: "u-x",
        email: "x@lamego.com.vc",
        name: "X",
        role: "company_admin",
        account_type: "empresas",
        status: "ativo",
        is_active: true,
        company_id: "co-1",
        agency_id: "ag-1",
        admin_profile_id: null,
      },
      memberCompany: { id: "co-1", name: "Co", status: "ativo" },
      memberAgency: { id: "ag-1", name: "Ag", status: "ativo" },
    });
    assert.throws(() => evaluateRetainedAccount("x@lamego.com.vc", raw), /ambíguo/i);
  });

  it("throws when agency_id points at an agency that no longer exists (orphaned link)", () => {
    const raw = emptyRaw({
      user: {
        id: "u-orphan",
        email: "orphan@lamego.com.vc",
        name: "Orphan",
        role: "agency_admin",
        account_type: "agencias",
        status: "ativo",
        is_active: true,
        company_id: null,
        agency_id: "ag-missing",
        admin_profile_id: null,
      },
    });
    assert.throws(() => evaluateRetainedAccount("orphan@lamego.com.vc", raw), /quebrado/i);
  });

  it("throws when the account owns one agency but is a member of a different one", () => {
    const raw = emptyRaw({
      user: {
        id: "u-split",
        email: "split@lamego.com.vc",
        name: "Split",
        role: "agency_admin",
        account_type: "agencias",
        status: "ativo",
        is_active: true,
        company_id: null,
        agency_id: "ag-member",
        admin_profile_id: null,
      },
      memberAgency: { id: "ag-member", name: "Member Agency", status: "ativo" },
      ownedAgency: { id: "ag-owned", name: "Owned Agency", status: "ativo" },
    });
    assert.throws(() => evaluateRetainedAccount("split@lamego.com.vc", raw), /ambíguo/i);
  });

  it("throws when the account has both a nomad profile and an owned agency", () => {
    const raw = emptyRaw({
      user: {
        id: "u-dual",
        email: "dual@lamego.com.vc",
        name: "Dual",
        role: "nomad",
        account_type: "nomades",
        status: "ativo",
        is_active: true,
        company_id: null,
        agency_id: null,
        admin_profile_id: null,
      },
      ownedAgency: { id: "ag-1", name: "Ag", status: "ativo" },
      nomade: { id: "nm-1", name: "Dual", status: "ativo" },
    });
    assert.throws(() => evaluateRetainedAccount("dual@lamego.com.vc", raw), /ambíguo/i);
  });

  it("throws when admin_profile_id points at a profile that no longer exists", () => {
    const raw = emptyRaw({
      user: {
        id: "u-badadmin",
        email: "badadmin@lamego.com.vc",
        name: "Bad Admin",
        role: "admin",
        account_type: "admin",
        status: "ativo",
        is_active: true,
        company_id: null,
        agency_id: null,
        admin_profile_id: "ap-missing",
      },
    });
    assert.throws(() => evaluateRetainedAccount("badadmin@lamego.com.vc", raw), /quebrado/i);
  });
});
