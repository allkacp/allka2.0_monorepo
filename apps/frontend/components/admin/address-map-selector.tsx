
import { useState } from "react"
import { MapPin, Loader2, Navigation, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddressMapSelectorProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialLat?: number
  initialLng?: number
}

export function AddressMapSelector({ onLocationSelect, initialLat = -23.5505, initialLng = -46.6333 }: AddressMapSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [manualLat, setManualLat] = useState(initialLat.toString())
  const [manualLng, setManualLng] = useState(initialLng.toString())
  const [error, setError] = useState<string | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number; address?: string } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null
  )

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) { setError("Geolocalização não suportada"); return }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setManualLat(lat.toFixed(6))
        setManualLng(lng.toFixed(6))
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
          const data = await res.json()
          const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          setSelectedPosition({ lat, lng, address })
          onLocationSelect(lat, lng, address)
        } catch {
          setSelectedPosition({ lat, lng })
          onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        } finally { setLoading(false) }
      },
      () => { setError("Não foi possível obter sua localização."); setLoading(false) }
    )
  }

  const handleManualSearch = async () => {
    const lat = Number.parseFloat(manualLat)
    const lng = Number.parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) { setError("Coordenadas inválidas"); return }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`)
      const data = await res.json()
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setSelectedPosition({ lat, lng, address })
      onLocationSelect(lat, lng, address)
    } catch {
      setSelectedPosition({ lat, lng })
      onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    } finally { setLoading(false) }
  }

  return (
    <div className="rounded-xl border overflow-hidden">
      <div className="bg-primary px-4 py-3 flex items-center gap-2">
        <MapPin className="h-4 w-4 text-primary-foreground" />
        <p className="text-primary-foreground font-semibold text-sm">Localização no Mapa</p>
      </div>
      <div className="p-4 space-y-3">
        <Button onClick={handleGetCurrentLocation} disabled={loading} size="sm" className="w-full gap-2">
          {loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Obtendo...</> : <><Navigation className="h-3.5 w-3.5" />Usar minha localização</>}
        </Button>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Latitude</Label>
            <Input type="number" step="0.000001" value={manualLat} onChange={(e) => setManualLat(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Longitude</Label>
            <Input type="number" step="0.000001" value={manualLng} onChange={(e) => setManualLng(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>
        <Button onClick={handleManualSearch} disabled={loading} variant="outline" size="sm" className="w-full gap-2">
          <Search className="h-3.5 w-3.5" />Buscar endereço
        </Button>
        {error && <p className="text-xs text-destructive">{error}</p>}
        {selectedPosition && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border">
            <MapPin className="h-4 w-4 text-primary" />
            <p className="text-xs">{selectedPosition.address || `${selectedPosition.lat.toFixed(6)}, ${selectedPosition.lng.toFixed(6)}`}</p>
          </div>
        )}
      </div>
    </div>
  )
}
