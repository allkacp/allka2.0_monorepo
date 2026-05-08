
import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, GripVertical, Instagram, Facebook, Linkedin, Music, Youtube, Mail, MapPin, MessageCircle, Globe, X } from "lucide-react"
import { cn } from "@/lib/utils"

export type SocialPlatform = "instagram" | "facebook" | "linkedin" | "tiktok" | "youtube" | "x" | "pinterest" | "whatsapp" | "telegram" | "site" | "google_business"

export interface SocialLink {
  id: string
  platform: SocialPlatform
  url: string
  order: number
}

interface CompanySocialLinksManagerProps {
  socialLinks: SocialLink[]
  onChange: (links: SocialLink[]) => void
  isEditMode?: boolean
}

const SOCIAL_PLATFORMS: { id: SocialPlatform; name: string; icon: React.ReactNode; color: string; placeholder: string }[] = [
  { id: "instagram", name: "Instagram", icon: <Instagram className="h-5 w-5" />, color: "bg-pink-50 border-pink-200 text-pink-600", placeholder: "https://instagram.com/empresa" },
  { id: "facebook", name: "Facebook", icon: <Facebook className="h-5 w-5" />, color: "bg-blue-50 border-blue-200 text-blue-600", placeholder: "https://facebook.com/empresa" },
  { id: "linkedin", name: "LinkedIn", icon: <Linkedin className="h-5 w-5" />, color: "bg-blue-50 border-blue-200 text-blue-700", placeholder: "https://linkedin.com/company/empresa" },
  { id: "tiktok", name: "TikTok", icon: <Music className="h-5 w-5" />, color: "bg-black/5 border-black/10 text-black", placeholder: "https://tiktok.com/@empresa" },
  { id: "youtube", name: "YouTube", icon: <Youtube className="h-5 w-5" />, color: "bg-red-50 border-red-200 text-red-600", placeholder: "https://youtube.com/@empresa" },
  { id: "x", name: "X (Twitter)", icon: <X className="h-5 w-5" />, color: "bg-black/5 border-black/10 text-black", placeholder: "https://x.com/empresa" },
  { id: "pinterest", name: "Pinterest", icon: <Mail className="h-5 w-5" />, color: "bg-red-50 border-red-200 text-red-500", placeholder: "https://pinterest.com/empresa" },
  { id: "whatsapp", name: "WhatsApp", icon: <MessageCircle className="h-5 w-5" />, color: "bg-green-50 border-green-200 text-green-600", placeholder: "https://wa.me/55xxxxxxxxxxxx" },
  { id: "telegram", name: "Telegram", icon: <MessageCircle className="h-5 w-5" />, color: "bg-blue-50 border-blue-200 text-blue-500", placeholder: "https://t.me/empresa" },
  { id: "site", name: "Site", icon: <Globe className="h-5 w-5" />, color: "bg-purple-50 border-purple-200 text-purple-600", placeholder: "https://empresa.com.br" },
  { id: "google_business", name: "Google Meu Negócio", icon: <MapPin className="h-5 w-5" />, color: "bg-yellow-50 border-yellow-200 text-yellow-600", placeholder: "https://google.com/business/empresa" },
]

const getPlatformConfig = (platform: SocialPlatform) => SOCIAL_PLATFORMS.find(p => p.id === platform) || SOCIAL_PLATFORMS[0]

export function CompanySocialLinksManager({ socialLinks, onChange, isEditMode = false }: CompanySocialLinksManagerProps) {
  const [showSelector, setShowSelector] = useState(false)
  const usedPlatforms = new Set(socialLinks.map(l => l.platform))

  const handleAddPlatform = (platform: SocialPlatform) => {
    // If platform already exists, just close the selector
    if (usedPlatforms.has(platform)) {
      setShowSelector(false)
      return
    }

    const newLink: SocialLink = {
      id: `${platform}-${Date.now()}`,
      platform,
      url: "",
      order: socialLinks.length,
    }

    onChange([...socialLinks, newLink])
    setShowSelector(false)
  }

  const handleUpdateLink = (id: string, url: string) => {
    onChange(
      socialLinks.map(link =>
        link.id === id ? { ...link, url } : link
      )
    )
  }

  const handleRemoveLink = (id: string) => {
    onChange(socialLinks.filter(link => link.id !== id))
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-500 via-rose-500 to-orange-400 px-4 py-3 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Globe className="h-4 w-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-white font-semibold text-sm leading-tight">Redes Sociais</p>
          <p className="text-pink-100 text-xs">Adicione os perfis e links da empresa</p>
        </div>
        {socialLinks.length > 0 && (
          <div className="flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-1">
            <span className="text-white text-xs font-medium">{socialLinks.length} adicionada{socialLinks.length > 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 bg-white">
        {/* Platform Selector Grid */}
        {showSelector && (
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2.5">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-slate-600">Selecione uma plataforma:</p>
              <button
                onClick={() => setShowSelector(false)}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {SOCIAL_PLATFORMS.map((platform) => {
                const used = usedPlatforms.has(platform.id)
                return (
                  <button
                    key={platform.id}
                    onClick={() => handleAddPlatform(platform.id)}
                    disabled={used}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-xs font-medium transition-all",
                      used
                        ? "bg-slate-100 border-slate-200 text-slate-300 cursor-not-allowed"
                        : cn("bg-white hover:scale-[1.02] cursor-pointer", platform.color)
                    )}
                  >
                    <span className="flex-shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">{platform.icon}</span>
                    <span className="truncate">{platform.name}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Add Button */}
        {!showSelector && (
          <button
            type="button"
            onClick={() => setShowSelector(true)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed border-slate-300 text-xs font-medium text-slate-500 hover:border-pink-400 hover:text-pink-500 hover:bg-pink-50 transition-all"
          >
            <Plus className="h-3.5 w-3.5" />
            Adicionar rede social
          </button>
        )}

        {/* Social Links List */}
        {socialLinks.length > 0 && (
          <div className="space-y-2">
            {socialLinks.map((link) => {
              const config = getPlatformConfig(link.platform)
              return (
                <div key={link.id} className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-100 bg-slate-50 group hover:border-slate-200 transition-all">
                  <GripVertical className="h-3.5 w-3.5 text-slate-300 flex-shrink-0 cursor-grab" />
                  <div className={cn("h-7 w-7 rounded-lg border flex items-center justify-center flex-shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5", config.color)}>
                    {config.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-slate-700 mb-1">{config.name}</p>
                    <Input
                      type="url"
                      placeholder={config.placeholder}
                      value={link.url}
                      onChange={(e) => handleUpdateLink(link.id, e.target.value)}
                      className="h-7 text-xs border-slate-200 bg-white"
                    />
                  </div>
                  <button
                    onClick={() => handleRemoveLink(link.id)}
                    className="h-6 w-6 rounded-md flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty State */}
        {socialLinks.length === 0 && !showSelector && (
          <div className="text-center py-4 text-slate-400">
            <Globe className="h-8 w-8 mx-auto mb-2 text-slate-200" />
            <p className="text-xs">Nenhuma rede social adicionada ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}
