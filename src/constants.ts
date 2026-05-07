export interface SongConfig {
  id: string;
  artist: string;
  description: string;
  loopStart: number;
  loopEnd: number;
  volume: number;
  fade?: number;
  lowPass?: number;
  url: string; 
}

export const SLIDES: SongConfig[] = [
  {
    id: "intro",
    artist: "LIDA",
    description: "Intro",
    loopStart: 10,
    loopEnd: 50,
    volume: 0.8, // Базовая громкость
    fade: 2000,
    url: "audio/intro.mp3",
  },
  {
    id: "macros",
    artist: "LIDA",
    description: "Energy",
    loopStart: 0,
    loopEnd: 70,
    volume: 0.8,
    fade: 2000,
    url: "audio/macros.mp3",
  },
  {
    id: "message",
    artist: "LIDA",
    description: "Message",
    loopStart: 0,
    loopEnd: 60,
    volume: 0.6, // Чуть тише для чтения длинного текста
    fade: 3000,
    lowPass: 8000,
    url: "audio/message.mp3",
  },
  {
    id: "kyrgyzstan",
    artist: "LIDA",
    description: "Joke",
    loopStart: 5,
    loopEnd: 45,
    volume: 0.8,
    fade: 1500,
    url: "audio/kyrgyzstan.mp3",
  },
  {
    id: "final",
    artist: "LIDA",
    description: "Final",
    loopStart: 40,
    loopEnd: 120,
    volume: 0.8,
    fade: 2500,
    url: "audio/final.mp3",
  },
];