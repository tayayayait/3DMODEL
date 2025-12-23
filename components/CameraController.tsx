import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { useStore } from '../store';
import gsap from 'gsap';
import * as THREE from 'three';
import { OrbitControls } from 'three-stdlib';

const PRESETS: Record<'reset' | 'top' | 'side' | 'front', { position: [number, number, number]; target: [number, number, number] }> = {
  reset: { position: [0, 6, 10], target: [0, 0, 0] },
  top: { position: [0, 12, 0.01], target: [0, 0, 0] },
  side: { position: [12, 2, 0], target: [0, 0.4, 0] },
  front: { position: [0, 2, 12], target: [0, 0.4, 0] }
};

export const CameraController = () => {
  const { camera, controls } = useThree();
  const viewPreset = useStore((state) => state.viewPreset);
  const cameraMode = useStore((state) => state.cameraMode);
  const isControlsEnabled = useStore((state) => state.isControlsEnabled);

  useEffect(() => {
    const orbitControls = controls as OrbitControls | undefined;
    if (!orbitControls) return;

    orbitControls.enabled = isControlsEnabled;

    const preset = PRESETS[viewPreset] ?? PRESETS.reset;
    const targetPos = new THREE.Vector3(...preset.position);
    const targetLookAt = new THREE.Vector3(...preset.target);

    gsap.to(camera.position, {
      duration: 1.2,
      x: targetPos.x,
      y: targetPos.y,
      z: targetPos.z,
      ease: 'power3.inOut'
    });

    gsap.to(orbitControls.target, {
      duration: 1.2,
      x: targetLookAt.x,
      y: targetLookAt.y,
      z: targetLookAt.z,
      ease: 'power3.inOut',
      onUpdate: () => orbitControls.update()
    });
  }, [viewPreset, camera, controls, isControlsEnabled]);

  useEffect(() => {
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      const ortho = camera as THREE.OrthographicCamera;
      ortho.zoom = cameraMode === 'orthographic' ? 60 : ortho.zoom;
      ortho.updateProjectionMatrix();
    }
  }, [cameraMode, camera]);

  return null;
};
