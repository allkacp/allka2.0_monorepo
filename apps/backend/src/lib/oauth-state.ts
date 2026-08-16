// Assina/valida o parâmetro `state` do fluxo OAuth (Meta) — proteção CSRF
// contra um callback forjado, já que /callback é uma rota pública (o
// próprio Facebook navega o usuário até ela, sem header de autenticação).
import jwt from "jsonwebtoken";
import { config } from "../config";

const STATE_TTL_SECONDS = 10 * 60; // 10 minutos — tempo de sobra pra consentir na Meta

export interface ConnectStatePayload {
  project_id: string;
  user_id: string;
}

export function signConnectState(payload: ConnectStatePayload): string {
  if (!config.META_OAUTH_STATE_SECRET) {
    throw new Error("META_OAUTH_STATE_SECRET não configurada.");
  }
  return jwt.sign(payload, config.META_OAUTH_STATE_SECRET, { expiresIn: STATE_TTL_SECONDS });
}

export function verifyConnectState(token: string): ConnectStatePayload {
  if (!config.META_OAUTH_STATE_SECRET) {
    throw new Error("META_OAUTH_STATE_SECRET não configurada.");
  }
  const decoded = jwt.verify(token, config.META_OAUTH_STATE_SECRET) as ConnectStatePayload;
  return { project_id: decoded.project_id, user_id: decoded.user_id };
}
