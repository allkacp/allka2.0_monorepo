"use client"

import { useCallback } from "react"

interface GeocodeResult {
  formatted_address: string
  lat: number
  lng: number
  placeId?: string
}

/**
 * Hook para geocodificar automaticamente um endereço antigo (sem coordenadas)
 * Tenta encontrar coordenadas para rua + numero + cidade
 */
export function useAutoGeocode() {
  const geocodeAddress = useCallback(
    async (address: string): Promise<GeocodeResult | null> => {
      try {
        if (typeof google === "undefined") {
          console.error("Google Maps API not loaded")
          return null
        }

        const geocoder = new (window as any).google.maps.Geocoder()

        return new Promise((resolve) => {
          geocoder.geocode({ address }, (results: any[], status: string) => {
            if (status === "OK" && results[0]) {
              const place = results[0]
              const location = place.geometry.location

              resolve({
                formatted_address: place.formatted_address || address,
                lat: location.lat(),
                lng: location.lng(),
                placeId: place.place_id,
              })
            } else {
              console.warn("Geocoding failed:", status)
              resolve(null)
            }
          })
        })
      } catch (error) {
        console.error("Geocoding error:", error)
        return null
      }
    },
    [],
  )

  const geocodeAddressComponents = useCallback(
    async (rua: string, numero: string, cidade: string, estado: string, cep?: string): Promise<GeocodeResult | null> => {
      // Monta um endereço completo para geocodificação
      const address = [numero && rua ? `${rua}, ${numero}` : rua, cidade, estado, cep].filter(Boolean).join(", ")
      return geocodeAddress(address)
    },
    [geocodeAddress],
  )

  return {
    geocodeAddress,
    geocodeAddressComponents,
  }
}
