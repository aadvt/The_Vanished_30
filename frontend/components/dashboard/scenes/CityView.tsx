'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore, ValuationData } from '@/store/useStore'

const Building = ({ data, index }: { data: ValuationData, index: number }) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  // Calculate position in a grid
  const x = (index % 10) * 12 - 50
  const z = Math.floor(index / 10) * 12 - 50
  
  useFrame((state) => {
    if (!meshRef.current) return
    
    // Smoothly interpolate height and color
    const targetHeight = data.price_index / 10000 + 1
    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetHeight, 0.1)
    meshRef.current.position.y = meshRef.current.scale.y / 2

    // Color based on risk score (0-10)
    const riskFactor = Math.min(Math.max(data.risk_score / 10, 0), 1)
    const color = new THREE.Color().lerpColors(
      new THREE.Color('#00ff88'), // Low risk
      new THREE.Color('#ff0044'), // High risk
      riskFactor
    )
    
    // Update material color
    if (meshRef.current.material instanceof THREE.MeshStandardMaterial) {
      meshRef.current.material.color.lerp(color, 0.1)
      meshRef.current.material.emissive.lerp(color, 0.05)
      meshRef.current.material.emissiveIntensity = 0.2
    }
  })

  return (
    <group position={[x, 0, z]}>
      <Box ref={meshRef} args={[8, 1, 8]} castShadow receiveShadow>
        <meshStandardMaterial metalness={0.8} roughness={0.2} transparent opacity={0.9} />
      </Box>
      
      {/* Label for building */}
        <Text
          position={[0, 0.5, 5]}
          rotation={[-Math.PI / 2, 0, 0]}
          fontSize={1.2}
          color="white"
          maxWidth={8}
          textAlign="center"
        >
        {data.id}
      </Text>
    </group>
  )
}

const CityView = () => {
  const { valuationMap } = useStore()
  const items = Object.values(valuationMap)

  return (
    <group>
      {/* Ground Plane */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow position={[0, -0.1, 0]}>
        <planeGeometry args={[200, 200]} />
        <meshStandardMaterial color="#0a0a0a" metalness={0.8} roughness={0.4} />
      </mesh>
      
      {/* Grid Helper */}
      <gridHelper args={[200, 20, '#ffffff05', '#ffffff10']} position={[0, 0.01, 0]} />

      {items.map((data, i) => (
        <Building key={data.id} data={data} index={i} />
      ))}
      
      {/* Empty state buildings if no data */}
      {items.length === 0 && Array.from({ length: 10 }).map((_, i) => (
        <Building 
           key={`placeholder-${i}`} 
           data={{ id: `Node-${i}`, price_index: 50000, risk_score: 2, volatility: 0.1, pi_ratio: 0.5 }} 
           index={i} 
        />
      ))}
    </group>
  )
}

export default CityView
