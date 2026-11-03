// Saldo da carteira mostrado em Projeto → Faturamento → Formas de Pagamento (antes um 0 fixo na tela).
// Só leitura e só pela fonte autorizada de cada perfil:
//  • agência/empresa: a própria carteira, pela MESMA fonte do saldo do topo (`/wallet-topup/summary`);
//  • admin: a carteira do dono do projeto, como em Financeiro → Carteiras (`/wallets?owner_type&owner_id`).
// Sem fonte autorizada (outros perfis, projeto sem dono, erro) = null → a tela diz "indisponível". Nunca ajusta saldo.
import { apiClient } from "@/lib/api-client";

export async function loadProjectWalletBalance({ accountType, ownerType, ownerId }: {
  accountType?: string | null;
  ownerType?: string | null;
  ownerId?: string | null;
}): Promise<number | null> {
  if (accountType === "agencias" || accountType === "empresas") {
    const summary: any = await apiClient.getWalletTopupSummary();
    return typeof summary?.balance_brl === "number" ? summary.balance_brl : null;
  }
  if (accountType === "admin" && ownerId && (ownerType === "agency" || ownerType === "company" || ownerType === "partner")) {
    const res: any = await apiClient.getWallets({ owner_type: ownerType, owner_id: ownerId, limit: 1 });
    const wallet = Array.isArray(res?.data) ? res.data[0] : null;
    return typeof wallet?.balance === "number" ? wallet.balance : null;
  }
  return null;
}
