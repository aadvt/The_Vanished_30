'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Cylinder, Cone, Torus, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { HologramMaterial } from '../materials/HologramMaterial'

interface ArchitecturalProps {
  type: 'icici' | 'nse' | 'jio' | 'bkc_block'
  position: [number, number, number]
  scale?: [number, number, number]
  risk: number
  id: string
}

const ArchitecturalAsset = ({ type, position, scale = [1, 1, 1], risk, id }: ArchitecturalProps) => {
  const groupRef = useRef<THREE.Group>(null)
  const riskColor = risk > 7 ? '#ff0055' : risk > 4 ? '#ffaa00' : '#00ffff'

  useFrame((state) => {
    if (!groupRef.current) return
    const time = state.clock.getElapsedTime()
    
    groupRef.current.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.ShaderMaterial) {
        child.material.uniforms.uTime.value = time
        child.material.uniforms.uRiskIntensity.value = risk > 7 ? 1.0 : 0.0
        child.material.uniforms.uColor.value.lerp(new THREE.Color(riskColor), 0.05)
      }
    })
  })

  return (
    <group position={position} ref={groupRef} scale={scale}>
      {/* ICICI BANK HEADQUARTERS - BKC */}
      {type === 'icici' && (
        <group>
          {/* Distinctive Curved Glass Volume */}
          <Box args={[30, 40, 20]} position={[0, 20, 0]}>
             <HologramMaterial uWindowFreq={new THREE.Vector2(30, 20)} />
          </Box>
          <Cylinder args={[10, 10, 40, 32, 1, false, 0, Math.PI]} position={[15, 20, 0]} rotation={[0, 0, 0]}>
             <HologramMaterial uWindowFreq={new THREE.Vector2(10, 20)} />
          </Cylinder>
          <Cylinder args={[10, 10, 40, 32, 1, false, Math.PI, Math.PI]} position={[-15, 20, 0]} rotation={[0, 0, 0]}>
             <HologramMaterial uWindowFreq={new THREE.Vector2(10, 20)} />
          </Cylinder>
        </group>
      )}

      {/* NATIONAL STOCK EXCHANGE (NSE) - BKC */}
      {type === 'nse' && (
        <group>
          {/* Main Stepped Plateau Body */}
          <Box args={[40, 10, 40]} position={[0, 5, 0]}>
            <HologramMaterial uWindowFreq={new THREE.Vector2(20, 5)} />
          </Box>
          <Box args={[30, 10, 30]} position={[0, 15, 0]}>
            <HologramMaterial uWindowFreq={new THREE.Vector2(15, 5)} />
          </Box>
          <Box args={[20, 15, 20]} position={[0, 27.5, 0]}>
            <HologramMaterial uWindowFreq={new THREE.Vector2(10, 8)} />
          </Box>
          {/* Decorative geometric cap */}
          <Box args={[10, 5, 10]} position={[0, 37.5, 0]}>
             <HologramMaterial uColor={new THREE.Color('#ffaa00')} />
          </Box>
        </group>
      )}

      {/* JIO WORLD CENTRE - BKC */}
      {type === 'jio' && (
        <group>
          {/* Massive horizontal high-tech footprint */}
          <Box args={[80, 25, 60]} position={[0, 12.5, 0]}>
            <HologramMaterial uWindowFreq={new THREE.Vector2(50, 15)} />
          </Box>
          {/* Modern Roof Details */}
          <Box args={[70, 2, 50]} position={[0, 26, 0]}>
            <HologramMaterial uColor={new THREE.Color('#ffffff')} uOpacity={0.8} />
          </Box>
          <Sphere args={[5, 16, 16]} position={[30, 28, 20]}>
             <HologramMaterial uColor={new THREE.Color('#00ffff')} uOpacity={0.9} />
          </Sphere>
        </group>
      )}

      {/* BKC MODERN GLASS BLOCK */}
      {type === 'bkc_block' && (
        <Box args={[25, 35, 25]} position={[0, 17.5, 0]}>
           <HologramMaterial uWindowFreq={new THREE.Vector2(15, 20)} />
        </Box>
      )}
    </group>
  )
}

export default ArchitecturalAsset
