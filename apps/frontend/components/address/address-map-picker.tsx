
import { useEffect, useRef, useState } from "react"
import { MapPin, Loader2, AlertCircle } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface AddressData {
  street: string
  number: string
  district: string
  city: string
  state: string
  zipcode: string
  lat: number
  lng: number
  placeId: string
  formatted: string
}

interface AddressMapPickerProps {
  address?: Partial<AddressData>
  onAddressChange?: (address: Partial<AddressData>) => void
}

export function AddressMapPicker({ address, onAddressChange }: AddressMapPickerProps) {
  const [searchInput, setSearchInput] = useState("")
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [googleMapsReady, setGoogleMapsReady] = useState(false)
  const [selectedPosition, setSelectedPosition] = useState<{ lat: number; lng: number } | null>(
    address?.lat && address?.lng ? { lat: address.lat, lng: address.lng } : null,
  )
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<any>(null)
  const markerRef = useRef<any>(null)
  const autocompleteRef = useRef<any>(null)

  // Check if Google Maps API is available
  useEffect(() => {
    const checkGoogleMaps = () => {
      if (typeof (window as any).google !== "undefined" && (window as any).google.maps) {
        setGoogleMapsReady(true)
      }
    }

    // Check immediately
    checkGoogleMaps()

    // Also check periodically in case API loads later
    const interval = setInterval(checkGoogleMaps, 500)
    return () => clearInterval(interval)
  }, [])

  // Initialize Google Maps Autocomplete
  useEffect(() => {
    if (!googleMapsReady) return
    if (typeof (window as any).google === "undefined") return

    if (searchInputRef.current && !autocompleteRef.current) {
      autocompleteRef.current = new (window as any).google.maps.places.Autocomplete(
        searchInputRef.current,
        {
          componentRestrictions: { country: "br" },
          types: ["address"],
        },
      )

      autocompleteRef.current.addListener("place_changed", handlePlaceSelect)
    }
  }, [googleMapsReady])

  // Initialize map
  useEffect(() => {
    if (!googleMapsReady || typeof (window as any).google === "undefined" || !mapRef.current || mapLoaded) return

    const initialLat = selectedPosition?.lat || -23.5505
    const initialLng = selectedPosition?.lng || -46.6333

    const map = new (window as any).google.maps.Map(mapRef.current, {
      zoom: 15,
      center: { lat: initialLat, lng: initialLng },
      mapTypeControl: false,
      fullscreenControl: false,
      streetViewControl: false,
    })

    mapInstanceRef.current = map

    // Add marker
    const marker = new (window as any).google.maps.Marker({
      position: { lat: initialLat, lng: initialLng },
      map,
      draggable: true,
    })

    markerRef.current = marker

    // Handle marker drag
    marker.addListener("dragend", async () => {
      const position = marker.getPosition()
      const lat = position.lat()
      const lng = position.lng()

      setSelectedPosition({ lat, lng })
      geocodeLatLng(lat, lng)
    })

    setMapLoaded(true)

    return () => {
      mapInstanceRef.current = null
    }
  }, [mapLoaded])

  // Update marker position when selectedPosition changes
  useEffect(() => {
    if (markerRef.current && selectedPosition) {
      markerRef.current.setPosition(selectedPosition)
      mapInstanceRef.current?.setCenter(selectedPosition)
    }
  }, [selectedPosition])

  const handlePlaceSelect = async () => {
    if (!autocompleteRef.current) return

    const place = autocompleteRef.current.getPlace()

    if (!place.geometry) {
      console.error("No geometry found for place")
      return
    }

    const lat = place.geometry.location.lat()
    const lng = place.geometry.location.lng()

    setSelectedPosition({ lat, lng })
    setSearchInput(place.formatted_address || "")

    // Parse address components
    const addressData = parseAddressComponents(place)
    addressData.lat = lat
    addressData.lng = lng
    addressData.placeId = place.place_id || ""
    addressData.formatted = place.formatted_address || ""

    onAddressChange?.(addressData)
    setSuggestions([])
  }

  const geocodeLatLng = async (lat: number, lng: number) => {
    try {
      const geocoder = new (window as any).google.maps.Geocoder()

      geocoder.geocode({ location: { lat, lng } }, (results: any[], status: string) => {
        if (status === "OK" && results[0]) {
          const place = results[0]
          setSearchInput(place.formatted_address || "")

          const addressData = parseAddressComponents(place)
          addressData.lat = lat
          addressData.lng = lng
          addressData.placeId = place.place_id || ""
          addressData.formatted = place.formatted_address || ""

          onAddressChange?.(addressData)
        }
      })
    } catch (error) {
      console.error("Geocoding error:", error)
    }
  }

  const parseAddressComponents = (place: any): Partial<AddressData> => {
    const components: any = {}

    if (place.address_components) {
      place.address_components.forEach((component: any) => {
        const types = component.types

        if (types.includes("route")) components.street = component.long_name
        if (types.includes("street_number")) components.number = component.long_name
        if (types.includes("sublocality") || types.includes("administrative_area_level_2"))
          components.district = component.long_name
        if (types.includes("administrative_area_level_1")) components.state = component.short_name
        if (types.includes("locality")) components.city = component.long_name
        if (types.includes("postal_code")) components.zipcode = component.long_name
      })
    }

    return {
      street: components.street || "",
      number: components.number || "",
      district: components.district || "",
      city: components.city || "",
      state: components.state || "",
      zipcode: components.zipcode || "",
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-500 px-4 py-3 flex items-center gap-2.5">
        <div className="h-7 w-7 rounded-lg bg-white/20 flex items-center justify-center flex-shrink-0">
          <MapPin className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-tight">Localização no Mapa</p>
          <p className="text-purple-100 text-xs">Busque o endereço ou arraste o marcador</p>
        </div>
        {selectedPosition && (
          <div className="ml-auto flex items-center gap-1.5 bg-white/20 rounded-full px-2.5 py-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-300 animate-pulse" />
            <span className="text-white text-xs font-medium">Definida</span>
          </div>
        )}
      </div>

      <div className="p-4 space-y-3 bg-white">
        {/* Warning: Google Maps not configured */}
        {!googleMapsReady && (
          <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-amber-50 border border-amber-100">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-amber-800">Google Maps não configurado</p>
              <p className="text-xs text-amber-700 mt-0.5">Solicite ao administrador a API Key do Google Maps.</p>
            </div>
          </div>
        )}

        {/* Search Input */}
        <div className="space-y-1.5">
          <Label htmlFor="address-search" className="text-xs font-medium text-slate-600">
            {googleMapsReady ? "Buscar endereço" : "Endereço (manual)"}
          </Label>
          <div className="relative">
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
            <Input
              ref={searchInputRef}
              id="address-search"
              type="text"
              placeholder={googleMapsReady ? "Digite um endereço para buscar..." : "Digite o endereço manualmente"}
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="h-8 text-xs pl-8"
            />
          </div>
          {googleMapsReady && (
            <p className="text-xs text-slate-400">Comece a digitar para ver sugestões automáticas</p>
          )}
        </div>

        {/* Loading */}
        {googleMapsReady && !mapLoaded && (
          <div className="flex items-center justify-center gap-2 py-3 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Carregando mapa...
          </div>
        )}

        {/* Map + coords */}
        {googleMapsReady && selectedPosition && (
          <>
            <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-100">
              <MapPin className="h-4 w-4 text-violet-500 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-violet-900">Localização selecionada</p>
                <p className="text-xs text-violet-600 font-mono">
                  {selectedPosition.lat.toFixed(6)}, {selectedPosition.lng.toFixed(6)}
                </p>
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden border border-slate-200 shadow-sm">
              <div
                ref={mapRef}
                className="w-full rounded-xl bg-slate-100"
                style={{ minHeight: "220px" }}
              />
              <p className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-sm text-xs text-slate-600 px-2.5 py-1 rounded-full shadow-sm whitespace-nowrap">
                Arraste o marcador para ajustar
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
