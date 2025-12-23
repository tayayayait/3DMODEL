import React, { Suspense, useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  OrbitControls,
  OrthographicCamera,
  PerspectiveCamera,
  AdaptiveDpr,
  PerformanceMonitor,
  usePerformanceMonitor,
  useGLTF,
  Edges,
  Grid,
  Sparkles,
  Environment
} from '@react-three/drei';
import { EffectComposer, Bloom, SSAO, Vignette, SMAA } from '@react-three/postprocessing';
import * as THREE from 'three';
import { MeshSurfaceSampler } from 'three-stdlib';
import { CameraController } from './CameraController';
import { useStore } from '../store';
import type { RoiItem, RoiPoint } from '../store';
import { ErrorBoundary } from './ErrorBoundary';

type ColorStop = { t: number; color: THREE.Color };

const ROI_COLORS: Record<RoiItem['type'], { fill: string; edge: string }> = {
  positive: { fill: '#10b981', edge: '#5eead4' },
  negative: { fill: '#ef4444', edge: '#fda4af' }
};

const COLOR_MAPS: Record<'jet' | 'viridis' | 'plasma', ColorStop[]> = {
  jet: [
    { t: 0, color: new THREE.Color('#00007f') },
    { t: 0.35, color: new THREE.Color('#0044ff') },
    { t: 0.5, color: new THREE.Color('#00e5ff') },
    { t: 0.7, color: new THREE.Color('#ffe600') },
    { t: 1, color: new THREE.Color('#ff0000') }
  ],
  viridis: [
    { t: 0, color: new THREE.Color('#440154') },
    { t: 0.25, color: new THREE.Color('#3b528b') },
    { t: 0.5, color: new THREE.Color('#21918c') },
    { t: 0.75, color: new THREE.Color('#5ec962') },
    { t: 1, color: new THREE.Color('#fde725') }
  ],
  plasma: [
    { t: 0, color: new THREE.Color('#0d0887') },
    { t: 0.35, color: new THREE.Color('#6a00a8') },
    { t: 0.6, color: new THREE.Color('#b12a90') },
    { t: 0.8, color: new THREE.Color('#e16462') },
    { t: 1, color: new THREE.Color('#fca636') }
  ]
};

