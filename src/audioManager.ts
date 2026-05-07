import { Howl } from 'howler';
import { SLIDES, SongConfig } from './constants';

export const audioCache: Record<string, Howl> = {};
let isLoaded = false;

export const initAudio = (onProgress?: (progress: number) => void) => {
  if (isLoaded) return;

  let loadedCount = 0;
  const total = SLIDES.length;

  SLIDES.forEach((song) => {
    const howl = new Howl({
      src: [song.url],
      html5: true,
      preload: true,
      volume: 0,
      loop: true,
      sprite: {
        segment: [song.loopStart * 1000, (song.loopEnd - song.loopStart) * 1000, true]
      },
      onload: () => {
        loadedCount++;
        if (onProgress) onProgress(loadedCount / total);
        if (loadedCount === total) isLoaded = true;
      },
      onloaderror: (id, err) => console.error(`Error loading ${song.url}:`, err)
    });
    audioCache[song.id] = howl;
  });
};