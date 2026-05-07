import { Howl } from 'howler';
import { SLIDES } from './constants';

export const audioCache: Record<string, Howl> = {};

export const initAudio = (onProgress: (p: number) => void) => {
  let loadedCount = 0;
  const total = SLIDES.length;

  SLIDES.forEach((song) => {
    if (audioCache[song.id]) {
      loadedCount++;
      onProgress(loadedCount / total);
      return;
    }

    const howl = new Howl({
      src: [song.url],
      html5: false, 
      preload: true,
      volume: 0,
      loop: true,
      sprite: {
        segment: [song.loopStart * 1000, (song.loopEnd - song.loopStart) * 1000, true]
      },
      onload: () => {
        loadedCount++;
        onProgress(loadedCount / total);
      },
      onloaderror: (id, err) => {
        console.error(`Audio error ${song.url}:`, err);
        loadedCount++;
        onProgress(loadedCount / total);
      }
    });
    audioCache[song.id] = howl;
  });
};