const isPointInPolygon = (x: number, z: number, polygon: RoiPoint[]) => {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const zi = polygon[i].z;
    const xj = polygon[j].x;
    const zj = polygon[j].z;
    const intersects =
      (zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi || 1e-9) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

const isPointInsideRoi = (roi: RoiItem, x: number, y: number, z: number) => {
  if (y < roi.heightMin || y > roi.heightMax) return false;
  return isPointInPolygon(x, z, roi.points);
};

const sampleColor = (stops: ColorStop[], t: number) => {
  const clamped = Math.min(1, Math.max(0, t));
  for (let i = 0; i < stops.length - 1; i += 1) {
    const left = stops[i];
    const right = stops[i + 1];
    if (clamped >= left.t && clamped <= right.t) {
      const local = (clamped - left.t) / (right.t - left.t || 1);
      return left.color.clone().lerp(right.color, local);
    }
  }
  return stops[stops.length - 1].color.clone();
};

const PointCloud = () => {
  const pointSize = useStore((state) => state.pointSize);
  const colorMapMode = useStore((state) => state.colorMapMode);
  const colorMapType = useStore((state) => state.colorMapType);
  const roiItems = useStore((state) => state.roiItems);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const geometryRef = useRef<THREE.BufferGeometry>(null);

  const alphaMap = useMemo(() => {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
      gradient.addColorStop(0, 'rgba(255,255,255,1)');
      gradient.addColorStop(0.4, 'rgba(255,255,255,0.6)');
      gradient.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, size, size);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    return texture;
  }, []);

  const { positions, heights, depths, sizes, alphas } = useMemo(() => {
    const count = 12000;
    const positionsArray = new Float32Array(count * 3);
    const heightArray = new Float32Array(count);
    const depthArray = new Float32Array(count);
    const sizeArray = new Float32Array(count);
    const alphaArray = new Float32Array(count);
    const distanceArray = new Float32Array(count);

    const clusters = [
      { center: new THREE.Vector3(0, 0.1, 0), spread: 5.2, weight: 0.42 },
      { center: new THREE.Vector3(-4.8, 0.2, 2.6), spread: 2.8, weight: 0.25 },
      { center: new THREE.Vector3(3.8, 0.6, -3.4), spread: 3.4, weight: 0.2 },
      { center: new THREE.Vector3(1.6, 1.2, 3.6), spread: 2.2, weight: 0.13 }
    ];

    const pickCluster = () => {
      const r = Math.random();
      let acc = 0;
      for (const cluster of clusters) {
        acc += cluster.weight;
        if (r <= acc) return cluster;
      }
      return clusters[clusters.length - 1];
    };

    let minHeight = Number.POSITIVE_INFINITY;
    let maxHeight = Number.NEGATIVE_INFINITY;
    let minDepth = Number.POSITIVE_INFINITY;
    let maxDepth = Number.NEGATIVE_INFINITY;
    let maxDist = 0;

    for (let i = 0; i < count; i += 1) {
      const cluster = pickCluster();
      const angle = Math.random() * Math.PI * 2;
      const ringBias = Math.random() < 0.25 ? 0.65 : 0.35;
      const radius = Math.pow(Math.random(), ringBias) * cluster.spread;
      const x = cluster.center.x + Math.cos(angle) * radius + (Math.random() - 0.5) * 0.45;
      const z = cluster.center.z + Math.sin(angle) * radius + (Math.random() - 0.5) * 0.45;
      const y = cluster.center.y + (Math.random() - 0.5) * 1.6 + Math.sin(angle * 2) * 0.25;

      positionsArray[i * 3] = x;
      positionsArray[i * 3 + 1] = y;
      positionsArray[i * 3 + 2] = z;

      heightArray[i] = y;
      depthArray[i] = z;

      if (y < minHeight) minHeight = y;
      if (y > maxHeight) maxHeight = y;
      if (z < minDepth) minDepth = z;
      if (z > maxDepth) maxDepth = z;

      const dist = Math.sqrt(x * x + y * y + z * z);
      distanceArray[i] = dist;
      if (dist > maxDist) maxDist = dist;
    }

    const heightRange = maxHeight - minHeight || 1;
    const depthRange = maxDepth - minDepth || 1;

    for (let i = 0; i < count; i += 1) {
      const heightNorm = (heightArray[i] - minHeight) / heightRange;
      const depthNorm = (depthArray[i] - minDepth) / depthRange;
      const distNorm = maxDist > 0 ? distanceArray[i] / maxDist : 0;

      sizeArray[i] = 1.2 + heightNorm * 1.8 + (1 - distNorm) * 1.2 + Math.random() * 0.6;
      alphaArray[i] = Math.min(1, Math.max(0.18, 0.25 + (1 - distNorm) * 0.55 + heightNorm * 0.2 + depthNorm * 0.1));
    }

    return {
      positions: positionsArray,
      heights: heightArray,
      depths: depthArray,
      sizes: sizeArray,
      alphas: alphaArray
    };
  }, []);

  const colors = useMemo(() => {
    const count = heights.length;
    const colorArray = new Float32Array(count * 3);
    let minVal = Number.POSITIVE_INFINITY;
    let maxVal = Number.NEGATIVE_INFINITY;
    const source = colorMapMode === 'height' ? heights : depths;

    for (let i = 0; i < source.length; i += 1) {
      const value = source[i];
      if (value < minVal) minVal = value;
      if (value > maxVal) maxVal = value;
    }
    const range = maxVal - minVal || 1;
    const stops = COLOR_MAPS[colorMapType];

    for (let i = 0; i < count; i += 1) {
      const value = source[i];
      const t = (value - minVal) / range;
      const color = sampleColor(stops, t);
      colorArray[i * 3] = color.r;
      colorArray[i * 3 + 1] = color.g;
      colorArray[i * 3 + 2] = color.b;
    }

    return colorArray;
  }, [colorMapMode, colorMapType, heights, depths]);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uSize: { value: 1 },
      uOpacity: { value: 0.95 },
      uAlphaMap: { value: alphaMap }
    }),
    [alphaMap]
  );

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.elapsedTime;
      materialRef.current.uniforms.uSize.value = pointSize * 0.3;
    }
  });

  const vertexShader = `
    attribute float aSize;
    attribute float aAlpha;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vDepth;
    uniform float uSize;
    uniform float uTime;

    void main() {
      vColor = color;
      vAlpha = aAlpha;
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      float dist = length(mvPosition.xyz);
      float pulse = 1.0 + sin(uTime * 0.8 + aAlpha * 6.2831) * 0.05;
      float size = aSize * uSize * (30.0 / dist) * pulse;
      gl_PointSize = clamp(size, 1.5, 14.0);
      gl_Position = projectionMatrix * mvPosition;
      vDepth = dist;
    }
  `;

  const fragmentShader = `
    precision highp float;
    uniform float uOpacity;
    uniform sampler2D uAlphaMap;
    varying vec3 vColor;
    varying float vAlpha;
    varying float vDepth;

    void main() {
      float soft = texture2D(uAlphaMap, gl_PointCoord).r;
      float depthFade = smoothstep(90.0, 20.0, vDepth);
      float alpha = soft * vAlpha * uOpacity * depthFade;
      if (alpha < 0.02) discard;
      gl_FragColor = vec4(vColor, alpha);
    }
  `;

  const filtered = useMemo(() => {
    if (roiItems.length === 0) {
      return {
        positions,
        colors,
        sizes,
        alphas,
        count: positions.length / 3
      };
    }

    const positives = roiItems.filter((roi) => roi.type === 'positive' && roi.points.length >= 3);
    const negatives = roiItems.filter((roi) => roi.type === 'negative' && roi.points.length >= 3);
    const hasPositive = positives.length > 0;

    const filteredPositions: number[] = [];
    const filteredColors: number[] = [];
    const filteredSizes: number[] = [];
    const filteredAlphas: number[] = [];

    const pointCount = positions.length / 3;

    for (let i = 0; i < pointCount; i += 1) {
      const index = i * 3;
      const x = positions[index];
      const y = positions[index + 1];
      const z = positions[index + 2];

      let included = !hasPositive;
      if (hasPositive) {
        included = positives.some((roi) => isPointInsideRoi(roi, x, y, z));
      }
      if (!included) continue;

      const isExcluded = negatives.some((roi) => isPointInsideRoi(roi, x, y, z));
      if (isExcluded) continue;

      filteredPositions.push(x, y, z);
      filteredColors.push(colors[index], colors[index + 1], colors[index + 2]);
      filteredSizes.push(sizes[i]);
      filteredAlphas.push(alphas[i]);
    }

    return {
      positions: new Float32Array(filteredPositions),
      colors: new Float32Array(filteredColors),
      sizes: new Float32Array(filteredSizes),
      alphas: new Float32Array(filteredAlphas),
      count: filteredSizes.length
    };
  }, [roiItems, positions, colors, sizes, alphas]);

  useEffect(() => {
    if (!geometryRef.current) return;
    geometryRef.current.setDrawRange(0, filtered.count);
  }, [filtered.count]);

  return (
    <points>
      <bufferGeometry ref={geometryRef}>
        <bufferAttribute attach="attributes-position" array={filtered.positions} itemSize={3} />
        <bufferAttribute attach="attributes-color" array={filtered.colors} itemSize={3} />
        <bufferAttribute attach="attributes-aSize" array={filtered.sizes} itemSize={1} />
        <bufferAttribute attach="attributes-aAlpha" array={filtered.alphas} itemSize={1} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        uniforms={uniforms}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        toneMapped={false}
      />
    </points>
  );
};

