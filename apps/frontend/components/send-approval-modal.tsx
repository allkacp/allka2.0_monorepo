// @ts-nocheck
"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Send,
  Mail,
  MessageCircle,
  Users,
  User,
  AlertCircle,
  Phone,
  Building2,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Package,
  FileText,
  X as XIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Textarea } from "@/components/ui/textarea";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ApprovalContact {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  role?: string;
  isPrimary?: boolean;
}

export interface SendApprovalOptions {
  channels: { email: boolean; whatsapp: boolean };
  recipientMode: "primary" | "all" | "manual";
  selectedContactIds: string[];
  message: string;
}

interface SendApprovalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectName: string;
  productCount: number;
  totalFormatted: string;
  clientName: string;
  companyName: string;
  contacts: ApprovalContact[];
  onSend: (opts: SendApprovalOptions) => void;
  onSaveDraft?: (opts: SendApprovalOptions) => void;
  sending?: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildDefaultMessage(projectName: string, clientName: string) {
  const first = clientName ? `, ${clientName.trim().split(" ")[0]}` : "";
  return `Olá${first}! Segue a proposta do projeto "${projectName}" para sua aprovação. Qualquer dúvida, fico à disposição.`;
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2.5">
      {children}
    </p>
  );
}

function ChannelCard({
  icon: Icon,
  label,
  sublabel,
  active,
  disabled,
  color,
  onClick,
}: {
  icon: React.ElementType;
  label: string;
  sublabel: string;
  active: boolean;
  disabled: boolean;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-2 rounded-xl border-2 px-4 py-3.5 transition-all text-center",
        disabled
          ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200"
          : active
            ? `${color} shadow-sm`
            : "bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {active && !disabled && (
        <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-current flex items-center justify-center">
          <CheckCircle2 className="h-3 w-3 text-white" />
        </span>
      )}
      <Icon
        className={cn(
          "h-5 w-5",
          disabled
            ? "text-slate-400"
            : active
              ? "text-current"
              : "text-slate-500",
        )}
      />
      <div>
        <p
          className={cn(
            "text-xs font-bold leading-tight",
            disabled
              ? "text-slate-400"
              : active
                ? "text-current"
                : "text-slate-700",
          )}
        >
          {label}
        </p>
        <p className="text-[10px] text-slate-400 mt-0.5 leading-tight">
          {sublabel}
        </p>
      </div>
    </button>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function SendApprovalModal({
  open,
  onOpenChange,
  projectName,
  productCount,
  totalFormatted,
  clientName,
  companyName,
  contacts,
  onSend,
  onSaveDraft,
  sending = false,
}: SendApprovalModalProps) {
  const [channels, setChannels] = useState({ email: true, whatsapp: false });
  const [recipientMode, setRecipientMode] = useState<
    "primary" | "all" | "manual"
  >("primary");
  const [selectedContactIds, setSelectedContactIds] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [showContacts, setShowContacts] = useState(false);

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setChannels({ email: true, whatsapp: false });
      setRecipientMode("primary");
      setSelectedContactIds([]);
      setMessage(buildDefaultMessage(projectName, clientName));
      setShowContacts(false);
    }
  }, [open, projectName, clientName]);

  // ── Derived values ──
  const primaryContact = useMemo(
    () => contacts.find((c) => c.isPrimary) ?? contacts[0] ?? null,
    [contacts],
  );

  const hasAnyEmail = contacts.some((c) => c.email);
  const hasAnyPhone = contacts.some((c) => c.phone);
  const hasContacts = contacts.length > 0;

  const effectiveRecipients = useMemo(() => {
    if (recipientMode === "primary")
      return primaryContact ? [primaryContact] : [];
    if (recipientMode === "all") return contacts;
    return contacts.filter((c) => selectedContactIds.includes(c.id));
  }, [recipientMode, primaryContact, contacts, selectedContactIds]);

  const recipientsWithEmail = effectiveRecipients.filter((c) => c.email);
  const recipientsWithPhone = effectiveRecipients.filter((c) => c.phone);

  const willSendEmail = channels.email && recipientsWithEmail.length > 0;
  const willSendWhatsapp = channels.whatsapp && recipientsWithPhone.length > 0;
  const canSend =
    (willSendEmail || willSendWhatsapp) &&
    effectiveRecipients.length > 0 &&
    (channels.email || channels.whatsapp);

  const validationMessage = useMemo(() => {
    if (!hasContacts) return "Nenhum contato encontrado para este cliente.";
    if (!channels.email && !channels.whatsapp)
      return "Selecione pelo menos um canal de envio.";
    if (effectiveRecipients.length === 0)
      return "Selecione ao menos um destinatário.";
    if (channels.email && recipientsWithEmail.length === 0)
      return "Nenhum destinatário selecionado possui e-mail.";
    if (channels.whatsapp && recipientsWithPhone.length === 0)
      return "Nenhum destinatário selecionado possui WhatsApp.";
    return null;
  }, [
    hasContacts,
    channels,
    effectiveRecipients,
    recipientsWithEmail,
    recipientsWithPhone,
  ]);

  const buildOptions = (): SendApprovalOptions => ({
    channels,
    recipientMode,
    selectedContactIds:
      recipientMode === "manual"
        ? selectedContactIds
        : recipientMode === "all"
          ? contacts.map((c) => c.id)
          : primaryContact
            ? [primaryContact.id]
            : [],
    message,
  });

  const toggleContactId = (id: string) => {
    setSelectedContactIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-75"
        onClick={() => !sending && onOpenChange(false)}
      />

      {/* Modal card */}
      <div className="fixed inset-0 z-76 flex items-center justify-center p-4 pointer-events-none">
        <div className="pointer-events-auto w-full max-w-3xl max-h-[92vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden bg-white">
          {/* ── Header ── */}
          <div
            className="relative shrink-0 px-6 py-4 overflow-hidden flex items-center justify-between"
            style={{
              background:
                "var(--app-brand-gradient, linear-gradient(135deg, #000000 0%, #1a2a6f 45%, #c81a7f 100%))",
            }}
          >
            <div className="absolute -top-6 -right-6 w-40 h-40 bg-purple-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -bottom-4 left-1/4 w-32 h-32 bg-blue-400/8 rounded-full blur-3xl pointer-events-none" />

            <div className="relative flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-white/15 border border-white/20 backdrop-blur-sm">
                <Send className="h-5 w-5 text-white" />
              </div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">
                  Enviar para Aprovação do Cliente
                </p>
                <p className="text-xs text-white/55 mt-0.5">{projectName}</p>
              </div>
            </div>

            <button
              onClick={() => !sending && onOpenChange(false)}
              disabled={sending}
              className="relative h-8 w-8 flex items-center justify-center rounded-lg bg-white/12 border border-white/20 text-white/60 hover:bg-white/22 hover:text-white transition-all disabled:opacity-40"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-7 py-6 space-y-6">
            {/* ── 1. Dados do Cliente ── */}
            <div>
              <SectionLabel>Dados do Cliente</SectionLabel>
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 overflow-hidden">
                {/* Identity row */}
                <div className="flex items-center gap-4 px-5 py-4 border-b border-slate-100">
                  <div className="shrink-0 w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold text-slate-800 leading-tight truncate">
                      {clientName || "—"}
                    </p>
                    {companyName && (
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <p className="text-sm text-slate-500 truncate">
                          {companyName}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact details row */}
                <div className="grid grid-cols-2 divide-x divide-slate-100">
                  {/* E-mail */}
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center">
                      <Mail className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none">
                        E-mail
                      </p>
                      {primaryContact?.email ? (
                        <p className="text-sm text-slate-700 truncate font-medium mt-1">
                          {primaryContact.email}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic mt-1">
                          não cadastrado
                        </p>
                      )}
                    </div>
                  </div>

                  {/* WhatsApp / Telefone */}
                  <div className="flex items-center gap-3 px-5 py-3.5">
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center">
                      <Phone className="h-3.5 w-3.5 text-emerald-500" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wide leading-none">
                        WhatsApp
                      </p>
                      {primaryContact?.phone ? (
                        <p className="text-sm text-slate-700 truncate font-medium mt-1">
                          {primaryContact.phone}
                        </p>
                      ) : (
                        <p className="text-sm text-slate-400 italic mt-1">
                          não cadastrado
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Other contacts */}
                {contacts.length > 1 && (
                  <div className="border-t border-slate-100 px-5 py-3">
                    <button
                      type="button"
                      onClick={() => setShowContacts((v) => !v)}
                      className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700 transition-colors"
                    >
                      <Users className="h-3.5 w-3.5" />
                      <span>
                        {contacts.length - 1} outro
                        {contacts.length - 1 !== 1 ? "s" : ""} contato
                        {contacts.length - 1 !== 1 ? "s" : ""} vinculado
                        {contacts.length - 1 !== 1 ? "s" : ""}
                      </span>
                      {showContacts ? (
                        <ChevronUp className="h-3 w-3 ml-auto" />
                      ) : (
                        <ChevronDown className="h-3 w-3 ml-auto" />
                      )}
                    </button>
                    {showContacts && (
                      <div className="mt-2 space-y-1.5">
                        {contacts
                          .filter((c) => !c.isPrimary)
                          .map((c) => (
                            <div
                              key={c.id}
                              className="flex items-center gap-2 rounded-lg bg-white border border-slate-100 px-2.5 py-1.5"
                            >
                              <div className="shrink-0 w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center">
                                <User className="h-2.5 w-2.5 text-slate-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-slate-700 truncate">
                                  {c.name}
                                </p>
                                {c.email && (
                                  <p className="text-[10px] text-slate-400 truncate">
                                    {c.email}
                                  </p>
                                )}
                              </div>
                              {c.role && (
                                <span className="shrink-0 text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded-full font-medium">
                                  {c.role}
                                </span>
                              )}
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                )}

                {!hasContacts && (
                  <div className="flex items-center gap-2.5 px-5 py-3 border-t border-amber-100 bg-amber-50/50">
                    <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-sm text-amber-700">
                      Nenhum contato encontrado. Cadastre um contato para este
                      cliente antes de enviar.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* ── 2. Canal de Envio ── */}
            <div>
              <SectionLabel>Canal de Envio</SectionLabel>
              <div className="grid grid-cols-2 gap-4">
                <ChannelCard
                  icon={Mail}
                  label="E-mail"
                  sublabel={
                    hasAnyEmail ? "Enviar por e-mail" : "Sem e-mail cadastrado"
                  }
                  active={channels.email}
                  disabled={!hasAnyEmail}
                  color="border-blue-400 bg-blue-50 text-blue-600"
                  onClick={() =>
                    setChannels((p) => ({ ...p, email: !p.email }))
                  }
                />
                <ChannelCard
                  icon={MessageCircle}
                  label="WhatsApp"
                  sublabel={
                    hasAnyPhone
                      ? "Enviar por WhatsApp"
                      : "Sem telefone cadastrado"
                  }
                  active={channels.whatsapp}
                  disabled={!hasAnyPhone}
                  color="border-emerald-400 bg-emerald-50 text-emerald-600"
                  onClick={() =>
                    setChannels((p) => ({ ...p, whatsapp: !p.whatsapp }))
                  }
                />
              </div>
            </div>

            {/* ── 3. Destinatários ── */}
            <div>
              <SectionLabel>Destinatários</SectionLabel>
              <div className="space-y-2">
                {/* Primary */}
                <RecipientOption
                  id="primary"
                  active={recipientMode === "primary"}
                  disabled={!primaryContact}
                  onClick={() => setRecipientMode("primary")}
                  label="Contato principal"
                  sublabel={
                    primaryContact
                      ? `${primaryContact.name}${primaryContact.email ? ` · ${primaryContact.email}` : ""}`
                      : "Nenhum contato principal encontrado"
                  }
                  icon={User}
                />

                {/* All */}
                <RecipientOption
                  id="all"
                  active={recipientMode === "all"}
                  disabled={contacts.length === 0}
                  onClick={() => setRecipientMode("all")}
                  label="Todos os contatos"
                  sublabel={
                    contacts.length > 0
                      ? `${contacts.length} contato${contacts.length !== 1 ? "s" : ""} receberão`
                      : "Nenhum contato cadastrado"
                  }
                  icon={Users}
                />

                {/* Manual */}
                <RecipientOption
                  id="manual"
                  active={recipientMode === "manual"}
                  disabled={contacts.length === 0}
                  onClick={() => setRecipientMode("manual")}
                  label="Selecionar manualmente"
                  sublabel="Escolha quais contatos receberão"
                  icon={Users}
                />
              </div>

              {/* Manual contact list */}
              {recipientMode === "manual" && contacts.length > 0 && (
                <div className="mt-3 rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {contacts.map((c) => {
                    const checked = selectedContactIds.includes(c.id);
                    const hasValidChannel =
                      (channels.email && c.email) ||
                      (channels.whatsapp && c.phone);
                    return (
                      <label
                        key={c.id}
                        className={cn(
                          "flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors",
                          checked
                            ? "bg-violet-50"
                            : "bg-white hover:bg-slate-50",
                          !hasValidChannel && "opacity-50",
                        )}
                      >
                        <div
                          className={cn(
                            "shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                            checked
                              ? "bg-violet-600 border-violet-600"
                              : "bg-white border-slate-300",
                          )}
                        >
                          {checked && (
                            <svg
                              viewBox="0 0 10 8"
                              fill="none"
                              className="w-2.5 h-2.5"
                            >
                              <path
                                d="M1 4L3.5 6.5L9 1"
                                stroke="white"
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={checked}
                          onChange={() => toggleContactId(c.id)}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-800 truncate">
                            {c.name}
                          </p>
                          <div className="flex items-center gap-2 flex-wrap mt-0.5">
                            {c.email && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Mail className="h-2.5 w-2.5" />
                                {c.email}
                              </span>
                            )}
                            {c.phone && (
                              <span className="text-[10px] text-slate-400 flex items-center gap-0.5">
                                <Phone className="h-2.5 w-2.5" />
                                {c.phone}
                              </span>
                            )}
                          </div>
                        </div>
                        {c.isPrimary && (
                          <span className="shrink-0 text-[9px] bg-violet-100 text-violet-600 px-1.5 py-0.5 rounded-full font-semibold">
                            Principal
                          </span>
                        )}
                        {!hasValidChannel && (
                          <span className="shrink-0 text-[9px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full">
                            sem canal
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ── 4. Mensagem ── */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <SectionLabel>Mensagem</SectionLabel>
                <span className="text-[10px] text-slate-400">
                  {message.length} caracteres
                </span>
              </div>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={4}
                placeholder="Digite a mensagem que será enviada ao cliente..."
                className="resize-none text-sm text-slate-700 leading-relaxed border-slate-200 focus-visible:ring-violet-400"
              />
            </div>

            {/* ── 5. Pré-visualização ── */}
            <div>
              <SectionLabel>Pré-visualização do Envio</SectionLabel>
              <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
                {/* Project summary */}
                <div className="flex items-start gap-3">
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-white border border-blue-100 flex items-center justify-center">
                    <Package className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">
                      {projectName}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {productCount} produto{productCount !== 1 ? "s" : ""} ·
                      Total:{" "}
                      <strong className="text-slate-700">
                        {totalFormatted}
                      </strong>
                    </p>
                  </div>
                </div>

                {/* Link placeholder */}
                <div className="flex items-center gap-2 rounded-lg bg-white border border-blue-100 px-3 py-2">
                  <FileText className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <p className="text-[11px] text-blue-600 font-medium">
                    Ver proposta completa →
                  </p>
                  <span className="ml-auto text-[9px] bg-blue-100 text-blue-500 px-1.5 py-0.5 rounded-full">
                    link gerado no envio
                  </span>
                </div>

                {/* Separator */}
                <div className="border-t border-blue-100" />

                {/* Message preview */}
                <p className="text-xs text-slate-600 leading-relaxed italic">
                  "{message || "..."}"
                </p>

                {/* Channels + recipients summary */}
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {channels.email && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                      <Mail className="h-2.5 w-2.5" />
                      E-mail
                      {willSendEmail && ` · ${recipientsWithEmail.length}`}
                    </span>
                  )}
                  {channels.whatsapp && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-medium">
                      <MessageCircle className="h-2.5 w-2.5" />
                      WhatsApp
                      {willSendWhatsapp && ` · ${recipientsWithPhone.length}`}
                    </span>
                  )}
                  {effectiveRecipients.length > 0 && (
                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                      <Users className="h-2.5 w-2.5" />
                      {effectiveRecipients.length} destinatário
                      {effectiveRecipients.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* ── Validation alert ── */}
            {validationMessage && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-50 border border-red-100 px-3.5 py-3">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <p className="text-xs text-red-600">{validationMessage}</p>
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="shrink-0 border-t border-slate-100 px-7 py-4 flex items-center justify-between gap-3">
            <button
              type="button"
              disabled={sending}
              onClick={() => onOpenChange(false)}
              className="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40"
            >
              Cancelar
            </button>

            <div className="flex items-center gap-2">
              {onSaveDraft && (
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => onSaveDraft(buildOptions())}
                  className="h-9 px-4 rounded-lg text-sm font-medium text-slate-600 border border-slate-200 hover:bg-slate-50 transition-all disabled:opacity-40"
                >
                  Salvar rascunho
                </button>
              )}

              <button
                type="button"
                disabled={sending || !canSend}
                onClick={() => onSend(buildOptions())}
                className="h-9 px-5 flex items-center gap-2 rounded-xl text-sm font-bold text-white shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{
                  background:
                    "var(--app-brand-button, linear-gradient(135deg, #1a2a6f 0%, #c81a7f 100%))",
                }}
              >
                {sending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar agora
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ── Sub-component: RecipientOption ────────────────────────────────────────────

function RecipientOption({
  active,
  disabled,
  onClick,
  label,
  sublabel,
  icon: Icon,
}: {
  id: string;
  active: boolean;
  disabled: boolean;
  onClick: () => void;
  label: string;
  sublabel: string;
  icon: React.ElementType;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all",
        disabled
          ? "opacity-40 cursor-not-allowed bg-slate-50 border-slate-200"
          : active
            ? "border-violet-300 bg-violet-50 shadow-sm"
            : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
      )}
    >
      {/* Radio dot */}
      <div
        className={cn(
          "shrink-0 w-4 h-4 rounded-full border-2 flex items-center justify-center transition-colors",
          active ? "border-violet-600" : "border-slate-300",
        )}
      >
        {active && <div className="w-2 h-2 rounded-full bg-violet-600" />}
      </div>

      <div className="shrink-0 w-7 h-7 rounded-lg bg-violet-50 flex items-center justify-center">
        <Icon className="h-3.5 w-3.5 text-violet-500" />
      </div>

      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-semibold leading-tight",
            active ? "text-violet-800" : "text-slate-700",
          )}
        >
          {label}
        </p>
        <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sublabel}</p>
      </div>
    </button>
  );
}
