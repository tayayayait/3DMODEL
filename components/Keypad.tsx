import React from 'react';
import { ArrowUp, ArrowDown, ArrowLeft, ArrowRight } from 'lucide-react';

export const Keypad = () => {
  return (
    <div className="keypad ui-layer" aria-label="키보드 단축키 안내">
      <div className="keypad-grid">
        <div className="keycap">View</div>
        <div className="keycap">
          <ArrowUp size={14} />
        </div>
        <div className="keycap">Cam</div>
        <div className="keycap">
          <ArrowLeft size={14} />
        </div>
        <div className="keycap">
          <ArrowDown size={14} />
        </div>
        <div className="keycap">
          <ArrowRight size={14} />
        </div>
      </div>
    </div>
  );
};
