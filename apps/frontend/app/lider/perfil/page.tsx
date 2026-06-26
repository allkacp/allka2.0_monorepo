// @ts-nocheck
"use client";

import { useState, useEffect } from "react";
import { AlertTriangle, Loader2, User, Mail, Briefcase, Phone, Tag } from "lucide-react";
import { PageHeader } from "@/components/page-header";

const API_BASE =
  (typeof import.meta !== "undefined" &&
    (import.meta as any).env?.VITE_API_URL) ||
  "/api";

function getToken() {
  try { return localStorage.getItem("allka_token"); } catch { return null; }
}

async function apiFetch(path: string) {
  const url = `${API_BASE}${path}`;
  const token = getToken();
  const res = await fetch(url, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(j.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

function parseCategorias(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [String(parsed)];
  } catch {
    // fallback: comma-separated plain string
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }
}

function InfoRow({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 py-3 border-b border-slate-100 dark:border-border last:border-0">
      <div className="mt-0.5 shrink-0 text-slate-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-slate-400 mb-0.5">{label}</p>
        <p className="text-sm text-slate-800 dark:text-slate-100 font-medium break-all">
          {value || <span className="font-normal text-slate-300">—</span>}
        </p>
      </div>
    </div>
  );
}

export default function LiderPerfilPage() {
  const [user, setUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch("/lider/me")
      .then((data) => setUser(data.user ?? data))
      .catch((e) => setError(e.message ?? "Erro ao carregar perfil"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Meu Perfil" description="Informações da sua conta e áreas de atuação" />

      {error && (
        <div className="flex items-center gap-2 text-red-500 text-sm mb-4">
          <AlertTriangle className="h-4 w-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48 gap-2 text-slate-400">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span className="text-sm">Carregando…</span>
        </div>
      ) : user ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Dados pessoais */}
          <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1">
              Dados Pessoais
            </h2>
            <div>
              <InfoRow icon={User}     label="Nome"     value={user.name ?? ""} />
              <InfoRow icon={Mail}     label="E-mail"   value={user.email ?? ""} />
              <InfoRow icon={Briefcase} label="Cargo"   value={user.position ?? ""} />
              <InfoRow icon={Phone}    label="Telefone" value={user.phone ?? ""} />
            </div>
          </div>

          {/* Áreas de atuação */}
          <div className="bg-white dark:bg-card rounded-xl border border-slate-200 dark:border-border p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">
              Áreas de Atuação
            </h2>

            {(user.lider_areas ?? []).length === 0 ? (
              <p className="text-sm text-slate-400">Nenhuma área atribuída.</p>
            ) : (
              <div className="space-y-4">
                {(user.lider_areas ?? []).map((area: any) => {
                  const cats = parseCategorias(area.categorias_permitidas);
                  return (
                    <div
                      key={area.id}
                      className="rounded-lg border border-slate-100 dark:border-border bg-slate-50 dark:bg-muted/20 p-4"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="h-4 w-4 text-teal-600 shrink-0" />
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {area.area_nome}
                        </span>
                        {!area.ativo && (
                          <span className="ml-auto text-xs text-slate-400 bg-slate-200 dark:bg-muted px-2 py-0.5 rounded-full">
                            Inativa
                          </span>
                        )}
                      </div>

                      {cats.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 mt-1">
                          {cats.map((cat) => (
                            <span
                              key={cat}
                              className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-100 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 mt-1">Todas as categorias</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
