import { useEffect, useState } from 'react';
import { Channel, CHANNELS } from '../config/channels';
import { PlayerState, audioService } from '../services/audioService';

export function useAudioPlayer() {
  const [currentChannel, setCurrentChannel] = useState<Channel | null>(null);
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [volume, setVolume] = useState(1);
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('favorites');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [audioBoost, setAudioBoostState] = useState<number>(() => {
    return parseFloat(localStorage.getItem('audioBoost') || '1');
  });
  const [sleepTimerTimeLeft, setSleepTimerTimeLeft] = useState<number | null>(null);

  const [hiddenChannels, setHiddenChannels] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('hiddenChannels');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const toggleHiddenChannel = (id: string) => {
    setHiddenChannels(prev => {
      const newHidden = prev.includes(id) ? prev.filter(h => h !== id) : [...prev, id];
      localStorage.setItem('hiddenChannels', JSON.stringify(newHidden));
      return newHidden;
    });
  };

  useEffect(() => {
    audioService.setOnStateChange((state) => {
      setPlayerState(state);
    });

    // Auto-play on startup
    const lastChannelId = localStorage.getItem('lastPlayedChannel');
    if (lastChannelId) {
      const channel = CHANNELS.find(c => c.id === lastChannelId);
      if (channel) {
        setCurrentChannel(channel);
        audioService.play(channel);
      }
    }
  }, []);

  const setAudioBoost = (level: number) => {
    setAudioBoostState(level);
    localStorage.setItem('audioBoost', level.toString());
    audioService.setAudioBoost(level);
  };

  // Sleep Timer countdown effect
  useEffect(() => {
    if (sleepTimerTimeLeft === null) return;
    
    if (sleepTimerTimeLeft <= 0) {
      audioService.pause();
      setSleepTimerTimeLeft(null);
      return;
    }

    const interval = setInterval(() => {
      setSleepTimerTimeLeft(prev => prev !== null ? prev - 1 : null);
    }, 1000);

    return () => clearInterval(interval);
  }, [sleepTimerTimeLeft]);

  const setSleepTimer = (minutes: number) => {
    setSleepTimerTimeLeft(minutes * 60);
  };

  const clearSleepTimer = () => {
    setSleepTimerTimeLeft(null);
  };

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const newFavs = prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id];
      localStorage.setItem('favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const playChannel = (channel: Channel) => {
    setCurrentChannel(channel);
    localStorage.setItem('lastPlayedChannel', channel.id);
    audioService.play(channel);
  };

  const playNextChannel = () => {
    if (!currentChannel) return;
    const visibleChannels = CHANNELS.filter(c => !hiddenChannels.includes(c.id));
    if (visibleChannels.length === 0) return;
    
    const currentIndex = visibleChannels.findIndex(c => c.id === currentChannel.id);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % visibleChannels.length;
    playChannel(visibleChannels[nextIndex]);
  };

  const playPrevChannel = () => {
    if (!currentChannel) return;
    const visibleChannels = CHANNELS.filter(c => !hiddenChannels.includes(c.id));
    if (visibleChannels.length === 0) return;
    
    const currentIndex = visibleChannels.findIndex(c => c.id === currentChannel.id);
    const prevIndex = currentIndex === -1 ? 0 : (currentIndex - 1 < 0 ? visibleChannels.length - 1 : currentIndex - 1);
    playChannel(visibleChannels[prevIndex]);
  };

  const togglePlay = () => {
    audioService.togglePlay();
  };

  const changeVolume = (val: number) => {
    setVolume(val);
    audioService.setVolume(val);
  };

  return {
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
    analyser: audioService.analyser,
    sleepTimerTimeLeft,
    setSleepTimer,
    clearSleepTimer,
    audioBoost,
    setAudioBoost
  };
}

