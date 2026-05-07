import { useEffect, useRef, useState } from 'react';
import { Howler } from 'howler';
import { audioCache } from './audioManager';
import { SongConfig } from './constants';

let globalIsMuted = false;

export function useAudioLoop(config: SongConfig | null, onComplete?: () => void) {
  const [isMuted, setIsMuted] = useState(globalIsMuted);
  const prevHowlRef = useRef<Howl | null>(null);

  useEffect(() => {
    if (!config) return;

    const currentHowl = audioCache[config.id];
    if (!currentHowl) return;

    const fadeDuration = config.fade || 2000;
    const targetVolume = config.volume;

    if (prevHowlRef.current && prevHowlRef.current !== currentHowl) {
      const oldHowl = prevHowlRef.current;
      oldHowl.fade(oldHowl.volume(), 0, fadeDuration);
      setTimeout(() => {
        if (prevHowlRef.current !== oldHowl) {
          oldHowl.stop();
        }
      }, fadeDuration);
    }

    if (!currentHowl.playing()) {
      currentHowl.play('segment');
    }
    
    currentHowl.fade(currentHowl.volume(), targetVolume, fadeDuration);
    prevHowlRef.current = currentHowl;

    currentHowl.off('end');
    if (onComplete) {
      currentHowl.on('end', () => onComplete());
    }

  }, [config?.id]);

  const toggleMute = () => {
    globalIsMuted = !globalIsMuted;
    setIsMuted(globalIsMuted);
    Howler.mute(globalIsMuted);
  };

  const forcePlay = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
    if (prevHowlRef.current && !prevHowlRef.current.playing()) {
      prevHowlRef.current.play('segment');
    }
  };

  return { isMuted, toggleMute, forcePlay };
}