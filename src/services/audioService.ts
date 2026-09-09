import Hls from 'hls.js';
import { Channel, CHANNELS, getStreamUrlFallback } from '../config/channels';
import { Capacitor, registerPlugin } from '@capacitor/core';

const RadioPlayback = registerPlugin<any>('RadioPlayback');

function getNativeArtMetadata(id: string) {
  switch(id) {
    case 'vov-giaothong-hn': return { title: 'VOV', subtitle: 'GT HÀ NỘI', c1: '#2F8DFF', c2: '#0A2540' };
    case 'vov-giaothong-hcm': return { title: 'VOV', subtitle: 'GT TP.HCM', c1: '#55D8FF', c2: '#2F8DFF' };
    case 'vov1': return { title: 'VOV 1', subtitle: 'THỜI SỰ', c1: '#E52D27', c2: '#B31217' };
    case 'vov2': return { title: 'VOV 2', subtitle: 'VĂN HÓA', c1: '#4776E6', c2: '#8E54E9' };
    case 'vov3': return { title: 'VOV 3', subtitle: 'ÂM NHẠC', c1: '#7B61FF', c2: '#FF61A6' };
    case 'vov5': return { title: 'VOV 5', subtitle: 'QUỐC TẾ', c1: '#00c6ff', c2: '#0072ff' };
    case 'voh-999': return { title: 'VOH', subtitle: 'FM 99.9', c1: '#F12711', c2: '#F5AF19' };
    case 'xone-fm': return { title: 'XONE', subtitle: 'MUSIC 24/7', c1: '#11998E', c2: '#38EF7D' };
    case 'joyfm': return { title: 'JOY', subtitle: 'FM 98.9', c1: '#FF4E50', c2: '#F9D423' };
    case 'vov-fm-suckhoe': return { title: 'VOV', subtitle: 'SỨC KHỎE', c1: '#1D976C', c2: '#93F9B9' };
    case 'vov-fm-giaoduc': return { title: 'VOV', subtitle: 'GIÁO DỤC', c1: '#3A1C71', c2: '#D76D77' };
    case 'voh-nhandan': return { title: 'VOH', subtitle: 'NHÂN DÂN', c1: '#0052D4', c2: '#65C7F7' };
    case 'xone-tophits': return { title: 'XONE', subtitle: 'TOP HITS', c1: '#8A2387', c2: '#E94057' };
    case 'hanoi-fm': return { title: 'HN', subtitle: 'FM 90', c1: '#1F1C2C', c2: '#928DAB' };
    case 'radio-vnr': return { title: 'VNR', subtitle: 'RADIO VN', c1: '#2C3E50', c2: '#FD746C' };
    case 'rfi-tiengviet': return { title: 'RFI', subtitle: 'TIẾNG VIỆT', c1: '#D31027', c2: '#EA00D9' };
    case 'zing-bolero': return { title: 'ZING', subtitle: 'BOLERO', c1: '#f857a6', c2: '#ff5858' };
    case 'bbc-world': return { title: 'BBC', subtitle: 'WORLD', c1: '#B21F1F', c2: '#1A2A6C' };
    default: return { title: 'VOV', subtitle: 'RADIO', c1: '#E52D27', c2: '#B31217' };
  }
}

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
  private onChannelChangeCallback: ((channel: Channel) => void) | null = null;
  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;
  private state: PlayerState = 'idle';
  private isIntentionalPause: boolean = true;
  private backgroundMode: any = null;
  private isNativePlaylistSet = false;

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
    
    if (Capacitor.isNativePlatform()) {
      this.initNativePlayback();
    }
  }

  private async initNativePlayback() {
    try {
      RadioPlayback.addListener('onChannelChange', (data: { channelId: string, index: number }) => {
        console.log('Native onChannelChange:', data);
        const channel = CHANNELS.find(c => c.id === data.channelId);
        if (channel) {
          this.currentChannel = channel;
          if (this.onChannelChangeCallback) {
            this.onChannelChangeCallback(channel);
          }
        }
      });

      RadioPlayback.addListener('onStateChange', (data: { state: PlayerState }) => {
        console.log('Native onStateChange:', data);
        this.setState(data.state);
      });
    } catch (e) {
      console.warn('Native playback listeners setup failed:', e);
    }
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

  public setOnChannelChange(cb: (channel: Channel) => void) {
    this.onChannelChangeCallback = cb;
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
    if (Capacitor.isNativePlatform()) {
      this.currentChannel = channel;
      this.isIntentionalPause = false;
      this.setState('loading');
      
      if (!this.isNativePlaylistSet) {
        const list = CHANNELS.map(c => {
          const art = getNativeArtMetadata(c.id);
          return {
            id: c.id,
            name: c.name,
            streamUrl: c.streamUrl,
            titleText: art.title,
            subtitleText: art.subtitle,
            color1: art.c1,
            color2: art.c2
          };
        });
        RadioPlayback.setChannels({ channels: list, activeId: channel.id, autoPlay: true })
          .then(() => {
            this.isNativePlaylistSet = true;
          })
          .catch((err: any) => {
            console.error('Failed to set native channels:', err);
            this.setState('error');
          });
      } else {
        RadioPlayback.selectIndex({ id: channel.id, autoPlay: true })
          .catch((err: any) => {
            console.error('Failed to select native index:', err);
            this.setState('error');
          });
      }
      return;
    }

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
    if (Capacitor.isNativePlatform()) {
      RadioPlayback.pause().catch((e: any) => console.warn(e));
      this.setState('paused');
      return;
    }
    this.audio.pause();
    this.wakeLockAudio.pause();
    this.setState('paused');
  }

  public togglePlay() {
    if (Capacitor.isNativePlatform()) {
      if (this.state === 'playing') {
        this.pause();
      } else {
        this.isIntentionalPause = false;
        RadioPlayback.play().catch((e: any) => console.warn(e));
      }
      return;
    }

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
    if (Capacitor.isNativePlatform()) {
      RadioPlayback.setVolume({ volume: val }).catch((e: any) => console.warn(e));
    }
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
