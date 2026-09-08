import React, { useState } from 'react';
import { Channel } from '../config/channels';
import { PlayerState } from '../services/audioService';
import { Visualizer } from './Visualizer';
import { SleepTimerModal } from './SleepTimerModal';
import { Play, Pause, Volume2, VolumeX, Heart, RadioReceiver, ChevronDown, Clock, MoreVertical, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '../utils/cn';

interface NowPlayingProps {
  currentChannel: Channel | null;
  playerState: PlayerState;
  volume: number;
  onTogglePlay: () => void;
  onChangeVolume: (v: number) => void;
  isExpanded: boolean;
  onClose: () => void;
  isLandscape?: boolean;
  sleepTimerTimeLeft?: number | null;
  setSleepTimer?: (minutes: number) => void;
  clearSleepTimer?: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  favorites?: string[];
  toggleFavorite?: (id: string) => void;
}

export const NowPlaying: React.FC<NowPlayingProps> = ({
  currentChannel,
  playerState,
  volume,
  onTogglePlay,
  onChangeVolume,
  isExpanded,
  onClose,
  isLandscape = false,
  sleepTimerTimeLeft = null,
  setSleepTimer,
  clearSleepTimer,
  onNextChannel,
  onPrevChannel,
  favorites = [],
  toggleFavorite
}) => {
  const [isMuted, setIsMuted] = useState(false);
  const [isSleepTimerOpen, setIsSleepTimerOpen] = useState(false);

  if (!currentChannel) return null;

  const isFavorite = favorites.includes(currentChannel.id);
  const handleToggleFavorite = () => {
    if (toggleFavorite) {
      toggleFavorite(currentChannel.id);
    }
  };

  const isPlaying = playerState === 'playing';
  const isLoading = playerState === 'loading';

  const handleVolumeToggle = () => {
    if (isMuted) {
      onChangeVolume(1);
      setIsMuted(false);
    } else {
      onChangeVolume(0);
      setIsMuted(true);
    }
  };

  // If we're not landscape and not expanded, we don't render (handled by parent or CSS)
  if (!isLandscape && !isExpanded) return null;

  return (
    <div className={cn(
      "flex flex-col items-center justify-between h-full bg-gray-50 dark:bg-gradient-to-b dark:from-[#0F2238] dark:to-[#07131F] transition-colors duration-300",
      isLandscape ? "px-8 py-6 w-full !bg-transparent" : "fixed inset-0 z-50 px-6 pb-8 pt-safe"
    )}>
      {/* Top Header - Only in Portrait */}
      {!isLandscape && (
        <div className="w-full flex items-center justify-between">
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:text-white/70 dark:hover:text-white transition-colors">
            <ChevronDown className="w-8 h-8" />
          </button>
          <div className="flex flex-col items-center">
            <span className="text-xs font-semibold text-gray-400 dark:text-white/50 tracking-widest uppercase">Đang phát từ</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white/90">{currentChannel.category}</span>
          </div>
          <button className="p-2 text-gray-500 hover:text-gray-900 dark:text-white/70 dark:hover:text-white transition-colors">
            <MoreVertical className="w-6 h-6" />
          </button>
        </div>
      )}

      {/* Center Art & Visualizer */}
      <div className={cn(
        "relative flex flex-col items-center justify-center w-full flex-1",
        isLandscape ? "my-0" : "my-8"
      )}>
        {/* Visualizer Background Container */}
        <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
           <Visualizer isActive={isPlaying} isLandscape={isLandscape} />
        </div>

        {/* Artwork Ring */}
        <div className="relative z-10">
          <div className={cn(
            "rounded-full p-2 transition-all duration-700",
            isPlaying ? "bg-blue-100 dark:bg-blue-500/20 animate-pulse shadow-[0_0_50px_rgba(47,141,255,0.4)]" : "bg-gray-200/50 dark:bg-white/5"
          )}>
            <div className={cn(
              "rounded-full p-1 border border-gray-100 dark:border-white/10 transition-all duration-700",
              isPlaying ? "bg-white dark:bg-[#1A365D]" : "bg-transparent"
            )}>
              <div className={cn(
                "rounded-full overflow-hidden bg-white dark:bg-[#07131F] relative shadow-2xl transition-all duration-700 border border-gray-100 dark:border-none",
                isLandscape ? "w-56 h-56 lg:w-64 lg:h-64" : "w-64 h-64 md:w-80 md:h-80"
              )}>
                <img 
                  src={currentChannel.logo} 
                  alt={currentChannel.name} 
                  className={cn(
                    "w-full h-full object-cover transition-transform duration-[20s] ease-linear",
                    isPlaying ? "scale-110" : "scale-100"
                  )} 
                />
                {/* Glossy overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info & Controls */}
      <div className="w-full z-10 flex flex-col items-center max-w-md mx-auto">
        
        {/* Title */}
        <div className="w-full flex items-center justify-between mb-6">
          <div className="flex-1 min-w-0 pr-4 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate w-full">{currentChannel.name}</h2>
            <p className="text-blue-600 dark:text-blue-400 mt-1 flex items-center justify-center">
              <RadioReceiver className="w-4 h-4 mr-1.5" />
              Chương trình trực tiếp
            </p>
          </div>
        </div>

        {/* Live Progress Bar (Dummy for radio) */}
        <div className="w-full mb-8">
           <div className="h-1.5 w-full bg-gray-200 dark:bg-white/10 rounded-full overflow-hidden">
             {isPlaying ? (
               <div className="h-full bg-blue-500 rounded-full w-full relative">
                 <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]" />
               </div>
             ) : (
               <div className="h-full bg-blue-500/30 rounded-full w-full" />
             )}
           </div>
           <div className="flex justify-between text-xs text-gray-500 dark:text-white/50 mt-2 font-medium tracking-wide">
             <span className="flex items-center text-red-500 dark:text-red-400"><span className="w-2 h-2 rounded-full bg-red-500 mr-1.5 animate-pulse" /> LIVE</span>
             <span>--:--</span>
           </div>
        </div>

        {/* Primary Controls */}
        <div className="w-full flex items-center justify-between mb-8 px-4">
          <button className="text-gray-400 hover:text-gray-900 dark:text-white/50 dark:hover:text-white transition-colors" onClick={handleToggleFavorite}>
            <Heart className={cn("w-7 h-7 transition-transform", isFavorite && "fill-pink-500 text-pink-500 scale-110")} />
          </button>
          
          <div className="flex items-center space-x-6">
            <button 
              onClick={onPrevChannel}
              className="text-gray-500 hover:text-gray-900 dark:text-white/70 dark:hover:text-white transition-colors active:scale-95"
            >
              <SkipBack className="w-7 h-7 fill-current" />
            </button>
            
            <button 
              onClick={onTogglePlay}
              className="w-20 h-20 flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_30px_rgba(47,141,255,0.4)] transition-all active:scale-95 group relative"
            >
              <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out" />
              {isLoading ? (
                <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-8 h-8 fill-white relative z-10" />
              ) : (
                <Play className="w-8 h-8 fill-white relative z-10 ml-1" />
              )}
            </button>

            <button 
              onClick={onNextChannel}
              className="text-gray-500 hover:text-gray-900 dark:text-white/70 dark:hover:text-white transition-colors active:scale-95"
            >
               <SkipForward className="w-7 h-7 fill-current" />
            </button>
          </div>

          <button 
            onClick={() => setIsSleepTimerOpen(true)}
            className={cn(
              "hover:text-gray-900 dark:hover:text-white transition-colors active:scale-95", 
              sleepTimerTimeLeft !== null ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-white/70"
            )}
          >
            <Clock className={cn("w-7 h-7", sleepTimerTimeLeft !== null && "fill-blue-600/20 dark:fill-blue-400/20")} />
          </button>
        </div>

        {/* Volume & Bottom Actions */}
        <div className="w-full flex items-center space-x-3 px-2">
           <button onClick={handleVolumeToggle} className="text-gray-500 hover:text-gray-900 dark:text-white/60 dark:hover:text-white">
             {volume === 0 || isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
           </button>
           <input 
             type="range" 
             min="0" 
             max="1" 
             step="0.01" 
             value={isMuted ? 0 : volume}
             onChange={(e) => {
               onChangeVolume(parseFloat(e.target.value));
               if (isMuted) setIsMuted(false);
             }}
             className="flex-1 h-1 bg-gray-300 dark:bg-white/20 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:bg-gray-600 dark:[&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full"
           />
        </div>

      </div>

      <SleepTimerModal 
        isOpen={isSleepTimerOpen} 
        onClose={() => setIsSleepTimerOpen(false)}
        timeLeft={sleepTimerTimeLeft}
        setTimer={setSleepTimer || (() => {})}
        clearTimer={clearSleepTimer || (() => {})}
      />
    </div>
  );
};
