// Файл: src/App.tsx
import { useEffect, useState, useRef, useMemo } from "react";
import { 
  Volume2, 
  VolumeX, 
  Skull,
  Image as ImageIcon,
  ChevronDown,
  Monitor
} from "lucide-react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, OrbitControls, Text, Sparkles } from "@react-three/drei";
import { motion, AnimatePresence, useAnimationFrame } from "motion/react";
import * as THREE from "three";
import { Howler } from "howler";
import { SLIDES, SongConfig } from "./constants";
import { useAudioLoop } from "./useAudioLoop";
import { initAudio, getAudioEnergy } from "./audioManager";

export default function App() {
  const [started, setStarted] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  useEffect(() => {
    initAudio((progress) => setLoadProgress(progress));
  },[]);

  return (
    <>
      <AnimatePresence>
        {!started && (
          <motion.div 
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, filter: "blur(10px)", scale: 1.1 }}
            transition={{ duration: 0.8, ease: "easeInOut" }}
            onClick={() => {
              if (loadProgress === 1) {
                setStarted(true);
                if (Howler.ctx && Howler.ctx.state === 'suspended') {
                  Howler.ctx.resume();
                }
              }
            }}
            className={`fixed inset-0 z-[1000] flex items-center justify-center bg-[#0a0a0a] group ${loadProgress === 1 ? 'cursor-pointer' : 'cursor-wait'}`}
          >
            <div className="crt-overlay crt-scanlines" />
            <div className="crt-overlay crt-flicker" />
            <div className="grain" />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1 }}
              className="glitch-wrapper relative z-10 flex flex-col items-center px-4 text-center"
            >
              <h1 
                className="glitch-text text-5xl sm:text-7xl font-black uppercase tracking-widest text-transparent group-hover:scale-105 transition-transform duration-500"
                style={{ WebkitTextStroke: '2px #00ff00', textShadow: '4px 4px 0px #ff00ff' }}
                data-text={loadProgress < 1 ? "ЗАГРУЗКА..." : "НАЧНЁМ?"}
              >
                {loadProgress < 1 ? `ЗАГРУЗКА ${Math.round(loadProgress * 100)}%` : "НАЧНЁМ?"}
              </h1>

              {loadProgress < 1 && (
                <div className="w-64 h-1 bg-white/10 mt-6 overflow-hidden border border-white/20 relative">
                  <motion.div 
                    className="absolute inset-y-0 left-0 bg-[#00ff00] shadow-[0_0_10px_#00ff00]" 
                    initial={{ width: 0 }}
                    animate={{ width: `${loadProgress * 100}%` }}
                  />
                </div>
              )}

              <div className="mt-8 border-2 border-[#00ff00]/30 bg-[#111]/90 backdrop-blur-md p-4 sm:p-5 max-w-xs sm:max-w-sm brutalist-shadow-purple transition-colors duration-300 group-hover:border-[#00ff00]">
                <div className="flex items-center justify-center gap-3 mb-3 text-[#00ff00]">
                  <Monitor size={18} />
                  <span className="text-[10px] sm:text-xs font-mono font-bold uppercase tracking-[0.2em]">system advice</span>
                  <Volume2 size={18} />
                </div>
                <p className="text-xs sm:text-sm font-mono text-gray-300 leading-relaxed">
                  коля, если есть возможность — открывай с компа и врубай звук на полную.
                </p>
              </div>

              {loadProgress === 1 && (
                <p className="mt-10 text-xs sm:text-sm font-mono text-[#ff00ff] animate-pulse tracking-[0.2em] sm:tracking-[0.3em] uppercase group-hover:text-[#00ff00] transition-colors">[ tap anywhere to start ]
                </p>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {started && <MainContent />}
    </>
  );
}

