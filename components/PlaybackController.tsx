import { useEffect, useRef } from 'react';
import { useStore } from '../store';

const BASE_FPS = 30;

export const PlaybackController = () => {
  const isPlaying = useStore((state) => state.isPlaying);
  const playbackRate = useStore((state) => state.playbackRate);
  const totalFrames = useStore((state) => state.totalFrames);

  const intervalRef = useRef<number | null>(null);

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!isPlaying || totalFrames <= 0) return;

    const interval = Math.max(20, 1000 / (BASE_FPS * playbackRate));

    intervalRef.current = window.setInterval(() => {
      const { currentFrame, setCurrentFrame, setIsPlaying } = useStore.getState();
      if (currentFrame >= totalFrames) {
        setIsPlaying(false);
        return;
      }
      setCurrentFrame(currentFrame + 1);
    }, interval);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, playbackRate, totalFrames]);

  return null;
};
