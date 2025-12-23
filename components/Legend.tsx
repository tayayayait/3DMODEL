import React from 'react';

export const Legend = () => {
  return (
    <div className="legend ui-layer" aria-label="스케일 범례">
      <span className="legend-label">80m</span>
      <div className="legend-bar" />
      <span className="legend-label">0m</span>
    </div>
  );
};
