'use client'

import * as THREE from 'three'
import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'

const HologramMaterialImpl = shaderMaterial(
  {
    uTime: 0,
    uColor: new THREE.Color('#00ffff'),
    uOpacity: 0.6,
    uWindowFreq: new THREE.Vector2(20.0, 40.0),
    uRiskIntensity: 0.0,
  },
  // Vertex Shader
  `
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vPosition = position;
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
  `,
  // Fragment Shader
  `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  uniform vec2 uWindowFreq;
  uniform float uRiskIntensity;
  
  varying vec3 vNormal;
  varying vec3 vPosition;
  varying vec2 vUv;

  void main() {
    // Fresnel effect
    vec3 viewDirection = normalize(cameraPosition - vPosition);
    float fresnel = pow(1.0 - dot(vNormal, viewDirection), 3.0);
    
    // Windows Grid (Procedural)
    vec2 grid = fract(vUv * uWindowFreq);
    float window = step(0.1, grid.x) * step(0.1, grid.y);
    float windowPattern = step(0.6, window);
    
    // Scanlines
    float scanline = sin(vPosition.y * 20.0 - uTime * 5.0) * 0.1 + 0.9;
    
    // Risk "Flicker"
    float flicker = sin(uTime * 10.0) * 0.2 * uRiskIntensity;
    
    vec3 finalColor = uColor + fresnel * 0.5 + (windowPattern * 0.3);
    float alpha = uOpacity * (fresnel + 0.3) * scanline + (windowPattern * 0.1) + flicker;
    
    gl_FragColor = vec4(finalColor, alpha);
  }
  `
)

extend({ HologramMaterialImpl })

export const HologramMaterial = (props: any) => {
  return <hologramMaterialImpl attach="material" transparent depthWrite={false} {...props} />
}
