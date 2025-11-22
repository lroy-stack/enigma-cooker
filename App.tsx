import React, { useState, useEffect } from 'react';
import GameScene from './components/GameScene';
import { GameStatus, GameState, EntityType, FURY_DURATION } from './types';
import { soundManager } from './utils/sound';

// --- Icons & SVG Components ---

const IconTomato = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12 2C8.13 2 5 5.13 5 9c0 2.38 1.19 4.47 3 5.74V17c0 1.66 1.34 3 3 3h2c1.66 0 3-1.34 3-3v-2.26c1.81-1.27 3-3.36 3-5.74 0-3.87-3.13-7-7-7zm0 12c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm4-5c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
    <path d="M12 22c-1.1 0-2-.9-2-2h4c0 1.1-.9 2-2 2z" opacity="0.5"/>
  </svg>
);

const IconCheese = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M12.5 3L5 15h15L12.5 3zM11 13a1 1 0 110-2 1 1 0 010 2zM13 8a1 1 0 110-2 1 1 0 010 2z" />
    <path d="M4.5 16l-2.5 5h20l-2.5-5H4.5z" opacity="0.8" />
  </svg>
);

const IconSteak = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M19.5 7.5c-1.1 0-2 .9-2 2 .55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1c0-1.1-.9-2-2-2s-2 .9-2 2 .9 2 2 2 2-.9 2-2c0-.3-.06-.59-.17-.85-.57-1.28-1.88-2.15-3.33-2.15-2.21 0-4 1.79-4 4 0 1.22.55 2.3 1.41 3.05L5.17 19.17c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0l7.41-7.41c.62.53 1.42.83 2.26.83 2.07 0 3.75-1.68 3.75-3.75S18.32 6.5 16.25 6.5c-.16 0-.32.02-.47.05.5-.32 1.09-.55 1.72-.55 1.66 0 3 1.34 3 3h1.5c0-2.48-2.02-4.5-4.5-4.5-1.36 0-2.58.6-3.41 1.54.64-1.28 1.97-2.04 3.41-2.04z" />
  </svg>
);

const IconSoundOn = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
  </svg>
);

const IconSoundOff = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
  </svg>
);

// --- Helper Components ---

const Button = ({ onClick, children, className = "", secondary = false }: any) => (
  <button 
    onClick={onClick}
    className={`
      relative overflow-hidden group
      px-8 py-4 rounded-full 
      font-fredoka font-bold text-xl uppercase tracking-wider
      shadow-[0_6px_0_rgb(0,0,0,0.2)] active:shadow-[0_2px_0_rgb(0,0,0,0.2)] active:translate-y-1
      transition-all duration-150
      flex items-center justify-center gap-2
      ${secondary 
        ? "bg-amber-400 text-amber-900 hover:bg-amber-300" 
        : "bg-gradient-to-br from-orange-500 to-red-600 text-white hover:from-orange-400 hover:to-red-500"
      }
      ${className}
    `}
  >
    {children}
  </button>
);

const Panel = ({ children, className = "" }: any) => (
  <div className={`bg-[#fff8e7] border-4 border-orange-200 rounded-3xl shadow-2xl p-8 ${className}`}>
    {children}
  </div>
);

