import React, { useRef, useState, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { useStore } from '../store';
import { InteractiveObject } from '../types';
import * as THREE from 'three';
import { Html, Float, Edges, useGLTF, Clone } from '@react-three/drei';
import { ErrorBoundary } from './ErrorBoundary';

interface Props {
  data: InteractiveObject;
}

// Sub-component to handle Suspense/Fetch logic
const ModelContent: React.FC<{ url: string; color: string; hovered: boolean }> = ({ url, color, hovered }) => {
  const { scene } = useGLTF(url);
  
  return (
    <group>
      <Clone object={scene} castShadow receiveShadow />
      {hovered && <pointLight distance={3} intensity={5} color={color} />}
    </group>
  );
};

export const InteractiveShape: React.FC<Props> = ({ data }) => {
  const groupRef = useRef<THREE.Group>(null);
  const setFocus = useStore((state) => state.setFocus);
  const currentFocus = useStore((state) => state.currentFocus);
  const [hovered, setHover] = useState(false);

  const isActive = currentFocus === data.id;

  useFrame((state, delta) => {
    if (groupRef.current) {
      // Gentle rotation for specific items
      if (data.type === 'cylinder' || data.modelUrl) {
         groupRef.current.rotation.y += delta * 0.2;
      }
      
      // Scale animation
      const baseScale = data.scale ? data.scale[0] : 1;
      const targetScale = hovered || isActive ? baseScale * 1.2 : baseScale;
      
      const currentScale = groupRef.current.scale.x;
      const nextScale = THREE.MathUtils.lerp(currentScale, targetScale, delta * 8);
      groupRef.current.scale.set(nextScale, nextScale, nextScale);
    }
  });

  const handlePointerOver = (e: any) => {
    e.stopPropagation();
    setHover(true);
    document.body.style.cursor = 'pointer';
  };

  const handlePointerOut = (e: any) => {
    setHover(false);
    document.body.style.cursor = 'auto';
  };

  const handleClick = (e: any) => {
    e.stopPropagation();
    setFocus(data.id);
  };

  const renderFallbackGeometry = () => {
    let geometry;
    switch (data.type) {
      case 'box': geometry = <boxGeometry args={[1.2, 1.2, 1.2]} />; break;
      case 'sphere': geometry = <icosahedronGeometry args={[0.8, 0]} />; break;
      case 'cylinder': geometry = <cylinderGeometry args={[0.6, 0.6, 1.2, 6]} />; break;
      default: geometry = <boxGeometry args={[1, 1, 1]} />; break;
    }

    return (
        <mesh>
            {geometry}
            <meshStandardMaterial 
                color={hovered || isActive ? '#ffffff' : data.color} 
                emissive={data.color}
                emissiveIntensity={hovered || isActive ? 0.8 : 0.4}
                roughness={0.1}
                metalness={0.9}
                transparent
                opacity={0.9}
            />
            <Edges 
                scale={1.05} 
                threshold={15} 
                color={hovered ? "white" : data.color} 
            />
        </mesh>
    );
  };

  return (
    <group position={data.position}>
      <Float speed={2} rotationIntensity={0.2} floatIntensity={0.5}>
        <group
          ref={groupRef}
          onClick={handleClick}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
        >
            {data.modelUrl ? (
                <ErrorBoundary fallback={renderFallbackGeometry()}>
                    <ModelContent url={data.modelUrl} color={data.color} hovered={hovered || isActive} />
                </ErrorBoundary>
            ) : (
                renderFallbackGeometry()
            )}
        </group>
      </Float>
        
      {/* Floating Label */}
      <Html 
        position={[0, 2, 0]} 
        center 
        distanceFactor={12}
        style={{
          opacity: hovered && !isActive ? 1 : 0,
          transform: `scale(${hovered && !isActive ? 1 : 0.5})`,
          transition: 'all 0.3s ease-in-out',
          pointerEvents: 'none'
        }}
      >
        <div className="interactive-label">
          {data.name}
        </div>
      </Html>
    </group>
  );
};
