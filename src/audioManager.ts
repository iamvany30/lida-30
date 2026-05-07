import { Howl, Howler } from 'howler';
import { SLIDES } from './constants';

export const audioCache: Record<string, Howl> = {};

export let analyser: AnalyserNode | null = null;
export let dataArray: Uint8Array | null = null;

function setupAnalyzer() {
  if (!Howler.ctx || analyser) return;
  try {
    analyser = Howler.ctx.createAnalyser();
    analyser.fftSize = 256;
    dataArray = new Uint8Array(analyser.frequencyBinCount);
    Howler.masterGain.connect(analyser);
  } catch (e) {
    console.warn("Analyzer setup failed", e);
  }
}

export const initAudio = (onProgress: (p: number) => void) => {
  let loadedCount = 0;
  const total = SLIDES.length;

  SLIDES.forEach((song) => {
    if (audioCache[song.id]) {
      loadedCount++;
      onProgress(loadedCount / total);
      return;
    }

    const isLoop = song.loop !== false; 

    const spriteConfig = isLoop 
      ? { segment:[song.loopStart * 1000, (song.loopEnd - song.loopStart) * 1000, true] } 
      : undefined;

    const howl = new Howl({
      src: [song.url],
      html5: false,
      preload: true,
      volume: 0,
      loop: isLoop,
      sprite: spriteConfig as any,
      onload: () => {
        loadedCount++;
        onProgress(loadedCount / total);
        setupAnalyzer(); 
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

export const getAudioEnergy = () => {
  if (!analyser || !dataArray) return { bass: 0, mid: 0, treble: 0, raw: new Uint8Array(0) };
  
  analyser.getByteFrequencyData(dataArray);

  let bass = 0, mid = 0, treble = 0;
  
  for (let i = 0; i < 10; i++) bass += dataArray[i];
  for (let i = 10; i < 50; i++) mid += dataArray[i];
  for (let i = 50; i < 120; i++) treble += dataArray[i];

  return {
    bass: bass / (10 * 255),
    mid: mid / (40 * 255),
    treble: treble / (70 * 255),
    raw: dataArray
  };
};