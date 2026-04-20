// @ts-nocheck
import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { apiClient } from "@/lib/api-client"
import { useToast } from "@/hooks/use-toast"
import { Loader2, ArrowRight, Eye, EyeOff } from "lucide-react"

export type Locale = "pt" | "en" | "es" | "zh"

export interface LocaleContent {
  tag: string
  headlineLines: Array<{ text: string; outlined?: boolean }>
  subtext: string
  stats: Array<{ value: string; label: string }>
}

export interface LoginRoleConfig {
  gradient: string
  defaultEmail: string
  redirectPath: string
  translations: Record<Locale, LocaleContent>
}

const LOCALES: Array<{ code: Locale; flag: string; label: string; abbr: string; colors: string[] }> = [
  { code: "pt", flag: "🇧🇷", label: "Português",  abbr: "BR", colors: ["#009c3b", "#ffdf00", "#002776"] },
  { code: "en", flag: "🇺🇸", label: "English",    abbr: "US", colors: ["#b22234", "#ffffff", "#3c3b6e"] },
  { code: "es", flag: "🇪🇸", label: "Español",    abbr: "ES", colors: ["#c60b1e", "#ffc400", "#c60b1e"] },
  { code: "zh", flag: "🇨🇳", label: "中文",        abbr: "CN", colors: ["#de2910", "#ffde00", "#de2910"] },
]

const UI: Record<Locale, {
  welcome: string
  subtitle: string
  emailLabel: string
  passwordLabel: string
  submitLabel: string
  divider: string
  restricted: string
  errorFill: string
  errorLogin: string
  socialSoon: string
}> = {
  pt: {
    welcome: "Bem-vindo de volta",
    subtitle: "Acesse sua conta para continuar",
    emailLabel: "Email",
    passwordLabel: "Senha",
    submitLabel: "ENTRAR",
    divider: "ou continue com",
    restricted: "Acesso restrito · Plataforma Allka",
    errorFill: "Preencha email e senha.",
    errorLogin: "Email ou senha incorretos.",
    socialSoon: "Em breve · Integração OAuth em configuração.",
  },
  en: {
    welcome: "Welcome back",
    subtitle: "Sign in to your account to continue",
    emailLabel: "Email",
    passwordLabel: "Password",
    submitLabel: "SIGN IN",
    divider: "or continue with",
    restricted: "Restricted access · Allka Platform",
    errorFill: "Please fill in email and password.",
    errorLogin: "Incorrect email or password.",
    socialSoon: "Coming soon · OAuth integration in setup.",
  },
  es: {
    welcome: "Bienvenido de vuelta",
    subtitle: "Accede a tu cuenta para continuar",
    emailLabel: "Email",
    passwordLabel: "Contraseña",
    submitLabel: "INGRESAR",
    divider: "o continuar con",
    restricted: "Acceso restringido · Plataforma Allka",
    errorFill: "Ingresa tu email y contraseña.",
    errorLogin: "Email o contraseña incorrectos.",
    socialSoon: "Próximamente · Integración OAuth en configuración.",
  },
  zh: {
    welcome: "欢迎回来",
    subtitle: "登录您的账户以继续",
    emailLabel: "邮箱",
    passwordLabel: "密码",
    submitLabel: "登 录",
    divider: "或通过以下方式继续",
    restricted: "受限访问 · Allka 平台",
    errorFill: "请填写邮箱和密码。",
    errorLogin: "邮箱或密码不正确。",
    socialSoon: "即将推出 · OAuth 集成配置中。",
  },
}

interface Props {
  config: LoginRoleConfig
}

