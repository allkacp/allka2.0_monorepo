import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { apiClient } from "@/lib/api-client";

/**
 * Primeiro acesso — a pessoa define a própria senha a partir de um link com
 * token.
 *
 * Existe por causa da migração da plataforma antiga: os usuários importados
 * não herdaram senha utilizável e os nômades que nunca tiveram login também
 * caem aqui. Como o projeto não envia e-mail, o link é gerado pela operação
 * (scripts/preparar-primeiro-acesso.ts) e entregue por fora.
 *
 * Página pública: fica fora do AppLayout, como as telas de login.
 */
export default function PrimeiroAcessoPage() {
  const { token = "" } = useParams<{ token?: string }>();
  const navigate = useNavigate();

  const [validando, setValidando] = useState(true);
  const [convite, setConvite] = useState<{ name: string; email: string } | null>(null);
  const [erroLink, setErroLink] = useState<string | null>(null);

  const [senha, setSenha] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    apiClient
      .validarPrimeiroAcesso(token)
      .then((dados: any) => {
        if (!cancelado) setConvite({ name: dados.name, email: dados.email });
      })
      .catch((e: any) => {
        if (!cancelado) setErroLink(e?.message ?? "Não foi possível validar este link.");
      })
      .finally(() => {
        if (!cancelado) setValidando(false);
      });
    return () => {
      cancelado = true;
    };
  }, [token]);

  const senhaCurta = senha.length > 0 && senha.length < 6;
  const naoConfere = confirmacao.length > 0 && senha !== confirmacao;
  const podeEnviar = senha.length >= 6 && senha === confirmacao && !enviando;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!podeEnviar) return;
    setEnviando(true);
    setErro(null);
    try {
      const res: any = await apiClient.definirSenhaPrimeiroAcesso(token, senha);
      // O backend já devolve sessão iniciada — manda direto pro painel certo.
      const destino =
        res?.user?.account_type === "nomades"
          ? "/nomad/dashboard"
          : res?.user?.account_type === "agencias"
            ? "/agencia/dashboard"
            : res?.user?.account_type === "empresas"
              ? "/company/dashboard"
              : "/admin/dashboard";
      navigate(destino, { replace: true });
    } catch (e: any) {
      setErro(e?.message ?? "Não foi possível definir a senha. Tente novamente.");
      setEnviando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl p-7">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#2558FF] via-[#6E2C96] to-[#D92293] flex items-center justify-center shadow-md">
              <KeyRound className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">
                Primeiro acesso
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Defina a senha que você vai usar na plataforma
              </p>
            </div>
          </div>

          {validando && (
            <div className="flex items-center gap-2 py-8 justify-center text-slate-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span className="text-sm">Validando seu link…</span>
            </div>
          )}

          {!validando && erroLink && (
            <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 p-4">
              <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1">
                Link inválido ou expirado
              </p>
              <p className="text-xs text-red-600 dark:text-red-400/80">
                {erroLink} Peça um novo link ao administrador da plataforma.
              </p>
            </div>
          )}

          {!validando && convite && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 px-3 py-2.5">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                  {convite.name}
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{convite.email}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Nova senha
                </label>
                <div className="relative">
                  <input
                    type={mostrarSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    autoFocus
                    autoComplete="new-password"
                    className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 pr-10 text-sm outline-none focus:border-[#2558FF] focus:ring-2 focus:ring-[#2558FF]/20"
                    placeholder="Mínimo de 6 caracteres"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarSenha((v) => !v)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}
                  >
                    {mostrarSenha ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {senhaCurta && (
                  <p className="mt-1 text-[11px] text-amber-600">
                    Use pelo menos 6 caracteres.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Confirme a senha
                </label>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  value={confirmacao}
                  onChange={(e) => setConfirmacao(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm outline-none focus:border-[#2558FF] focus:ring-2 focus:ring-[#2558FF]/20"
                  placeholder="Repita a senha"
                />
                {naoConfere && (
                  <p className="mt-1 text-[11px] text-amber-600">As senhas não conferem.</p>
                )}
              </div>

              {erro && (
                <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 px-3 py-2">
                  <p className="text-xs text-red-600 dark:text-red-400">{erro}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={!podeEnviar}
                className="w-full rounded-lg bg-gradient-to-r from-[#2558FF] via-[#6E2C96] to-[#D92293] px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-opacity disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {enviando ? (
                  <span className="inline-flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Definindo…
                  </span>
                ) : (
                  "Definir senha e entrar"
                )}
              </button>

              <p className="flex items-start gap-1.5 text-[11px] text-slate-400 dark:text-slate-500">
                <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-px" />
                Este link é de uso único e deixa de funcionar assim que a senha for
                definida.
              </p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
