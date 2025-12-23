import React from 'react';

export const Header = () => {
  return (
    <header className="topbar ui-layer">
      <div className="topbar-left">
        <div className="logo-badge">NOVA</div>
        <div className="brand-name">(주)노바비전</div>
        <div className="tagline">Intelligent Spatial Simulation Platform</div>
      </div>
      <div className="topbar-right">
        <span className="status-label">STATUS:</span>
        <span className="badge">Connected</span>
        <span className="topbar-divider" />
        <span className="topbar-link">LiDAR Simulation</span>
        <span className="topbar-divider" />
        <span className="topbar-link">EN</span>
      </div>
    </header>
  );
};