export function LoginPageTemplate({ config }: Props) {
  const [locale, setLocale] = useState<Locale>(() => {
    return (localStorage.getItem("allka_login_locale") as Locale) ?? "pt"
  })
  const [email, setEmail] = useState(config.defaultEmail)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const { toast } = useToast()

  const ui = UI[locale]
  const content = config.translations[locale]

  useEffect(() => {
    const token = localStorage.getItem("allka_token")
    if (token) navigate(config.redirectPath, { replace: true })
  }, [navigate, config.redirectPath])

  const switchLocale = (l: Locale) => {
    setLocale(l)
    localStorage.setItem("allka_login_locale", l)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      toast({ title: "Erro", description: ui.errorFill, variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      await apiClient.login(email, password)
      navigate(config.redirectPath, { replace: true })
    } catch (error: any) {
      toast({
        title: "Falha no login",
        description: error.message || ui.errorLogin,
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Painel esquerdo: brand ─────────────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-[58%] flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: config.gradient }}
      >
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10 bg-white" />
        <div className="absolute -bottom-48 -right-24 w-md h-112 rounded-full opacity-10 bg-white" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-xl h-144 rounded-full opacity-[0.04] bg-white" />

        <div className="relative z-10">
          <img src="/logo-allka-full.png" alt="ALLKA" className="h-10 object-contain brightness-0 invert" />
        </div>

        <div className="relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 text-white/80 text-xs font-semibold tracking-widest uppercase rounded-full px-4 py-1.5">
            {content.tag}
          </div>

          <h1
            className="text-white font-extrabold leading-tight"
            style={{ fontSize: "clamp(2rem, 3.5vw, 3rem)" }}
          >
            {content.headlineLines.map((line, i) =>
              line.outlined ? (
                <span
                  key={i}
                  className="block mt-1"
                  style={{ WebkitTextStroke: "1px rgba(255,255,255,0.6)", color: "transparent" }}
                >
                  {line.text}
                </span>
              ) : (
                <span key={i}>{line.text}</span>
              )
            )}
          </h1>

          <p className="text-white/60 text-sm leading-relaxed max-w-md">{content.subtext}</p>

          <div className="flex items-center gap-6 pt-2">
            {content.stats.map((stat, i) => (
              <div key={i} className="flex items-center gap-6">
                {i > 0 && <div className="w-px h-8 bg-white/20" />}
                <div className="text-center">
                  <p className="text-white font-bold text-xl">{stat.value}</p>
                  <p className="text-white/50 text-xs">{stat.label}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-white/30 text-xs">
          © {new Date().getFullYear()} Allka Platform · Todos os direitos reservados
        </p>
      </div>

      {/* ── Painel direito: formulário ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950">
        {/* Seletor de idioma */}
        <div className="flex justify-end p-4">
          <div className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {LOCALES.map((l) => {
              const isActive = locale === l.code
              return (
                <button
                  key={l.code}
                  onClick={() => switchLocale(l.code)}
                  title={l.label}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all duration-200 ${
                    isActive
                      ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                      : "text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
                  }`}
                >
                  <span className="tracking-wide">{l.abbr}</span>
                </button>
              )
            })}
          </div>
        </div>

        <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 pt-0">
          {/* Logo mobile */}
          <div className="lg:hidden mb-10">
            <img src="/logo-allka-full.png" alt="ALLKA" className="h-8 object-contain" />
          </div>

          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                {ui.welcome}
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">{ui.subtitle}</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="email"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                >
                  {ui.emailLabel}
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="password"
                  className="text-xs font-semibold text-slate-600 dark:text-slate-300 uppercase tracking-wider"
                >
                  {ui.passwordLabel}
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    autoComplete="current-password"
                    className="h-11 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl text-sm pr-10"
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full h-11 flex items-center justify-center gap-2 text-white font-semibold text-sm rounded-xl transition-all duration-200 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                style={{ background: config.gradient }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{ui.submitLabel}</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* ── Divisor ──────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 my-6">
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs text-slate-400 dark:text-slate-500 whitespace-nowrap">{ui.divider}</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700" />
            </div>

            {/* ── Social login ─────────────────────────────────────────── */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Google */}
              <button
                type="button"
                onClick={() => toast({ title: ui.socialSoon })}
                className="flex items-center justify-center gap-2.5 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Google
              </button>

              {/* Facebook */}
              <button
                type="button"
                onClick={() => toast({ title: ui.socialSoon })}
                className="flex items-center justify-center gap-2.5 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#1877F2">
                  <path d="M24 12.073C24 5.405 18.627 0 12 0S0 5.405 0 12.073c0 6.03 4.388 11.026 10.125 11.927v-8.437H7.078v-3.49h3.047V9.41c0-3.025 1.792-4.697 4.533-4.697 1.312 0 2.686.235 2.686.235v2.953h-1.514c-1.491 0-1.956.93-1.956 1.886v2.286h3.328l-.532 3.49h-2.796v8.437C19.612 23.099 24 18.103 24 12.073z"/>
                </svg>
                Facebook
              </button>

              {/* LinkedIn */}
              <button
                type="button"
                onClick={() => toast({ title: ui.socialSoon })}
                className="flex items-center justify-center gap-2.5 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="#0A66C2">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn
              </button>

              {/* Apple */}
              <button
                type="button"
                onClick={() => toast({ title: ui.socialSoon })}
                className="flex items-center justify-center gap-2.5 h-11 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-sm font-medium hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <svg width="16" height="18" viewBox="0 0 814 1000" fill="currentColor">
                  <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 376.8 0 248.7 0 126.1 0 56.6 29.5 19.6 53.3 8.1 76.6-2.9 114.3-6.3 138.4-6.3c64.4 0 113.7 43.7 148.1 43.7 32.3 0 92-46.4 165.2-46.4 24.8 0 108.2 2.6 157.1 98.8zm-122.8-194.3c26.8-32.8 45.9-78.4 45.9-123.9 0-6.5-.3-12.9-1.6-18.3-43.7 1.6-97.2 29.2-128.8 65.5-24.2 28.5-47.1 73.5-47.1 119.7 0 6.5 1 13 1.6 15.6 3.2.6 8.4 1.3 13.5 1.3 39.1 0 87.8-26.2 116.5-59.9z"/>
                </svg>
                Apple
              </button>
            </div>

            <p className="mt-6 text-center text-xs text-slate-400">{ui.restricted}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

