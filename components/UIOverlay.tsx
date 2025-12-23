import React from 'react';
import { Header } from './Header';
import { ROIPanel } from './ROIPanel';
import { InfoPanel } from './InfoPanel';
import { Timeline } from './Timeline';
import { Legend } from './Legend';
import { Keypad } from './Keypad';
import { HelpCircle } from 'lucide-react';
import { MobileTabs } from './MobileTabs';
import { useStore } from '../store';

type UIOverlayProps = {
  children?: React.ReactNode;
};

export const UIOverlay = ({ children }: UIOverlayProps) => {
  const mobileSection = useStore((state) => state.mobileSection);

  return (
    <div className="ui-shell" data-mobile-section={mobileSection}>
      <Header />

      <div className="main-grid">
        <MobileTabs />
        <ROIPanel />

        <section className="viewport" aria-label="3D viewport">
          <div className="viewport-canvas">{children}</div>
          <div className="viewport-vignette" />
          <div className="viewport-hud">
            <Legend />
            <Keypad />
            <button className="help-fab ui-layer" type="button" aria-label="도움말 열기">
              <HelpCircle size={18} />
            </button>
          </div>
        </section>

        <InfoPanel />
      </div>

      <Timeline />
    </div>
  );
};
