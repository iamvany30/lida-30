import { useEffect, useRef, useState } from 'react';
import { Howler } from 'howler';
import { audioCache } from './audioManager';
import { SongConfig } from './constants';

let globalIsMuted = false;

export function useAudioLoop(config: SongConfig | null, onComplete?: () => void) {
  const [isMuted, setIsMuted] = useState(globalIsMuted);
  const prevHowlId = useRef<string | null>(null);
  const fadeOutTimer = useRef<NodeJS.Timeout | null>(null);

  const forcePlay = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().then(() => console.log("Audio Context Resumed"));
    }
    
    if (config && audioCache[config.id]) {
      const current = audioCache[config.id];
      if (!current.playing()) {
        const spriteToPlay = current._sprite?.segment ? 'segment' : undefined;
        current.play(spriteToPlay);
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

    // Очищаем старый таймер авто-затухания, если он был
    if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);

    // Запускаем НОВЫЙ трек (спрайт, если он зациклен, либо целиком)
    if (!currentHowl.playing()) {
      const spriteToPlay = currentHowl._sprite?.segment ? 'segment' : undefined;
      currentHowl.play(spriteToPlay);
    }
    currentHowl.fade(currentHowl.volume(), config.volume, fadeDuration);
    
    if (config.loop === false) {
      const duration = currentHowl.duration();
      if (duration > 0) {
        const timeRemaining = duration - (currentHowl.seek() as number);
        if (timeRemaining > 3) {
          fadeOutTimer.current = setTimeout(() => {
            if (prevHowlId.current === config.id && currentHowl.playing()) {
              currentHowl.fade(config.volume, 0, 3000);
            }
          }, (timeRemaining - 3) * 1000);
        }
      }
    }

    prevHowlId.current = config.id;

    return () => {
      if (fadeOutTimer.current) clearTimeout(fadeOutTimer.current);
    };
  },[config?.id]);

  const toggleMute = () => {
    globalIsMuted = !globalIsMuted;
    setIsMuted(globalIsMuted);
    Howler.mute(globalIsMuted);
  };

  return { isMuted, toggleMute, forcePlay };
}