const createRoiShape = (points: RoiPoint[]) => {
  const shape = new THREE.Shape();
  const first = points[0];
  shape.moveTo(first.x, -first.z);
  for (let i = 1; i < points.length; i += 1) {
    const point = points[i];
    shape.lineTo(point.x, -point.z);
  }
  shape.lineTo(first.x, -first.z);
  return shape;
};

const DraftRoiOverlay = () => {
  const roiMode = useStore((state) => state.roiMode);
  const roiDraftPoints = useStore((state) => state.roiDraftPoints);
  const roiDraftType = useStore((state) => state.roiDraftType);

  const linePositions = useMemo(() => {
    if (roiDraftPoints.length < 2) return null;
    const isClosed = roiDraftPoints.length >= 3;
    const count = roiDraftPoints.length + (isClosed ? 1 : 0);
    const positions = new Float32Array(count * 3);
    roiDraftPoints.forEach((point, index) => {
      const offset = index * 3;
      positions[offset] = point.x;
      positions[offset + 1] = 0.02;
      positions[offset + 2] = point.z;
    });
    if (isClosed) {
      const offset = (count - 1) * 3;
      positions[offset] = roiDraftPoints[0].x;
      positions[offset + 1] = 0.02;
      positions[offset + 2] = roiDraftPoints[0].z;
    }
    return positions;
  }, [roiDraftPoints]);

  const fillGeometry = useMemo(() => {
    if (roiDraftPoints.length < 3) return null;
    const shape = createRoiShape(roiDraftPoints);
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }, [roiDraftPoints]);

  if (roiMode === 'idle') return null;

  const colors = ROI_COLORS[roiDraftType ?? 'positive'];

  return (
    <group>
      {fillGeometry ? (
        <mesh geometry={fillGeometry} position={[0, 0.01, 0]}>
          <meshBasicMaterial color={colors.fill} transparent opacity={0.22} depthWrite={false} />
        </mesh>
      ) : null}
      {roiDraftPoints.map((point, index) => (
        <mesh key={`roi-draft-point-${index}`} position={[point.x, 0.04, point.z]}>
          <sphereGeometry args={[0.08, 14, 14]} />
          <meshStandardMaterial color={colors.edge} emissive={colors.edge} emissiveIntensity={0.7} />
        </mesh>
      ))}
      {linePositions ? (
        <line>
          <bufferGeometry>
            <bufferAttribute attach="attributes-position" array={linePositions} itemSize={3} />
          </bufferGeometry>
          <lineBasicMaterial color={colors.edge} />
        </line>
      ) : null}
    </group>
  );
};


const RoiInputPlane = () => {
  const roiMode = useStore((state) => state.roiMode);
  const roiDraftPoints = useStore((state) => state.roiDraftPoints);
  const addRoiPoint = useStore((state) => state.addRoiPoint);
  const requestRoiHeight = useStore((state) => state.requestRoiHeight);
  const setControlsEnabled = useStore((state) => state.setControlsEnabled);

  useEffect(() => {
    setControlsEnabled(roiMode === 'idle');
  }, [roiMode, setControlsEnabled]);

  if (roiMode !== 'drawing') return null;

  return (
    <mesh
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, 0, 0]}
      onPointerDown={(event) => {
        event.stopPropagation();
        if (event.button !== 0) return;

        const first = roiDraftPoints[0];
        if (first && roiDraftPoints.length >= 3) {
          const dx = event.point.x - first.x;
          const dz = event.point.z - first.z;
          const distance = Math.hypot(dx, dz);
          if (distance < 0.35) {
            requestRoiHeight();
            return;
          }
        }

        addRoiPoint({ x: event.point.x, z: event.point.z });
      }}
    >
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
};

