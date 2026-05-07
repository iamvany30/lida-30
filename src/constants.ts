export interface SongConfig {
  id: string;
  artist: string;
  description: string;
  loopStart: number;
  loopEnd: number;
  volume: number;
  fade?: number;
  lowPass?: number;
  reverb?: boolean;
  url: string; 
}

export const SLIDES: SongConfig[] =[
  {
    id: "intro",
    artist: "LIDA",
    description: "Intro / Energy",
    loopStart: 18,
    loopEnd: 36,
    volume: 0.7,
    fade: 200,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3",
  },
  {
    id: "macros",
    artist: "LIDA",
    description: "Macros and Bass",
    loopStart: 28,
    loopEnd: 52,
    volume: 0.9,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", 
  },
  {
    id: "message",
    artist: "LIDA",
    description: "Personal Message",
    loopStart: 22,
    loopEnd: 44,
    volume: 0.45,
    lowPass: 8000,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3",
  },
  {
    id: "kyrgyzstan",
    artist: "LIDA",
    description: "Bank Worker's Day",
    loopStart: 15,
    loopEnd: 33,
    volume: 0.8,
    fade: 150,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3",
  },
  {
    id: "final",
    artist: "LIDA",
    description: "Final / LIDA 30",
    loopStart: 50,
    loopEnd: 70,
    volume: 0.85,
    reverb: true,
    url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3",
  },
];