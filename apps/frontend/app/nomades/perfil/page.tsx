import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  User,
  MapPin,
  Star,
  Edit2,
  Check,
  Award,
  Clock,
  Wallet,
  Loader2,
  ExternalLink,
  X,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  STANDARD_SHELL_PANEL_CLASS,
  StandardPageBanner,
} from "@/components/standard-page-shell";
import { PinToTrayButton } from "@/components/pin-to-tray-button";
import { apiClient } from "@/lib/api-client";

/**
 * Nômade › Meu Perfil.
 *
 * Até 2026-08-06 esta tela rodava num objeto fixo (`INITIAL`, a "Ana Lima") e
 * o botão Salvar só trocava um estado local — nada saía do navegador. Agora
 * lê `GET /api/nomades/me` e grava em `PATCH /api/nomades/me`.
 *
 * O que o mock oferecia e o modelo não tem, saiu: bio, portfólio, LinkedIn,
 * disponibilidade, máximo de horas semanais e os cinco interruptores de
 * notificação. Nenhum desses campos existe em `Nomade` — eram caixas que a
 * pessoa preencheria para nada.
 *
 * Duas coisas viraram somente leitura por serem consequência, não cadastro:
 * nível/pontuação (o backend recusa alterá-los por este endpoint) e as
 * habilidades, que hoje só o admin concede — a aba manda para a tela de
 * Habilitações em vez de oferecer uma edição que o backend negaria.
 *
 * Não há aba de Segurança: não existe rota de troca de senha para usuário
 * logado (`auth.ts` só tem login, logout e primeiro-acesso).
 */

interface Perfil {
  id: string;
  name: string;
  email: string;
  cnpj: string | null;
  whatsapp: string | null;
  avatar: string | null;
  level: string;
  status: string;
  score: number;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  pix_key: string | null;
  pix_key_type: string | null;
  areas_of_interest: string | null;
  min_monthly_goal: number | null;
  registration_date: string | null;
  tasks_completed_total: number;
  performance_avg_rating: number;
}

const NIVEL_BADGE: Record<string, string> = {
  bronze: "bg-amber-100 text-amber-700 border-amber-200",
  silver: "bg-slate-100 text-slate-600 border-slate-300",
  gold: "bg-yellow-100 text-yellow-700 border-yellow-200",
  platinum: "bg-sky-100 text-sky-700 border-sky-200",
  diamond: "bg-violet-100 text-violet-700 border-violet-200",
  leader: "bg-rose-100 text-rose-700 border-rose-200",
};

const TIPOS_PIX = [
  { valor: "cpf", label: "CPF" },
  { valor: "cnpj", label: "CNPJ" },
  { valor: "email", label: "E-mail" },
  { valor: "telefone", label: "Telefone" },
  { valor: "aleatoria", label: "Chave aleatória" },
];

/** Só estes campos o backend aceita em PATCH /nomades/me. */
const CAMPOS_EDITAVEIS = [
  "whatsapp",
  "address",
  "number",
  "neighborhood",
  "city",
  "state",
  "zip_code",
  "pix_key",
  "pix_key_type",
  "areas_of_interest",
  "min_monthly_goal",
] as const;

function StarRating({ value }: { value: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
        />
      ))}
      <span className="ml-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
        {value > 0 ? value.toFixed(1) : "—"}
      </span>
    </div>
  );
}

function Campo({
  label,
  valor,
  editando,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  valor: string;
  editando: boolean;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <Label className="text-xs text-slate-500 mb-1.5 block">{label}</Label>
      {editando ? (
        <Input
          type={type}
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
          {valor || <span className="text-slate-400 font-normal">—</span>}
        </p>
      )}
    </div>
  );
}

