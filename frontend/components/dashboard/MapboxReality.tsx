'use client'

import React, { useRef, useEffect, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || ''

// BKC Mumbai coordinates
const BKC_CENTER: [number, number] = [72.8656, 19.0658]

const MapboxReality = () => {
  const mapContainer = useRef<HTMLDivElement>(null)
  const map = useRef<mapboxgl.Map | null>(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const { valuationMap, mapTarget, activeRegion, bubbleFlags, overrideScore } = useStore()

  const sceneStateRef = useRef({
    lngLat: BKC_CENTER as [number, number],
    score: 50,
    needsUpdate: true
  })

  useEffect(() => {
    const CITIES: Record<string, [number, number]> = {
      'Mumbai': [72.8656, 19.0658],
      'Delhi': [77.2090, 28.6139],
      'Bangalore': [77.5946, 12.9716],
      'Chennai': [80.2707, 13.0827],
    }
    
    let targetLngLat = BKC_CENTER;
    if (mapTarget) {
      targetLngLat = [mapTarget.lng, mapTarget.lat]
    } else if (activeRegion && CITIES[activeRegion]) {
      targetLngLat = CITIES[activeRegion]
    }

    const flag = bubbleFlags?.find(f => f.region.toLowerCase() === activeRegion?.toLowerCase())
    // Fall back to overrideScore if active (e.g. for voice command simulation spikes)
    const score = overrideScore !== null ? overrideScore : flag ? flag.overall_score : 50

    if (sceneStateRef.current) {
      sceneStateRef.current.lngLat = targetLngLat
      sceneStateRef.current.score = score
      sceneStateRef.current.needsUpdate = true
    }
  }, [mapTarget, activeRegion, bubbleFlags, overrideScore])

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

      // Tint the map terrain/land to dark matcha (#10381a)
      if (m.getLayer('background')) {
        m.setPaintProperty('background', 'background-color', '#10381a')
      }
      if (m.getLayer('water')) {
        m.setPaintProperty('water', 'fill-color', '#07180b')
      }

      // 3D Terrain
      m.addSource('mapbox-dem', {
        type: 'raster-dem',
        url: 'mapbox://mapbox.mapbox-terrain-dem-v1',
        tileSize: 512,
        maxzoom: 14,
      })
      m.setTerrain({ source: 'mapbox-dem', exaggeration: 1.5 })

      // 3D Buildings Layer — Matcha Style
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
              0, '#ffffff',
              20, '#b6e6c8',
              50, '#75d195',
              100, '#4dbf73',
              200, '#2d7a48',
            ],
            'fill-extrusion-height': ['get', 'height'],
            'fill-extrusion-base': ['get', 'min_height'],
            'fill-extrusion-opacity': 0.85,
          },
        },
        labelLayerId
      )

      // Atmosphere for clean light look
      m.addLayer({
        id: 'sky',
        type: 'sky',
        paint: {
          'sky-type': 'atmosphere',
          'sky-atmosphere-sun': [0.0, 0.0],
          'sky-atmosphere-sun-intensity': 20,
        },
      })

      // THREE.JS Integration
      // THREE.JS Integration - Initial coordinates will be overridden in render
      const mercator = mapboxgl.MercatorCoordinate.fromLngLat(BKC_CENTER, 0)
      const scale = mercator.meterInMercatorCoordinateUnits()

      const bubbleFireLayer: any = {
        id: 'bubble-fire-effect',
        type: 'custom',
        renderingMode: '3d',
        onAdd: function (map: mapboxgl.Map, gl: WebGLRenderingContext) {
          this.camera = new THREE.Camera()
          this.scene = new THREE.Scene()
          
          // 1. Red solid bounding box replacing the building visually
          const boxGeo = new THREE.BoxGeometry(60, 160, 60)
          boxGeo.translate(0, 80, 0) // Shift origin to bottom
          
          // Apply vertex colors for a gradient (dark red at base, bright orange/red at top)
          const boxPos = boxGeo.attributes.position
          const colors = []
          const c = new THREE.Color()
          for (let i = 0; i < boxPos.count; i++) {
            const y = boxPos.getY(i)
            // Interpolate from deep red to bright orange-red based on height (0 to 160)
            c.setHex(0xd7383b).lerp(new THREE.Color(0xff8a00), y / 160)
            colors.push(c.r, c.g, c.b)
          }
          boxGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))

          const boxMat = new THREE.MeshBasicMaterial({
            vertexColors: true,
            transparent: true,
            opacity: 0.9,
            depthWrite: true
          })
          this.boxMesh = new THREE.Mesh(boxGeo, boxMat)
          this.scene.add(this.boxMesh)

          // 2. Fire/Bubble Particles rising from it softly
          const particleCount = 40
          const geom = new THREE.BufferGeometry()
          const pos = new Float32Array(particleCount * 3)
          this.velocities = []

          for (let i = 0; i < particleCount; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 80
            pos[i * 3 + 1] = Math.random() * 200
            pos[i * 3 + 2] = (Math.random() - 0.5) * 80
            this.velocities.push({
              x: (Math.random() - 0.5) * 0.5,
              y: Math.random() * 0.8 + 0.2, // much slower rise
              z: (Math.random() - 0.5) * 0.5
            })
          }
          geom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
          const ptMat = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 2, // smaller dots
            transparent: true,
            opacity: 0.35, // much fainter
            blending: THREE.AdditiveBlending,
            depthWrite: false
          })
          this.particles = new THREE.Points(geom, ptMat)
          this.scene.add(this.particles)

          // 3. Capital Flow Arcs (Transaction mapping)
          this.arcs = []
          this.photons = []
          
          // Strike right at the rooftop of the highlighted vertical building (height = 160)
          const endPt = new THREE.Vector3(0, 160, 0)

          // 5 sources looping around dynamically, originating slightly off the ground 
          // to simulate Capital flowing in from adjacent surrounding rooftops
          const sources = [
            new THREE.Vector3(300, 50, -250), // Distant NE flow
            new THREE.Vector3(120, 80, 80),   // Close East mid-rise
            new THREE.Vector3(-50, 20, 350),  // Far South ground swell
            new THREE.Vector3(-250, 60, 50),  // Mid West flow
            new THREE.Vector3(-100, 100, -150) // Close NW high-rise jump
          ]

          sources.forEach(startPt => {
            const dist = startPt.distanceTo(endPt)
            
            // Calculate a beautiful high parabolic arc
            const midPt = new THREE.Vector3().addVectors(startPt, endPt).multiplyScalar(0.5)
            // Ensure the arc apex is significantly higher than both the start and end points
            midPt.y = Math.max(startPt.y, endPt.y) + dist * 0.4 
            
            const curve = new THREE.QuadraticBezierCurve3(startPt, midPt, endPt)

            // Faint track line
            const points = curve.getPoints(50) // 51 points
            const trackGeo = new THREE.BufferGeometry().setFromPoints(points)
            // Make the beam brighter since it's going to be a moving shot of light
            const trackMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.6 })
            const trackLine = new THREE.Line(trackGeo, trackMat)
            
            // Start fully hidden
            trackGeo.setDrawRange(0, 0)
            
            this.scene.add(trackLine)

            // Random start time and speed for organic flow
            this.arcs.push({ 
              curve, 
              t: Math.random(), 
              speed: 0.004 + Math.random() * 0.004,
              trackGeo, // Store geometry to animate it
              numPts: 51
            })

            // The moving photon (glowing orb mimicking capital)
            const photonGeo = new THREE.SphereGeometry(6, 16, 16)
            const photonMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 })
            const photon = new THREE.Mesh(photonGeo, photonMat)
            
            // Outer lush green glow for the photon
            const glowGeo = new THREE.SphereGeometry(16, 16, 16)
            const glowMat = new THREE.MeshBasicMaterial({ color: 0x4dbf73, transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false })
            const glow = new THREE.Mesh(glowGeo, glowMat)
            photon.add(glow)
            
            this.scene.add(photon)
            this.photons.push(photon)
          })

          this.renderer = new THREE.WebGLRenderer({
            canvas: map.getCanvas(),
            context: gl,
            antialias: true
          })
          this.renderer.autoClear = false
        },
        render: function (gl: WebGLRenderingContext, matrix: number[]) {
          const state = sceneStateRef.current
          
          // Recompute coordinates dynamically based on state
          const currentMercator = mapboxgl.MercatorCoordinate.fromLngLat(state.lngLat, 0)
          const currentScale = currentMercator.meterInMercatorCoordinateUnits()
          
          const m = new THREE.Matrix4().fromArray(matrix)
          const l = new THREE.Matrix4()
            .makeTranslation(currentMercator.x, currentMercator.y, currentMercator.z)
            .scale(new THREE.Vector3(currentScale, -currentScale, currentScale))
            .multiply(new THREE.Matrix4().makeRotationX(Math.PI / 2))

          this.camera.projectionMatrix = m.multiply(l)
          this.renderer.resetState()

          // Data-Driven Colors
          if (state.needsUpdate && this.boxMesh && this.particles) {
             state.needsUpdate = false
             
             let hexColor = 0x0f4d23 // Match Safe (Green)
             let topColor = 0x4dbf73
             
             if (state.score > 70) {
               hexColor = 0xd7383b // Red High Risk
               topColor = 0xff8a00
             } else if (state.score > 40) {
               hexColor = 0xE4B461 // Yellow/Gold Warning
               topColor = 0xffcc00
             }
             
             // Box gradient
             const boxPos = this.boxMesh.geometry.attributes.position
             const colors = []
             const cColor = new THREE.Color()
             for (let i = 0; i < boxPos.count; i++) {
               const y = boxPos.getY(i)
               cColor.setHex(hexColor).lerp(new THREE.Color(topColor), y / 160)
               colors.push(cColor.r, cColor.g, cColor.b)
             }
             this.boxMesh.geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
             
             // Particles & Photons
             this.particles.material.color.setHex(topColor)
             if (this.photons) {
                this.photons.forEach((p: any) => p.children[0].material.color.setHex(topColor))
             }
          }

          // Animate particles slowly
          if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array
            for (let i = 0; i < 40; i++) {
              positions[i * 3] += this.velocities[i].x
              positions[i * 3 + 1] += this.velocities[i].y
              positions[i * 3 + 2] += this.velocities[i].z
              
              if (positions[i * 3 + 1] > 200) {
                positions[i * 3 + 1] = 0
                positions[i * 3] = (Math.random() - 0.5) * 80
                positions[i * 3 + 2] = (Math.random() - 0.5) * 80
              }
            }
            this.particles.geometry.attributes.position.needsUpdate = true
          }

          // Animate Capital Flow Arcs
          if (this.arcs && this.photons) {
            for (let i = 0; i < this.arcs.length; i++) {
              const arc = this.arcs[i]
              arc.t += arc.speed
              if (arc.t > 1) {
                arc.t = 0 // Reset to source
              }
              
              // 1. Move Photon Orb
              const pos = arc.curve.getPointAt(arc.t)
              this.photons[i].position.copy(pos)
              
              // 2. Animate the Line itself (Shooting Beam Effect)
              const currentIndex = Math.floor(arc.t * arc.numPts)
              const tailLength = 15 // Only show the last 15 segments of the curve as a trail
              const startDraw = Math.max(0, currentIndex - tailLength)
              const drawCount = currentIndex - startDraw
              
              // Update geometry draw range so the line physically "moves"
              arc.trackGeo.setDrawRange(startDraw, drawCount)
            }
          }

          this.renderer.render(this.scene, this.camera)
          map.current?.triggerRepaint()
        }
      }

      m.addLayer(bubbleFireLayer, '3d-buildings')

      setMapLoaded(true)
    })

    // Navigation controls
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Add data-driven markers for our assets - Matcha themed
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const assetLocations: Record<string, [number, number]> = {
      'MUM-BKC': [72.8656, 19.0658],
      'DEL-CP': [77.2090, 28.6139],
      'BLR-WF': [77.5946, 12.9716],
      'MAA-OMR': [80.2707, 13.0827],
    }

    const existingMarkers = document.querySelectorAll('.mapbox-risk-marker')
    existingMarkers.forEach(el => el.remove())

    Object.entries(assetLocations).forEach(([id, coords]) => {
      const data = valuationMap[id]
      if (!data) return

      const risk = data.risk_score
      // Matcha Risk Scale: Good (Sage), Warning (Yellow-Matcha), High (Coral)
      const color = risk > 7 ? '#d7383b' : risk > 4 ? '#E4B461' : '#0f4d23'

      const el = document.createElement('div')
      el.className = 'mapbox-risk-marker'
      el.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${color};
        border: 2px solid white;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        cursor: pointer;
        animation: pulse-marker 2s infinite;
      `

      const popup = new mapboxgl.Popup({ offset: 25, className: 'matcha-popup' }).setHTML(`
        <div style="background: rgba(255,255,255,0.95); color: #1A1D1A; padding: 14px 20px; border-radius: 16px; border: 1px solid rgba(0,0,0,0.05); font-family: 'Space Grotesk', sans-serif; backdrop-filter: blur(16px); box-shadow: 0 10px 30px rgba(0,0,0,0.1);">
          <div style="font-size: 15px; font-weight: 800; margin-bottom: 4px; letter-spacing: -0.03em;">${id}</div>
          <div style="font-size: 9px; color: #888; text-transform: uppercase; font-weight: 700; letter-spacing: 0.15em; margin-bottom: 12px;">Primary Asset Hub</div>
          <div style="display: flex; gap: 24px; border-top: 1px solid rgba(0,0,0,0.05); pt: 8px;">
            <div>
              <div style="font-size: 8px; color: #999; text-transform: uppercase; font-weight: 700;">Risk</div>
              <div style="font-size: 13px; color: ${color}; font-weight: 800;">${risk.toFixed(2)}</div>
            </div>
            <div>
              <div style="font-size: 8px; color: #999; text-transform: uppercase; font-weight: 700;">Price</div>
              <div style="font-size: 13px; color: #000; font-weight: 800;">₹${(data.price_index / 100000).toFixed(1)}L</div>
            </div>
          </div>
        </div>
      `)

      const markerBtn = document.createElement('div')
      // Mapbox needs the element to trigger interaction
      el.addEventListener('click', () => {
        useStore.getState().setSelectedAssetId(id)
      })

      new mapboxgl.Marker(el)
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current!)
    })
  }, [valuationMap, mapLoaded])

  // --- Dynamic Mapbox Environment Coloring (p10 < p50 < p90 Risk Distribution) ---
  useEffect(() => {
    if (!map.current || !mapLoaded) return

    const flag = bubbleFlags?.find(f => f.region.toLowerCase() === activeRegion?.toLowerCase())
    const score = overrideScore !== null ? overrideScore : flag ? flag.overall_score : 50

    // The user requested: green = p10 (low), yellowish = p50 (medium), red = p90 (high/tall buildings)
    // We color-grade individual buildings by their height (representing capital/asset density)
    // and tweak the intensity based on the city's overall macro risk score.
    
    // Default Spectrum (Balanced City)
    let colorRamp = [
      0, '#4dbf73',    // Green (Safe/Base)
      50, '#f6d353',   // Yellow (Medium Risk/Mid-rises)
      150, '#d7383b',  // Red (High Risk/Skyscrapers)
    ]

    if (score > 70) {
      // High Risk City: The spectrum shifts down, more buildings become yellow/red quickly
      colorRamp = [
        0, '#75d195',    // Base is slightly agitated green
        30, '#f6d353',   // Mid-rises turn yellow much faster
        100, '#d7383b',  // Anything >= 100m becomes explicitly red
      ]
    } else if (score < 40) {
      // Safe City: It takes massive skyscrapers to hit the red zone
      colorRamp = [
        0, '#2d7a48',    // Deep safe green
        80, '#75d195',   // Mid-rises stay green
        180, '#f6d353',  // Only massive towers show yellow warning
      ]
    }

    if (map.current.getLayer('3d-buildings')) {
      map.current.setPaintProperty('3d-buildings', 'fill-extrusion-color', [
        'interpolate',
        ['linear'],
        ['get', 'height'],
        ...colorRamp
      ])
    }
  }, [activeRegion, bubbleFlags, mapLoaded, overrideScore])

  // --- Fly to target location when mapTarget changes ---
  useEffect(() => {
    if (!map.current || !mapTarget) return

    map.current.flyTo({
      center: [mapTarget.lng, mapTarget.lat],
      zoom: mapTarget.zoom ?? 15.5,
      pitch: 60,
      bearing: -17.6,
      duration: 3000,
      essential: true,
    })
  }, [mapTarget])

  return (
    <div className="fixed inset-0 z-0">
      <div ref={mapContainer} className="w-full h-full" />

      {/* Holographic scan overlay */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_0%,rgba(0,255,255,0.04)_0%,transparent_60%)]" />
      
      <style jsx>{`
        @keyframes pulse-marker {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.3); opacity: 0.7; }
        }
      `}</style>
    </div>
  )
}

export default MapboxReality
