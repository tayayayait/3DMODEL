import React, { useEffect, useState } from 'react';
import { useProgress } from '@react-three/drei';
import { Scene } from './components/Scene';
import { UIOverlay } from './components/UIOverlay';
import { PlaybackController } from './components/PlaybackController';

function Loader() {
  const { progress, active, loaded, total, item } = useProgress();
  const [visible, setVisible] = useState(active);
  const [phase, setPhase] = useState<'loading' | 'booting'>(active ? 'loading' : 'booting');

  useEffect(() => {
    if (active) {
      setVisible(true);
      setPhase('loading');
      return;
    }
    setPhase('booting');
    const timer = window.setTimeout(() => setVisible(false), 600);
    return () => window.clearTimeout(timer);
  }, [active]);

  if (!visible) return null;

  const normalized = Math.min(100, Math.max(0, progress));
  const statusLabel = phase === 'loading' ? '에셋 로딩 중' : '렌더 준비 중';
  const statusDetail =
    phase === 'loading' ? `파일 ${loaded}/${total || 0}` : '장면 초기화 및 렌더 파이프라인 준비 중';

  return (
    <div className="loader-overlay" role="status" aria-live="polite" aria-busy="true">
      <div className="loader-card">
        <div className="loader-brand">
          <div className="loader-badge" aria-hidden="true" />
          <div>
            <div className="loader-title">NOVA Spatial</div>
            <div className="loader-subtitle">{statusLabel}</div>
          </div>
        </div>
        <div className="loader-bar" aria-hidden="true">
          <div className="loader-bar-fill" style={{ width: `${normalized}%` }} />
        </div>
        <div className="loader-meta">
          <span>{statusDetail}</span>
          <span>{normalized.toFixed(0)}%</span>
        </div>
        {item ? <div className="loader-item">현재 로딩: {item}</div> : null}
      </div>
    </div>
  );
}

function App() {
  return (
    <div className="app-shell" data-testid="canvas-container">
      <Loader />
      <PlaybackController />
      <UIOverlay>
        <Scene />
      </UIOverlay>
    </div>
  );
}

export default App;
