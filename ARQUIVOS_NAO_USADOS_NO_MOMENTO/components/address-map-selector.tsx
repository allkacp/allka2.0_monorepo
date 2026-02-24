
import { useState } from "react"
import { MapPin, Loader2, Navigation, Search, Globe, CheckCircle2, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddressMapSelectorProps {
  onLocationSelect: (lat: number, lng: number, address: string) => void
  initialLat?: number
  initialLng?: number
}

export function AddressMapSelector({
  onLocationSelect,
  initialLat = -23.5505,
  initialLng = -46.6333,
}: AddressMapSelectorProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number; address?: string } | null>(
    initialLat && initialLng ? { lat: initialLat, lng: initialLng } : null,
  )
  const [manualLat, setManualLat] = useState(initialLat.toString())
  const [manualLng, setManualLng] = useState(initialLng.toString())

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocalização não é suportada pelo seu navegador")
      return
    }
    setLoading(true)
    setError(null)
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setManualLat(lat.toFixed(6))
        setManualLng(lng.toFixed(6))
        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
          )
          const data = await response.json()
          const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
          setSelectedPosition({ lat, lng, address })
          onLocationSelect(lat, lng, address)
        } catch {
          setSelectedPosition({ lat, lng })
          onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
        } finally {
          setLoading(false)
        }
      },
      () => {
        setError("Não foi possível obter sua localização. Verifique as permissões do navegador.")
        setLoading(false)
      },
    )
  }

  const handleManualSearch = async () => {
    const lat = Number.parseFloat(manualLat)
    const lng = Number.parseFloat(manualLng)
    if (isNaN(lat) || isNaN(lng)) { setError("Por favor, insira coordenadas válidas"); return }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) { setError("Coordenadas fora do intervalo válido"); return }
    setLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`,
      )
      const data = await response.json()
      const address = data.display_name || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      setSelectedPosition({ lat, lng, address })
      onLocationSelect(lat, lng, address)
    } catch {
      setSelectedPosition({ lat, lng })
      onLocationSelect(lat, lng, `${lat.toFixed(6)}, ${lng.toFixed(6)}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 px-4 py-3 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <Globe className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">Localização no Mapa</p>
          <p className="text-blue-100 text-xs">Use GPS ou insira coordenadas manualmente</p>
        </div>
        {selectedPosition && (
          <div className="ml-auto flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-1">
            <CheckCircle2 className="h-3.5 w-3.5 text-green-300" />
            <span className="text-white text-xs font-medium">Definida</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-4 bg-white">
        {/* GPS Button */}
        <Button
          onClick={handleGetCurrentLocation}
          disabled={loading}
          size="sm"
          className="w-full h-9 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 text-white shadow-sm gap-2"
        >
          {loading ? (
            <><Loader2 className="h-3.5 w-3.5 animate-spin" />Obtendo localização...</>
          ) : (
            <><Navigation className="h-3.5 w-3.5" />Usar minha localização atual</>
          )}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-slate-100" />
          <span className="text-xs text-slate-400 font-medium">ou insira as coordenadas</span>
          <div className="h-px flex-1 bg-slate-100" />
        </div>

        {/* Manual Coordinates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="latitude" className="text-xs font-medium text-slate-600">Latitude</Label>
            <Input
              id="latitude"
              type="number"
              step="0.000001"
              value={manualLat}
              onChange={(e) => setManualLat(e.target.value)}
              placeholder="-23.550520"
              className="h-8 text-xs"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="longitude" className="text-xs font-medium text-slate-600">Longitude</Label>
            <Input
              id="longitude"
              type="number"
              step="0.000001"
              value={manualLng}
              onChange={(e) => setManualLng(e.target.value)}
              placeholder="-46.633308"
              className="h-8 text-xs"
            />
          </div>
        </div>

        <Button
          onClick={handleManualSearch}
          disabled={loading}
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs border-slate-200 hover:border-blue-300 hover:bg-blue-50 gap-2"
        >
          <Search className="h-3.5 w-3.5" />
          Buscar endereço pelas coordenadas
        </Button>

        {/* Error */}
        {error && (
          <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100">
            <XCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}

        {/* Selected Position Badge */}
        {selectedPosition && (
          <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-100">
            <MapPin className="h-4 w-4 text-indigo-500 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-indigo-900">Localização selecionada</p>
              {selectedPosition.address ? (
                <p className="text-xs text-indigo-600 truncate">{selectedPosition.address}</p>
              ) : (
                <p className="text-xs text-indigo-600 font-mono">
                  {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Map Preview */}
        {selectedPosition && (
          <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
            <div className="absolute top-2 left-2 z-10 bg-white/90 backdrop-blur-sm rounded-lg px-2 py-1 shadow-sm flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
              <span className="text-xs font-semibold text-slate-700">
                {selectedPosition.lat.toFixed(4)}, {selectedPosition.lng.toFixed(4)}
              </span>
            </div>
            <iframe
              width="100%"
              height="220"
              frameBorder="0"
              scrolling="no"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${selectedPosition.lng - 0.01},${selectedPosition.lat - 0.01},${selectedPosition.lng + 0.01},${selectedPosition.lat + 0.01}&layer=mapnik&marker=${selectedPosition.lat},${selectedPosition.lng}`}
              style={{ border: 0, display: "block" }}
              title="Mapa de localização"
            />
          </div>
        )}
      </div>
    </div>
  )
}
