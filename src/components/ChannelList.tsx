import React, { useState } from 'react';
import { Channel, CATEGORIES, CHANNELS } from '../config/channels';
import { cn } from '../utils/cn';
import { Heart, Play, Pause, MoreVertical } from 'lucide-react';
import { PlayerState } from '../services/audioService';

interface ChannelListProps {
  currentChannel: Channel | null;
  playerState: PlayerState;
  onPlayChannel: (channel: Channel) => void;
  isLandscape?: boolean;
  favorites?: string[];
  toggleFavorite?: (id: string) => void;
  hiddenChannels?: string[];
}

export const ChannelList: React.FC<ChannelListProps> = ({
  currentChannel,
  playerState,
  onPlayChannel,
  isLandscape = false,
  favorites = [],
  toggleFavorite,
  hiddenChannels = []
}) => {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0]);

  const filteredChannels = CHANNELS.filter(c => {
    if (hiddenChannels.includes(c.id)) return false;
    if (activeCategory === 'Tất cả') return true;
    if (activeCategory === 'Yêu thích') return favorites.includes(c.id);
    return c.category === activeCategory;
  });

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (toggleFavorite) {
      toggleFavorite(id);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", isLandscape ? "pr-4 border-r border-gray-200 dark:border-white/10" : "")}>
      {/* Categories */}
      <div className="flex space-x-3 overflow-x-auto pb-4 pt-2 hide-scrollbar px-4 md:px-0">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              "whitespace-nowrap px-4 py-1.5 rounded-full text-sm font-medium transition-all duration-300",
              activeCategory === cat 
                ? "bg-blue-500 text-white shadow-[0_0_15px_rgba(47,141,255,0.4)]" 
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/5 dark:text-gray-400 dark:hover:bg-white/10"
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto hide-scrollbar pb-24 px-4 md:px-0 space-y-3 pt-2">
        {filteredChannels.map(channel => {
          const isActive = currentChannel?.id === channel.id;
          const isPlaying = isActive && playerState === 'playing';
          const isLoading = isActive && playerState === 'loading';

          return (
            <div
              key={channel.id}
              onClick={() => onPlayChannel(channel)}
              className={cn(
                "group relative flex items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 backdrop-blur-sm border",
                isActive 
                  ? "bg-blue-50 border-blue-200 dark:bg-white/10 dark:border-blue-500/30 shadow-[0_0_20px_rgba(47,141,255,0.15)]" 
                  : "bg-white border-gray-100 hover:bg-gray-50 dark:bg-white/5 dark:border-white/5 dark:hover:bg-white/10 dark:hover:border-white/10 shadow-sm dark:shadow-none"
              )}
            >
              {/* Thumbnail */}
              <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-gray-100 dark:bg-white/10 flex-shrink-0 flex items-center justify-center">
                <img src={channel.logo} alt={channel.name} className="w-full h-full object-cover" />
                
                {/* Play overlay / Equalizer indicator */}
                {isActive && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center backdrop-blur-[2px]">
                    {isLoading ? (
                      <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                    ) : isPlaying ? (
                       <div className="flex space-x-0.5 items-end h-4">
                         <div className="w-1 bg-white dark:bg-blue-400 animate-[bounce_0.8s_infinite_ease-in-out] rounded-t-sm" style={{ animationDelay: '0s', height: '100%' }} />
                         <div className="w-1 bg-white dark:bg-blue-400 animate-[bounce_0.8s_infinite_ease-in-out] rounded-t-sm" style={{ animationDelay: '0.2s', height: '60%' }} />
                         <div className="w-1 bg-white dark:bg-blue-400 animate-[bounce_0.8s_infinite_ease-in-out] rounded-t-sm" style={{ animationDelay: '0.4s', height: '80%' }} />
                       </div>
                    ) : (
                      <Play className="w-5 h-5 text-white fill-white" />
                    )}
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="ml-3 flex-1 min-w-0">
                <h3 className={cn("text-base font-semibold truncate transition-colors", isActive ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-white")}>
                  {channel.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{channel.description}</p>
              </div>

              {/* Actions */}
              <button 
                onClick={(e) => handleToggleFavorite(e, channel.id)}
                className="p-2 ml-2 text-gray-400 hover:text-pink-500 transition-colors"
              >
                <Heart className={cn("w-5 h-5 transition-all", favorites.includes(channel.id) && "fill-pink-500 text-pink-500 scale-110")} />
              </button>
            </div>
          );
        })}
        {filteredChannels.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            Không tìm thấy kênh nào
          </div>
        )}
      </div>
    </div>
  );
};
