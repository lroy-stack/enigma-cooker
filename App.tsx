import React, { useState, useEffect } from 'react';
import GameScene from './components/GameScene';
import { GameStatus, GameState, EntityType } from './types';

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    status: GameStatus.MENU,
    score: 0,
    speed: 0,
    ingredients: [],
    furyMode: false,
    furyTimer: 0
  });

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

  return (
    <div className="relative w-full h-full bg-stone-900 overflow-hidden font-sans noselect">
      {/* 3D Scene */}
      <div className="absolute inset-0 z-0">
        <GameScene gameState={gameState} setGameState={setGameState} />
      </div>

      {/* UI Layer */}
      <div className="absolute inset-0 z-10 pointer-events-none flex flex-col justify-between p-6">
        
        {/* Header / HUD */}
        {gameState.status === GameStatus.PLAYING && (
          <div className="flex justify-between items-start">
            <div className="bg-white/90 p-4 rounded-xl shadow-lg border-b-4 border-orange-500 backdrop-blur-sm">
              <div className="text-xs text-gray-500 uppercase font-bold tracking-wider">Score</div>
              <div className="text-4xl font-black text-orange-600">{Math.floor(gameState.score)}</div>
            </div>
            
            <div className="flex flex-col gap-2 items-end">
               {/* Ingredients HUD */}
               <div className="flex gap-2 bg-white/80 p-2 rounded-lg backdrop-blur-sm">
                  {[0,1,2].map(i => {
                      const item = gameState.ingredients[i];
                      let color = "bg-gray-200";
                      if (item === EntityType.ITEM_TOMATO) color = "bg-red-500";
                      if (item === EntityType.ITEM_CHEESE) color = "bg-yellow-400";
                      if (item === EntityType.ITEM_STEAK) color = "bg-red-900";
                      
                      return (
                          <div key={i} className={`w-8 h-8 rounded-full border-2 border-white shadow-sm ${color} transition-all duration-300`} />
                      );
                  })}
               </div>
               
               {gameState.furyMode && (
                 <div className="animate-pulse bg-red-600 text-white px-4 py-1 rounded-full font-bold text-sm uppercase shadow-lg border-2 border-yellow-400">
                    🔥 FURY MODE 🔥
                 </div>
               )}
            </div>
          </div>
        )}

        {/* Menus */}
        {gameState.status !== GameStatus.PLAYING && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[2px] pointer-events-auto">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center transform transition-all border-b-8 border-orange-600">
              <h1 className="text-5xl font-black text-orange-600 mb-2 tracking-tighter">CHEF RUNNER</h1>
              <p className="text-gray-500 mb-8 text-lg font-medium">Collect ingredients. Avoid the kitchen chaos!</p>
              
              {gameState.status === GameStatus.GAME_OVER && (
                 <div className="mb-8 p-4 bg-red-50 rounded-lg border border-red-100">
                    <div className="text-sm text-red-500 font-bold uppercase">Game Over</div>
                    <div className="text-4xl font-black text-gray-800">{Math.floor(gameState.score)} pts</div>
                 </div>
              )}

              <button 
                onClick={startGame}
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700 text-white text-xl font-bold py-4 px-8 rounded-xl shadow-lg transform hover:scale-105 transition-all active:scale-95"
              >
                {gameState.status === GameStatus.MENU ? "START COOKING" : "TRY AGAIN"}
              </button>
              
              <div className="mt-6 text-sm text-gray-400 flex justify-center gap-4">
                <span>⬅️ Move Left</span>
                <span>⬆️ Jump</span>
                <span>➡️ Move Right</span>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Controls Hint (Visible only during play on touch devices ideally, but kept simple here) */}
        {gameState.status === GameStatus.PLAYING && (
           <div className="text-center text-white/50 text-sm pb-4 font-medium md:hidden">
              Swipe to Move • Tap/Swipe Up to Jump
           </div>
        )}
      </div>
    </div>
  );
}