import React from 'react';
import { useStore } from '../store';

export const MobileTabs = () => {
  const mobileSection = useStore((state) => state.mobileSection);
  const setMobileSection = useStore((state) => state.setMobileSection);

  return (
    <div className="mobile-tabs" role="tablist" aria-label="모바일 섹션 전환">
      <button
        type="button"
        className={`chip ${mobileSection === 'viewport' ? 'is-active' : ''}`}
        onClick={() => setMobileSection('viewport')}
        aria-pressed={mobileSection === 'viewport'}
      >
        3D
      </button>
      <button
        type="button"
        className={`chip ${mobileSection === 'roi' ? 'is-active' : ''}`}
        onClick={() => setMobileSection('roi')}
        aria-pressed={mobileSection === 'roi'}
      >
        ROI/옵션
      </button>
      <button
        type="button"
        className={`chip ${mobileSection === 'info' ? 'is-active' : ''}`}
        onClick={() => setMobileSection('info')}
        aria-pressed={mobileSection === 'info'}
      >
        정보
      </button>
    </div>
  );
};
