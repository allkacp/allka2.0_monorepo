import { Router } from "express";
import type { NextFunction, Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { verifyToken } from "../middleware/auth";
import { projectVisibleToUser } from "../lib/project-scope";
import {
  isMetaIntegrationConfigured,
  buildAuthorizeUrl,
  exchangeCodeForToken,
  exchangeForLongLivedToken,
  getAdAccounts,
  MetaClientError,
} from "../lib/meta-ads-client";
import { signConnectState, verifyConnectState } from "../lib/oauth-state";
import { encryptToken } from "../lib/token-encryption";
import { syncConnectionMetrics } from "../lib/meta-ads-sync";

// Fluxo OAuth só da Meta — isolado de propósito de project-connections.ts
// (genérico), pra Google/TikTok entrarem depois sem tocar aqui.
const router = Router();

function htmlPage(title: string, message: string, autoClose: boolean): string {
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#0a1628;color:#fff;text-align:center;padding:24px}</style>
</head><body><div><h2>${title}</h2><p>${message}</p></div>
${autoClose ? "<script>setTimeout(()=>window.close(),2500)</script>" : ""}
</body></html>`;
}

// ── GET /authorize-url?project_id=X ─────────────────────────────────────────
// Autenticado — devolve a URL em JSON (nunca redireciona direto), porque o
// apiClient autentica por Authorization: Bearer, não cookie. É o FRONTEND
// que abre a URL devolvida numa aba nova.
router.get("/authorize-url", verifyToken, async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!isMetaIntegrationConfigured()) {
      res.status(503).json({ error: "Integração com Meta Ads não está configurada ainda." });
      return;
    }
    const projectId = String(req.query.project_id || "");
    if (!projectId) {
      res.status(400).json({ error: "project_id é obrigatório." });
      return;
    }
    const project = await prisma.project.findUnique({ where: { id: projectId } });
    if (!project || !(await projectVisibleToUser(prisma, req.user!, project))) {
      res.status(404).json({ error: "Projeto não encontrado." });
      return;
    }
    const state = signConnectState({ project_id: projectId, user_id: req.user!.id });
    res.json({ url: buildAuthorizeUrl(state) });
  } catch (err) {
    next(err);
  }
});

// ── GET /callback?code=&state= ──────────────────────────────────────────────
// PÚBLICA — é o Facebook navegando o navegador do usuário direto pra cá,
// sem header de autenticação nenhum. A identidade vem do `state` assinado.
// Sempre responde com uma paginazinha HTML amigável, nunca JSON cru — o
// usuário está olhando pra uma aba de navegador, não pra um cliente de API.
router.get("/callback", async (req: Request, res: Response) => {
  const code = String(req.query.code || "");
  const stateToken = String(req.query.state || "");

  if (!isMetaIntegrationConfigured()) {
    res.status(200).type("html").send(htmlPage("Integração indisponível", "A integração com Meta Ads não está configurada no momento.", false));
    return;
  }
  if (!code || !stateToken) {
    res.status(200).type("html").send(htmlPage("Link inválido", "Faltam parâmetros nesse link de retorno. Feche esta aba e tente conectar de novo.", false));
    return;
  }

  let state: { project_id: string; user_id: string };
  try {
    state = verifyConnectState(stateToken);
  } catch {
    res.status(200).type("html").send(htmlPage("Link expirado", "Esse link de conexão expirou ou é inválido. Feche esta aba e tente conectar de novo.", false));
    return;
  }

  try {
    const short = await exchangeCodeForToken(code);
    const long = await exchangeForLongLivedToken(short.access_token);
    const accounts = await getAdAccounts(long.access_token);
    const account = accounts.find((a) => a.account_status === 1) ?? accounts[0];
    if (!account) {
      res.status(200).type("html").send(htmlPage("Nenhuma conta de anúncio encontrada", "Essa conta da Meta não tem nenhuma conta de anúncio acessível. Feche esta aba.", false));
      return;
    }

    const expiresAt = new Date(Date.now() + (long.expires_in ?? 60 * 24 * 60 * 60) * 1000);
    const connection = await prisma.projectConnection.upsert({
      where: { project_id_provider: { project_id: state.project_id, provider: "meta_ads" } },
      create: {
        project_id: state.project_id,
        provider: "meta_ads",
        status: "connected",
        external_account_id: account.id,
        external_account_name: account.name,
        access_token_encrypted: encryptToken(long.access_token),
        token_expires_at: expiresAt,
        connected_by_user_id: state.user_id,
      },
      update: {
        status: "connected",
        external_account_id: account.id,
        external_account_name: account.name,
        access_token_encrypted: encryptToken(long.access_token),
        token_expires_at: expiresAt,
        connected_by_user_id: state.user_id,
        last_error: null,
      },
    });

    // Primeira carga de histórico, pro widget já ter dado assim que a aba
    // fechar — falha aqui não invalida a conexão em si (o cron/"sincronizar
    // agora" tentam de novo depois).
    syncConnectionMetrics(connection.id, { daysBack: 30 }).catch(() => {});

    res.status(200).type("html").send(htmlPage("Conectado!", `Conta "${account.name}" conectada com sucesso. Pode fechar esta aba.`, true));
  } catch (err) {
    const message =
      err instanceof MetaClientError
        ? "Não foi possível concluir a conexão com a Meta. Tente novamente."
        : "Erro inesperado ao conectar. Tente novamente.";
    res.status(200).type("html").send(htmlPage("Não foi possível conectar", message, false));
  }
});

export default router;