const RoiVolume = ({ item }: { item: RoiItem }) => {
  const depth = Math.max(0.001, item.heightMax - item.heightMin);
  const geometry = useMemo(() => {
    if (item.points.length < 3) return null;
    const shape = createRoiShape(item.points);
    const extrude = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    extrude.rotateX(-Math.PI / 2);
    extrude.computeVertexNormals();
    return extrude;
  }, [item.points, depth]);

  if (!geometry) return null;
  const colors = ROI_COLORS[item.type];

  return (
    <mesh geometry={geometry} position={[0, item.heightMin, 0]}>
      <meshStandardMaterial
        color={colors.fill}
        transparent
        opacity={0.28}
        emissive={colors.edge}
        emissiveIntensity={0.18}
        roughness={0.25}
        metalness={0.05}
        depthWrite={false}
      />
      <Edges color={colors.edge} />
    </mesh>
  );
};

const RoiVolumes = () => {
  const roiItems = useStore((state) => state.roiItems);
  if (roiItems.length === 0) return null;
  return (
    <group>
      {roiItems.map((item) => (
        <RoiVolume key={`roi-${item.id}`} item={item} />
      ))}
    </group>
  );
};

const GlobalScanPlane = () => {
  const planeRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const minY = -0.4;
  const maxY = 2.2;
  const range = maxY - minY;

  useFrame(({ clock }) => {
    if (!planeRef.current || !materialRef.current) return;
    const t = (clock.elapsedTime * 0.12) % 1;
    const y = minY + t * range;
    planeRef.current.position.y = y;
    materialRef.current.opacity = 0.08 + Math.sin(t * Math.PI) * 0.12;
  });

  return (
    <mesh ref={planeRef} rotation={[-Math.PI / 2, 0, 0]}>
      <planeGeometry args={[28, 28]} />
      <meshBasicMaterial
        ref={materialRef}
        color="#5eead4"
        transparent
        opacity={0.12}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </mesh>
  );
};

const seeded = (seed: number) => {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const seededRange = (seed: number, min: number, max: number) => min + seeded(seed) * (max - min);

const lerpAngle = (from: number, to: number, t: number) => {
  const delta = Math.atan2(Math.sin(to - from), Math.cos(to - from));
  return from + delta * t;
};

const HUMAN_MODEL_URL = '/models/human.glb';
const APARTMENT_MODEL_URL = '/models/apartment.glb';

const CITY_CONFIG = {
  buildingCount: 8,
  buildingRadius: [10.4, 13.2] as [number, number],
  buildingHeight: [6, 11.5] as [number, number],
  buildingFootprint: [3.4, 5.6] as [number, number],
  buildingJitter: 0.7,
  buildingPointCount: 1600,
  peopleCount: 6,
  peopleLaneCount: 2,
  peopleRadiusBase: 4.6,
  peopleLaneGap: 0.8,
  peopleSpeed: [0.22, 0.36] as [number, number],
  peopleHeight: [1.6, 1.9] as [number, number],
  peoplePointCount: 520,
  peoplePath: 'circle' as 'circle' | 'figure8'
};

const RENDER_CONFIG = {
  shadowMapSize: 1024,
  enableSSAO: false
};

const GRID_CONFIG = {
  size: 80,
  position: [0, -0.01, 0] as [number, number, number],
  rotation: [0, 0, 0] as [number, number, number],
  scale: [1, 1, 1] as [number, number, number],
  cellSize: 1,
  sectionSize: 5,
  cellThickness: 0.6,
  sectionThickness: 1.2,
  cellColor: '#ffffff',
  sectionColor: '#ffffff',
  fadeDistance: 200,
  fadeStrength: 0
};

const WORLD_CONFIG = {
  floorY: 0,
  objectLift: 0.06
};

const AdaptivePerformance = () => {
  const set = useThree((state) => state.set);
  const min = useThree((state) => state.performance.min);
  const max = useThree((state) => state.performance.max);

  usePerformanceMonitor({
    onChange: ({ factor }) => {
      const clamped = Math.min(max, Math.max(min, factor));
      set((state) => ({
        performance: {
          ...state.performance,
          current: clamped
        }
      }));
    }
  });

  return <AdaptiveDpr />;
};

const getModelInfo = (scene: THREE.Object3D) => {
  const box = new THREE.Box3().setFromObject(scene);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);
  return {
    size: [size.x, size.y, size.z] as [number, number, number],
    baseOffset: -box.min.y,
    center: [center.x, center.y, center.z] as [number, number, number]
  };
};

