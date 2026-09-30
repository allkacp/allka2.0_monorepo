// Sons de notificação — gerados na hora pelo navegador (Web Audio), sem
// arquivo de áudio. Preferência guardada por aparelho (localStorage): cada
// pessoa escolhe o som de cada tipo de aviso, o volume, ou deixa em mudo.

export type SoundCategory =
  | "notificacao"
  | "alerta_verde"
  | "alerta_amarelo"
  | "alerta_vermelho"
  | "chat"

export type SoundId =
  | "off"
  | "suave"
  | "sino"
  | "gota"
  | "duplo"
  | "cristal"
  | "atencao"
  | "urgente"

export interface SoundOption {
  id: SoundId
  label: string
}

export const SOUND_OPTIONS: SoundOption[] = [
  { id: "off", label: "Mudo" },
  { id: "suave", label: "Suave" },
  { id: "sino", label: "Sino" },
  { id: "gota", label: "Gota" },
  { id: "duplo", label: "Duplo" },
  { id: "cristal", label: "Cristal" },
  { id: "atencao", label: "Atenção" },
  { id: "urgente", label: "Urgente" },
]

export const SOUND_CATEGORIES: { id: SoundCategory; label: string; desc: string }[] = [
  { id: "notificacao", label: "Notificação", desc: "Aviso comum no sino" },
  { id: "chat", label: "Mensagem de chat", desc: "Mensagem nova no chat interno" },
  { id: "alerta_verde", label: "Alerta verde", desc: "Informativo, sem urgência" },
  { id: "alerta_amarelo", label: "Alerta amarelo", desc: "Requer atenção" },
  { id: "alerta_vermelho", label: "Alerta vermelho", desc: "Crítico, exige ação rápida" },
]

export interface SoundSettings {
  enabled: boolean
  volume: number // 0–100
  sounds: Record<SoundCategory, SoundId>
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = {
  enabled: true,
  volume: 60,
  sounds: {
    notificacao: "suave",
    chat: "gota",
    alerta_verde: "cristal",
    alerta_amarelo: "atencao",
    alerta_vermelho: "urgente",
  },
}

const STORAGE_KEY = "allka:notification-sounds:v1"
export const SOUND_SETTINGS_EVENT = "allka:notification-sounds-changed"

export function loadSoundSettings(): SoundSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SOUND_SETTINGS
    const parsed = JSON.parse(raw) as Partial<SoundSettings>
    const validIds = new Set(SOUND_OPTIONS.map((o) => o.id))
    const sounds = { ...DEFAULT_SOUND_SETTINGS.sounds }
    for (const cat of Object.keys(sounds) as SoundCategory[]) {
      const v = parsed.sounds?.[cat]
      if (v && validIds.has(v)) sounds[cat] = v
    }
    const volume =
      typeof parsed.volume === "number" ? Math.min(100, Math.max(0, parsed.volume)) : DEFAULT_SOUND_SETTINGS.volume
    return { enabled: parsed.enabled !== false, volume, sounds }
  } catch {
    return DEFAULT_SOUND_SETTINGS
  }
}

export function saveSoundSettings(settings: SoundSettings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    window.dispatchEvent(new Event(SOUND_SETTINGS_EVENT))
  } catch {
    /* sem storage: a preferência só vale até recarregar */
  }
}

// ─── Síntese ────────────────────────────────────────────────────────────────

interface Note {
  freq: number
  start: number // s
  dur: number // s
  type?: OscillatorType
  gain?: number
}

const RECIPES: Record<Exclude<SoundId, "off">, Note[]> = {
  suave: [{ freq: 660, start: 0, dur: 0.35, type: "sine" }],
  sino: [
    { freq: 880, start: 0, dur: 0.9, type: "sine" },
    { freq: 1760, start: 0, dur: 0.5, type: "sine", gain: 0.3 },
  ],
  gota: [{ freq: 1200, start: 0, dur: 0.14, type: "sine" }, { freq: 800, start: 0.08, dur: 0.2, type: "sine", gain: 0.7 }],
  duplo: [
    { freq: 700, start: 0, dur: 0.15, type: "triangle" },
    { freq: 700, start: 0.2, dur: 0.15, type: "triangle" },
  ],
  cristal: [
    { freq: 1047, start: 0, dur: 0.2, type: "sine" },
    { freq: 1319, start: 0.12, dur: 0.2, type: "sine" },
    { freq: 1568, start: 0.24, dur: 0.4, type: "sine" },
  ],
  atencao: [
    { freq: 520, start: 0, dur: 0.18, type: "square", gain: 0.5 },
    { freq: 620, start: 0.22, dur: 0.28, type: "square", gain: 0.5 },
  ],
  urgente: [
    { freq: 880, start: 0, dur: 0.16, type: "sawtooth", gain: 0.55 },
    { freq: 660, start: 0.2, dur: 0.16, type: "sawtooth", gain: 0.55 },
    { freq: 880, start: 0.4, dur: 0.16, type: "sawtooth", gain: 0.55 },
    { freq: 660, start: 0.6, dur: 0.3, type: "sawtooth", gain: 0.55 },
  ],
}

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  try {
    if (!audioCtx) {
      const Ctor: typeof AudioContext | undefined =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return null
      audioCtx = new Ctor()
    }
    // Navegadores só liberam áudio depois de um clique/tecla do usuário.
    if (audioCtx.state === "suspended") void audioCtx.resume().catch(() => {})
    return audioCtx
  } catch {
    return null
  }
}

export function playSound(id: SoundId, volume: number) {
  if (id === "off" || volume <= 0) return
  const ctx = getCtx()
  if (!ctx || ctx.state !== "running") return
  const master = (volume / 100) * 0.4
  const t0 = ctx.currentTime
  for (const n of RECIPES[id]) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    const peak = master * (n.gain ?? 1)
    osc.type = n.type ?? "sine"
    osc.frequency.value = n.freq
    g.gain.setValueAtTime(0.0001, t0 + n.start)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), t0 + n.start + 0.015)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + n.start + n.dur)
    osc.connect(g).connect(ctx.destination)
    osc.start(t0 + n.start)
    osc.stop(t0 + n.start + n.dur + 0.05)
  }
}

/** Toca o som configurado para a categoria (respeita mudo/volume). */
export function playCategorySound(category: SoundCategory) {
  const s = loadSoundSettings()
  if (!s.enabled) return
  playSound(s.sounds[category], s.volume)
}
