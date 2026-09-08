import React from 'react';
import { Channel } from '../config/channels';
import { PlayerState } from '../services/audioService';
import { Play, Pause, Square } from 'lucide-react';
import { cn } from '../utils/cn';

interface MiniPlayerProps {
  currentChannel: Channel | null;
  playerState: PlayerState;
  onTogglePlay: () => void;
  onClick: () => void;
}

export const MiniPlayer: React.FC<MiniPlayerProps> = ({
  currentChannel,
  playerState,
  onTogglePlay,
  onClick
}) => {
  if (!currentChannel) return null;

  const isPlaying = playerState === 'playing';
  const isLoading = playerState === 'loading';

  return (
    <div 
      onClick={onClick}
      className="fixed bottom-0 left-0 right-0 p-3 z-50 animate-in slide-in-from-bottom-10 fade-in duration-300 pb-safe"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 12px) + 12px)' }}
    >
      <div className="bg-white/90 dark:bg-[#152C46]/80 backdrop-blur-xl border border-gray-200 dark:border-white/10 rounded-2xl p-2 flex items-center shadow-[0_-5px_20px_rgba(0,0,0,0.05)] dark:shadow-[0_-5px_20px_rgba(0,0,0,0.3)] cursor-pointer">
        {/* Cover */}
        <div className="relative w-10 h-10 rounded-lg overflow-hidden flex-shrink-0">
           <img src={currentChannel.logo} alt={currentChannel.name} className="w-full h-full object-cover" />
           {isPlaying && (
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-full h-full bg-blue-500/20 mix-blend-overlay animate-pulse" />
              </div>
           )}
        </div>

        {/* Info */}
        <div className="ml-3 flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{currentChannel.name}</h4>
          <p className="text-xs text-blue-600 dark:text-blue-400 truncate flex items-center">
             <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse mr-1.5" />
             Live Broadcast
          </p>
        </div>

        {/* Controls */}
        <div className="flex items-center space-x-2 px-2" onClick={e => e.stopPropagation()}>
          <button 
            onClick={onTogglePlay}
            className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-white/10 text-gray-900 dark:text-white hover:bg-gray-200 dark:hover:bg-white/20 transition-all active:scale-95"
          >
            {isLoading ? (
               <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-900 dark:border-white/20 dark:border-t-white rounded-full animate-spin" />
            ) : isPlaying ? (
               <Pause className="w-4 h-4 fill-gray-900 dark:fill-white" />
            ) : (
               <Play className="w-4 h-4 fill-gray-900 dark:fill-white ml-0.5" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
