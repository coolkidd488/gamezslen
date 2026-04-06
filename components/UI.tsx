
import React from 'react';
import { GameStatus } from '../types';

interface UIProps {
  status: GameStatus;
  pages: number;
  message: string;
  deathNote: string;
  onStart: () => void;
  flashlightOn: boolean;
  toggleFlashlight: () => void;
  nearestPageAngle: number | null;
}

const UI: React.FC<UIProps> = ({ status, pages, message, deathNote, onStart, flashlightOn, nearestPageAngle }) => {
  
  if (status === GameStatus.MENU) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 z-40 p-6 text-center">
        <h1 className="text-6xl md:text-8xl font-bold tracking-[0.2em] mb-4 text-zinc-100 uppercase opacity-90 drop-shadow-2xl">SLENDER</h1>
        <p className="text-zinc-500 max-w-md mb-12 uppercase tracking-widest text-xs leading-relaxed opacity-60">
          A floresta está fria. As páginas chamam.<br/>Não olhe para ele.
        </p>
        <button 
          onClick={onStart}
          className="border border-zinc-800 hover:border-zinc-200 hover:bg-zinc-100 hover:text-black transition-all px-12 py-4 uppercase tracking-[0.3em] text-lg bg-black cursor-pointer"
        >
          Entrar na Floresta
        </button>
        <div className="mt-8 text-[10px] text-zinc-700 uppercase tracking-widest space-y-2">
          <p>Controles: WASD para Mover</p>
          <p>F: Lanterna | G: Pausar/Menu</p>
          <p>Clique na tela para capturar o mouse</p>
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black z-50 text-center p-8">
        <div className="w-full h-full absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />
        <h2 className="text-5xl font-bold mb-8 text-red-900 uppercase tracking-tighter">O FIM</h2>
        <p className="text-zinc-500 italic mb-12 max-w-lg text-sm">"{deathNote || 'Ele estava sempre observando.'}"</p>
        <button 
          onClick={onStart}
          className="border border-red-950 text-red-900 px-10 py-3 uppercase tracking-widest hover:bg-red-950 hover:text-white transition-colors cursor-pointer"
        >
          Recomeçar
        </button>
      </div>
    );
  }

  if (status === GameStatus.VICTORY) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 z-50 text-center p-8">
        <h2 className="text-6xl font-bold mb-4 text-black uppercase tracking-tighter">SOBREVIVENTE</h2>
        <p className="text-zinc-700 mb-12 uppercase tracking-widest text-sm">Você coletou as 8 páginas e escapou do olhar.</p>
        <button 
          onClick={onStart}
          className="bg-black text-white px-10 py-3 uppercase tracking-widest hover:bg-zinc-800 transition-colors cursor-pointer"
        >
          Voltar para a Floresta
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-30 p-10 flex flex-col justify-between">
      {/* Top HUD */}
      <div className="flex justify-between items-start">
        <div className="flex items-center space-x-4">
          <div className="space-y-1">
            <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Páginas Encontradas</div>
            <div className="text-3xl font-black tracking-tighter text-zinc-200">
              {pages}<span className="text-zinc-700 mx-1">/</span>8
            </div>
          </div>
          
          {/* Compass Arrow */}
          {nearestPageAngle !== null && (
            <div className="flex flex-col items-center justify-center pt-4">
              <div 
                className="w-6 h-6 flex items-center justify-center transition-transform duration-75 ease-linear"
                style={{ transform: `rotate(${-nearestPageAngle * (180 / Math.PI)}deg)` }}
              >
                <svg viewBox="0 0 24 24" className="w-full h-full text-red-800 fill-current">
                  <path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71z" />
                </svg>
              </div>
              <div className="text-[8px] text-red-950 uppercase font-bold tracking-tighter mt-1">PÁGINA</div>
            </div>
          )}
        </div>

        <div className="text-right">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest font-bold">Bateria</div>
          <div className={`text-xs uppercase font-black tracking-widest ${flashlightOn ? 'text-green-800' : 'text-zinc-800'}`}>
            {flashlightOn ? 'Ativa' : 'Desligada'}
          </div>
        </div>
      </div>

      {/* Cryptic Message */}
      {message && (
        <div className="flex items-center justify-center pb-20">
          <div className="text-xl md:text-3xl font-black uppercase tracking-[0.4em] text-white animate-pulse text-center drop-shadow-lg">
            {message}
          </div>
        </div>
      )}

      {/* Center Prompt (Only visible if flashlight is off) */}
      {!flashlightOn && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-zinc-800 text-[10px] uppercase tracking-widest">
          Escuridão... [F]
        </div>
      )}
    </div>
  );
};

export default UI;
