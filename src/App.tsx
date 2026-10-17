import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/engine';
import { GameState } from './game/types';
import { LEVELS } from './game/constants';
import { soundEngine } from './game/audio';
import { 
  Volume2, 
  VolumeX, 
  Play, 
  RotateCcw, 
  RotateCw,
  Smartphone,
  Pause, 
  Trophy, 
  Flame, 
  ChevronRight,
  Sparkles
} from 'lucide-react';

export type ScreenRotation = 0 | 90 | 180 | 270;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);

  const [gameState, setGameState] = useState<GameState>('title');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [isEndless, setIsEndless] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [highScore, setHighScore] = useState<number>(() => {
    return parseInt(localStorage.getItem('monke_high_score') || '0', 10);
  });
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState<any>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  // Game Screen Rotation System (0°, 90°, 180°, 270°)
  const [screenRotation, setScreenRotation] = useState<ScreenRotation>(() => {
    const saved = localStorage.getItem('monke_game_rotation');
    return (saved === '90' || saved === '180' || saved === '270' ? parseInt(saved, 10) : 0) as ScreenRotation;
  });
  const [windowDims, setWindowDims] = useState({
    w: typeof window !== 'undefined' ? window.innerWidth : 1280,
    h: typeof window !== 'undefined' ? window.innerHeight : 720,
  });
  const [showPortraitNotice, setShowPortraitNotice] = useState<boolean>(true);
  const [showRotationMenu, setShowRotationMenu] = useState<boolean>(false);

  const [stats, setStats] = useState({
    score: 0,
    bananas: 0,
    health: 3,
    maxHealth: 3,
    coconuts: 5,
    maxCoconuts: 10,
    combo: 1,
    feverEnergy: 0,
    isFever: false,
    levelId: 1,
    progress: 0,
  });

  // Keep track of high score
  useEffect(() => {
    if (stats.score > highScore) {
      setHighScore(stats.score);
      localStorage.setItem('monke_high_score', stats.score.toString());
    }
  }, [stats.score, highScore]);

  // Handle GameEngine Initialization once on mount
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, {
      onStateChange: (newState) => {
        setGameState(newState);
      },
      onStatsUpdate: (newStats) => {
        setStats(newStats);
      },
    });
    engineRef.current = engine;
    engine.startLoop();

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredInstallPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      engine.destroy();
    };
  }, []);

  // Update Canvas sizing on resize or screenRotation change
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateDimensions = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      setWindowDims({ w, h });
      if (screenRotation === 90 || screenRotation === 270) {
        canvas.width = h;
        canvas.height = w;
      } else {
        canvas.width = w;
        canvas.height = h;
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [screenRotation]);

  const handleCycleRotation = useCallback(() => {
    soundEngine.playOrientationRotate();
    setScreenRotation((prev) => {
      const next = (prev === 0 ? 90 : prev === 90 ? 180 : prev === 180 ? 270 : 0) as ScreenRotation;
      localStorage.setItem('monke_game_rotation', next.toString());
      return next;
    });
  }, []);

  const handleSetRotation = useCallback((angle: ScreenRotation) => {
    soundEngine.playOrientationRotate();
    setScreenRotation(angle);
    localStorage.setItem('monke_game_rotation', angle.toString());
    setShowRotationMenu(false);
  }, []);

  const handleLockLandscape = useCallback(async () => {
    soundEngine.playOrientationRotate();
    try {
      if (document.documentElement.requestFullscreen && !document.fullscreenElement) {
        await document.documentElement.requestFullscreen().catch(() => {});
      }
      if (screen.orientation && 'lock' in screen.orientation) {
        await (screen.orientation as any).lock('landscape').catch(() => {});
      }
    } catch {
      // Virtual rotation will handle it seamlessly!
    }
    handleSetRotation(90);
    setShowPortraitNotice(false);
  }, [handleSetRotation]);

  const handleInstallApp = async () => {
    if (deferredInstallPrompt) {
      deferredInstallPrompt.prompt();
      const choiceResult = await deferredInstallPrompt.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setDeferredInstallPrompt(null);
      }
    } else {
      // Provide guidance if install prompt is not natively available yet
      alert('To install this game app:\n• On Chrome / Edge / Android: Tap the ⋮ menu and select "Install App" or "Add to Home Screen".\n• On iOS Safari: Tap Share (square with arrow) and tap "Add to Home Screen"!');
    }
  };

  const handleToggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  // Keyboard Event Listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
        if (engine.state === 'playing' || engine.state === 'paused') {
          engine.togglePause();
        }
        return;
      }

      // Shift+R = Screen rotation; R in midair = Acrobatic 360 Flip!
      if (e.key === 'r' || e.key === 'R') {
        if (e.shiftKey) {
          e.preventDefault();
          handleCycleRotation();
          return;
        }
        if (engine.state === 'playing') {
          e.preventDefault();
          engine.triggerFlip();
          return;
        }
      }

      if (engine.state === 'title' && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        handleStartGame(selectedLevel, isEndless);
        return;
      }

      const input: Record<string, boolean> = {};

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        input.left = true;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        input.right = true;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        input.up = true;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        input.down = true;
      }
      if (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        input.jumpHeld = true;
        if (!e.repeat) input.jumpPressed = true;
      }
      if (e.key === 'x' || e.key === 'X' || e.key === 'j' || e.key === 'J') {
        if (!e.repeat) input.throwPressed = true;
      }

      engine.setInput(input);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const engine = engineRef.current;
      if (!engine) return;

      const input: Record<string, boolean> = {};

      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        input.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        input.right = false;
      }
      if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
        input.up = false;
      }
      if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
        input.down = false;
      }
      if (e.key === ' ' || e.key === 'w' || e.key === 'W' || e.key === 'ArrowUp') {
        input.jumpHeld = false;
      }

      engine.setInput(input);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [selectedLevel, isEndless, handleCycleRotation]);

  const handleStartGame = useCallback((levelId: number, endless: boolean) => {
    if (!engineRef.current) return;
    engineRef.current.startPlaying(levelId, endless);
  }, []);

  const handleToggleMute = useCallback(() => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  }, []);

  const handleRestart = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.startPlaying(selectedLevel, isEndless);
  }, [selectedLevel, isEndless]);

  const handleNextLevel = useCallback(() => {
    if (!engineRef.current) return;
    const nextLvl = Math.min(3, selectedLevel + 1);
    setSelectedLevel(nextLvl);
    engineRef.current.startPlaying(nextLvl, false);
  }, [selectedLevel]);

  const handleReturnToTitle = useCallback(() => {
    if (!engineRef.current) return;
    engineRef.current.state = 'title';
    engineRef.current.loadLevel(1, false);
    setGameState('title');
    soundEngine.stopMusic();
  }, []);

  // Virtual buttons for touch & mobile accessibility
  const handleTouchControl = (action: string, isDown: boolean) => {
    if (!engineRef.current) return;
    if (action === 'left') engineRef.current.setInput({ left: isDown });
    if (action === 'right') engineRef.current.setInput({ right: isDown });
    if (action === 'jump') {
      engineRef.current.setInput({ jumpHeld: isDown, ...(isDown ? { jumpPressed: true } : {}) });
    }
    if (action === 'throw' && isDown) {
      engineRef.current.setInput({ throwPressed: true });
    }
    if (action === 'flip') {
      engineRef.current.triggerFlip();
    }
  };

  const isSideways = screenRotation === 90 || screenRotation === 270;
  const containerStyle: React.CSSProperties = isSideways
    ? {
        position: 'fixed',
        width: `${windowDims.h}px`,
        height: `${windowDims.w}px`,
        left: '50%',
        top: '50%',
        transform: `translate(-50%, -50%) rotate(${screenRotation}deg)`,
        transformOrigin: 'center center',
      }
    : screenRotation === 180
    ? {
        position: 'fixed',
        width: `${windowDims.w}px`,
        height: `${windowDims.h}px`,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%) rotate(180deg)',
        transformOrigin: 'center center',
      }
    : {
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
      };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black font-sans select-none touch-none">
      {/* Smart Orientation Prompt for Portrait Screens */}
      {windowDims.h > windowDims.w && screenRotation === 0 && showPortraitNotice && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 border border-amber-500/80 shadow-2xl px-3.5 py-2 rounded-xl flex items-center gap-2.5 backdrop-blur-md pointer-events-auto">
          <Smartphone className="w-4 h-4 text-amber-400 rotate-90 animate-pulse" />
          <span className="text-xs text-amber-100 font-medium whitespace-nowrap">Landscape view recommended</span>
          <button
            onClick={handleLockLandscape}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs rounded-lg transition-transform active:scale-95 cursor-pointer flex items-center gap-1 shadow"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span>Rotate 90°</span>
          </button>
          <button
            onClick={() => setShowPortraitNotice(false)}
            className="text-stone-400 hover:text-stone-200 text-xs px-1 cursor-pointer"
            title="Dismiss"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Game Screen Canvas & Overlays Container with Smooth CSS Rotation */}
      <div
        style={containerStyle}
        className="relative overflow-hidden bg-emerald-950 transition-transform duration-300 ease-out"
      >
        {/* 60fps Game Viewport Canvas */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full block cursor-crosshair"
        />

        {/* PERIMETER STATUS CLUSTER: World-Matched, Low-Occlusion HUD (85%+ unobstructed) */}
        {gameState === 'playing' && (
          <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-4 md:p-6">
            {/* Top Row: Score, Bananas, Hearts, Fever Bar, Audio/Pause */}
            <div className="flex items-start justify-between w-full">
              {/* Left Status: Hearts & Bananas */}
              <div className="flex flex-col gap-2">
                {/* Hearts Bar */}
                <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-lg border border-emerald-800/40">
                  {Array.from({ length: stats.maxHealth }).map((_, idx) => (
                    <svg
                      key={idx}
                      className={`w-6 h-6 transition-transform ${
                        idx < stats.health ? 'text-rose-500 scale-100 animate-pulse' : 'text-stone-600 scale-90'
                      }`}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                  ))}
                </div>

                {/* Bananas & Coconut Ammo */}
                <div className="flex items-center gap-4 text-xs font-semibold tracking-wider text-amber-300">
                  {/* Banana Count */}
                  <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-amber-600/30">
                    <span className="text-base">🍌</span>
                    <span className="tabular-nums font-mono text-sm text-amber-200">
                      {stats.bananas}
                    </span>
                  </div>

                  {/* Coconut Ammo */}
                  <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-md border border-amber-800/40">
                    <span className="text-base">🥥</span>
                    <span className="tabular-nums font-mono text-sm text-stone-200">
                      {stats.coconuts}
                    </span>
                  </div>

                  {/* Combo Multiplier */}
                  {stats.combo > 1 && (
                    <div className="flex items-center gap-1 bg-amber-500/20 px-2.5 py-1 rounded-md border border-amber-400/40 text-amber-300 animate-bounce">
                      <Flame className="w-3.5 h-3.5 text-amber-400" />
                      <span className="tabular-nums font-mono text-xs font-bold">
                        x{stats.combo} COMBO!
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Center Status: Fever Gauge & Distance Progress */}
              <div className="flex flex-col items-center gap-2 max-w-xs w-full px-4">
                {/* Score Readout */}
                <div className="text-center">
                  <span className="text-xs uppercase tracking-widest text-emerald-400 font-medium">Score</span>
                  <div className="tabular-nums font-mono text-2xl font-black tracking-tight text-white drop-shadow-md">
                    {stats.score.toLocaleString()}
                  </div>
                </div>

                {/* Fever Meter */}
                <div className="w-full flex flex-col gap-1 items-center">
                  <div className="w-48 h-2.5 bg-black/50 rounded-full overflow-hidden border border-emerald-700/50 relative">
                    <div
                      className={`h-full transition-all duration-150 ${
                        stats.isFever
                          ? 'bg-gradient-to-r from-yellow-400 via-pink-500 to-amber-400 animate-pulse'
                          : 'bg-gradient-to-r from-amber-500 to-yellow-300'
                      }`}
                      style={{ width: `${stats.isFever ? 100 : stats.feverEnergy}%` }}
                    />
                  </div>
                  {stats.isFever ? (
                    <span className="text-[10px] uppercase font-bold tracking-widest text-amber-300 animate-pulse flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-yellow-400" /> GOLDEN MONKE FEVER! <Sparkles className="w-3 h-3 text-yellow-400" />
                    </span>
                  ) : (
                    <span className="text-[10px] uppercase tracking-wider text-emerald-300/70 font-mono">
                      FEVER: {stats.feverEnergy}%
                    </span>
                  )}
                </div>

                {/* Stage Progress Bar */}
                <div className="w-36 h-1 bg-black/40 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-400 transition-all duration-100"
                    style={{ width: `${stats.progress * 100}%` }}
                  />
                </div>
              </div>

              {/* Right Buttons: Rotate View, Mute & Pause */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onClick={handleCycleRotation}
                  aria-label="Rotate screen orientation"
                  title={`Rotate Game Screen (Current: ${screenRotation}°)`}
                  className="h-10 px-2.5 rounded-lg bg-black/40 hover:bg-black/60 border border-emerald-700/50 flex items-center gap-1.5 text-emerald-200 transition-colors pointer-events-auto cursor-pointer"
                >
                  <RotateCw className="w-4 h-4 text-amber-400" />
                  <span className="text-[11px] font-mono font-bold text-amber-300">{screenRotation}°</span>
                </button>
                <button
                  onClick={handleToggleMute}
                  aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
                  className="w-10 h-10 rounded-lg bg-black/40 hover:bg-black/60 border border-emerald-700/50 flex items-center justify-center text-emerald-200 transition-colors cursor-pointer"
                >
                  {isMuted ? <VolumeX className="w-5 h-5 text-rose-400" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <button
                  onClick={() => engineRef.current?.togglePause()}
                  aria-label="Pause game"
                  className="w-10 h-10 rounded-lg bg-black/40 hover:bg-black/60 border border-emerald-700/50 flex items-center justify-center text-emerald-200 transition-colors cursor-pointer"
                >
                  <Pause className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* On-Screen Touch Controls (Mobile / Tablet friendly) */}
            <div className="flex justify-between items-end w-full pb-2 md:hidden">
              {/* D-Pad Left / Right */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onTouchStart={() => handleTouchControl('left', true)}
                  onTouchEnd={() => handleTouchControl('left', false)}
                  onMouseDown={() => handleTouchControl('left', true)}
                  onMouseUp={() => handleTouchControl('left', false)}
                  className="w-14 h-14 rounded-xl bg-black/50 border border-emerald-700/60 active:bg-emerald-800/60 flex items-center justify-center text-white text-xl font-bold active:scale-95 transition-transform cursor-pointer"
                >
                  ◀
                </button>
                <button
                  onTouchStart={() => handleTouchControl('right', true)}
                  onTouchEnd={() => handleTouchControl('right', false)}
                  onMouseDown={() => handleTouchControl('right', true)}
                  onMouseUp={() => handleTouchControl('right', false)}
                  className="w-14 h-14 rounded-xl bg-black/50 border border-emerald-700/60 active:bg-emerald-800/60 flex items-center justify-center text-white text-xl font-bold active:scale-95 transition-transform cursor-pointer"
                >
                  ▶
                </button>
              </div>

              {/* Jump / Throw / Flip Action Buttons */}
              <div className="flex items-center gap-2 pointer-events-auto">
                <button
                  onTouchStart={() => handleTouchControl('flip', true)}
                  onMouseDown={() => handleTouchControl('flip', true)}
                  className="w-13 h-13 rounded-full bg-cyan-950/70 border-2 border-cyan-400/80 active:bg-cyan-800 flex flex-col items-center justify-center text-cyan-200 text-xs font-bold active:scale-95 transition-transform shadow-md cursor-pointer"
                  title="360° Acrobatic Flip"
                >
                  <RotateCw className="w-4 h-4 text-cyan-300" />
                  <span className="text-[9px]">FLIP</span>
                </button>
                <button
                  onTouchStart={() => handleTouchControl('throw', true)}
                  onMouseDown={() => handleTouchControl('throw', true)}
                  className="w-13 h-13 rounded-full bg-amber-900/60 border border-amber-500/60 active:bg-amber-700 flex flex-col items-center justify-center text-amber-200 text-xs font-bold active:scale-95 transition-transform cursor-pointer"
                >
                  <span>🥥</span>
                  <span className="text-[9px]">TOSS</span>
                </button>
                <button
                  onTouchStart={() => handleTouchControl('jump', true)}
                  onTouchEnd={() => handleTouchControl('jump', false)}
                  onMouseDown={() => handleTouchControl('jump', true)}
                  onMouseUp={() => handleTouchControl('jump', false)}
                  className="w-15 h-15 rounded-full bg-emerald-600/80 border-2 border-emerald-300 active:bg-emerald-500 flex flex-col items-center justify-center text-white font-bold text-xs active:scale-95 transition-transform shadow-lg cursor-pointer"
                >
                  <span>🌿</span>
                  <span className="text-[10px]">SWING</span>
                </button>
              </div>
            </div>
          </div>
        )}

      {/* TITLE SCREEN: Atmospheric live world in background + Bespoke SVG Lockup */}
      {gameState === 'title' && (
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-between p-6 sm:p-10 pointer-events-auto bg-black/40">
          {/* Top Brand Bar */}
          <div className="flex items-center justify-between w-full max-w-4xl text-xs text-emerald-300/80">
            <div className="flex items-center gap-2">
              <span className="font-semibold tracking-wider text-amber-400">JUNGLE CANOPY ARCADE</span>
              <span aria-hidden="true">·</span>
              <span>v1.0.0</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>High Score:</span>
              <span className="tabular-nums font-mono font-bold text-amber-300">{highScore.toLocaleString()}</span>
              
              <button
                onClick={handleInstallApp}
                title="Install Game App"
                className="ml-2 px-2.5 py-1 rounded bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>📲</span>
                <span className="font-medium hidden sm:inline">Install App</span>
              </button>

              {/* Screen Rotation Selector */}
              <div className="relative">
                <button
                  onClick={() => setShowRotationMenu((v) => !v)}
                  title="Screen Orientation & Rotation System"
                  className="px-2.5 py-1 rounded bg-black/40 hover:bg-black/60 text-emerald-300 border border-emerald-800 transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  <span className="font-mono font-bold text-amber-300">{screenRotation}°</span>
                  <span className="hidden sm:inline text-xs">Rotate</span>
                </button>

                {showRotationMenu && (
                  <div className="absolute right-0 top-full mt-1.5 z-50 bg-stone-900 border border-emerald-700/80 p-2 rounded-xl shadow-2xl flex flex-col gap-1 min-w-[160px] backdrop-blur-md">
                    <span className="text-[10px] uppercase font-bold text-emerald-400/80 px-2 py-0.5">Screen Rotate</span>
                    {([0, 90, 180, 270] as ScreenRotation[]).map((deg) => (
                      <button
                        key={deg}
                        onClick={() => handleSetRotation(deg)}
                        className={`px-2.5 py-1.5 text-xs rounded-lg text-left font-medium flex items-center justify-between transition-colors cursor-pointer ${
                          screenRotation === deg
                            ? 'bg-amber-500 text-stone-950 font-bold'
                            : 'text-stone-200 hover:bg-emerald-950/80'
                        }`}
                      >
                        <span>{deg === 0 ? '0° Normal' : deg === 90 ? '90° Landscape' : deg === 180 ? '180° Inverted' : '270° Reverse'}</span>
                        {screenRotation === deg && <span>✓</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={handleToggleFullscreen}
                title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                className="p-1.5 rounded bg-black/40 hover:bg-black/60 text-emerald-300 border border-emerald-800 transition-colors cursor-pointer"
              >
                {isFullscreen ? "🗗" : "⛶"}
              </button>

              <button
                onClick={handleToggleMute}
                className="p-1.5 rounded bg-black/40 hover:bg-black/60 text-emerald-300 border border-emerald-800 transition-colors cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Central Title Lockup over negative space */}
          <div className="flex flex-col items-center text-center my-auto max-w-xl">
            {/* Bespoke inline SVG Title Art Lockup */}
            <div className="relative mb-4 drop-shadow-2xl">
              <svg viewBox="0 0 540 120" className="w-72 sm:w-96 md:w-[480px] h-auto">
                <defs>
                  <linearGradient id="monkeGold" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#fef08a" />
                    <stop offset="45%" stopColor="#facc15" />
                    <stop offset="100%" stopColor="#b45309" />
                  </linearGradient>
                  <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ade80" />
                    <stop offset="100%" stopColor="#15803d" />
                  </linearGradient>
                </defs>

                {/* Palm Vine Arch */}
                <path
                  d="M 20,40 Q 270,-15 520,40"
                  fill="none"
                  stroke="#2d471e"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                <path
                  d="M 20,40 Q 270,-15 520,40"
                  fill="none"
                  stroke="url(#leafGrad)"
                  strokeWidth="4"
                  strokeLinecap="round"
                />

                {/* Decorative Leaves */}
                <ellipse cx="140" cy="18" rx="14" ry="7" fill="#4ade80" transform="rotate(-15 140 18)" />
                <ellipse cx="400" cy="18" rx="14" ry="7" fill="#4ade80" transform="rotate(15 400 18)" />
                <ellipse cx="270" cy="5" rx="16" ry="8" fill="#86efac" />

                {/* Text: MONKE MAYHEM */}
                <text
                  x="270"
                  y="62"
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="900"
                  fontSize="48"
                  letterSpacing="4"
                  fill="#1c1917"
                  stroke="#451a03"
                  strokeWidth="8"
                >
                  MONKE MAYHEM
                </text>
                <text
                  x="270"
                  y="62"
                  textAnchor="middle"
                  fontFamily="system-ui, sans-serif"
                  fontWeight="900"
                  fontSize="48"
                  letterSpacing="4"
                  fill="url(#monkeGold)"
                >
                  MONKE MAYHEM
                </text>

                {/* Subtitle banner */}
                <text
                  x="270"
                  y="98"
                  textAnchor="middle"
                  fontFamily="monospace"
                  fontWeight="700"
                  fontSize="16"
                  letterSpacing="6"
                  fill="#86efac"
                >
                  JUNGLE CANOPY RUSH
                </text>
              </svg>
            </div>

            <p className="text-emerald-100/90 text-sm sm:text-base max-w-md font-normal leading-relaxed mb-6">
              Swing through dynamic tree vines, trampoline off bouncy mushrooms, toss coconuts at toucans, and unleash Golden Monke Fever!
            </p>

            {/* Level & Mode Selection */}
            <div className="flex flex-col items-center gap-2 mb-6 max-w-lg w-full">
              <div className="flex flex-wrap items-center justify-center gap-2">
                {LEVELS.map((lvl) => (
                  <button
                    key={lvl.id}
                    onClick={() => {
                      setSelectedLevel(lvl.id);
                      setIsEndless(false);
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
                      !isEndless && selectedLevel === lvl.id
                        ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md'
                        : 'bg-emerald-950/60 text-emerald-200 border-emerald-800 hover:bg-emerald-900/60'
                    }`}
                  >
                    Ch {lvl.id}: {lvl.name.split('&')[0].trim()}
                  </button>
                ))}
                <button
                  onClick={() => setIsEndless(true)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors border cursor-pointer ${
                    isEndless
                      ? 'bg-amber-500 text-stone-950 border-amber-300 shadow-md'
                      : 'bg-emerald-950/60 text-emerald-200 border-emerald-800 hover:bg-emerald-900/60'
                  }`}
                >
                  ♾️ Endless Gauntlet
                </button>
              </div>
              <p className="text-[11px] text-amber-300/80 font-medium text-center italic">
                {isEndless 
                  ? 'All monster hordes scale infinitely! Dodge dive-bombing harpies, charging boars, and savage titans.' 
                  : LEVELS[selectedLevel - 1]?.subtitle}
              </p>
            </div>

            {/* Primary Start CTA */}
            <button
              onClick={() => handleStartGame(selectedLevel, isEndless)}
              className="group relative px-8 py-3.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:from-amber-400 hover:to-yellow-300 text-stone-950 font-black text-lg tracking-wider rounded-xl shadow-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 cursor-pointer"
            >
              <Play className="w-5 h-5 fill-stone-950" />
              <span>SWING INTO JUNGLE</span>
              <ChevronRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </button>

            <button
              onClick={handleInstallApp}
              className="mt-3 text-xs text-amber-300/90 hover:text-amber-200 flex items-center gap-1.5 underline underline-offset-4 decoration-amber-500/50 cursor-pointer transition-colors"
            >
              <span>📲</span>
              <span>Install Monke Mayhem as Native App (Offline Ready)</span>
            </button>
          </div>

          {/* Single Flat Control-Hint Line */}
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-emerald-300/80 font-mono text-center max-w-xl">
            <span>A / D Move</span>
            <span aria-hidden="true">·</span>
            <span>Space / W Jump & Swing & Stomp</span>
            <span aria-hidden="true">·</span>
            <span>X / J Toss Coconut</span>
            <span aria-hidden="true">·</span>
            <span>R Flip</span>
            <span aria-hidden="true">·</span>
            <span>Shift+R Rotate Screen</span>
            <span aria-hidden="true">·</span>
            <span>Esc Pause</span>
          </div>
        </div>
      )}

      {/* PAUSE MODAL */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/60 pointer-events-auto">
          <div className="w-full max-w-sm bg-stone-900 border border-emerald-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center">
            <h2 className="text-2xl font-black text-amber-400 tracking-wide mb-1">GAME PAUSED</h2>
            <div className="flex items-center gap-2 text-xs text-emerald-400/80 mb-4">
              <span>{isEndless ? 'Endless Canopy' : LEVELS[selectedLevel - 1]?.name}</span>
              <span aria-hidden="true">·</span>
              <span>{stats.score.toLocaleString()} pts</span>
            </div>

            {/* Screen Rotation System Quick Selector */}
            <div className="w-full bg-stone-950/70 p-3 rounded-xl border border-stone-800 mb-4 flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-stone-300 font-semibold flex items-center gap-1.5">
                  <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                  Screen Rotation:
                </span>
                <span className="font-mono text-amber-300 font-bold">{screenRotation}°</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {([0, 90, 180, 270] as ScreenRotation[]).map((deg) => (
                  <button
                    key={deg}
                    onClick={() => handleSetRotation(deg)}
                    className={`py-1.5 text-[11px] font-bold rounded-lg border transition-colors cursor-pointer ${
                      screenRotation === deg
                        ? 'bg-amber-500 text-stone-950 border-amber-300 shadow'
                        : 'bg-stone-900 text-stone-300 border-stone-700 hover:bg-stone-800'
                    }`}
                  >
                    {deg}°
                  </button>
                ))}
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={() => engineRef.current?.togglePause()}
                className="w-full py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <Play className="w-4 h-4 fill-stone-950" />
                Resume Game
              </button>
              <button
                onClick={handleRestart}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-emerald-200 font-semibold rounded-lg border border-emerald-800/60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                Restart Level
              </button>
              <button
                onClick={handleToggleMute}
                className="w-full py-2.5 bg-stone-800 hover:bg-stone-700 text-emerald-200 font-semibold rounded-lg border border-emerald-800/60 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
                {isMuted ? 'Unmute Audio' : 'Mute Audio'}
              </button>
              <button
                onClick={handleReturnToTitle}
                className="w-full py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors cursor-pointer"
              >
                Quit to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* GAME OVER MODAL */}
      {gameState === 'gameover' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
          <div className="w-full max-w-sm bg-stone-900 border border-rose-900 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-rose-950/80 border border-rose-600 flex items-center justify-center text-3xl mb-3">
              🙈
            </div>
            <h2 className="text-2xl font-black text-rose-500 tracking-wide mb-1">MONKE DOWN!</h2>
            <p className="text-xs text-stone-400 mb-5">You tumbled into the jungle floor!</p>

            {/* Score Summary */}
            <div className="w-full bg-stone-950/70 p-3 rounded-lg border border-stone-800 mb-6 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Final Score</span>
                <span className="tabular-nums font-mono font-bold text-amber-300">{stats.score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Bananas Collected</span>
                <span className="tabular-nums font-mono text-emerald-400">{stats.bananas}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">All-Time Best</span>
                <span className="tabular-nums font-mono text-amber-400 font-bold">{highScore.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              <button
                onClick={handleRestart}
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-bold rounded-lg transition-transform hover:scale-102 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
              >
                <RotateCcw className="w-4 h-4" />
                Try Again
              </button>
              <button
                onClick={handleReturnToTitle}
                className="w-full py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VICTORY MODAL */}
      {gameState === 'victory' && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/75 pointer-events-auto">
          <div className="w-full max-w-sm bg-stone-900 border border-amber-500/80 p-6 rounded-2xl shadow-2xl flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-2 border-amber-400 flex items-center justify-center text-3xl mb-3 animate-bounce">
              👑
            </div>
            <h2 className="text-2xl font-black text-amber-400 tracking-wide mb-1">STAGE CLEARED!</h2>
            <p className="text-xs text-emerald-300 mb-5">You mastered the canopy swings!</p>

            {/* Score Summary */}
            <div className="w-full bg-stone-950/70 p-3 rounded-lg border border-stone-800 mb-6 flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Level Score</span>
                <span className="tabular-nums font-mono font-bold text-amber-300">{stats.score.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">Total Bananas</span>
                <span className="tabular-nums font-mono text-emerald-400">{stats.bananas}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-stone-400">All-Time Best</span>
                <span className="tabular-nums font-mono text-amber-400 font-bold">{highScore.toLocaleString()}</span>
              </div>
            </div>

            <div className="w-full flex flex-col gap-3">
              {selectedLevel < 3 && !isEndless ? (
                <button
                  onClick={handleNextLevel}
                  className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-400 text-stone-950 font-bold rounded-lg transition-transform hover:scale-102 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Play className="w-4 h-4 fill-stone-950" />
                  Next Level: {LEVELS[selectedLevel]?.name}
                </button>
              ) : (
                <button
                  onClick={() => handleStartGame(1, true)}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-400 text-stone-950 font-bold rounded-lg transition-transform hover:scale-102 flex items-center justify-center gap-2 cursor-pointer shadow-lg"
                >
                  <Trophy className="w-4 h-4" />
                  Play Endless Canopy Mode
                </button>
              )}
              <button
                onClick={handleRestart}
                className="w-full py-2 bg-stone-800 hover:bg-stone-700 text-emerald-200 text-xs font-semibold rounded-lg border border-emerald-800/60 transition-colors"
              >
                Replay Level
              </button>
              <button
                onClick={handleReturnToTitle}
                className="w-full py-2 text-xs text-stone-400 hover:text-stone-200 transition-colors"
              >
                Return to Title Screen
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