function MainContent() {
  const [mounted, setMounted] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [songs] = useState<SongConfig[]>(SLIDES);
  
  const totalSlides = 5;
  const currentSong = songs[currentSlide];

  const { isMuted, toggleMute, forcePlay } = useAudioLoop(
    currentSong, 
    () => {
      goToSlide(prev => prev + 1); // Используем функциональное обновление
    }
  );
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const isAnimatingRef = useRef(false);
  const lastScrollTime = useRef(0);

  // ГЛОБАЛЬНАЯ СИНХРОНИЗАЦИЯ CSS И МУЗЫКИ (60 FPS)
  useAnimationFrame(() => {
    const { bass, mid, treble } = getAudioEnergy();
    document.body.style.setProperty('--bass', bass.toString());
    document.body.style.setProperty('--mid', mid.toString());
    document.body.style.setProperty('--treble', treble.toString());
  });

  useEffect(() => {
    setMounted(true);
    forcePlay();
    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  },[]);

  // ПРАВИЛЬНАЯ ФУНКЦИЯ ПЕРЕКЛЮЧЕНИЯ (без потери контекста)
  const goToSlide = (action: number | ((prev: number) => number)) => {
    if (isAnimatingRef.current) return;
    
    setCurrentSlide(prev => {
      const nextSlide = typeof action === 'function' ? action(prev) : action;
      
      // Блокируем выход за пределы
      if (nextSlide < 0 || nextSlide >= totalSlides || nextSlide === prev) {
        return prev;
      }
      
      isAnimatingRef.current = true;
      // Ставим тайм-аут, чтобы заблокировать спам кнопками
      setTimeout(() => {
        isAnimatingRef.current = false;
      }, 1000);
      
      return nextSlide;
    });
  };

  useEffect(() => {
    let touchStartY = 0;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Игнорируем клавиши, если фокус на кнопке (например включение звука)
      if (e.target instanceof HTMLButtonElement) return;

      const navKeys =["ArrowDown", "ArrowUp", "PageDown", "PageUp", " ", "Home", "End"];
      
      if (navKeys.includes(e.key)) {
        e.preventDefault(); // ОТКЛЮЧАЕМ СТАНДАРТНЫЙ СКРОЛЛ БРАУЗЕРА (убирает дёрганье)
        
        if (e.key === "ArrowDown" || e.key === "PageDown" || e.key === " ") {
          goToSlide(prev => prev + 1);
        } else if (e.key === "ArrowUp" || e.key === "PageUp") {
          goToSlide(prev => prev - 1);
        } else if (e.key === "Home") {
          goToSlide(0);
        } else if (e.key === "End") {
          goToSlide(totalSlides - 1);
        }
      }
    };

    const handleWheel = (e: WheelEvent) => {
      const now = Date.now();
      if (now - lastScrollTime.current < 1200) return; 
      if (Math.abs(e.deltaY) < 20) return;

      if (e.deltaY > 0) goToSlide(prev => prev + 1);
      else goToSlide(prev => prev - 1);
      
      lastScrollTime.current = now;
    };

    const handleTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touchEndY = e.changedTouches[0].clientY;
      const diff = touchStartY - touchEndY;
      const now = Date.now();
      
      if (now - lastScrollTime.current < 1200) return;
      
      if (Math.abs(diff) > 50) { 
        if (diff > 0) goToSlide(prev => prev + 1);
        else goToSlide(prev => prev - 1);
        lastScrollTime.current = now;
      }
    };

    // Биндим слушатели ТОЛЬКО 1 раз при монтировании компонента
    window.addEventListener("keydown", handleKeyDown, { passive: false });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchend", handleTouchEnd);
    };
  },[]); // <-- Пустой массив! Теперь нет проблем с замыканиями стейта

  const playGlitchSound = (freqMultiple = 1) => {
    try {
      if (!audioContextRef.current) {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        audioContextRef.current = new AudioContext();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const freqs =[55, 110, 220, 440, 880].map(f => f * freqMultiple);
      const randomFreq = freqs[Math.floor(Math.random() * freqs.length)];
      osc.type = clickCount % 2 === 0 ? "sawtooth" : "square";
      osc.frequency.setValueAtTime(randomFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(randomFreq / 4, ctx.currentTime + 0.15);
      gain.gain.setValueAtTime(0.04, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
    } catch (e) {
      console.error(e);
    }
  };

  if (!mounted) return null;

  return (
    <div className="relative bg-[#0a0a0a] text-white selection:bg-[#ff00ff] selection:text-[#0a0a0a] h-[100dvh] overflow-hidden">
      <button 
        onClick={toggleMute}
        className={`fixed top-4 right-4 sm:top-6 sm:right-6 z-[500] w-10 h-10 sm:w-12 sm:h-12 flex items-center justify-center border-2 transition-all active:scale-95 bg-black/60 backdrop-blur-md group ${
          !isMuted 
            ? 'border-[#00ff00] text-[#00ff00] hover:bg-[#00ff00]/10 brutalist-shadow-green' 
            : 'border-white/20 text-white opacity-50 hover:opacity-100 hover:border-white/50'
        }`}
        aria-label="Toggle Audio"
      >
        {!isMuted ? <Volume2 size={20} className="animate-pulse sm:w-6 sm:h-6" /> : <VolumeX size={20} className="sm:w-6 sm:h-6" />}
      </button>

      <div className="fixed top-0 right-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00ff00] to-transparent z-[200]"></div>
      <div className="crt-overlay crt-scanlines" />
      <div className="crt-overlay crt-flicker" />
      <div className="crt-overlay overflow-hidden">
        <div className="crt-scanline-active" />
      </div>
      <div className="grain" />
      
      <div className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-[500] flex flex-col gap-3 sm:gap-4 mix-blend-difference">
        {Array.from({ length: totalSlides }).map((_, i) => (
          <button
            key={i}
            onClick={() => goToSlide(i)}
            className={`relative w-2.5 h-2.5 sm:w-3 sm:h-3 border-2 transition-all duration-300 group ${
              currentSlide === i 
                ? "bg-[#00ff00] border-[#00ff00] scale-[1.3] brutalist-shadow-green" 
                : "bg-transparent border-white/40 hover:border-[#ff00ff] hover:scale-110"
            }`}
          >
            <span className="absolute right-6 top-1/2 -translate-y-1/2 bg-black text-[#00ff00] text-[10px] px-2 py-1 opacity-0 group-hover:opacity-100 transition-opacity border border-[#00ff00] pointer-events-none hidden sm:block whitespace-nowrap">
              0{i + 1}
            </span>
          </button>
        ))}
      </div>

      {/* АУДИО-РЕАКТИВНЫЙ ФОН */}
      <div className="fixed inset-0 z-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#00ff00 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
      <div 
        className="fixed inset-0 z-0 pointer-events-none opacity-20" 
        style={{
          background: 'radial-gradient(circle at 50% 30%, #00ff00 0%, transparent 40%), radial-gradient(circle at 10% 80%, #7000ff 0%, transparent 40%)',
          filter: 'blur(80px)',
          willChange: 'transform',
          transform: 'scale(calc(1 + var(--bass) * 0.15))'
        }} 
      />

      <motion.div
        animate={{ y: `-${currentSlide * 100}dvh` }}
        transition={{ type: "spring", stiffness: 80, damping: 20, mass: 1 }}
        className="relative z-10 w-full h-full"
      >
        {/* === СЛАЙД 1 === */}
        <Slide className="overflow-hidden">
          <div className="absolute top-6 left-6 sm:top-10 sm:left-10 w-16 h-16 sm:w-20 sm:h-20 border-t-2 border-l-2 border-[#00ff00] opacity-50 hidden md:block" />
          <div className="absolute top-6 right-6 sm:top-10 sm:right-10 w-16 h-16 sm:w-20 sm:h-20 border-t-2 border-r-2 border-[#ff00ff] opacity-50 hidden md:block" />
          <div className="absolute bottom-6 left-6 sm:bottom-10 sm:left-10 w-16 h-16 sm:w-20 sm:h-20 border-b-2 border-l-2 border-[#7000ff] opacity-50 hidden md:block" />
          <div className="absolute bottom-6 right-6 sm:bottom-10 sm:right-10 w-16 h-16 sm:w-20 sm:h-20 border-b-2 border-r-2 border-[#00ff00] opacity-50 hidden md:block" />

          <div 
            className="relative z-10 flex flex-col items-center justify-center w-full max-w-5xl px-4 pr-10 sm:pr-16 pb-24 sm:pb-20 cursor-pointer"
            onClick={() => { setClickCount(p => p + 1); playGlitchSound(); }}
          >
            <div 
              className="glitch-wrapper mb-4 sm:mb-6 w-full flex justify-center"
              style={{ willChange: 'transform', transform: 'scale(calc(1 + var(--bass) * 0.15))' }}
            >
              <h1 
                className="glitch-text text-[4.5rem] leading-[0.85] sm:text-[110px] md:text-[160px] lg:text-[200px] font-black uppercase text-transparent text-center"
                style={{ WebkitTextStroke: '2px #ff00ff', textShadow: '4px 4px 0px #7000ff' }}
                data-text="LIDA 31"
              >
                LIDA 31
              </h1>
            </div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8, duration: 1 }}
              className="mt-4 sm:mt-8 flex flex-col items-center text-center gap-2 sm:gap-4 w-full"
            >
              <span className="text-[#00ff00] font-mono text-sm sm:text-xl lg:text-3xl tracking-[0.1em] sm:tracking-[0.2em] lowercase drop-shadow-[0_0_10px_rgba(0,255,0,0.5)]">
                тебе 31, но ты всё ещё
              </span>
              <span 
                className="text-black bg-[#00ff00] font-mono font-black text-sm sm:text-xl lg:text-3xl tracking-[0.05em] sm:tracking-[0.1em] lowercase px-3 py-1"
                style={{ willChange: 'transform', transform: 'rotate(calc(var(--bass) * 3deg)) scale(calc(1 + var(--bass) * 0.05))' }}
              >
                звучишь как будущее
              </span>
            </motion.div>
          </div>
          
          <motion.div 
            className="absolute bottom-6 sm:bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center cursor-pointer group z-50 pointer-events-auto"
            animate={{ y:[0, 10, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            onClick={() => goToSlide(prev => prev + 1)}
          >
            <span className="text-[10px] sm:text-xs font-mono text-[#ff00ff] mb-2 opacity-80 group-hover:opacity-100 transition-opacity uppercase tracking-[0.2em] sm:tracking-[0.3em] text-center whitespace-nowrap">
              ДАВАЙ ТОЛЬКО ВПЕРЁД
            </span>
            <ChevronDown className="text-[#ff00ff] opacity-80 group-hover:opacity-100 transition-opacity" size={24} />
            <div className="w-[2px] h-6 sm:h-10 bg-gradient-to-b from-[#ff00ff] via-[#7000ff] to-transparent opacity-50 group-hover:opacity-100 transition-opacity mt-1" />
          </motion.div>
        </Slide>

        {/* === СЛАЙД 2 === */}
        <Slide className="overflow-hidden">
          <div className="absolute inset-x-0 top-1/4 -translate-y-1/2 z-0 opacity-10 flex whitespace-nowrap overflow-hidden pointer-events-none mix-blend-screen">
            <div className="animate-marquee font-display font-black text-[60px] sm:text-[120px] md:text-[200px] uppercase text-transparent" style={{ WebkitTextStroke: '2px #ff00ff' }}>
              {Array(20).fill("ЭНЕРГИЯ / РЕЙВ / MUDOED / ХАОС / ").join("")}
            </div>
          </div>
          <div className="absolute inset-x-0 bottom-1/4 translate-y-1/2 z-0 opacity-10 flex whitespace-nowrap overflow-hidden pointer-events-none mix-blend-screen">
            <div className="animate-marquee-reverse font-display font-black text-[60px] sm:text-[120px] md:text-[200px] uppercase text-transparent" style={{ WebkitTextStroke: '2px #00ff00' }}>
              {Array(20).fill("СЛЭМ / HAPPY GABBER BDAY / HYPERPOP / ").join("")}
            </div>
          </div>

          <div className="w-full max-w-5xl mx-auto z-10 relative h-[500px] sm:h-[600px] flex items-center justify-center pr-10 sm:pr-16">
            <div className="absolute inset-x-0 inset-y-1/2 -translate-y-1/2 flex items-center justify-center pointer-events-none z-30 px-4">
                <ScrollReveal delay={0.8} rootMargin="0px">
                  <div 
                    className="bg-[#111]/95 backdrop-blur-sm border-2 border-[#7000ff] p-5 sm:p-8 brutalist-shadow-purple max-w-[260px] sm:max-w-md pointer-events-auto"
                    style={{ willChange: 'transform', transform: 'rotate(-2deg) scale(calc(1 + var(--bass) * 0.1))' }}
                  >
                    <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4 border-b-2 border-[#7000ff]/30 pb-3 sm:pb-4">
                      <Volume2 className="text-[#00ff00] size-6 sm:size-8" style={{ transform: 'scale(calc(1 + var(--treble) * 0.5))' }} />
                      <h3 className="font-display font-black text-base sm:text-3xl text-white uppercase tracking-widest">а как всё было?</h3>
                    </div>
                    <p className="font-mono text-gray-300 text-[11px] sm:text-base font-medium leading-relaxed">
                      От всратых мэшапов до полных стадионов. Твои биты ломают колонки (и связки), а тексты разъедают мозг в концентрированной форме.
                    </p>
                  </div>
                </ScrollReveal>
            </div>
            
            <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="absolute top-4 sm:top-10 left-2 sm:left-20 z-10">
              <div style={{ willChange: 'transform', transform: 'scale(calc(1 + var(--bass) * 0.15))' }}>
                <PhotoPlaceholder src="./assets/rave_01.jpg" label="RAVE_01.JPG" className="w-28 h-36 sm:w-56 sm:h-64" tilt="-10deg" onPlaySound={playGlitchSound} />
              </div>
            </motion.div>
            
            <motion.div initial={{ y: 50, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="absolute bottom-4 sm:bottom-10 right-2 sm:right-20 z-10">
              <div style={{ willChange: 'transform', transform: 'scale(calc(1 + var(--bass) * 0.2))' }}>
                <PhotoPlaceholder src="./assets/live_moscow.jpg" label="LIVE_MOSCOW.JPG" className="w-32 h-40 sm:w-64 sm:h-72" tilt="8deg" onPlaySound={playGlitchSound} />
              </div>
            </motion.div>
          </div>
        </Slide>

        {/* === СЛАЙД 3 === */}
        <Slide className="overflow-y-auto no-scrollbar">
          <div className="w-full max-w-6xl mx-auto flex flex-col lg:flex-row items-center justify-center lg:justify-between gap-6 sm:gap-12 z-10 py-10 sm:py-16 px-4 pr-12 sm:pr-20">
            <div 
              className="w-full lg:flex-1 space-y-4 sm:space-y-6 font-mono bg-[#111]/90 backdrop-blur-md p-5 sm:p-10 border-2 border-[#00ff00] brutalist-shadow-green"
              style={{ willChange: 'box-shadow', boxShadow: '6px 6px 0px var(--color-neon-green), 0 0 calc(var(--bass) * 30px) #00ff00' }}
            >
              <ScrollReveal><p className="text-[#00ff00] font-bold border-b border-[#00ff00]/30 pb-2 sm:pb-4 mb-2 sm:mb-4 text-[10px] sm:text-base">[{">"}] _message_incoming</p></ScrollReveal>
              <ScrollReveal delay={0.2}><p className="text-gray-300 text-xs sm:text-base md:text-lg lg:text-xl leading-relaxed">слушай, Колян.</p></ScrollReveal>
              <ScrollReveal delay={0.3}><p className="text-gray-300 text-xs sm:text-base md:text-lg lg:text-xl leading-relaxed">тебе 30. это какая-то странная цифра, которая вообще не вяжется с тем хаосом и энергией, которую ты стабильно выдаёшь на каждом дропе.</p></ScrollReveal>
              <ScrollReveal delay={0.4}>
                <div 
                  className="bg-[#ff00ff] text-black font-display font-black text-sm sm:text-2xl lg:text-3xl p-3 sm:p-4 my-4 sm:my-6 brutalist-shadow-purple cursor-default"
                  style={{ willChange: 'transform', transform: 'rotate(-1deg) scale(calc(1 + var(--bass) * 0.05))' }}
                >
                  «ты вообще понимаешь, что сделал?»
                </div>
              </ScrollReveal>
              <ScrollReveal delay={0.5}><p className="text-gray-300 text-xs sm:text-base md:text-lg lg:text-xl leading-relaxed">то, что когда-то было подвальным звуком, через тебя превратилось во что-то монументальное. это уже не просто музыка, это стиль жизни.</p></ScrollReveal>
            </div>
            
            <div className="w-full lg:flex-1 flex justify-center py-4 sm:py-4">
              <ScrollReveal delay={0.6}>
                <div style={{ willChange: 'transform', transform: 'scale(calc(1 + var(--bass) * 0.15))' }}>
                  <PhotoPlaceholder src="./assets/lida_portrait.jpg" label="FILE_01_LIDA.JPG" className="w-[180px] h-[240px] sm:w-[350px] sm:h-[450px]" tilt="2deg" onPlaySound={playGlitchSound} />
                </div>
              </ScrollReveal>
            </div>
          </div>
        </Slide>

        {/* === СЛАЙД 4 === */}
        <Slide className="overflow-y-auto no-scrollbar">
          <div className="w-full max-w-6xl mx-auto z-10 font-mono flex flex-col items-center justify-center text-center py-10 sm:py-16 px-4 pr-10 sm:pr-20 relative min-h-[100dvh]">
            <div 
              className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#00ff0030] via-[#00ff0005] to-transparent opacity-60 blur-3xl pointer-events-none" 
              style={{ willChange: 'transform', transform: 'scale(calc(1.5 + var(--bass) * 0.5))' }}
            />
            
            <ScrollReveal><p className="text-base sm:text-2xl lg:text-3xl text-gray-300 font-bold leading-relaxed mb-4 sm:mb-6 font-display">Кстати ещё в этот прекрасный день празнуется ......</p></ScrollReveal>
            <ScrollReveal delay={0.4}>
              <div 
                className="glitch-wrapper my-2 sm:my-4 relative z-20"
                style={{ willChange: 'transform', transform: 'scale(calc(1 + var(--bass) * 0.1))' }}
              >
                <h2 className="glitch-text text-2xl sm:text-5xl md:text-[64px] font-black uppercase tracking-tighter text-transparent leading-[1.1] sm:leading-[0.9]" style={{ WebkitTextStroke: '2px #00ff00', textShadow: '4px 4px 0px #7000ff' }} data-text="ДЕНЬ БАНКОВСКОГО РАБОТНИКА КЫРГЫЗСТАНА!!!!!">ДЕНЬ БАНКОВСКОГО РАБОТНИКА КЫРГЫЗСТАНА!!!!!</h2>
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={0.8}>
              <div 
                className="relative group cursor-pointer my-6 sm:my-8 z-30 inline-block" 
                onClick={() => playGlitchSound()}
                style={{ willChange: 'transform', transform: 'scale(calc(1 + var(--bass) * 0.2))' }}
              >
                <div className="absolute inset-0 bg-[#ff00ff] mix-blend-difference opacity-0 group-hover:opacity-50 transition-opacity pointer-events-none z-20" />
                <img src="./assets/slide_4_kyrgyzstan.png" alt="Кыргызстан" className="w-48 sm:w-72 md:w-96 h-auto object-cover border-4 border-white brutalist-shadow-purple transform rotate-2 group-hover:-rotate-1 group-hover:scale-105 transition-all duration-300 relative z-10 bg-black" />
              </div>
            </ScrollReveal>
            
            <ScrollReveal delay={1.2}>
              <div 
                className="bg-[#ff00ff] text-black font-display font-black text-sm sm:text-2xl lg:text-4xl p-3 sm:p-6 mt-4 brutalist-shadow-green transform -rotate-1 inline-block z-30 relative hover:rotate-1 transition-transform"
                style={{ willChange: 'transform', transform: 'rotate(-1deg) scale(calc(1 + var(--bass) * 0.05))' }}
              >
                ПОЗДРАВЛЯЮ ТЕБЯ С ЭТИМ ПРЕКРАСНЫМ ДНЁМ!!!!
              </div>
            </ScrollReveal>
          </div>
        </Slide>

        {/* === СЛАЙД 5 (ТОРТ) === */}
        <Slide className="overflow-y-auto no-scrollbar py-20 pr-12 sm:pr-16">
          <div 
            className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#ff00ff20] via-transparent to-transparent opacity-50 blur-xl mix-blend-screen pointer-events-none" 
            style={{ willChange: 'transform', transform: 'scale(calc(1.5 + var(--mid) * 0.3))' }}
          />
          
          <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ duration: 1.5, ease: "easeOut" }} className="text-center relative z-10 flex flex-col items-center w-full">
            <div 
              className="glitch-wrapper mb-6 sm:mb-8 w-full px-2"
              style={{ willChange: 'transform', transform: 'scale(calc(1 + var(--bass) * 0.1))' }}
            >
              <h2 className="glitch-text text-4xl sm:text-7xl md:text-8xl font-black lowercase tracking-tighter text-transparent break-words w-full" style={{ WebkitTextStroke: '1.5px #00ff00', textShadow: '3px 3px 0px #111' }} data-text="ты сделал это по-своему.">ты сделал это по-своему.</h2>
            </div>
            <div className="mt-4 sm:mt-8 space-y-4 sm:space-y-6 font-mono w-full px-2">
              <div className="p-4 sm:p-6 border-2 border-[#ff00ff] bg-[#111] transform rotate-1 hover:rotate-0 transition-transform max-w-[280px] sm:max-w-lg mx-auto mb-4 sm:mb-6 text-left brutalist-shadow-purple relative">
                <div className="absolute top-0 left-0 w-full h-1 flex"><div className="h-full w-1/3 bg-[#ff00ff]" /><div className="h-full w-1/3 bg-[#00ff00]" /><div className="h-full w-1/3 bg-[#7000ff]" /></div>
                <div className="flex justify-between items-center mb-3 sm:mb-4 mt-2">
                  <p className="text-[10px] sm:text-sm font-mono font-bold uppercase text-[#00ff00] flex items-center gap-2"><Skull size={16} /> что по итогу?</p>
                  <div className="text-[9px] sm:text-[10px] text-white/50 bg-black px-2 py-1 border border-white/20">сиськи</div>
                </div>
                <p className="text-base sm:text-2xl text-white font-display font-medium italic">уровень 30 пройден. <br/><span className="text-[#ff00ff] font-black">дальше — полный пиздец.</span></p>
              </div>
              <p className="text-[#00ff00] text-sm sm:text-2xl tracking-widest font-black uppercase bg-[#00ff00]/10 border border-[#00ff00] inline-block px-4 sm:px-6 py-2 hover:bg-[#00ff00]/20 transition-colors cursor-default">С ДНЁМ РОЖДЕНИЯ, КОЛЯ</p>
              <p className="text-gray-500 text-[10px] sm:text-sm mt-4 sm:mt-6 font-bold">(тортик можно крутить)</p>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 50, filter: "brightness(0.5)" }} whileInView={{ opacity: 1, y: 0, filter: "brightness(1)" }} transition={{ delay: 1.5, duration: 1.5, ease: "easeOut" }} viewport={{ once: true }} className="w-full max-w-3xl h-[250px] sm:h-[400px] md:h-[500px] relative z-20 mt-2 sm:mt-4 cursor-grab active:cursor-grabbing">
            <Canvas camera={{ position: [0, 6, 15], fov: 45 }}>
              <ambientLight intensity={1.5} />
              <pointLight position={[10, 10, 10]} intensity={3} color="#ff00ff" />
              <pointLight position={[-10, 5, -10]} intensity={3} color="#00ff00" />
              <pointLight position={[0, -5, 5]} intensity={2} color="#7000ff" />
              <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1.5} maxPolarAngle={Math.PI / 2 + 0.2} minPolarAngle={0.5} />
              <Float speed={2.5} rotationIntensity={0.5} floatIntensity={1.5}><StylizedCake /></Float>
            </Canvas>
          </motion.div>

          <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} transition={{ delay: 2, duration: 2 }} className="absolute bottom-4 sm:bottom-6 right-4 sm:right-8 text-[10px] sm:text-xs text-gray-400 font-mono border border-gray-600 bg-black/80 backdrop-blur-md px-2 sm:px-4 py-2 brutalist-shadow-purple hover:text-white hover:border-[#ff00ff] transition-colors z-50 cursor-default flex items-center gap-1 sm:gap-2">
            <span className="text-[#ff00ff] font-bold">{"//"}</span> 
            <span className="tracking-wider whitespace-nowrap">by iamvany20 :] from Sakhalin</span>
          </motion.div>
        </Slide>
      </motion.div>
    </div>
  );
}

