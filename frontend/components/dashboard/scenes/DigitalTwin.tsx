'use client'

import React, { useMemo } from 'react'
import { useStore } from '@/store/useStore'
import ArchitecturalAsset from './ArchitecturalAsset'

const DigitalTwin = () => {
  const { valuationMap } = useStore()

  // Real-world configuration for the BKC, Mumbai Digital Twin
  const landmarkConfigs = useMemo(() => [
    { id: 'BKC-ICICI', type: 'icici', pos: [0, 0, -40] as [number, number, number] },
    { id: 'BKC-NSE', type: 'nse', pos: [80, 0, 10] as [number, number, number] },
    { id: 'BKC-JIO', type: 'jio', pos: [-100, 0, 0] as [number, number, number] },
    { id: 'BKC-BLK-1', type: 'bkc_block', pos: [40, 0, 50] as [number, number, number] },
    { id: 'BKC-BLK-2', type: 'bkc_block', pos: [-50, 0, -60] as [number, number, number] },
    { id: 'BKC-BLK-3', type: 'bkc_block', pos: [120, 0, -30] as [number, number, number] },
    { id: 'BKC-BLK-4', type: 'bkc_block', pos: [-40, 0, 70] as [number, number, number] },
  ], [])

  return (
    <group>
      {/* India Financial Hub - BKC Floor Grid */}
      <gridHelper args={[800, 80, '#00ffff33', '#00ffff11']} position={[0, -0.1, 0]} />
      
      {/* BKC Architectural Assets */}
      {landmarkConfigs.map((config) => {
        const data = valuationMap[config.id] || { risk_score: 2 }
        return (
          <ArchitecturalAsset 
            key={config.id} 
            id={config.id}
            type={config.type as any} 
            position={config.pos} 
            risk={data.risk_score} 
          />
        )
      })}

      {/* Volumetric scanning floor pulse */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
         <rectAreaLight width={400} height={400} intensity={2} color="#00ffff" />
         <circleGeometry args={[400, 64]} />
         <meshStandardMaterial 
            color="#00ffff" 
            transparent 
            opacity={0.03} 
            emissive="#00ffff" 
            emissiveIntensity={0.2} 
         />
      </mesh>
    </group>
  )
}

export default DigitalTwin
