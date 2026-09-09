/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Channel } from './config/channels';
import { useAudioPlayer } from './hooks/useAudioPlayer';
import { useMediaQuery } from './hooks/useMediaQuery';
import { useTheme } from './hooks/useTheme';
import { ChannelList } from './components/ChannelList';
import { MiniPlayer } from './components/MiniPlayer';
import { NowPlaying } from './components/NowPlaying';
import { SettingsModal } from './components/SettingsModal';
import { Settings } from 'lucide-react';
import { cn } from './utils/cn';

export default function App() {
  const { 
    currentChannel, 
    playerState, 
    volume, 
    favorites,
    toggleFavorite,
    hiddenChannels,
    toggleHiddenChannel,
    playChannel, 
    playNextChannel,
    playPrevChannel,
    togglePlay, 
    changeVolume,
    sleepTimerTimeLeft,
    setSleepTimer,
    clearSleepTimer,
    audioBoost,
    setAudioBoost
  } = useAudioPlayer();
  const isLandscape = useMediaQuery('(min-width: 768px) and (orientation: landscape), (min-width: 1024px)');
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const { theme, setTheme } = useTheme();

  return (
    <div className="w-full h-[100dvh] bg-gray-50 dark:bg-[#07131F] overflow-hidden text-gray-900 dark:text-white font-sans selection:bg-blue-500/30 flex flex-col md:flex-row relative transition-colors duration-300">
      
      {/* Left / Main Content Area */}
      <div className={cn(
        "flex flex-col h-full transition-colors duration-300",
        isLandscape ? "w-2/5 max-w-sm shrink-0 bg-white dark:bg-[#0A1828] border-r border-gray-200 dark:border-transparent" : "w-full"
      )}>
        
        {/* Header */}
        <div className="pt-safe px-6 pb-6 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
               <span className="font-bold text-white tracking-wider">FM</span>
             </div>
             <div>
               <h1 className="font-bold text-lg leading-tight text-gray-900 dark:text-white">FM Radio</h1>
               <p className="text-[10px] text-blue-600 dark:text-blue-400 font-medium uppercase tracking-widest">Việt Nam</p>
             </div>
          </div>
          
          <div className="flex items-center space-x-3 text-gray-500 dark:text-white/70">
            <div className="px-2 flex items-center justify-center">
               <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 900 600" className="w-7 h-5 rounded-[2px] shadow-sm">
                 <rect fill="#da251d" width="900" height="600"/>
                 <polygon fill="#ff0" points="450,113 548,414 292,228 608,228 352,414"/>
               </svg>
            </div>
            <button className="p-2 hover:text-gray-900 dark:hover:text-white transition-colors" onClick={() => setIsSettingsOpen(true)}>
               <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Channel List */}
        <div className="flex-1 overflow-hidden">
          <ChannelList 
             currentChannel={currentChannel} 
             playerState={playerState} 
             onPlayChannel={playChannel} 
             isLandscape={isLandscape}
             favorites={favorites}
             toggleFavorite={toggleFavorite}
             hiddenChannels={hiddenChannels}
          />
        </div>

      </div>

      {/* Right Content Area (Landscape Only) */}
      {isLandscape && (
         <div className="flex-1 h-full bg-gray-100 dark:bg-gradient-to-br dark:from-[#0F2238] dark:to-[#07131F] flex items-center justify-center relative overflow-hidden shadow-[-10px_0_30px_rgba(0,0,0,0.05)] dark:shadow-[-10px_0_30px_rgba(0,0,0,0.3)] z-10 transition-colors duration-300">
            {currentChannel ? (
               <NowPlaying 
                 currentChannel={currentChannel}
                 playerState={playerState}
                 volume={volume}
                 onTogglePlay={togglePlay}
                 onChangeVolume={changeVolume}
                 isExpanded={true}
                 onClose={() => {}}
                 isLandscape={true}
                 sleepTimerTimeLeft={sleepTimerTimeLeft}
                 setSleepTimer={setSleepTimer}
                 clearSleepTimer={clearSleepTimer}
                 onNextChannel={playNextChannel}
                 onPrevChannel={playPrevChannel}
                 favorites={favorites}
                 toggleFavorite={toggleFavorite}
               />
            ) : (
               <div className="flex flex-col items-center justify-center text-gray-400 dark:text-white/30">
                 <div className="w-24 h-24 rounded-full border border-gray-300 dark:border-white/10 flex items-center justify-center mb-4 transition-colors">
                   <span className="text-2xl font-bold tracking-widest">FM</span>
                 </div>
                 <p className="font-medium tracking-wide">Chọn một kênh để phát</p>
               </div>
            )}
         </div>
      )}

      {/* Portrait Floating UI */}
      {!isLandscape && currentChannel && (
        <>
          {/* Mini Player */}
          <div className={cn(
            "transition-all duration-500 ease-in-out",
            isPlayerExpanded ? "opacity-0 pointer-events-none translate-y-20" : "opacity-100 translate-y-0"
          )}>
            <MiniPlayer 
              currentChannel={currentChannel}
              playerState={playerState}
              onTogglePlay={togglePlay}
              onClick={() => setIsPlayerExpanded(true)}
            />
          </div>

          {/* Full Screen Player */}
          <div className={cn(
            "fixed inset-0 z-40 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] bg-white dark:bg-[#07131F]",
            isPlayerExpanded ? "translate-y-0" : "translate-y-full"
          )}>
             <NowPlaying 
                 currentChannel={currentChannel}
                 playerState={playerState}
                 volume={volume}
                 onTogglePlay={togglePlay}
                 onChangeVolume={changeVolume}
                 isExpanded={isPlayerExpanded}
                 onClose={() => setIsPlayerExpanded(false)}
                 isLandscape={false}
                 sleepTimerTimeLeft={sleepTimerTimeLeft}
                 setSleepTimer={setSleepTimer}
                 clearSleepTimer={clearSleepTimer}
                 onNextChannel={playNextChannel}
                 onPrevChannel={playPrevChannel}
                 favorites={favorites}
                 toggleFavorite={toggleFavorite}
               />
          </div>
        </>
      )}

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        theme={theme} 
        setTheme={setTheme} 
        audioBoost={audioBoost}
        setAudioBoost={setAudioBoost}
        hiddenChannels={hiddenChannels}
        toggleHiddenChannel={toggleHiddenChannel}
      />
    </div>
  );
}
