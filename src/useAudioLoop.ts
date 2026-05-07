import { useEffect, useRef, useState } from 'react';
import { Howler } from 'howler';
import { audioCache } from './audioManager';
import { SongConfig } from './constants';

let globalIsMuted = false;

export function useAudioLoop(config: SongConfig | null, onComplete?: () => void) {
  const [isMuted, setIsMuted] = useState(globalIsMuted);
  const prevHowlId = useRef<string | null>(null);

  const forcePlay = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().then(() => console.log("Audio Context Resumed"));
    }
    
    if (config && audioCache[config.id]) {
      const current = audioCache[config.id];
      if (!current.playing()) {
        current.play('segment');
        current.fade(0, config.volume, 1000);
      }
    }
  };

  useEffect(() => {
    if (!config || !audioCache[config.id]) return;

    const currentHowl = audioCache[config.id];
    const fadeDuration = config.fade || 2000;

    if (prevHowlId.current && prevHowlId.current !== config.id) {
      const oldHowl = audioCache[prevHowlId.current];
      if (oldHowl) {
        oldHowl.fade(oldHowl.volume(), 0, fadeDuration);
        setTimeout(() => {
          if (prevHowlId.current !== oldHowl._src) oldHowl.stop();
        }, fadeDuration);
      }
    }

    if (!currentHowl.playing()) {
      currentHowl.play('segment');
    }
    currentHowl.fade(currentHowl.volume(), config.volume, fadeDuration);
    
    prevHowlId.current = config.id;
  }, [config?.id]);

  const toggleMute = () => {
    globalIsMuted = !globalIsMuted;
    setIsMuted(globalIsMuted);
    Howler.mute(globalIsMuted);
  };

  return { isMuted, toggleMute, forcePlay };
}