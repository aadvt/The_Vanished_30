'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Text } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

const ScenarioBar = ({ label, value, targetValue, color, position }: any) => {
  const meshRef = useRef<THREE.Mesh>(null)
  
  useFrame(() => {
    if (!meshRef.current) return
    const targetHeight = targetValue / 100000 // Scales value to 3D units
    meshRef.current.scale.y = THREE.MathUtils.lerp(meshRef.current.scale.y, targetHeight || 0.1, 0.05)
    meshRef.current.position.y = meshRef.current.scale.y / 2
  })

  return (
    <group position={position}>
      <Box ref={meshRef} args={[5, 1, 5]} castShadow>
        <meshStandardMaterial color={color} metalness={0.9} roughness={0.1} emissive={color} emissiveIntensity={0.2} />
      </Box>
      <Text
        position={[0, -2, 4]}
        fontSize={1}
        color="white"
        maxWidth={10}
        textAlign="center"
      >
        {label}\n${(targetValue / 1000).toFixed(0)}k
      </Text>
    </group>
  )
}

const ScenarioLab = () => {
  const { scenarioResult } = useStore()
  
  // Default values for animation preview
  const data = scenarioResult || { p5: 0, p50: 0, p95: 0 }

  return (
    <group>
      <Text
        position={[0, 15, 0]}
        fontSize={2}
        color="white"
        anchorX="center"
      >
        MONTE CARLO SIMULATION
      </Text>

      <ScenarioBar 
        label="P5 (Conservative)" 
        targetValue={data.p5} 
        color="#ffaa00" 
        position={[-15, 0, 0]} 
      />
      <ScenarioBar 
        label="P50 (Median)" 
        targetValue={data.p50} 
        color="#00aaff" 
        position={[0, 0, 0]} 
      />
      <ScenarioBar 
        label="P95 (Optimistic)" 
        targetValue={data.p95} 
        color="#00ff88" 
        position={[15, 0, 0]} 
      />
      
      {/* Ground Reflector */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
        <planeGeometry args={[60, 30]} />
        <meshStandardMaterial color="#050505" opacity={0.5} transparent />
      </mesh>
    </group>
  )
}

export default ScenarioLab
