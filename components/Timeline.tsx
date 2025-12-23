import React from 'react';
import { RotateCcw, SkipBack, SkipForward, Play, Pause } from 'lucide-react';
import { useStore } from '../store';

export const Timeline = () => {
  const isPlaying = useStore((state) => state.isPlaying);
  const setIsPlaying = useStore((state) => state.setIsPlaying);
  const playbackRate = useStore((state) => state.playbackRate);
  const setPlaybackRate = useStore((state) => state.setPlaybackRate);
  const currentFrame = useStore((state) => state.currentFrame);
  const totalFrames = useStore((state) => state.totalFrames);
  const setCurrentFrame = useStore((state) => state.setCurrentFrame);

  const progressPercent = totalFrames > 0 ? (currentFrame / totalFrames) * 100 : 0;

  const handleTogglePlay = () => {
    if (!isPlaying && currentFrame >= totalFrames) {
      setCurrentFrame(0);
    }
    setIsPlaying(!isPlaying);
  };

  const handleResetFrame = () => {
    setIsPlaying(false);
    setCurrentFrame(0);
  };

  const handleStepBack = () => {
    setCurrentFrame(Math.max(0, currentFrame - 1));
  };

  const handleStepForward = () => {
    setCurrentFrame(Math.min(totalFrames, currentFrame + 1));
  };

  return (
    <footer className="bottom-bar ui-layer">
      <div className="timeline-top">
        <span className="frame-info">
          Frame: {currentFrame} / {totalFrames}
        </span>
        <span className="progress-info">{progressPercent.toFixed(1)}%</span>
      </div>
      <input
        className="range timeline-range"
        type="range"
        min={0}
        max={totalFrames}
        value={currentFrame}
        onChange={(event) => setCurrentFrame(parseInt(event.target.value, 10))}
        aria-label="프레임 이동"
      />
      <div className="timeline-controls">
        <div className="control-group">
          <button className="icon-button" type="button" onClick={handleResetFrame} aria-label="프레임 리셋">
            <RotateCcw size={16} />
          </button>
          <button className="icon-button" type="button" onClick={handleStepBack} aria-label="이전 프레임">
            <SkipBack size={16} />
          </button>
          <button
            className="icon-button"
            type="button"
            onClick={handleTogglePlay}
            aria-label="재생 또는 일시정지"
            aria-pressed={isPlaying}
          >
            {isPlaying ? <Pause size={16} /> : <Play size={16} />}
          </button>
          <button className="icon-button" type="button" onClick={handleStepForward} aria-label="다음 프레임">
            <SkipForward size={16} />
          </button>
        </div>
        <div className="speed-group">
          <button
            type="button"
            className={`chip ${playbackRate === 0.1 ? 'is-active' : ''}`}
            onClick={() => setPlaybackRate(0.1)}
            aria-pressed={playbackRate === 0.1}
          >
            0.1x
          </button>
          <button
            type="button"
            className={`chip ${playbackRate === 0.2 ? 'is-active' : ''}`}
            onClick={() => setPlaybackRate(0.2)}
            aria-pressed={playbackRate === 0.2}
          >
            0.2x
          </button>
          <button
            type="button"
            className={`chip ${playbackRate === 0.5 ? 'is-active' : ''}`}
            onClick={() => setPlaybackRate(0.5)}
            aria-pressed={playbackRate === 0.5}
          >
            0.5x
          </button>
          <button
            type="button"
            className={`chip ${playbackRate === 1 ? 'is-active' : ''}`}
            onClick={() => setPlaybackRate(1)}
            aria-pressed={playbackRate === 1}
          >
            1x
          </button>
        </div>
      </div>
    </footer>
  );
};
