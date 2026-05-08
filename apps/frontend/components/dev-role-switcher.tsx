import { useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Check } from "lucide-react";
import {
  useAccountType,
  type AccountType,
  type AccountSubType,
} from "@/contexts/account-type-context";

const ROLES: Array<{
  id: string;
  label: string;
  description: string;
  path: string;
  loginPath: string;
  prefix: string;
  color: string;
  emoji: string;
  accountType: AccountType;
  accountSubType: AccountSubType;
  previewName: string;
  previewEmail: string;
}> = [
  {
    id: "admin",
    label: "Administrador",
    description: "Painel completo da plataforma",
    path: "/admin/dashboard",
    loginPath: "/login",
    prefix: "/admin",
    color: "bg-rose-500",
    emoji: "🛡️",
    accountType: "admin",
    accountSubType: null,
    previewName: "Admin Allka",
    previewEmail: "admin@allka.test",
  },
  {
    id: "nomade",
    label: "Nômade",
    description: "Tarefas, ganhos e habilitações",
    path: "/nomades/dashboard",
    loginPath: "/nomades/login",
    prefix: "/nomades",
    color: "bg-amber-500",
    emoji: "🧭",
    accountType: "nomades",
    accountSubType: null,
    previewName: "Nômade Teste",
    previewEmail: "nomade@allka.test",
  },
  {
    id: "empresa",
    label: "Company",
    description: "Projetos, tarefas e faturas",
    path: "/company/dashboard",
    loginPath: "/company/login",
    prefix: "/company",
    color: "bg-violet-500",
    emoji: "🏢",
    accountType: "empresas",
    accountSubType: "company",
    previewName: "Company Teste",
    previewEmail: "company@allka.test",
  },
  {
    id: "agencia",
    label: "Agência",
    description: "Clientes, projetos e financeiro",
    path: "/agencia/dashboard",
    loginPath: "/agencia/login",
    prefix: "/agencia",
    color: "bg-indigo-500",
    emoji: "💼",
    accountType: "agencias",
    accountSubType: null,
    previewName: "Agência Teste",
    previewEmail: "agencia@allka.test",
  },
  {
    id: "parceiro",
    label: "Parceiro",
    description: "Comissões, agências e saques",
    path: "/parceiro/dashboard",
    loginPath: "/parceiro/login",
    prefix: "/parceiro",
    color: "bg-blue-500",
    emoji: "🤝",
    accountType: "parceiro",
    accountSubType: null,
    previewName: "Partner Teste",
    previewEmail: "partner@allka.test",
  },
  {
    id: "lider",
    label: "Líder",
    description: "Qualificação e supervisão de tarefas",
    path: "/lider/dashboard",
    loginPath: "/lider/login",
    prefix: "/lider",
    color: "bg-teal-600",
    emoji: "🎯",
    accountType: "lider",
    accountSubType: null,
    previewName: "Líder de Performance",
    previewEmail: "lider.performance@allka.test",
  },
];

function getActiveRole(pathname: string) {
  // On login pages, match by loginPath
  const byLogin = ROLES.find((r) => pathname === r.loginPath);
  if (byLogin) return byLogin;
  return ROLES.find((r) => pathname.startsWith(r.prefix)) ?? ROLES[0];
}

function isOnLoginPage(pathname: string) {
  return ROLES.some((r) => pathname === r.loginPath);
}

export function DevRoleSwitcher() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { setAccountType, setPreviewUser } = useAccountType();
  const [open, setOpen] = useState(false);
  const leaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const active = getActiveRole(pathname);

  const handleMouseEnter = () => {
    if (leaveTimer.current) clearTimeout(leaveTimer.current);
    setOpen(true);
  };

  const handleMouseLeave = () => {
    leaveTimer.current = setTimeout(() => setOpen(false), 200);
  };

  return (
    <div
      className="fixed right-0 z-[9999]"
      style={{ top: "50%", transform: "translateY(-50%)" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* Side tab — always visible, glued to right edge */}
      <div
        className="flex flex-col items-center justify-center gap-1.5 py-3 px-2 rounded-l-xl
          bg-slate-900 text-white shadow-lg border border-white/10 cursor-pointer
          transition-all duration-200"
        style={{ minHeight: 64 }}
      >
        <span className="text-base leading-none">{active.emoji}</span>
        <span
          className="text-[10px] font-bold tracking-widest select-none text-white/70"
          style={{
            writingMode: "vertical-rl",
            textOrientation: "mixed",
            transform: "rotate(180deg)",
          }}
        >
          Preview
        </span>
      </div>

      {/* Expandable panel — appears to the left on hover */}
      <div
        className="absolute right-full top-1/2 -translate-y-1/2 mr-2
          transition-all duration-200 origin-right"
        style={{
          opacity: open ? 1 : 0,
          transform: `translateY(-50%) scaleX(${open ? 1 : 0.9})`,
          pointerEvents: open ? "auto" : "none",
        }}
      >
        <div className="w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-2">
          <p className="px-2 pt-1 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Visualizar como
          </p>

          <div className="space-y-0.5">
            {ROLES.map((role) => {
              const isActive = active.id === role.id;
              return (
                <button
                  key={role.id}
                  onClick={() => {
                    setAccountType(role.accountType, role.accountSubType);
                    setPreviewUser(role.previewName, role.previewEmail);
                    navigate(
                      isOnLoginPage(pathname) ? role.loginPath : role.path,
                    );
                    setOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "hover:bg-slate-50 text-slate-700"
                  }`}
                >
                  <span
                    className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0 ${
                      isActive ? "bg-white/10" : "bg-slate-100"
                    }`}
                  >
                    {role.emoji}
                  </span>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-tight">
                      {role.label}
                    </p>
                    <p
                      className={`text-[11px] leading-tight mt-0.5 truncate ${
                        isActive ? "text-white/55" : "text-slate-400"
                      }`}
                    >
                      {role.description}
                    </p>
                  </div>

                  {isActive && (
                    <Check className="h-4 w-4 shrink-0 text-white/60" />
                  )}
                </button>
              );
            })}
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 px-2 pb-1">
            <p className="text-[10px] text-slate-300 text-center">
              🔧 Modo preview — sem autenticação real
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
