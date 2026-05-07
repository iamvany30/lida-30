import { useEffect, useRef, useState } from 'react';
import { Howl, Howler } from 'howler';
import { SongConfig } from './constants';

let globalIsMuted = false;

export function useAudioLoop(config: SongConfig | null, onComplete?: () => void, isLastSlide?: boolean) {
  const howlRef = useRef<Howl | null>(null);
  const [isMuted, setIsMuted] = useState(globalIsMuted);

  useEffect(() => {
    if (!config) return;

    if (howlRef.current) {
      howlRef.current.stop();
      howlRef.current.unload();
    }

    const startMs = config.loopStart * 1000;
    const durationMs = (config.loopEnd - config.loopStart) * 1000;

    const newHowl = new Howl({
      src: [config.url],
      html5: false,
      sprite: {
        // Если это последний слайд — включаем loop внутри спрайта (3-й параметр true)
        segment: [startMs, durationMs, isLastSlide ? true : false]
      },
      volume: 0,
      onload: () => {
        if (config.lowPass) {
          try {
            const ctx = (Howler as any).ctx;
            if (ctx) {
              const filter = ctx.createBiquadFilter();
              filter.type = 'lowpass';
              filter.frequency.value = config.lowPass;
              const node = (newHowl as any)._sounds[0]?._node;
              if (node) {
                node.disconnect();
                node.connect(filter);
                filter.connect(ctx.destination);
              }
            }
          } catch (e) { console.error(e); }
        }
      },
      onplay: () => {
        newHowl.fade(0, config.volume, config.fade || 2000);
      },
      onend: () => {
        // Вызываем переход, только если это НЕ последний слайд
        if (!isLastSlide && onComplete) {
          onComplete();
        }
      }
    });

    howlRef.current = newHowl;
    newHowl.play('segment');

    return () => {
      newHowl.stop();
      newHowl.unload();
    };
  }, [config?.id, config?.url, isLastSlide]); // Добавили isLastSlide в зависимости

  const toggleMute = () => {
    globalIsMuted = !globalIsMuted;
    setIsMuted(globalIsMuted);
    Howler.mute(globalIsMuted);
  };

  const forcePlay = () => {
    if (Howler.ctx && Howler.ctx.state === 'suspended') Howler.ctx.resume();
    if (howlRef.current && !howlRef.current.playing()) {
      howlRef.current.play('segment');
    }
  };

  useEffect(() => {
    Howler.mute(globalIsMuted);
  }, []);

  return { isMuted, toggleMute, forcePlay };
}