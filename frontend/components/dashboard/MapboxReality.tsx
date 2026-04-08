'use client'

import React, { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useStore } from '@/store/useStore'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

// BKC Mumbai coordinates
const BKC_CENTER: [number, number] = [72.8656, 19.0658]

const MapboxReality = () => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const { valuationMap } = useStore()

  useEffect(() => {
    if (!mapContainer.current || map.current) return

    mapboxgl.accessToken = MAPBOX_TOKEN

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/dark-v11',
      center: BKC_CENTER,
      zoom: 15.5,
      pitch: 60,
      bearing: -17.6,
      antialias: true,
    })

    map.current.on('style.load', () => {
      const m = map.current!

      // 3D Terrain
      m.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })

      // 3D Buildings Layer — Holographic Style
      const layers = m.getStyle().layers
      const labelLayerId = layers?.find(
        (layer) => layer.type === 'symbol' && layer.layout?.['text-field']
      )?.id

      m.addLayer(
        {
          id: '3d-buildings',
          source: 'composite',
          'source-layer': 'building',
          filter: ['==', 'extrude', 'true'],
          type: 'fill-extrusion',
          minzoom: 12,
          paint: {
            'fill-extrusion-color': [
              'interpolate',
              ['linear'],
              ['get', 'height'],
              0, '#003344',
              20, '#005566',
              50, '#0088aa',
              100, '#00ccff',
              200, '#00ffff',
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.75,
          },
        },
        labelLayerId
      )

      // Sky atmosphere
      m.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 15,
        },
      })

      setMapLoaded(true)
    })

    // Navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Add data-driven markers for our assets
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    // BKC Asset Locations (Real Lat/Lng)
    const assetLocations: Record<string, [number, number]> = {
      'BKC-ICICI': [72.8615, 19.0660],
      'BKC-NSE': [72.8648, 19.0655],
      'BKC-JIO': [72.8685, 19.0640],
      'BKC-BLK-1': [72.8630, 19.0675],
      'BKC-BLK-2': [72.8670, 19.0670],
      'BKC-BLK-3': [72.8700, 19.0660],
      'BKC-BLK-4': [72.8640, 19.0645],
    }

    // Clear existing markers
    const existingMarkers = document.querySelectorAll('.mapbox-risk-marker')
    existingMarkers.forEach(el => el.remove())

    Object.entries(assetLocations).forEach(([id, coords]) => {
      const data = valuationMap[id]
      if (!data) return

      const risk = data.risk_score
      const color = risk > 7 ? '#ff0055' : risk > 4 ? '#ffaa00' : '#00ffff'

      const el = document.createElement('div')
      el.className = 'mapbox-risk-marker'
      el.style.cssText = `
        width: 24px;
        height: 24px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid rgba(255,255,255,0.6);
        box-shadow: 0 0 20px ${color}, 0 0 40px ${color}80;
        cursor: pointer;
        animation: pulse-marker 2s infinite;
      `

      const popup = new mapboxgl.Popup({ offset: 25, className: 'hologram-popup' }).setHTML(`
        <div style="background: rgba(0,20,30,0.95); color: #00ffff; padding: 12px 16px; border-radius: 8px; border: 1px solid #00ffff40; font-family: monospace;">
          <div style="font-size: 14px; font-weight: bold; margin-bottom: 6px;">${id}</div>
          <div style="font-size: 12px; color: #aaa;">Risk: <span style="color: ${color}; font-weight: bold;">${risk.toFixed(1)}</span></div>
          <div style="font-size: 12px; color: #aaa;">Value: ₹${(data.price_index / 100000).toFixed(1)}L</div>
        </div>
      `)

      new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!)
    })
  }, [valuationMap, mapLoaded])

  return (
    <div className="fixed inset-0 z-0">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Holographic scan overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,255,0.04)_0%,transparent_60%)]" />
      
      {/* Scan line animation */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent animate-scan" />
      </div>

      <style jsx>{`
        @keyframes pulse-marker {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
        @keyframes scan {
          0% { transform: translateY(-100vh); }
          100% { transform: translateY(100vh); }
        }
        .animate-scan {
          animation: scan 4s linear infinite;
        }
      `}</style>
    </div>
  )
}

export default MapboxReality