export default function NomadesPerfilPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [editando, setEditando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const r: any = await apiClient.getMeuPerfilNomade();
      setPerfil(r ?? null);
      setForm(r ?? {});
    } catch (e: any) {
      setErro(
        String(e?.message).includes("nômade não encontrado")
          ? "Sua conta ainda não está vinculada a um perfil de nômade."
          : (e?.message ?? "Não foi possível carregar seu perfil."),
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const setCampo = (chave: string, valor: any) =>
    setForm((prev) => ({ ...prev, [chave]: valor }));

  const salvar = async () => {
    setSalvando(true);
    setAviso(null);
    try {
      // Manda só o que o backend aceita: enviar `level` ou `score` junto faria
      // o schema recusar o PATCH inteiro.
      const payload: Record<string, any> = {};
      for (const campo of CAMPOS_EDITAVEIS) {
        const v = form[campo];
        if (campo === "min_monthly_goal") {
          payload[campo] = v === "" || v === null || v === undefined ? null : Number(v);
        } else if (v !== undefined && v !== null) {
          payload[campo] = String(v);
        }
      }
      const r: any = await apiClient.atualizarMeuPerfilNomade(payload);
      setPerfil(r);
      setForm(r);
      setEditando(false);
      setAviso("Perfil atualizado.");
      setTimeout(() => setAviso(null), 4000);
    } catch (e: any) {
      setAviso(e?.message ?? "Não foi possível salvar o perfil.");
    } finally {
      setSalvando(false);
    }
  };

  const cancelar = () => {
    setForm(perfil ?? {});
    setEditando(false);
  };

  const iniciais = (perfil?.name ?? "")
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  const membroDesde = perfil?.registration_date
    ? new Date(perfil.registration_date).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric",
      })
    : null;

  return (
    <div className={STANDARD_SHELL_PANEL_CLASS}>
      <div className="relative h-full min-h-0 flex flex-col">
        <div className="shrink-0 -mb-[11px]">
          <StandardPageBanner
            icon={User}
            title="Meu Perfil"
            description="Seus dados de cadastro, endereço e recebimento"
            actions={
              <>
                {editando ? (
                  <div className="flex gap-2">
                    <TooltipProvider delayDuration={400}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={cancelar}
                            disabled={salvando}
                            className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40"
                          >
                            <X className="h-3.5 w-3.5 shrink-0" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6}>
                          Descartar alterações
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    <TooltipProvider delayDuration={400}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={salvar}
                            disabled={salvando}
                            className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40"
                          >
                            {salvando ? (
                              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                            ) : (
                              <Check className="h-3.5 w-3.5 shrink-0" />
                            )}
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" sideOffset={6}>
                          Salvar alterações
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                ) : (
                  <TooltipProvider delayDuration={400}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => setEditando(true)}
                          disabled={!perfil}
                          className="flex items-center justify-center h-8 w-8 rounded-lg border border-white/70 text-white bg-white/10 hover:bg-white/20 transition-colors disabled:opacity-40"
                        >
                          <Edit2 className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom" sideOffset={6}>
                        Editar informações do perfil
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
                <PinToTrayButton
                  id="page-nomades-perfil"
                  label="Perfil"
                  icon={User}
                  path="/nomades/perfil"
                />
              </>
            }
          />
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="p-4 sm:p-6 space-y-5">
            {carregando ? (
              <div className="flex items-center justify-center gap-2 py-16 text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Carregando seu perfil…</span>
              </div>
            ) : erro ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-900/20">
                <p className="text-sm text-amber-800 dark:text-amber-300">{erro}</p>
              </div>
            ) : !perfil ? (
              <div className="py-16 text-center">
                <User className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm text-slate-500">Perfil não encontrado.</p>
              </div>
            ) : (
              <>
                {aviso && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-2.5 text-sm text-emerald-700 flex items-center gap-2">
                    <Check className="h-4 w-4 shrink-0" /> {aviso}
                  </div>
                )}

                {/* Cabeçalho */}
                <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-6">
                  <div className="flex flex-col sm:flex-row gap-5">
                    <div className="h-20 w-20 shrink-0 rounded-2xl bg-linear-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-2xl font-bold shadow-md">
                      {iniciais || "N"}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                          {perfil.name}
                        </h2>
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                            NIVEL_BADGE[perfil.level] ?? NIVEL_BADGE.bronze
                          }`}
                        >
                          {perfil.level}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mb-2">
                        {(perfil.city || perfil.state) && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {[perfil.city, perfil.state].filter(Boolean).join(", ")}
                          </span>
                        )}
                        {membroDesde && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Membro desde {membroDesde}
                          </span>
                        )}
                      </div>
                      <StarRating value={perfil.performance_avg_rating} />
                    </div>

                    <div className="flex sm:flex-col gap-4 sm:gap-3 sm:items-end shrink-0">
                      <div className="text-center sm:text-right">
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                          {perfil.tasks_completed_total}
                        </p>
                        <p className="text-xs text-slate-400">tarefas concluídas</p>
                      </div>
                      <div className="text-center sm:text-right">
                        <p className="text-xl font-bold text-slate-800 dark:text-slate-100">
                          {perfil.score}
                        </p>
                        <p className="text-xs text-slate-400">pontos</p>
                      </div>
                    </div>
                  </div>
                </div>

                <Tabs defaultValue="dados">
                  <TabsList>
                    <TabsTrigger value="dados">Dados</TabsTrigger>
                    <TabsTrigger value="endereco">Endereço</TabsTrigger>
                    <TabsTrigger value="pagamento">Recebimento</TabsTrigger>
                    <TabsTrigger value="habilidades">Habilidades</TabsTrigger>
                  </TabsList>

                  {/* ─── Dados ─────────────────────────────────────────── */}
                  <TabsContent value="dados" className="mt-5">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        {/*
                          Nome, e-mail e CNPJ são os dados cadastrais da
                          empresa do nômade — mudam por processo, não por
                          formulário, e o backend não os aceita neste PATCH.
                        */}
                        <div>
                          <Label className="text-xs text-slate-500 mb-1.5 block">
                            Razão social
                          </Label>
                          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                            {perfil.name}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 mb-1.5 block">E-mail</Label>
                          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                            {perfil.email}
                          </p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-500 mb-1.5 block">CNPJ</Label>
                          <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                            {perfil.cnpj || <span className="text-slate-400 font-normal">—</span>}
                          </p>
                        </div>
                        <Campo
                          label="WhatsApp"
                          valor={form.whatsapp ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("whatsapp", v)}
                          placeholder="+55 11 90000-0000"
                        />
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid sm:grid-cols-2 gap-4">
                        <Campo
                          label="Áreas de interesse"
                          valor={form.areas_of_interest ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("areas_of_interest", v)}
                          placeholder="Design, Conteúdo, Web…"
                        />
                        <div>
                          <Label className="text-xs text-slate-500 mb-1.5 block">
                            Meta mensal (R$)
                          </Label>
                          {editando ? (
                            <Input
                              type="number"
                              min={0}
                              value={form.min_monthly_goal ?? ""}
                              onChange={(e) => setCampo("min_monthly_goal", e.target.value)}
                              placeholder="0"
                            />
                          ) : (
                            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                              {perfil.min_monthly_goal
                                ? perfil.min_monthly_goal.toLocaleString("pt-BR", {
                                    style: "currency",
                                    currency: "BRL",
                                  })
                                : <span className="text-slate-400 font-normal">—</span>}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                        <p className="text-xs text-slate-400 leading-relaxed">
                          <Award className="h-3.5 w-3.5 inline mr-1 text-violet-400" />
                          Nível e pontuação são resultado do seu trabalho na plataforma
                          e não podem ser editados aqui. Veja como evoluir em{" "}
                          <Link
                            to="/nomades/programa"
                            className="text-violet-600 hover:underline font-medium"
                          >
                            Programa Nômade
                          </Link>
                          .
                        </p>
                      </div>
                    </div>
                  </TabsContent>

                  {/* ─── Endereço ──────────────────────────────────────── */}
                  <TabsContent value="endereco" className="mt-5">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <Campo
                          label="Logradouro"
                          valor={form.address ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("address", v)}
                        />
                        <Campo
                          label="Número"
                          valor={form.number ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("number", v)}
                        />
                        <Campo
                          label="Bairro"
                          valor={form.neighborhood ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("neighborhood", v)}
                        />
                        <Campo
                          label="CEP"
                          valor={form.zip_code ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("zip_code", v)}
                        />
                        <Campo
                          label="Cidade"
                          valor={form.city ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("city", v)}
                        />
                        <Campo
                          label="Estado"
                          valor={form.state ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("state", v)}
                          placeholder="SP"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  {/* ─── Recebimento ───────────────────────────────────── */}
                  <TabsContent value="pagamento" className="mt-5">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5 space-y-4">
                      <div className="flex items-center gap-2">
                        <Wallet className="h-4 w-4 text-emerald-500" />
                        <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          Chave PIX para receber
                        </p>
                      </div>
                      <div className="grid sm:grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-500 mb-1.5 block">
                            Tipo da chave
                          </Label>
                          {editando ? (
                            <Select
                              value={form.pix_key_type ?? ""}
                              onValueChange={(v) => setCampo("pix_key_type", v)}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione" />
                              </SelectTrigger>
                              <SelectContent>
                                {TIPOS_PIX.map((t) => (
                                  <SelectItem key={t.valor} value={t.valor}>
                                    {t.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <p className="text-sm text-slate-700 dark:text-slate-200 font-medium">
                              {TIPOS_PIX.find((t) => t.valor === perfil.pix_key_type)?.label ?? (
                                <span className="text-slate-400 font-normal">—</span>
                              )}
                            </p>
                          )}
                        </div>
                        <Campo
                          label="Chave"
                          valor={form.pix_key ?? ""}
                          editando={editando}
                          onChange={(v) => setCampo("pix_key", v)}
                        />
                      </div>
                      <p className="text-xs text-slate-400">
                        É para esta chave que os valores das etapas concluídas são pagos.
                        Confira antes de salvar.
                      </p>
                    </div>
                  </TabsContent>

                  {/* ─── Habilidades ───────────────────────────────────── */}
                  <TabsContent value="habilidades" className="mt-5">
                    <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm p-5">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">
                        Suas habilitações
                      </p>
                      <p className="text-xs text-slate-500 leading-relaxed mb-4">
                        As habilitações definem quais tarefas chegam até você na seleção
                        automática. Elas são concedidas pela equipe da Allka após
                        avaliação — não é um campo que você preenche.
                      </p>
                      <Link to="/nomades/habilitacoes">
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <ExternalLink className="h-3.5 w-3.5" />
                          Ver minhas habilitações
                        </Button>
                      </Link>
                    </div>
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
