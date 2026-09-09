import Hls from 'hls.js';
import { Channel, getStreamUrlFallback } from '../config/channels';
import { Capacitor } from '@capacitor/core';

export type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

class AudioService {
  public audio: HTMLAudioElement;
  private hls: Hls | null = null;
  
  public audioContext: AudioContext | null = null;
  public analyser: AnalyserNode | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private boostNode: GainNode | null = null;
  
  private currentChannel: Channel | null = null;
  private retryCount = 0;
  private retryDelays = [1000, 3000, 5000, 10000, 15000, 30000, 60000];
  private retryTimeout: any = null;

  private wakeLockAudio: HTMLAudioElement;
  private onStateChangeCallback: ((state: PlayerState) => void) | null = null;
  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;
  private state: PlayerState = 'idle';
  private isIntentionalPause: boolean = true;
  private backgroundMode: any = null;

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    this.audio.preload = 'auto';
    
    // Background execution wakelock hack for Web Audio API
    this.wakeLockAudio = new Audio('/silence.wav');
    this.wakeLockAudio.loop = true;

    this.setupAudioListeners();
    this.setupVisibilityListener();
    this.initBackgroundMode();
  }

  private async initBackgroundMode() {
    if (Capacitor.isNativePlatform()) {
      try {
        const { BackgroundMode } = await import('@anuradev/capacitor-background-mode');
        this.backgroundMode = BackgroundMode;
        await this.backgroundMode.enable();
        await this.backgroundMode.setSettings({
          title: 'FM Radio Việt Nam',
          text: 'Đang chạy ngầm',
          subText: 'Chạm để mở lại',
          silent: true,
          resume: true,
          hidden: false,
          disableWebViewOptimization: true,
          allowClose: false
        });
        await this.backgroundMode.disableWebViewOptimizations();
      } catch (e) {
        console.warn('Failed to initialize background mode:', e);
      }
    }
  }

  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.isIntentionalPause && this.currentChannel) {
          // Attempt to resume playback if the user returns to the app and didn't intentionally pause it
          this.audio.play().then(() => {
            this.wakeLockAudio.play().catch(e => console.warn(e));
          }).catch(e => console.warn('Auto-resume failed:', e));
        }
      });
    }
  }

  public setOnStateChange(cb: (state: PlayerState) => void) {
    this.onStateChangeCallback = cb;
  }

  public setMediaSessionCallbacks(onNext: () => void, onPrev: () => void) {
    this.onNextCallback = onNext;
    this.onPrevCallback = onPrev;
    if ('mediaSession' in navigator) {
      try {
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          if (this.onNextCallback) this.onNextCallback();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          if (this.onPrevCallback) this.onPrevCallback();
        });
      } catch (e) {
        console.warn('MediaSession API next/prev not supported', e);
      }
    }
  }

  public setAudioBoost(level: number) {
    if (this.boostNode) {
      this.boostNode.gain.setValueAtTime(level, this.audioContext?.currentTime || 0);
    }
  }

  private setState(newState: PlayerState) {
    this.state = newState;
    if ('mediaSession' in navigator) {
      if (newState === 'playing' || newState === 'loading') {
        navigator.mediaSession.playbackState = 'playing';
      } else if (newState === 'paused' || newState === 'idle' || newState === 'error') {
        navigator.mediaSession.playbackState = 'paused';
      }
    }
    if (this.backgroundMode) {
      let text = 'Đang chạy ngầm';
      if (newState === 'playing' && this.currentChannel) {
        text = `Đang phát: ${this.currentChannel.name}`;
      } else if (newState === 'paused') {
        text = 'Đã tạm dừng';
      } else if (newState === 'loading') {
        text = 'Đang tải kênh...';
      } else if (newState === 'error') {
        text = 'Lỗi kết nối';
      }
      this.backgroundMode.setSettings({ text }).catch(() => {});
    }
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(this.state);
    }
  }

  public getState() {
    return this.state;
  }

  private setupAudioListeners() {
    this.audio.addEventListener('playing', () => {
      this.setState('playing');
      this.retryCount = 0; // reset retry on success
    });
    this.audio.addEventListener('waiting', () => {
      if (this.state !== 'error') this.setState('loading');
    });
    this.audio.addEventListener('pause', () => {
      if (this.state !== 'error' && this.state !== 'loading') {
         this.setState('paused');
      }
    });
    this.audio.addEventListener('error', () => this.handleError());
  }

  public initWebAudio() {
    if (this.audioContext) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;
      
      this.boostNode = this.audioContext.createGain();
      this.boostNode.gain.value = 1;
      
      this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
      
      this.sourceNode.connect(this.boostNode);
      this.boostNode.connect(this.analyser);
      this.analyser.connect(this.audioContext.destination);
      
      const savedBoost = localStorage.getItem('audioBoost');
      if (savedBoost) {
        this.setAudioBoost(parseFloat(savedBoost));
      }
    } catch (e) {
      console.warn('Web Audio API initialization failed:', e);
    }
  }

  private handleError() {
    this.setState('error');
    if (this.retryCount < this.retryDelays.length) {
      const delay = this.retryDelays[this.retryCount];
      this.retryCount++;
      
      const useFallback = this.retryCount >= 4; // Give primary stream more chances before fallback
      
      console.log(`Stream error, retrying in ${delay}ms... (Attempt ${this.retryCount}, Fallback: ${useFallback})`);
      clearTimeout(this.retryTimeout);
      this.retryTimeout = setTimeout(() => {
        if (this.currentChannel) {
          this.play(this.currentChannel, true, useFallback);
        }
      }, delay);
    } else {
      console.error('Max retries reached. Using fallback stream as last resort.');
      if (this.currentChannel && this.retryCount === this.retryDelays.length) {
        this.retryCount++; // Increment to prevent infinite loops if fallback fails
        this.play(this.currentChannel, true, true);
      } else {
        console.error('Fallback stream also failed.');
      }
    }
  }

  public play(channel: Channel, isRetry = false, useFallback = false) {
    this.initWebAudio();
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    this.isIntentionalPause = false;
    
    if (!isRetry) {
      this.retryCount = 0;
      clearTimeout(this.retryTimeout);
    }
    
    this.currentChannel = channel;
    this.setState('loading');
    
    let url = channel.streamUrl;
    if (useFallback) {
      if (channel.backups && channel.backups.length > 0) {
        const backupIndex = (this.retryCount - 4) % channel.backups.length;
        url = channel.backups[backupIndex >= 0 ? backupIndex : 0];
      } else {
        url = getStreamUrlFallback(channel.id);
      }
    }

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.setupMediaSession(channel);

    if (url.includes('.m3u8') && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 30, // Keep latency low but buffer enough to prevent drops
        maxMaxBufferLength: 60,
        manifestLoadingMaxRetry: 10,
        manifestLoadingRetryDelay: 1000,
        levelLoadingMaxRetry: 10,
        fragLoadingMaxRetry: 10,
        startPosition: -1 // Live edge
      });
      this.hls.loadSource(url);
      this.hls.attachMedia(this.audio);
      this.hls.on(Hls.Events.MANIFEST_PARSED, () => {
        this.audio.play().then(() => {
          this.wakeLockAudio.play().catch(e => console.warn('Wakelock audio failed', e));
        }).catch(e => {
          this.isIntentionalPause = true;
          console.warn('Autoplay prevented', e);
        });
      });
      this.hls.on(Hls.Events.ERROR, (event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              this.hls?.startLoad();
              this.handleError();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              this.hls?.recoverMediaError();
              break;
            default:
              this.hls?.destroy();
              this.handleError();
              break;
          }
        }
      });
    } else {
      // Native support (Safari, mobile iOS/Android) or MP3 stream
      this.audio.src = url;
      this.audio.load();
      this.audio.play().then(() => {
        this.wakeLockAudio.play().catch(e => console.warn('Wakelock audio failed', e));
      }).catch(e => {
        this.isIntentionalPause = true;
        console.warn('Autoplay prevented', e);
        this.setState('paused');
      });
    }
  }

  public pause() {
    this.isIntentionalPause = true;
    this.audio.pause();
    this.wakeLockAudio.pause();
    this.setState('paused');
  }

  public togglePlay() {
    this.initWebAudio();
    if (this.audioContext?.state === 'suspended') {
      this.audioContext.resume();
    }
    if (this.state === 'playing') {
      this.pause();
    } else if (this.currentChannel) {
      this.isIntentionalPause = false;
      this.audio.play().then(() => {
        this.wakeLockAudio.play().catch(e => console.warn('Wakelock audio failed', e));
      }).catch(e => {
        this.isIntentionalPause = true;
        console.warn(e);
      });
    }
  }

  public setVolume(val: number) {
    this.audio.volume = val;
  }

  private convertSvgToPng(svgDataUrl: string): Promise<string> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, 512, 512);
            resolve(canvas.toDataURL('image/png'));
            return;
          }
        } catch (e) {
          console.warn('Canvas SVG draw failed:', e);
        }
        resolve(svgDataUrl);
      };
      img.onerror = () => resolve(svgDataUrl);
      img.src = svgDataUrl;
    });
  }

  private setupMediaSession(channel: Channel) {
    if (this.backgroundMode) {
      this.backgroundMode.setSettings({ text: `Đang phát: ${channel.name}` }).catch(() => {});
    }
    if ('mediaSession' in navigator) {
      const updateMetadata = (artworkUrl: string) => {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: channel.name,
          artist: 'FM Radio Việt Nam',
          album: channel.category,
          artwork: [
            { src: artworkUrl, sizes: '512x512', type: 'image/png' },
            { src: 'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?auto=format&fit=crop&w=512&h=512&q=80', sizes: '512x512', type: 'image/png' }
          ]
        });
      };

      // Set initial metadata with channel logo and convert to PNG async for lock screen support
      updateMetadata(channel.logo);
      if (channel.logo.startsWith('data:image/svg+xml')) {
        this.convertSvgToPng(channel.logo).then((pngUrl) => {
          updateMetadata(pngUrl);
        }).catch(e => console.warn('PNG conversion fallback used', e));
      }

      navigator.mediaSession.setActionHandler('play', () => {
        this.initWebAudio();
        if (this.audioContext?.state === 'suspended') {
          this.audioContext.resume();
        }
        this.isIntentionalPause = false;
        this.audio.play().then(() => {
          this.wakeLockAudio.play().catch(e => console.warn(e));
        }).catch(e => console.warn(e));
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.pause();
      });
      navigator.mediaSession.setActionHandler('stop', () => {
        this.pause();
      });
      
      navigator.mediaSession.setActionHandler('nexttrack', () => {
        if (this.onNextCallback) {
          this.onNextCallback();
        }
      });
      navigator.mediaSession.setActionHandler('previoustrack', () => {
        if (this.onPrevCallback) {
          this.onPrevCallback();
        }
      });
    }
  }

  public setupNetworkListeners() {
    window.addEventListener('online', () => {
      if (this.currentChannel && this.state !== 'playing' && this.state !== 'paused') {
        this.play(this.currentChannel);
      }
    });
  }
}

export const audioService = new AudioService();
audioService.setupNetworkListeners();