// --- Main App ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.MENU,
    score: 0,
    speed: 0,
    ingredients: [],
    furyMode: false,
    furyTimer: 0
  });

  const [muted, setMuted] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  const toggleMute = () => {
    const newMuted = soundManager.toggleMute();
    setMuted(newMuted);
  };

  const startGame = () => {
    setGameState({
      status: GameStatus.PLAYING,
      score: 0,
      speed: 10,
      ingredients: [],
      furyMode: false,
      furyTimer: 0
    });
  };

  // Score Interpolation for smooth UI
  useEffect(() => {
    if (gameState.status !== GameStatus.PLAYING) return;
    const target = Math.floor(gameState.score);
    let animationFrameId: number;
    
    const animate = () => {
      setDisplayScore(prev => {
        if (Math.abs(target - prev) < 1) return target;
        return prev + (target - prev) * 0.1;
      });
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState.score, gameState.status]);

  return (
    <div className="relative w-full h-full bg-[#1a1a1a] overflow-hidden font-fredoka noselect">
      {/* 3D Scene Layer */}
      <div className="absolute inset-0 z-0">
        <GameScene gameState={gameState} setGameState={setGameState} />
      </div>

      {/* Global Overlay Gradient (Vignette) */}
      <div className="absolute inset-0 z-10 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_50%,rgba(0,0,0,0.4)_100%)]" />

      {/* --- HUD (Playing) --- */}
      <div 
        className={`absolute inset-0 z-20 pointer-events-none flex flex-col justify-between p-4 md:p-8 transition-opacity duration-500 ${
          gameState.status === GameStatus.PLAYING ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {/* Top Bar */}
        <div className="flex justify-between items-start">
          {/* Score Badge */}
          <div className="flex flex-col items-start gap-1">
             <div className="bg-white border-b-4 border-r-4 border-orange-200 rounded-2xl px-6 py-3 shadow-lg flex items-center gap-3 transform -rotate-2">
                <span className="text-orange-400 text-2xl">★</span>
                <div className="flex flex-col">
                   <span className="text-xs text-orange-900 font-bold uppercase tracking-widest leading-none">Score</span>
                   <span className="text-4xl font-black text-orange-600 leading-none tracking-tight w-24 text-center">
                     {Math.floor(displayScore).toString().padStart(4, '0')}
                   </span>
                </div>
             </div>
          </div>

          {/* Right Side: Ingredients & Fury */}
          <div className="flex flex-col items-end gap-4">
            {/* Ingredient Slots */}
            <div className="flex items-center gap-2 bg-black/20 backdrop-blur-sm p-2 rounded-full border border-white/20">
               {[0, 1, 2].map((i) => {
                 const item = gameState.ingredients[i];
                 return (
                   <div 
                    key={i} 
                    className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2 shadow-sm transition-all duration-300
                      ${item ? 'bg-white scale-110 border-orange-400' : 'bg-black/30 border-white/10'}
                    `}
                   >
                     {item === EntityType.ITEM_TOMATO && <IconTomato className="w-8 h-8 text-red-500 drop-shadow-md" />}
                     {item === EntityType.ITEM_CHEESE && <IconCheese className="w-8 h-8 text-yellow-400 drop-shadow-md" />}
                     {item === EntityType.ITEM_STEAK && <IconSteak className="w-8 h-8 text-red-900 drop-shadow-md" />}
                   </div>
                 );
               })}
            </div>

            {/* Fury Meter */}
            <div className={`transition-all duration-300 flex flex-col items-end ${gameState.furyMode ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-10'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-yellow-300 font-bold uppercase text-sm animate-pulse">Chef Fury!</span>
                  <span className="text-2xl">🔥</span>
                </div>
                <div className="w-48 h-4 bg-black/50 rounded-full overflow-hidden border-2 border-white/30 relative">
                   <div 
                      className="h-full bg-gradient-to-r from-yellow-400 to-red-600"
                      style={{ 
                        width: '100%',
                        animation: gameState.furyMode ? `shrink ${FURY_DURATION}s linear forwards` : 'none'
                      }}
                   />
                </div>
            </div>
          </div>
        </div>

        {/* Mobile Controls Hint */}
        <div className="w-full text-center pb-4 opacity-50 md:hidden animate-pulse">
          <p className="text-white text-sm font-bold text-shadow">Swipe to Move & Jump</p>
        </div>
      </div>

      {/* --- START MENU --- */}
      {gameState.status === GameStatus.MENU && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
          <Panel className="w-full max-w-md mx-4 text-center relative">
             {/* Sound Toggle (Corner) */}
             <button 
                onClick={toggleMute} 
                className="absolute top-4 right-4 p-2 rounded-full hover:bg-orange-100 text-orange-800 transition-colors"
             >
                {muted ? <IconSoundOff className="w-6 h-6" /> : <IconSoundOn className="w-6 h-6" />}
             </button>

             {/* Logo Area */}
             <div className="mb-8 mt-2">
                <div className="inline-block p-4 rounded-full bg-orange-100 mb-4 shadow-inner">
                   <span className="text-6xl filter drop-shadow-lg">👨‍🍳</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-black text-orange-600 tracking-tighter drop-shadow-sm transform -rotate-2">
                  CHEF
                  <br/>
                  <span className="text-orange-500">RUNNER</span>
                </h1>
                <p className="text-gray-500 font-bold mt-2 text-lg">Endless Kitchen Chaos</p>
             </div>

             {/* Buttons */}
             <div className="space-y-4">
                <Button onClick={startGame} className="w-full py-5 text-2xl">
                   <span className="mr-2">▶</span> Start Cooking
                </Button>
                
                <div className="flex justify-center gap-4 mt-6 text-orange-900/40 font-bold text-sm">
                  <span className="flex items-center gap-1">⬅️ Move</span>
                  <span className="flex items-center gap-1">⬆️ Jump</span>
                  <span className="flex items-center gap-1">➡️ Move</span>
                </div>
             </div>
          </Panel>
        </div>
      )}

      {/* --- GAME OVER --- */}
      {gameState.status === GameStatus.GAME_OVER && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-red-900/80 backdrop-blur-md animate-fade-in">
           <Panel className="w-full max-w-md mx-4 text-center border-red-200 bg-[#fff5f5] transform scale-100 animate-pop-in">
              <div className="mb-6">
                <span className="text-6xl block mb-2">💥</span>
                <h2 className="text-4xl font-black text-red-600 uppercase tracking-wide mb-1">Kitchen Closed!</h2>
                <p className="text-red-400 font-semibold">Too many accidents...</p>
              </div>

              <div className="bg-white rounded-xl p-6 mb-8 border-2 border-red-100 shadow-inner">
                 <div className="text-gray-400 text-sm font-bold uppercase tracking-wider mb-1">Final Score</div>
                 <div className="text-6xl font-black text-gray-800">{Math.floor(gameState.score)}</div>
              </div>

              <Button onClick={startGame} className="w-full">
                 Try Again ↺
              </Button>
           </Panel>
        </div>
      )}
      
      {/* CSS Animations for Keyframes */}
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pop-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-fade-in { animation: fade-in 0.3s ease-out; }
        .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        .text-shadow { text-shadow: 0 2px 4px rgba(0,0,0,0.5); }
      `}</style>
    </div>
  );
}