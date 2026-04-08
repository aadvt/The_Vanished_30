'use client'

import React, { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Torus, Float, MeshDistortMaterial } from '@react-three/drei'
import * as THREE from 'three'
import { useStore } from '@/store/useStore'

const OrbAvatar = () => {
  const ringRef = useRef<THREE.Mesh>(null)
  const { voiceStatus, audioLevel } = useStore()

  useFrame((state) => {
    if (!ringRef.current) return
    
    // Subtle rotation and pulse
    ringRef.current.rotation.z += 0.01 + audioLevel * 0.1
    ringRef.current.rotation.x += 0.005
    
    const scale = 1 + audioLevel * 0.5
    ringRef.current.scale.lerp(new THREE.Vector3(scale, scale, scale), 0.1)
  })

  return (
    <Float speed={3} rotationIntensity={0.5} floatIntensity={0.5}>
      {/* Outer Holographic Ring */}
      <Torus ref={ringRef} args={[4, 0.05, 16, 100]}>
        <meshStandardMaterial 
          color={voiceStatus === 'listening' ? '#00aaff' : voiceStatus === 'speaking' ? '#00ff88' : '#ffffff'} 
          emissive={voiceStatus === 'listening' ? '#00aaff' : voiceStatus === 'speaking' ? '#00ff88' : '#fff'}
          emissiveIntensity={2}
          transparent
          opacity={0.8}
        />
      </Torus>

      {/* Inner subtle glow core */}
      <mesh>
        <sphereGeometry args={[0.5, 32, 32]} />
        <meshStandardMaterial 
          color="#fff" 
          emissive="#fff" 
          emissiveIntensity={1} 
          transparent 
          opacity={0.2} 
        />
      </mesh>

      {/* Particle dust for "Hologram" feel */}
      <points>
        <sphereGeometry args={[5, 16, 16]} />
        <pointsMaterial 
          size={0.05} 
          color="#00ff88" 
          transparent 
          opacity={0.3} 
          sizeAttenuation 
        />
      </points>
    </Float>
  )
}

export default OrbAvatar