const getMeshColor = (material: THREE.Material | THREE.Material[] | undefined) => {
  if (!material) return new THREE.Color('#ffffff');
  const mat = Array.isArray(material) ? material[0] : material;
  if ('color' in mat && (mat as THREE.MeshStandardMaterial).color) {
    return (mat as THREE.MeshStandardMaterial).color.clone();
  }
  return new THREE.Color('#ffffff');
};

const samplePointCloudGeometry = (
  scene: THREE.Object3D,
  targetCount: number,
  colorMode: 'mesh' | 'rainbow' = 'mesh'
) => {
  const geometry = new THREE.BufferGeometry();
  if (!scene || targetCount <= 0) return geometry;

  scene.updateMatrixWorld(true);
  const rootInverse = new THREE.Matrix4().copy(scene.matrixWorld).invert();
  const bounds = new THREE.Box3().setFromObject(scene);
  const boundsMin = bounds.min.clone().applyMatrix4(rootInverse);
  const boundsMax = bounds.max.clone().applyMatrix4(rootInverse);
  const rangeY = Math.max(0.0001, boundsMax.y - boundsMin.y);

  const meshes: THREE.Mesh[] = [];
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh && child.geometry) {
      meshes.push(child);
    }
  });

  if (!meshes.length) return geometry;

  const weights = meshes.map((mesh) => {
    const geom = mesh.geometry;
    const count = geom.index ? geom.index.count : geom.attributes.position.count;
    return Math.max(1, count);
  });
  const totalWeight = weights.reduce((acc, value) => acc + value, 0);

  const positions = new Float32Array(targetCount * 3);
  const colors = new Float32Array(targetCount * 3);
  const tempPosition = new THREE.Vector3();
  const tempColor = new THREE.Color();
  let offset = 0;

  meshes.forEach((mesh, meshIndex) => {
    if (offset >= targetCount) return;
    const weight = weights[meshIndex];
    const remaining = targetCount - offset;
    const desired = meshIndex === meshes.length - 1 ? remaining : Math.round((targetCount * weight) / totalWeight);
    const count = Math.max(1, Math.min(remaining, desired));
    if (count <= 0) return;

    const sampler = new MeshSurfaceSampler(mesh).build();
    const meshColor = getMeshColor(mesh.material);
    const hasVertexColors = Boolean(mesh.geometry.getAttribute('color'));

    for (let i = 0; i < count; i += 1) {
      sampler.sample(tempPosition, undefined, hasVertexColors ? tempColor : undefined);
      tempPosition.applyMatrix4(mesh.matrixWorld);
      tempPosition.applyMatrix4(rootInverse);

      const index = (offset + i) * 3;
      positions[index] = tempPosition.x;
      positions[index + 1] = tempPosition.y;
      positions[index + 2] = tempPosition.z;

      let finalColor = hasVertexColors ? tempColor : meshColor;
      if (colorMode === 'rainbow') {
        const t = (tempPosition.y - boundsMin.y) / rangeY;
        const swirl = (tempPosition.x + tempPosition.z) * 0.08;
        const hue = (t + swirl + meshIndex * 0.07) % 1;
        finalColor = new THREE.Color().setHSL(hue < 0 ? hue + 1 : hue, 0.75, 0.6);
      }
      colors[index] = finalColor.r;
      colors[index + 1] = finalColor.g;
      colors[index + 2] = finalColor.b;
    }
    offset += count;
  });

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeBoundingSphere();
  return geometry;
};

type BuildingData = {
  id: number;
  position: [number, number, number];
  rotation: [number, number, number];
  height: number;
  footprint: number;
};

