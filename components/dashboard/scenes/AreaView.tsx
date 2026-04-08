'use client'

import React, { useRef, useMemo } from 'react'
import { useFrame, useLoader } from '@react-three/fiber'
import { Box, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, ValuationData } from '@/store/useStore'

const RealisticBuilding = ({ data, position, size }: { data: ValuationData, position: [number, number, number], size: [number, number, number] }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (!meshRef.current) return
    const targetHeight = data.price_index / 8000 + 2
    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetHeight, 0.05)
    meshRef.current.position.y = meshRef.current.scale.y / 2
    
    const riskFactor = Math.min(Math.max(data.risk_score / 10, 0), 1)
    const color = new THREE.Color().lerpColors(
      new THREE.Color('#33ffaa'), // Secure
      new THREE.Color('#ff3355'), // High Risk
      riskFactor
    )
    
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.color.lerp(color, 0.05)
      meshRef.current.material.emissive.lerp(color, 0.02)
      meshRef.current.material.emissiveIntensity = 0.3
    }
  })

  return (
    <group position={position}>
      <Box ref={meshRef} args={size} castShadow receiveShadow>
        <meshStandardMaterial metalness={0.9} roughness={0.1} transparent opacity={0.95} />
      </Box>
      
      {/* Roof detail */}
      <mesh position={[0, 1, 0]}>
         <boxGeometry args={[size[0] * 0.9, 0.1, size[2] * 0.9]} />
         <meshStandardMaterial color="#222" metalness={0.5} roughness={0.8} />
      </mesh>
    </group>
  )
}

const AreaView = () => {
  const { valuationMap } = useStore()
  const items = Object.values(valuationMap)
  
  // Use a generic urban texture for the ground
  const texture = useLoader(THREE.TextureLoader, '/textures/map.png')
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping
  texture.repeat.set(1, 1)

  // Pre-calculate organic positions to look like a real area
  const buildingLayouts = useMemo(() => {
    return Array.from({ length: 40 }).map((_, i) => ({
      position: [
        (Math.random() - 0.5) * 150 + (Math.sin(i) * 10), 
        0, 
        (Math.random() - 0.5) * 150 + (Math.cos(i) * 10)
      ] as [number, number, number],
      size: [
        5 + Math.random() * 8, 
        1, 
        5 + Math.random() * 8
      ] as [number, number, number]
    }))
  }, [])

  return (
    <group>
      {/* Realistic Area Ground (Satellite Map) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.2, 0]}>
        <planeGeometry args={[300, 300]} />
        <meshStandardMaterial 
          map={texture} 
          metalness={0.2} 
          roughness={0.8} 
        />
      </mesh>
      
      {/* Organic Buildings */}
      {buildingLayouts.map((layout, i) => {
        const data = items[i] || { 
          id: `Node-${i}`, 
          price_index: 20000 + Math.random() * 60000, 
          risk_score: Math.random() * 10 
        }
        return (
          <RealisticBuilding 
            key={data.id} 
            data={data as ValuationData} 
            position={layout.position} 
            size={layout.size} 
          />
        )
      })}

      {/* Atmospheric Fog */}
      <fog attach="fog" args={['#050505', 50, 250]} />
    </group>
  )
}

export default AreaView
