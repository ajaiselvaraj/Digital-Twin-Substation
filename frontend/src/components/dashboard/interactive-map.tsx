"use client"

import { useEffect, useState } from "react"
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet"
import type { DummySubstation } from "@/lib/dummy-data"
import Link from "next/link"
import { ExternalLink } from "lucide-react"

// Component to handle map view updates
function MapUpdater({ center }: { center: [number, number] }) {
  const map = useMap()

  useEffect(() => {
    map.setView(center, 7)
  }, [center, map])

  return null
}

interface InteractiveMapProps {
  searchQuery: string
  selectedVoltage: string
  selectedOperator: string
  substations: DummySubstation[]
}

export function InteractiveMap({ searchQuery, selectedVoltage, selectedOperator, substations }: InteractiveMapProps) {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null)
  const [isMounted, setIsMounted] = useState(false)
  const [L, setL] = useState<any>(null)

  useEffect(() => {
    setIsMounted(true)
    // Dynamically import Leaflet on the client only to avoid SSR/module issues
    import("leaflet").then((leaflet) => {
      const L = leaflet.default || leaflet
      setL(L)

      // Fix default marker icon
      delete (L.Icon.Default.prototype as any)._getIconUrl
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      })
    })

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation([position.coords.latitude, position.coords.longitude])
          console.log("[v0] User location:", position.coords.latitude, position.coords.longitude)
        },
        (error) => {
          console.log("[v0] Geolocation error:", error.message)
        },
      )
    }
  }, [])

  // Filter substations based on search and filters
  const filteredSubstations = substations.filter((station) => {
    const matchesSearch =
      searchQuery === "" ||
      station.master.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.master.areaName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      station.master.substationCode.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesVoltage = selectedVoltage === "all" || station.master.voltageClass === selectedVoltage

    const matchesOperator = selectedOperator === "all" || station.master.operator === selectedOperator

    return matchesSearch && matchesVoltage && matchesOperator
  })

  // Calculate center point of filtered substations or use default
  const center: [number, number] =
    filteredSubstations.length > 0
      ? [filteredSubstations[0].master.latitude, filteredSubstations[0].master.longitude]
      : [11.0168, 78.5]

  if (!isMounted || !L) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 rounded-lg">
        <p className="text-slate-400">Loading map...</p>
      </div>
    )
  }

  return (
    <>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
        crossOrigin=""
      />

      <MapContainer
        center={center}
        zoom={7}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem" }}
        className="z-0"
      >
        <MapUpdater center={center} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Render substation markers */}
        {filteredSubstations.map((station) => (
          <Marker key={station.id} position={[station.master.latitude, station.master.longitude]}>
            <Popup className="custom-popup">
              <div className="space-y-2 p-1 min-w-[250px]">
                <h3 className="font-bold text-base text-gray-900">{station.master.name}</h3>
                <div className="space-y-1 text-sm">
                  <p className="text-gray-600">
                    <span className="font-medium">Code:</span> {station.master.substationCode}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Area:</span> {station.master.areaName}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Voltage:</span> {station.master.voltageClass}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Operator:</span> {station.master.operator}
                  </p>
                  <p className="text-gray-600">
                    <span className="font-medium">Installed:</span> {station.master.installationYear}
                  </p>
                  {station.master.notes && <p className="text-gray-500 text-xs italic mt-2">{station.master.notes}</p>}
                  <div className="pt-2 mt-2 border-t">
                    <Link
                      href={`/asset-details/${station.id}`}
                      className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      View Full Details
                      <ExternalLink className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Show user location marker if available */}
        {userLocation && (
          <Marker
            position={userLocation}
            icon={
              new L.Icon({
                iconUrl:
                  "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
                shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
                iconSize: [25, 41],
                iconAnchor: [12, 41],
                popupAnchor: [1, -34],
                shadowSize: [41, 41],
              })
            }
          >
            <Popup>
              <div className="text-sm font-medium">Your Location</div>
            </Popup>
          </Marker>
        )}
      </MapContainer>
    </>
  )
}