const ApartmentInstance = ({
  data,
  geometry,
  modelInfo,
  offset
}: {
  data: BuildingData;
  geometry: THREE.BufferGeometry;
  modelInfo: { size: [number, number, number]; baseOffset: number; center: [number, number, number] };
  offset: [number, number, number];
}) => {
  const scaleX = data.footprint / Math.max(0.001, modelInfo.size[0]);
  const scaleY = data.height / Math.max(0.001, modelInfo.size[1]);
  const scaleZ = data.footprint / Math.max(0.001, modelInfo.size[2]);
  const scale = [scaleX, scaleY, scaleZ] as [number, number, number];
  const pointSize = useStore((state) => state.pointSize);
  const size = 0.08 * (pointSize / 5);

  return (
    <group position={data.position} rotation={data.rotation} scale={scale}>
      <points geometry={geometry} position={offset}>
        <pointsMaterial
          size={size}
          vertexColors
          transparent
          opacity={0.9}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
};

const ApartmentBlocks = () => {
  const { scene } = useGLTF(APARTMENT_MODEL_URL);
  const modelInfo = useMemo(() => getModelInfo(scene), [scene]);
  const geometry = useMemo(
    () => samplePointCloudGeometry(scene, CITY_CONFIG.buildingPointCount, 'rainbow'),
    [scene]
  );
  const offset = useMemo(
    () => [-modelInfo.center[0], modelInfo.baseOffset, -modelInfo.center[2]] as [number, number, number],
    [modelInfo]
  );

  const buildings = useMemo<BuildingData[]>(() => {
    const result: BuildingData[] = [];
    for (let i = 0; i < CITY_CONFIG.buildingCount; i += 1) {
      const angle = (i / CITY_CONFIG.buildingCount) * Math.PI * 2;
      const radius = seededRange(i + 1, CITY_CONFIG.buildingRadius[0], CITY_CONFIG.buildingRadius[1]);
      const jitter = seededRange(i + 11, -CITY_CONFIG.buildingJitter, CITY_CONFIG.buildingJitter);
      const height = seededRange(i + 21, CITY_CONFIG.buildingHeight[0], CITY_CONFIG.buildingHeight[1]);
      const footprint = seededRange(i + 31, CITY_CONFIG.buildingFootprint[0], CITY_CONFIG.buildingFootprint[1]);
      const rotation = [0, Math.PI / 2 - angle + seededRange(i + 41, -0.25, 0.25), 0] as [
        number,
        number,
        number
      ];
      result.push({
        id: i + 1,
        position: [
          Math.cos(angle) * (radius + jitter),
          WORLD_CONFIG.floorY + WORLD_CONFIG.objectLift,
          Math.sin(angle) * (radius + jitter)
        ],
        rotation,
        height,
        footprint
      });
    }
    return result;
  }, []);

  return (
    <group>
      {buildings.map((building) => (
        <ApartmentInstance
          key={`building-${building.id}`}
          data={building}
          geometry={geometry}
          modelInfo={modelInfo}
          offset={offset}
        />
      ))}
    </group>
  );
};

type PersonData = {
  id: number;
  radius: number;
  speed: number;
  height: number;
  phase: number;
  direction: number;
  stride: number;
  bob: number;
  sway: number;
  lean: number;
  wander: number;
  tempo: number;
};

const HumanInstance = ({
  data,
  geometry,
  modelInfo,
  offset
}: {
  data: PersonData;
  geometry: THREE.BufferGeometry;
  modelInfo: { size: [number, number, number]; baseOffset: number; center: [number, number, number] };
  offset: [number, number, number];
}) => {
  const group = useRef<THREE.Group>(null);
  const motion = useRef({
    t: data.phase,
    heading: 0,
    initialized: false,
    lastPos: new THREE.Vector3()
  });
  const scale = data.height / Math.max(0.001, modelInfo.size[1]);
  const pointSize = useStore((state) => state.pointSize);
  const size = 0.06 * (pointSize / 5);

  useFrame(({ clock }, delta) => {
    if (!group.current) return;
    const time = clock.elapsedTime;
    const tempoWave = Math.sin(time * 0.6 + data.phase * 2.1);
    const tempoWave2 = Math.sin(time * 1.35 + data.id * 0.7);
    const speedFactor = 1 + data.tempo * (0.6 * tempoWave + 0.4 * tempoWave2);
    const microPause = 0.85 + 0.15 * Math.sin(time * 0.2 + data.phase);
    const speed = data.speed * speedFactor * microPause;
    motion.current.t += speed * data.direction * delta;
    const t = motion.current.t;
    let x = 0;
    let z = 0;
    let heading = 0;

    const wander =
      Math.sin(time * 0.4 + data.id * 1.7) * data.wander +
      Math.sin(time * 0.9 + data.id * 0.6) * data.wander * 0.35;
    const radius = data.radius + wander;

    if (CITY_CONFIG.peoplePath === 'figure8') {
      const sinT = Math.sin(t);
      const cosT = Math.cos(t);
      x = sinT * radius;
      z = sinT * cosT * radius * 1.4;
      const dx = cosT * radius;
      const dz = (cosT * cosT - sinT * sinT) * radius * 1.4;
      heading = Math.atan2(dx, dz);
    } else {
      x = Math.cos(t) * radius;
      z = Math.sin(t) * radius;
      heading = -t + Math.PI / 2;
    }

    const strideSpeed = data.stride + data.speed * 4.2;
    const stepPhase = time * strideSpeed * 1.6 + data.phase * 3.3;
    const step = Math.sin(stepPhase);
    const step2 = Math.sin(stepPhase * 2 + data.phase);
    const bob = step * data.bob + step2 * data.bob * 0.35;
    const footLift = Math.max(0, step) * Math.max(0, step) * data.bob * 0.7;
    const breath = Math.sin(time * 0.6 + data.id * 0.8) * 0.008;

    if (!motion.current.initialized) {
      motion.current.lastPos.set(x, 0, z);
      motion.current.heading = heading;
      motion.current.initialized = true;
    }

    const dx = x - motion.current.lastPos.x;
    const dz = z - motion.current.lastPos.z;
    if (Math.abs(dx) + Math.abs(dz) > 1e-4) {
      heading = Math.atan2(dx, dz);
    } else {
      heading = motion.current.heading;
    }

    const headingBlend = 1 - Math.exp(-delta * 10);
    const smoothHeading = lerpAngle(motion.current.heading, heading, headingBlend);
    motion.current.heading = smoothHeading;
    motion.current.lastPos.set(x, 0, z);

    const rightX = Math.cos(smoothHeading);
    const rightZ = -Math.sin(smoothHeading);
    const sway = Math.sin(stepPhase + Math.PI / 2) * data.sway;
    const lateralX = rightX * sway;
    const lateralZ = rightZ * sway;
    const turnNoise = Math.sin(time * 0.5 + data.id * 0.6) * 0.15;
    const lean = data.lean * (0.4 + 0.6 * Math.abs(step)) + Math.abs(speed) * 0.12;
    const roll = Math.sin(stepPhase) * data.sway * 1.2;

    group.current.position.set(
      x + lateralX,
      WORLD_CONFIG.floorY + WORLD_CONFIG.objectLift + bob + footLift + breath,
      z + lateralZ
    );
    group.current.rotation.set(lean, smoothHeading + turnNoise * 0.2, roll);
  });

  return (
    <group ref={group} scale={[scale, scale, scale]}>
      <points geometry={geometry} position={offset}>
        <pointsMaterial
          size={size}
          vertexColors
          transparent
          opacity={0.85}
          sizeAttenuation
          depthWrite={false}
        />
      </points>
    </group>
  );
};

const MovingPeople = () => {
  const { scene } = useGLTF(HUMAN_MODEL_URL);
  const modelInfo = useMemo(() => getModelInfo(scene), [scene]);
  const geometry = useMemo(
    () => samplePointCloudGeometry(scene, CITY_CONFIG.peoplePointCount, 'rainbow'),
    [scene]
  );
  const offset = useMemo(
    () => [-modelInfo.center[0], modelInfo.baseOffset, -modelInfo.center[2]] as [number, number, number],
    [modelInfo]
  );

  const people = useMemo<PersonData[]>(() => {
    const result: PersonData[] = [];
    for (let i = 0; i < CITY_CONFIG.peopleCount; i += 1) {
      const lane = i % CITY_CONFIG.peopleLaneCount;
      const radius = CITY_CONFIG.peopleRadiusBase + lane * CITY_CONFIG.peopleLaneGap + seededRange(i + 91, -0.3, 0.25);
      const speed = seededRange(i + 101, CITY_CONFIG.peopleSpeed[0], CITY_CONFIG.peopleSpeed[1]);
      const height = seededRange(i + 111, CITY_CONFIG.peopleHeight[0], CITY_CONFIG.peopleHeight[1]);
      const phase = seededRange(i + 121, 0, Math.PI * 2);
      result.push({
        id: i + 1,
        radius,
        speed,
        height,
        phase,
        direction: seeded(i + 131) > 0.5 ? 1 : -1,
        stride: seededRange(i + 141, 2.3, 3.4),
        bob: seededRange(i + 151, 0.02, 0.045),
        sway: seededRange(i + 161, 0.015, 0.03),
        lean: seededRange(i + 171, 0.035, 0.07),
        wander: seededRange(i + 181, 0.1, 0.28),
        tempo: seededRange(i + 191, 0.08, 0.22)
      });
    }
    return result;
  }, []);

  return (
    <group>
      {people.map((person) => (
        <HumanInstance
          key={`person-${person.id}`}
          data={person}
          geometry={geometry}
          modelInfo={modelInfo}
          offset={offset}
        />
      ))}
    </group>
  );
};

const GridPlane = () => {
  return (
    <group position={GRID_CONFIG.position} rotation={GRID_CONFIG.rotation} scale={GRID_CONFIG.scale}>
      <Grid
        args={[GRID_CONFIG.size, GRID_CONFIG.size]}
        cellSize={GRID_CONFIG.cellSize}
        sectionSize={GRID_CONFIG.sectionSize}
        cellThickness={GRID_CONFIG.cellThickness}
        sectionThickness={GRID_CONFIG.sectionThickness}
        cellColor={GRID_CONFIG.cellColor}
        sectionColor={GRID_CONFIG.sectionColor}
        fadeDistance={GRID_CONFIG.fadeDistance}
        fadeStrength={GRID_CONFIG.fadeStrength}
      />
    </group>
  );
};

const FallbackApartments = () => {
  const pointSize = useStore((state) => state.pointSize);
  const size = 0.12 * (pointSize / 5);
  const geometry = useMemo(() => {
    const count = Math.min(8, CITY_CONFIG.buildingCount);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const radius = seededRange(i + 201, CITY_CONFIG.buildingRadius[0], CITY_CONFIG.buildingRadius[1]);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = WORLD_CONFIG.floorY + WORLD_CONFIG.objectLift + seededRange(i + 211, 1.5, 3.5);
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const color = new THREE.Color().setHSL((i / count + 0.1) % 1, 0.7, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={size} vertexColors transparent opacity={0.9} sizeAttenuation depthWrite={false} />
    </points>
  );
};

const FallbackPeople = () => {
  const pointSize = useStore((state) => state.pointSize);
  const size = 0.09 * (pointSize / 5);
  const geometry = useMemo(() => {
    const count = Math.min(6, CITY_CONFIG.peopleCount);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i += 1) {
      const angle = (i / count) * Math.PI * 2;
      const radius = CITY_CONFIG.peopleRadiusBase + seededRange(i + 241, -0.4, 0.4);
      positions[i * 3] = Math.cos(angle) * radius;
      positions[i * 3 + 1] = WORLD_CONFIG.floorY + WORLD_CONFIG.objectLift + seededRange(i + 251, 1.2, 1.8);
      positions[i * 3 + 2] = Math.sin(angle) * radius;
      const color = new THREE.Color().setHSL((i / count + 0.55) % 1, 0.75, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    const geom = new THREE.BufferGeometry();
    geom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geom.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    return geom;
  }, []);

  return (
    <points geometry={geometry}>
      <pointsMaterial size={size} vertexColors transparent opacity={0.85} sizeAttenuation depthWrite={false} />
    </points>
  );
};

const SceneContent = () => {
  const cameraMode = useStore((state) => state.cameraMode);
  const currentFrame = useStore((state) => state.currentFrame);
  const totalFrames = useStore((state) => state.totalFrames);
  const motionGroup = useRef<THREE.Group>(null);
  const framePhase = totalFrames > 0 ? (currentFrame / totalFrames) * Math.PI * 2 : 0;

  useFrame(({ clock }) => {
    if (!motionGroup.current) return;
    const time = clock.elapsedTime;
    motionGroup.current.rotation.y = framePhase + time * 0.08;
    motionGroup.current.rotation.x = Math.sin(time * 0.18) * 0.03;
    motionGroup.current.position.y = Math.sin(time * 0.4) * 0.08;
  });

  return (
    <>
      {cameraMode === 'perspective' ? (
        <PerspectiveCamera makeDefault position={[0, 7.5, 12]} fov={42} />
      ) : (
        <OrthographicCamera makeDefault position={[0, 12, 12]} zoom={55} />
      )}

      <CameraController />

      <fog attach="fog" args={["#0a0d12", 14, 70]} />

      <ambientLight intensity={0.2} color="#cbd5f5" />
      <directionalLight
        castShadow
        position={[10, 14, 8]}
        intensity={1.1}
        color="#b8d4ff"
        shadow-mapSize={[RENDER_CONFIG.shadowMapSize, RENDER_CONFIG.shadowMapSize]}
        shadow-camera-near={2}
        shadow-camera-far={60}
        shadow-camera-left={-18}
        shadow-camera-right={18}
        shadow-camera-top={18}
        shadow-camera-bottom={-18}
      />
      <pointLight position={[-6, 3, 6]} intensity={0.45} color="#7dd3fc" />
      <directionalLight position={[-8, 6, -10]} intensity={0.65} color="#6aa7ff" />

      <Environment preset="city" background={false} />

      <GridPlane />
      <ErrorBoundary fallback={<FallbackApartments />}>
        <Suspense fallback={<FallbackApartments />}>
          <ApartmentBlocks />
        </Suspense>
      </ErrorBoundary>
      <ErrorBoundary fallback={<FallbackPeople />}>
        <Suspense fallback={<FallbackPeople />}>
          <MovingPeople />
        </Suspense>
      </ErrorBoundary>

      <group ref={motionGroup}>
        <PointCloud />
      </group>

      <RoiInputPlane />
      <RoiVolumes />
      <DraftRoiOverlay />

      <Sparkles count={40} scale={16} size={0.7} speed={0.25} opacity={0.3} color="#a5f3fc" />

      <EffectComposer multisampling={0} enableNormalPass={RENDER_CONFIG.enableSSAO} resolutionScale={0.8}>
        {RENDER_CONFIG.enableSSAO ? (
          <SSAO samples={8} radius={0.18} intensity={0.7} distanceThreshold={0.95} distanceFalloff={0.02} />
        ) : null}
        <Bloom intensity={0.5} luminanceThreshold={0.2} luminanceSmoothing={0.22} mipmapBlur />
        <Vignette eskil={false} offset={0.25} darkness={0.8} />
        <SMAA />
      </EffectComposer>

      <OrbitControls
        makeDefault
        enableDamping
        dampingFactor={0.08}
        autoRotate
        autoRotateSpeed={0.15}
        minDistance={4}
        maxDistance={32}
        minPolarAngle={0.15}
        maxPolarAngle={1.5}
        rotateSpeed={0.6}
        zoomSpeed={0.7}
        panSpeed={0.6}
        enablePan
        screenSpacePanning={false}
      />
    </>
  );
};

export const Scene = () => {
  return (
    <Canvas
      id="main-canvas"
      shadows
      performance={{ min: 0.85, max: 1, debounce: 200 }}
      gl={{
        preserveDrawingBuffer: true,
        antialias: true,
        toneMappingExposure: 1.05
      }}
      className="scene-canvas"
      dpr={[1, 1.5]}
    >
      <PerformanceMonitor factor={1} step={0.1} threshold={0.75}>
        <AdaptivePerformance />
      </PerformanceMonitor>
      <SceneContent />
    </Canvas>
  );
};

useGLTF.preload(HUMAN_MODEL_URL);
useGLTF.preload(APARTMENT_MODEL_URL);
