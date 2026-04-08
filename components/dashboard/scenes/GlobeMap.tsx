'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Sphere, Float, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

const GlobeMap = () => {
  const globeRef = useRef<THREE.Mesh>(null)
  const { valuationMap } = useStore()
  const items = Object.values(valuationMap)

  useFrame((state) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += 0.002
    }
  })

  return (
    <group>
      <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
        <Sphere ref={globeRef} args={[20, 64, 64]}>
          <MeshDistortMaterial
            color="#050505"
            speed={2}
            distort={0.2}
            metalness={0.9}
            roughness={0.1}
            emissive="#00ff88"
            emissiveIntensity={0.1}
          />
        </Sphere>
      </Float>

      {/* Hex-like data points on the globe surface */}
      {items.map((data, index) => {
        // Random spherical coords for mock representation
        const phi = Math.acos(-1 + (2 * index) / items.length)
        const theta = Math.sqrt(items.length * Math.PI) * phi
        
        const x = 22 * Math.sin(phi) * Math.cos(theta)
        const y = 22 * Math.sin(phi) * Math.sin(theta)
        const z = 22 * Math.cos(phi)
        
        return (
          <group key={data.id} position={[x, y, z]} lookAt={[0, 0, 0]}>
             <mesh>
               <boxGeometry args={[1, 1, data.volatility * 20 + 2]} />
               <meshStandardMaterial 
                 color={data.pi_ratio > 0.5 ? '#00aaff' : '#ff0044'} 
                 emissive={data.pi_ratio > 0.5 ? '#00aaff' : '#ff0044'} 
                 emissiveIntensity={0.5}
               />
             </mesh>
          </group>
        )
      })}

      {/* Atmospheric glow */}
      <Sphere args={[21, 32, 32]}>
        <meshStandardMaterial 
          color="#00ff88" 
          transparent 
          opacity={0.05} 
          side={THREE.BackSide} 
        />
      </Sphere>
    </group>
  )
}

export default GlobeMap
