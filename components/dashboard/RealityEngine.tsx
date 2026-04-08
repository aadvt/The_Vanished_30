'use client'

import React from 'react'
import dynamic from 'next/dynamic'

// Mapbox requires browser APIs, so we must disable SSR
const MapboxReality = dynamic(
  () => import('./MapboxReality'),
  { ssr: false }
)

const RealityEngine = () => {
  return <MapboxReality />
}

export default RealityEngine