// ДОБАВЛЕН КОМПОНЕНТ ScrollReveal ДЛЯ ПЛАВНОЙ АНИМАЦИИ
function ScrollReveal({ children, delay = 0, rootMargin = "0px" }: { children: React.ReactNode, delay?: number, rootMargin?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: rootMargin as any }}
      transition={{ duration: 0.8, delay, ease: "easeOut" }}
    >
      {children}
    </motion.div>
  );
}

function Slide({ children, className = "" }: { children: React.ReactNode, className?: string }) {
  return (
    <section className={`h-[100dvh] w-full relative flex flex-col justify-center items-center pl-4 sm:pl-8 py-4 sm:py-16 ${className}`}>
      {children}
    </section>
  );
}

function PhotoPlaceholder({ label, src, className = "", tilt = "0deg", onPlaySound }: { label: string, src?: string, className?: string, tilt?: string, onPlaySound?: (freq?: number) => void }) {
  const [isHovered, setIsHovered] = useState(false);
  return (
    <div 
      className={`relative border-2 border-[#fff] bg-[#0a0a0a] flex flex-col items-center justify-center overflow-visible group cursor-pointer transition-all duration-300 ${className} ${isHovered ? 'brutalist-shadow-pink border-[#ff00ff] z-50 scale-105' : 'brutalist-shadow-green'}`} 
      style={{ rotate: tilt }}
      onClick={() => onPlaySound?.(Math.random() > 0.5 ? 2 : 0.5)}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="absolute inset-0 z-0 p-1 bg-black">
         {src ? <img src={src} alt={label} className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" /> : <div className="w-full h-full bg-[#111]" />}
      </div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg viewBox=%220 0 200 200%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cfilter id=%22noise%22%3E%3CfeTurbulence type=%22fractalNoise%22 baseFrequency=%220.65%22 numOctaves=%223%22 stitchTiles=%22stitch%22/%3E%3C/filter%3E%3Crect width=%22100%25%22 height=%22100%25%22 filter=%22url(%23noise)%22 opacity=%220.3%22 mix-blend-mode=%22overlay%22/%3E%3C/svg%3E')] opacity-40 mix-blend-overlay pointer-events-none z-10" />
      <div className={`absolute inset-0 bg-[#00ff00] mix-blend-color transition-opacity pointer-events-none z-10 ${isHovered ? 'opacity-20' : 'opacity-0'}`} />
      <div className={`absolute inset-0 z-10 bg-[#ff00ff] mix-blend-difference pointer-events-none transition-transform duration-75 ${isHovered ? 'translate-x-2 -translate-y-2 opacity-30' : 'opacity-0'}`} />
      <div className={`absolute inset-0 z-10 bg-[#00ff00] mix-blend-screen pointer-events-none transition-transform duration-75 ${isHovered ? '-translate-x-2 translate-y-2 opacity-30' : 'opacity-0'}`} />
      <div className="z-20 font-mono flex flex-col items-center gap-3 mt-auto mb-4">
        {!src && <ImageIcon size={32} className="opacity-80 group-hover:scale-110 transition-transform duration-300 text-white group-hover:text-[#ff00ff] mix-blend-difference" />}
        <span className="text-[10px] sm:text-xs font-bold tracking-widest uppercase bg-white/90 backdrop-blur-sm text-black px-2 sm:px-3 py-1 group-hover:bg-[#ff00ff] group-hover:text-white transition-colors text-center shadow-md">{label}</span>
      </div>
      <div className="absolute top-0 w-full h-8 transform -translate-y-full group-hover:translate-y-0 transition-transform bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,#00ff00_10px,#00ff00_20px)] opacity-50 z-20" />
      <div className="absolute bottom-0 w-full h-8 transform translate-y-full group-hover:translate-y-0 transition-transform bg-[repeating-linear-gradient(-45deg,transparent,transparent_10px,#ff00ff_10px,#ff00ff_20px)] opacity-50 z-20" />
      <div className={`absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 bg-black border border-[#00ff00] text-[#00ff00] font-mono text-[10px] sm:text-xs px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap transition-all duration-200 brutalist-shadow-green z-50 pointer-events-none flex flex-col gap-1 items-center ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
        <span className="font-bold">{label}</span>
        <span className="text-[8px] sm:text-[9px] text-[#ff00ff] tracking-widest uppercase animate-pulse">Click to interact</span>
      </div>
    </div>
  );
}

function StylizedCake() {
  const groupRef = useRef<THREE.Group>(null);
  const flameRef = useRef<THREE.Group>(null);
  const ringsRef = useRef<THREE.Group>(null);
  const textRef = useRef<any>(null);
  const visualizerRef = useRef<THREE.InstancedMesh>(null);
  
  const timer = useRef(new THREE.Timer());
  
  // Сглаженные значения для плавной анимации
  const smoothedBass = useRef(0);
  const smoothedMid = useRef(0);

  // Для эквалайзера (32 столбика по кругу)
  const BAR_COUNT = 32;
  const dummy = useMemo(() => new THREE.Object3D(),[]);
  const color = useMemo(() => new THREE.Color(),[]);

  useFrame((state, delta) => {
    timer.current.update();
    const time = timer.current.getElapsed();
    
    // Получаем аудиоданные в реальном времени
    const { bass, mid, treble, raw } = getAudioEnergy();
    
    // Плавное затухание (чтобы торт не дергался слишком резко)
    smoothedBass.current = THREE.MathUtils.damp(smoothedBass.current, bass, 15, delta);
    smoothedMid.current = THREE.MathUtils.damp(smoothedMid.current, mid, 10, delta);

    // 1. КАЧАЕТ ТОРТ (БАСЫ)
    if (groupRef.current) {
      // Базовый скейл + прыжок от баса
      const bounceScale = 1 + smoothedBass.current * 0.25;
      groupRef.current.scale.set(bounceScale, bounceScale, bounceScale);

      // Глитч смещение при сильном басе
      if (bass > 0.8 && Math.random() > 0.5) {
        groupRef.current.position.x = (Math.random() - 0.5) * 0.3;
        groupRef.current.rotation.z = (Math.random() - 0.5) * 0.1;
      } else {
        groupRef.current.position.x = THREE.MathUtils.lerp(groupRef.current.position.x, 0, 0.2);
        groupRef.current.rotation.z = THREE.MathUtils.lerp(groupRef.current.rotation.z, 0, 0.2);
      }
    }

    // 2. ВРАЩЕНИЕ КОЛЕЦ УСКОРЯЕТСЯ ОТ ВЫСОКИХ ЧАСТОТ (ХЭТОВ)
    if (ringsRef.current) {
      const baseSpeed = 0.5;
      const speedMultiplier = 1 + treble * 5;
      ringsRef.current.rotation.y += delta * baseSpeed * speedMultiplier;
      ringsRef.current.rotation.x = Math.sin(time * 0.5) * 0.2;
      ringsRef.current.rotation.z = Math.cos(time * 0.3) * 0.1;
      
      // Кольца расширяются при ударах
      const ringScale = 1 + smoothedMid.current * 0.3;
      ringsRef.current.scale.set(ringScale, ringScale, ringScale);
    }

    // 3. ТЕКСТ "30" ПУЛЬСИРУЕТ
    if (textRef.current) {
      const textScale = 1 + smoothedBass.current * 0.4;
      textRef.current.scale.set(textScale, textScale, textScale);
      textRef.current.outlineWidth = 0.05 + smoothedBass.current * 0.1;
    }
    
    // 4. ПЛАМЯ СВЕЧИ
    if (flameRef.current) {
      const fScale = 1 + Math.sin(time * 20) * 0.1 + smoothedMid.current * 0.5;
      flameRef.current.scale.setScalar(fScale);
    }

    // 5. КРУГОВОЙ ЭКВАЛАЙЗЕР (ВИЗУАЛИЗАТОР ВОКРУГ ТОРТА)
    if (visualizerRef.current && raw && raw.length > 0) {
      for (let i = 0; i < BAR_COUNT; i++) {
        const angle = (i / BAR_COUNT) * Math.PI * 2;
        const radius = 4.0 + smoothedBass.current * 0.5; // Разлетаются при басе
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;

        // Берем частоты из середины спектра (чтобы красиво прыгало)
        const dataIndex = Math.floor((i / BAR_COUNT) * 60) + 2; 
        const barHeight = 0.1 + Math.pow(raw[dataIndex] / 255, 2) * 4;

        dummy.position.set(x, barHeight / 2 - 1.5, z);
        dummy.scale.set(0.15, barHeight, 0.15);
        dummy.lookAt(0, dummy.position.y, 0); 
        dummy.updateMatrix();
        visualizerRef.current.setMatrixAt(i, dummy.matrix);
        
        // Цвет: переходит от розового к зелёному в зависимости от громкости частоты
        const intensity = raw[dataIndex] / 255;
        color.setHSL(0.8 - intensity * 0.5, 1, 0.5 + intensity * 0.3);
        visualizerRef.current.setColorAt(i, color);
      }
      visualizerRef.current.instanceMatrix.needsUpdate = true;
      if (visualizerRef.current.instanceColor) visualizerRef.current.instanceColor.needsUpdate = true;
    }
  });

  return (
    <group position={[0, -1.5, 0]}>
      
      {/* ВИЗУАЛИЗАТОР (ЭКВАЛАЙЗЕР ПО КРУГУ) */}
      <instancedMesh ref={visualizerRef} args={[undefined, undefined, BAR_COUNT]}>
        <boxGeometry args={[1, 1, 1]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </instancedMesh>

      <group ref={groupRef}>
        {/* ПОДСТАВКА */}
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[3.2, 3.5, 0.3, 32]} />
          <meshStandardMaterial color="#111" metalness={0.9} roughness={0.1} />
        </mesh>
        <mesh position={[0, -0.15, 0]}>
          <cylinderGeometry args={[3.5, 3.5, 0.35, 16]} />
          <meshBasicMaterial color="#00ff00" wireframe transparent opacity={0.2} />
        </mesh>

        {/* ЯРУС 1 */}
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.5, 2.5, 1, 32]} />
          <meshStandardMaterial color="#1a0522" roughness={0.3} metalness={0.8} emissive="#ff00ff" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, 1, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[2.5, 0.15, 16, 64]} />
          <meshStandardMaterial color="#ff00ff" roughness={0.2} emissive="#ff00ff" emissiveIntensity={0.5} />
        </mesh>
        <mesh position={[0, 0.5, 0]}>
          <cylinderGeometry args={[2.55, 2.55, 1.05, 16]} />
          <meshBasicMaterial color="#ff00ff" wireframe transparent opacity={0.3} />
        </mesh>
        {Array.from({ length: 12 }).map((_, i) => (
          <mesh key={`d1-${i}`} position={[Math.cos((i / 12) * Math.PI * 2) * 2.5, 1.15, Math.sin((i / 12) * Math.PI * 2) * 2.5]}>
            <sphereGeometry args={[0.15, 16, 16]} />
            <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.4} />
          </mesh>
        ))}

        {/* ЯРУС 2 */}
        <mesh position={[0, 1.5, 0]}>
          <cylinderGeometry args={[1.8, 1.8, 1, 32]} />
          <meshStandardMaterial color="#052205" roughness={0.3} metalness={0.8} emissive="#00ff00" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.8, 0.12, 16, 64]} />
          <meshStandardMaterial color="#00ff00" roughness={0.2} emissive="#00ff00" emissiveIntensity={0.5} />
        </mesh>
        {Array.from({ length: 8 }).map((_, i) => (
          <mesh key={`d2-${i}`} position={[Math.cos((i / 8) * Math.PI * 2) * 1.8, 2.12, Math.sin((i / 8) * Math.PI * 2) * 1.8]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshStandardMaterial color="#7000ff" emissive="#7000ff" emissiveIntensity={0.5} />
          </mesh>
        ))}

        {/* ЯРУС 3 */}
        <mesh position={[0, 2.5, 0]}>
          <cylinderGeometry args={[1.2, 1.2, 1, 32]} />
          <meshStandardMaterial color="#110022" roughness={0.2} metalness={0.9} emissive="#7000ff" emissiveIntensity={0.2} />
        </mesh>
        <mesh position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[1.2, 0.1, 16, 64]} />
          <meshStandardMaterial color="#7000ff" roughness={0.2} emissive="#7000ff" emissiveIntensity={0.6} />
        </mesh>

        {/* ЛЕТАЮЩИЕ ГОЛОГРАФИЧЕСКИЕ КОЛЬЦА */}
        <group ref={ringsRef} position={[0, 1.5, 0]}>
          <mesh rotation={[Math.PI / 3, 0, 0]}>
            <torusGeometry args={[3.8, 0.02, 16, 64]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0.6} />
          </mesh>
          <mesh rotation={[-Math.PI / 4, Math.PI / 6, 0]}>
            <torusGeometry args={[4.2, 0.03, 16, 64]} />
            <meshBasicMaterial color="#ff00ff" transparent opacity={0.6} />
          </mesh>
          <mesh rotation={[0, Math.PI / 2, Math.PI / 8]}>
            <torusGeometry args={[3.5, 0.015, 16, 64]} />
            <meshBasicMaterial color="#7000ff" transparent opacity={0.8} />
          </mesh>
        </group>

        {/* ТЕКСТ 30 */}
        <Text 
          ref={textRef}
          position={[0, 3.8, 1.3]} 
          fontSize={1.5} 
          color="#ffffff" 
          outlineWidth={0.06} 
          outlineColor="#ff00ff" 
          font="https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYMZhrib2Bg-4.ttf" 
          fontWeight="900"
          rotation={[0, 0, -0.05]}
        >
          31
        </Text>

        {/* СВЕЧА */}
        <mesh position={[0, 3.5, 0]}>
          <cylinderGeometry args={[0.08, 0.1, 1, 16]} />
          <meshStandardMaterial color="#ffffff" roughness={0.4} metalness={0.1} emissive="#222" />
        </mesh>
        <group ref={flameRef} position={[0, 4.2, 0]}>
          <mesh position={[0, 0.15, 0]}>
            <coneGeometry args={[0.15, 0.5, 16]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0.9} />
          </mesh>
          <mesh position={[0, 0, 0]}>
            <sphereGeometry args={[0.12, 16, 16]} />
            <meshBasicMaterial color="#ffffff" />
          </mesh>
          <mesh position={[0, 0.1, 0]}>
            <coneGeometry args={[0.25, 0.7, 16]} />
            <meshBasicMaterial color="#00ff00" transparent opacity={0.3} blending={THREE.AdditiveBlending} />
          </mesh>
        </group>

        {/* СВЕТ (который тоже будет пульсировать косвенно через смещение) */}
        <pointLight position={[0, 4.5, 0]} color="#00ff00" intensity={4} distance={8} />
        <pointLight position={[0, 2.5, 0]} color="#7000ff" intensity={2} distance={6} />
      </group>
    </group>
  );
}