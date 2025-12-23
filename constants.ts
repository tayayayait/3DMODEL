import { InteractiveObject } from './types';

export const SCENE_DATA: InteractiveObject[] = [
  {
    id: "obj_server",
    name: "AI 서버 랙",
    position: [0, 0, 0], 
    targetCameraPosition: [2, 2, 3],
    type: 'box',
    // Using BoomBox as a reliable "Tech Hardware" placeholder
    modelUrl: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/BoomBox/glTF-Binary/BoomBox.glb",
    scale: [50, 50, 50], // BoomBox is very small
    color: '#6366f1', // Indigo-500
    content: {
      title: "고성능 AI 프로세싱",
      description: "당사의 독자적인 NPU 기술은 데이터 처리 속도를 10배 가속화하여, 엔터프라이즈 환경에 최적화된 실시간 인사이트를 제공합니다.",
      ctaLink: "https://example.com/tech",
      ctaLabel: "기술 사양 보기"
    }
  },
  {
    id: "obj_security",
    name: "보안 시스템",
    position: [-3, 0.5, -2],
    targetCameraPosition: [-4, 2, 0],
    type: 'sphere',
    // Using SciFiHelmet as a "High-Tech Security" placeholder
    modelUrl: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/SciFiHelmet/glTF-Binary/SciFiHelmet.glb",
    scale: [1, 1, 1],
    color: '#f43f5e', // Rose-500
    content: {
      title: "양자 암호화 기술",
      description: "차세대 양자 내성 암호화(PQC) 프로토콜을 탑재하여, 귀하의 디지털 자산을 256비트 수준의 강력한 보안으로 보호합니다.",
      ctaLink: "https://example.com/security",
      ctaLabel: "자세히 알아보기"
    }
  },
  {
    id: "obj_cloud",
    name: "글로벌 클라우드 위성",
    position: [3, 2, -2],
    targetCameraPosition: [4, 2, 0],
    type: 'cylinder',
    // Using DamagedHelmet as a "Robust Node" placeholder (High visual quality)
    modelUrl: "https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/DamagedHelmet/glTF-Binary/DamagedHelmet.glb",
    scale: [0.8, 0.8, 0.8],
    color: '#10b981', // Emerald-500
    content: {
      title: "탈중앙화 클라우드",
      description: "전 세계 궤도를 도는 위성 노드 아키텍처를 통해 99.999%의 가동 시간과 초저지연 글로벌 액세스를 보장합니다.",
      ctaLink: "https://example.com/cloud",
      ctaLabel: "네트워크 탐색"
    }
  }
];

export const DEFAULT_CAMERA_POSITION: [number, number, number] = [0, 6, 10];
export const DEFAULT_TARGET: [number, number, number] = [0, 0, 0];