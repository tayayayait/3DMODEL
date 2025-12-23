export interface InteractiveObject {
  id: string;
  name: string; // Internal ID
  position: [number, number, number]; // [x, y, z]
  targetCameraPosition: [number, number, number]; // Where the camera goes on click
  type: 'box' | 'sphere' | 'cylinder'; // Fallback shape
  modelUrl?: string; // URL for GLTF/GLB model
  scale?: [number, number, number]; // Scale adjustment for the imported model
  color: string;
  content: {
    title: string;
    description: string;
    ctaLink?: string; // Optional URL
    ctaLabel?: string;
  };
}