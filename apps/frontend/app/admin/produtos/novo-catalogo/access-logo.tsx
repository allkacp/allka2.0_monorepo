"use client";
import { useState } from "react";

// Logo de cada tipo de acesso. Se o cadastro do tipo tem o endereço da imagem do logo, usa ela; senão mostra o selo na cor da
// marca (reconhecida pela chave/provedor do tipo). O logo é configurado no cadastro do tipo de acesso (campo "Logo").
const BRANDS: { match: RegExp; bg: string; fg: string; letter: string }[] = [
  { match: /google|gtm|tag_manager|ads|analytics|search_console|business_profile|gmb/i, bg: "#4285F4", fg: "#FFFFFF", letter: "G" },
  { match: /meta|facebook|instagram|fb_/i, bg: "#0866FF", fg: "#FFFFFF", letter: "M" },
  { match: /wordpress|wp_/i, bg: "#21759B", fg: "#FFFFFF", letter: "W" },
  { match: /tray/i, bg: "#6D28D9", fg: "#FFFFFF", letter: "T" },
  { match: /shopify/i, bg: "#5E8E3E", fg: "#FFFFFF", letter: "S" },
  { match: /linkedin/i, bg: "#0A66C2", fg: "#FFFFFF", letter: "in" },
  { match: /tiktok/i, bg: "#111827", fg: "#FFFFFF", letter: "T" },
  { match: /youtube/i, bg: "#FF0000", fg: "#FFFFFF", letter: "Y" },
  { match: /whatsapp/i, bg: "#25D366", fg: "#FFFFFF", letter: "W" },
  { match: /mail|email/i, bg: "#475569", fg: "#FFFFFF", letter: "@" },
  { match: /crm|rd_|hubspot|activecampaign/i, bg: "#0E7490", fg: "#FFFFFF", letter: "C" },
];

export const isLogoUrl = (v: unknown): v is string => typeof v === "string" && /^https?:\/\//i.test(v.trim());

export function brandOf(t: { key?: string | null; provider?: string | null; name?: string | null }) {
  const hay = `${t.key ?? ""} ${t.provider ?? ""} ${t.name ?? ""}`;
  return BRANDS.find((b) => b.match.test(hay)) ?? { bg: "#7C3AED", fg: "#FFFFFF", letter: String(t.name ?? "?").trim().slice(0, 1).toUpperCase() || "?" };
}

export function AccessLogo({ type, size = 40 }: { type: { key?: string | null; provider?: string | null; name?: string | null; icon?: string | null }; size?: number }) {
  const [broken, setBroken] = useState(false);
  const px = { width: size, height: size };
  if (isLogoUrl(type.icon) && !broken) {
    return <img src={type.icon.trim()} alt={`Logo ${type.name ?? ""}`} style={px} className="shrink-0 rounded-lg border border-slate-200 bg-white object-contain p-1" onError={() => setBroken(true)} data-testid="access-logo-img" />;
  }
  const b = brandOf(type);
  return <span style={{ ...px, background: b.bg, color: b.fg, fontSize: Math.round(size * 0.42) }} className="grid shrink-0 place-items-center rounded-lg font-extrabold shadow-sm" aria-hidden="true" data-testid="access-logo-badge">{b.letter}</span>;
}
