import { create } from 'zustand';

export type RoiType = 'positive' | 'negative';
export type RoiMode = 'idle' | 'drawing' | 'height';
export type RoiPoint = { x: number; z: number };

export interface RoiItem {
  id: number;
  label: string;
  type: RoiType;
  heightMin: number;
  heightMax: number;
  points: RoiPoint[];
  range?: string;
}

export const ROI_DEFAULT_MIN = -5;
export const ROI_DEFAULT_MAX = 15;

interface AppState {
  currentFocus: string | null;
  setFocus: (id: string | null) => void;
  isControlsEnabled: boolean;
  setControlsEnabled: (enabled: boolean) => void;
  panelMode: 'view' | 'roi';
  setPanelMode: (mode: 'view' | 'roi') => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  playbackRate: 0.1 | 0.2 | 0.5 | 1;
  setPlaybackRate: (rate: 0.1 | 0.2 | 0.5 | 1) => void;
  currentFrame: number;
  totalFrames: number;
  setCurrentFrame: (frame: number) => void;
  pointSize: number;
  setPointSize: (size: number) => void;
  colorMapMode: 'height' | 'depth';
  setColorMapMode: (mode: 'height' | 'depth') => void;
  colorMapType: 'jet' | 'viridis' | 'plasma';
  setColorMapType: (type: 'jet' | 'viridis' | 'plasma') => void;
  cameraMode: 'perspective' | 'orthographic';
  setCameraMode: (mode: 'perspective' | 'orthographic') => void;
  viewPreset: 'reset' | 'top' | 'side' | 'front';
  setViewPreset: (preset: 'reset' | 'top' | 'side' | 'front') => void;
  isLeftPanelOpen: boolean;
  toggleLeftPanel: () => void;
  rightPanelTab: 'company' | 'contact';
  setRightPanelTab: (tab: 'company' | 'contact') => void;
  mobileSection: 'viewport' | 'roi' | 'info';
  setMobileSection: (section: 'viewport' | 'roi' | 'info') => void;
  roiItems: RoiItem[];
  roiCounter: number;
  roiMode: RoiMode;
  roiDraftType: RoiType | null;
  roiDraftPoints: RoiPoint[];
  startRoi: (type: RoiType) => void;
  addRoiPoint: (point: RoiPoint) => void;
  requestRoiHeight: () => void;
  confirmRoiDraft: (heightMin: number, heightMax: number) => void;
  cancelRoiDraft: () => void;
  addRoi: (type: RoiType) => void;
  removeRoi: (id: number) => void;
  clearRoi: () => void;
}

const initialRoiItems: RoiItem[] = [];

const formatRange = (min: number, max: number) => `${min.toFixed(1)}~${max.toFixed(1)}m`;

export const useStore = create<AppState>((set) => ({
  currentFocus: null,
  setFocus: (id) => set({ currentFocus: id }),
  isControlsEnabled: true,
  setControlsEnabled: (enabled) => set({ isControlsEnabled: enabled }),
  panelMode: 'roi',
  setPanelMode: (mode) => set({ panelMode: mode }),
  isPlaying: false,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  playbackRate: 1,
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  currentFrame: 57,
  totalFrames: 112,
  setCurrentFrame: (frame) =>
    set((state) => ({
      currentFrame: Math.max(0, Math.min(frame, state.totalFrames))
    })),
  pointSize: 5.1,
  setPointSize: (size) => set({ pointSize: size }),
  colorMapMode: 'height',
  setColorMapMode: (mode) => set({ colorMapMode: mode }),
  colorMapType: 'plasma',
  setColorMapType: (type) => set({ colorMapType: type }),
  cameraMode: 'perspective',
  setCameraMode: (mode) => set({ cameraMode: mode }),
  viewPreset: 'top',
  setViewPreset: (preset) => set({ viewPreset: preset }),
  isLeftPanelOpen: true,
  toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
  rightPanelTab: 'company',
  setRightPanelTab: (tab) => set({ rightPanelTab: tab }),
  mobileSection: 'viewport',
  setMobileSection: (section) => set({ mobileSection: section }),
  roiItems: initialRoiItems,
  roiCounter: initialRoiItems.length,
  roiMode: 'idle',
  roiDraftType: null,
  roiDraftPoints: [],
  startRoi: (type) =>
    set({
      roiMode: 'drawing',
      roiDraftType: type,
      roiDraftPoints: []
    }),
  addRoiPoint: (point) =>
    set((state) => {
      if (state.roiMode !== 'drawing') return state;
      return { roiDraftPoints: [...state.roiDraftPoints, point] };
    }),
  requestRoiHeight: () =>
    set((state) => {
      if (state.roiMode !== 'drawing' || state.roiDraftPoints.length < 3) return state;
      return { roiMode: 'height' };
    }),
  confirmRoiDraft: (heightMin, heightMax) =>
    set((state) => {
      if (!state.roiDraftType || state.roiDraftPoints.length < 3) return state;
      const nextId = state.roiCounter + 1;
      const min = Math.min(heightMin, heightMax);
      const max = Math.max(heightMin, heightMax);
      return {
        roiCounter: nextId,
        roiItems: [
          ...state.roiItems,
          {
            id: nextId,
            label: 'ROI',
            type: state.roiDraftType,
            heightMin: min,
            heightMax: max,
            points: state.roiDraftPoints,
            range: formatRange(min, max)
          }
        ],
        roiMode: 'idle',
        roiDraftType: null,
        roiDraftPoints: []
      };
    }),
  cancelRoiDraft: () =>
    set({
      roiMode: 'idle',
      roiDraftType: null,
      roiDraftPoints: []
    }),
  addRoi: (type) =>
    set({
      roiMode: 'drawing',
      roiDraftType: type,
      roiDraftPoints: []
    }),
  removeRoi: (id) =>
    set((state) => ({
      roiItems: state.roiItems.filter((item) => item.id !== id)
    })),
  clearRoi: () => set({ roiItems: [] })
}));
