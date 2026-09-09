import React, { useState } from 'react';
import { Channel } from '../config/channels';
import { PlayerState } from '../services/audioService';
import { Visualizer } from './Visualizer';
import { SleepTimerModal } from './SleepTimerModal';
import { Play, Pause, Volume2, VolumeX, Heart, RadioReceiver, ChevronDown, Clock, MoreVertical, SkipBack, SkipForward } from 'lucide-react';
import { cn } from '../utils/cn';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface NowPlayingProps {
  currentChannel: Channel | null;
  playerState: PlayerState;
  volume: number;
  onTogglePlay: () => void;
  onChangeVolume: (v: number) => void;
  isExpanded: boolean;
  onClose?: () => void;
  isLandscape?: boolean;
  sleepTimerTimeLeft?: number | null;
  setSleepTimer?: (minutes: number) => void;
  clearSleepTimer?: () => void;
  onNextChannel?: () => void;
  onPrevChannel?: () => void;
  favorites?: string[];
  toggleFavorite?: (id: string) => void;
}

import { SpectrumVisualizer } from './SpectrumVisualizer';

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
  const isShort = useMediaQuery('(max-height: 550px)');
  const isTabletSplit = !onClose;

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
      "flex items-center justify-between h-full bg-gray-50 dark:bg-gradient-to-b dark:from-[#0F2238] dark:to-[#07131F] transition-colors duration-300 relative",
      isTabletSplit
        ? "flex-col px-8 py-8 w-full h-full !bg-transparent overflow-y-auto hide-scrollbar"
        : (isLandscape 
            ? "flex-row px-6 py-4 w-full h-full gap-6 justify-evenly items-center !bg-transparent overflow-hidden"
            : "fixed inset-0 z-50 px-6 pb-8 pt-safe flex-col landscape:flex-row landscape:justify-evenly landscape:gap-8 overflow-y-auto")
    )}>
      {/* Back / Minimize Button - Displayed in both portrait & landscape if onClose is provided (mobile overlay) */}
      {onClose && (
        <div className="absolute top-4 left-4 z-50">
          <button 
            onClick={onClose} 
            className="p-2 rounded-full bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/20 text-gray-600 dark:text-white/80 transition-all active:scale-90"
          >
            <ChevronDown className="w-7 h-7" />
          </button>
        </div>
      )}

      {/* Center Art & Visualizer */}
      <div className={cn(
        "relative flex flex-col items-center justify-center w-full flex-1",
        isTabletSplit
          ? "my-4 min-h-[200px] max-h-[300px]"
          : (isLandscape 
              ? "my-0 max-w-[45%] shrink-0 h-full" 
              : "my-8 landscape:my-0 landscape:flex-1 landscape:max-w-[50vw]")
      )}>
        {/* Visualizer Background Container */}
        <div className="absolute inset-0 z-0 pointer-events-none">
           <Visualizer isActive={isPlaying} isLandscape={isTabletSplit ? false : isLandscape} />
        </div>

        {/* Artwork Ring with slow floating animation */}
        <div className="relative z-10 animate-float">
          <div className={cn(
            "rounded-full p-2.5 transition-all duration-700 backdrop-blur-md border border-white/10 shadow-2xl",
            isPlaying 
              ? "bg-violet-500/10 dark:bg-violet-500/15 shadow-[0_0_60px_rgba(139,92,246,0.25)]" 
              : "bg-gray-200/40 dark:bg-white/5"
          )}>
            <div className={cn(
              "rounded-full p-1.5 border border-gray-100 dark:border-white/10 transition-all duration-700",
              isPlaying ? "bg-white/90 dark:bg-slate-900/90" : "bg-transparent"
            )}>
              <div className={cn(
                "rounded-full overflow-hidden bg-white dark:bg-[#07131F] relative shadow-2xl transition-all duration-700 border border-gray-100 dark:border-none",
                isTabletSplit
                  ? "w-44 h-44 sm:w-52 sm:h-52 md:w-56 md:h-56"
                  : (isLandscape 
                      ? (isShort ? "w-36 h-36 md:w-40 md:h-40" : "w-56 h-56 lg:w-64 lg:h-64") 
                      : "w-64 h-64 md:w-80 md:h-80 landscape:w-56 landscape:h-56 landscape:md:w-64 landscape:md:h-64")
              )}>
                {/* Slow linear rotation wrapper */}
                <div 
                  className="w-full h-full animate-spin-slow"
                  style={{
                    animationPlayState: isPlaying ? 'running' : 'paused'
                  }}
                >
                  <img 
                    src={currentChannel.logo} 
                    alt={currentChannel.name} 
                    className={cn(
                      "w-full h-full object-cover transition-transform duration-[2s] ease-out",
                      isPlaying ? "scale-110" : "scale-100"
                    )} 
                  />
                </div>
                {/* Glossy glass reflection overlay */}
                <div className="absolute inset-0 bg-gradient-to-tr from-black/40 via-transparent to-white/15 pointer-events-none" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info & Controls */}
      <div className={cn(
        "w-full z-10 flex flex-col items-center max-w-md mx-auto",
        isTabletSplit
          ? "flex-1 w-full justify-evenly h-full"
          : (isLandscape 
              ? "flex-1 min-w-0 max-w-sm py-2 justify-evenly h-full" 
              : "landscape:max-w-none landscape:flex-1 landscape:pt-6")
      )}>
        
        {/* Title */}
        <div className={cn("w-full flex items-center justify-between", isTabletSplit ? "mb-0" : (isLandscape ? "mb-0" : (isShort ? "mb-2" : "mb-6")))}>
          <div className="flex-1 min-w-0 pr-4 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white truncate w-full">{currentChannel.name}</h2>
            <div className="mt-1 flex items-center justify-center text-red-500 dark:text-red-400 font-medium tracking-widest text-xs uppercase">
              <span className="w-2 h-2 rounded-full bg-red-500 mr-2 animate-pulse" /> 
              LIVE
            </div>
          </div>
        </div>

        {/* Live Visualizer Area - Only in Portrait or Tablet Split */}
        {(!isLandscape || isTabletSplit) && (
          <div className={cn("w-full relative", isTabletSplit ? "mb-4 h-12" : (isShort ? "mb-3 h-10" : "mb-8 h-14"))}>
             {/* Visualizer extends upwards from bottom. H-14 gives it enough space to reach the channel title bottom */}
             <div className={cn("absolute bottom-0 left-0 w-full z-0 opacity-90 mix-blend-screen", isTabletSplit ? "h-12" : (isShort ? "h-10" : "h-14"))}>
               <SpectrumVisualizer isActive={isPlaying} />
             </div>
          </div>
        )}

        {/* Primary Controls */}
        <div className={cn("w-full flex items-center justify-between px-4", isTabletSplit ? "mb-4" : (isLandscape ? "mb-0" : (isShort ? "mb-4" : "mb-8")))}>
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
              className={cn("flex items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_30px_rgba(47,141,255,0.4)] transition-all active:scale-95 group relative", isTabletSplit ? "w-16 h-16 sm:w-20 sm:h-20" : (isShort ? "w-14 h-14" : "w-20 h-20"))}
            >
              <div className="absolute inset-0 rounded-full bg-white/20 scale-0 group-hover:scale-100 transition-transform duration-300 ease-out" />
              {isLoading ? (
                <div className="w-6 h-6 border-3 border-white/20 border-t-white rounded-full animate-spin" />
              ) : isPlaying ? (
                <Pause className={cn("fill-white relative z-10", isTabletSplit ? "w-7 h-7" : (isShort ? "w-6 h-6" : "w-8 h-8"))} />
              ) : (
                <Play className={cn("fill-white relative z-10 ml-1", isTabletSplit ? "w-7 h-7" : (isShort ? "w-6 h-6" : "w-8 h-8"))} />
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

        {/* Volume & Bottom Actions - Only in Portrait or Tablet Split */}
        {(!isLandscape || isTabletSplit) && (
          <div className="w-full flex items-center space-x-3 px-2 mt-2">
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
        )}

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
