import { useState } from "react"
import { Play, Volume2, VolumeX } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { Slider } from "@/components/ui/slider"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  SOUND_CATEGORIES, SOUND_OPTIONS, loadSoundSettings, playSound, saveSoundSettings,
  type SoundCategory, type SoundId, type SoundSettings,
} from "@/lib/notification-sounds"

/** Sons de aviso: escolher o som de cada tipo, volume e mudo (salvo neste aparelho). */
export function NotificationSoundSettings() {
  const [settings, setSettings] = useState<SoundSettings>(() => loadSoundSettings())

  function update(next: SoundSettings) {
    setSettings(next)
    saveSoundSettings(next)
  }

  function pick(cat: SoundCategory, id: SoundId) {
    update({ ...settings, sounds: { ...settings.sounds, [cat]: id } })
    playSound(id, settings.volume) // prévia ao escolher
  }

  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Sons de aviso</p>
      <div className="rounded-xl border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/50 p-3 space-y-3">
        <label className="flex items-center justify-between gap-3 cursor-pointer">
          <span className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
            {settings.enabled ? <Volume2 className="h-3.5 w-3.5" /> : <VolumeX className="h-3.5 w-3.5" />}
            Tocar som quando chegar aviso novo
          </span>
          <Switch checked={settings.enabled} onCheckedChange={(v) => update({ ...settings, enabled: v })} className="scale-75" />
        </label>

        <div className={settings.enabled ? "space-y-3" : "space-y-3 opacity-50 pointer-events-none"}>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-500 w-12 shrink-0">Volume</span>
            <Slider
              value={[settings.volume]}
              min={0}
              max={100}
              step={5}
              onValueChange={([v]) => update({ ...settings, volume: v })}
              aria-label="Volume dos avisos"
            />
            <span className="text-[10px] text-slate-500 w-8 text-right">{settings.volume}%</span>
          </div>

          {SOUND_CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-none">{cat.label}</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{cat.desc}</p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Select value={settings.sounds[cat.id]} onValueChange={(v) => pick(cat.id, v as SoundId)}>
                  <SelectTrigger className="h-8 w-32 text-xs" aria-label={`Som de ${cat.label}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SOUND_OPTIONS.map((o) => (
                      <SelectItem key={o.id} value={o.id} className="text-xs">{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <button
                  type="button"
                  onClick={() => playSound(settings.sounds[cat.id], settings.volume)}
                  disabled={settings.sounds[cat.id] === "off"}
                  className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-40"
                  aria-label={`Ouvir som de ${cat.label}`}
                  title="Ouvir"
                >
                  <Play className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed">
          Vale só para este aparelho/navegador. O navegador só libera som depois que você clica em algo na página.
        </p>
      </div>
    </div>
  )
}
