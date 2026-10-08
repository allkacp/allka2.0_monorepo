// Etapa padrão "Validação e organização dos acessos" + acessos externos que um
// produto exige do cliente.
//
// Regras de segurança (pedido do responsável): NUNCA pedir nem guardar senha do
// cliente. A etapa orienta o compartilhamento de PERMISSÕES pela plataforma de
// cada ferramenta (convite de usuário, papel/função, parceiro/agência, etc.).
import type { Prisma, PrismaClient } from "@prisma/client";
import { createStepModel } from "./catalog2-models";

type Db = PrismaClient | Prisma.TransactionClient;

export const ACCESS_TYPES = [
  { key: "google_ads", label: "Google Ads" },
  { key: "meta_business_manager", label: "Meta Business Manager" },
  { key: "ad_account", label: "Conta de anúncios" },
  { key: "pixel_capi", label: "Pixel / Conversions API" },
  { key: "google_analytics", label: "Google Analytics" },
  { key: "google_tag_manager", label: "Google Tag Manager" },
  { key: "crm", label: "CRM" },
  { key: "site_landing", label: "Site / landing page" },
  { key: "other", label: "Outros" },
] as const;
export type AccessType = (typeof ACCESS_TYPES)[number]["key"];
export const ACCESS_TYPE_KEYS = ACCESS_TYPES.map((a) => a.key) as [AccessType, ...AccessType[]];
export const ACCESS_LABEL: Record<string, string> = Object.fromEntries(ACCESS_TYPES.map((a) => [a.key, a.label]));

export const ACCESS_VALIDATION_STEP = {
  name: "Validação e organização dos acessos",
  description:
    "Confirmar se os acessos necessários existem, estão corretos e permitem executar o serviço. " +
    "Orientar o cliente a compartilhar PERMISSÕES pela própria plataforma de cada ferramenta (convite de usuário, " +
    "papel/função, acesso de parceiro ou agência). Nunca solicitar, receber nem registrar senha do cliente.",
  completion_criteria: "Acessos validados; pendências registradas; cliente notificado quando necessário.",
  purpose: "coleta_informacao",
  execution_mode: "hibrido", // humano ou IA assistida, conforme as permissões disponíveis
} as const;

/**
 * Garante o modelo padrão de etapa de acessos (ID sequencial normal). Só é
 * chamado fora de produção: em produção o modelo chega pelo pacote de produtos
 * ("subir produtos") com o MESMO ID do ambiente local — criar aqui tomaria um
 * número que já é de outro modelo lá.
 */
export async function ensureStandardStepModels(db: Db) {
  const existing = await db.catalog2StepModel.findFirst({ where: { is_access_validation: true }, orderBy: { id: "asc" } });
  if (existing) return existing;
  const specialty = await db.catalog2Specialty.findFirst({ where: { key: "gestor_trafego" }, select: { id: true } });
  const created = await createStepModel(db, { ...ACCESS_VALIDATION_STEP, specialty_id: specialty?.id ?? null, estimated_minutes: 30 });
  return db.catalog2StepModel.update({ where: { id: created.id }, data: { is_access_validation: true } });
}
