import Hls from 'hls.js';
import { Channel, getStreamUrlFallback } from '../config/channels';
import { BackgroundMode } from '@anuradev/capacitor-background-mode';
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
  private retryDelays = [2000, 5000, 10000];
  private retryTimeout: any = null;

  private wakeLockAudio: HTMLAudioElement;
  private onStateChangeCallback: ((state: PlayerState) => void) | null = null;
  private onNextCallback: (() => void) | null = null;
  private onPrevCallback: (() => void) | null = null;
  private state: PlayerState = 'idle';
  private isIntentionalPause: boolean = true;

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
        await BackgroundMode.enable();
        await BackgroundMode.setSettings({
          title: 'FM Radio Việt Nam',
          text: 'Đang chạy ngầm',
          subText: 'Chạm để mở lại',
          resume: true,
          hidden: false,
          disableWebViewOptimization: true,
          allowClose: false
        });
        await BackgroundMode.disableWebViewOptimizations();
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
        navigator.mediaSession.setActionHandler('nexttrack', this.onNextCallback);
        navigator.mediaSession.setActionHandler('previoustrack', this.onPrevCallback);
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

  private setupWebAudio() {
    // WebAudio is completely disabled to maintain original HTML5 Audio sound quality.
    // Radio streams are heavily compressed and passing them through WebAudio, even with neutral gain,
    // causes subtle distortion and muddiness in talk shows and news.
  }

  private handleError() {
    this.setState('error');
    if (this.retryCount < this.retryDelays.length) {
      const delay = this.retryDelays[this.retryCount];
      this.retryCount++;
      
      const useFallback = this.retryCount >= 2; // Use fallback on second retry
      
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
    this.isIntentionalPause = false;
    
    if (!isRetry) {
      this.retryCount = 0;
      clearTimeout(this.retryTimeout);
    }
    
    this.currentChannel = channel;
    this.setState('loading');
    
    const url = useFallback ? getStreamUrlFallback(channel.id) : channel.streamUrl;

    if (this.hls) {
      this.hls.destroy();
      this.hls = null;
    }

    this.setupMediaSession(channel);

    if (url.includes('.m3u8') && Hls.isSupported()) {
      this.hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90
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

  private setupMediaSession(channel: Channel) {
    if (Capacitor.isNativePlatform()) {
      BackgroundMode.setSettings({ text: `Đang phát: ${channel.name}` }).catch(() => {});
    }
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: channel.name,
        artist: 'FM Radio Việt Nam',
        album: channel.category,
        artwork: [
          { src: channel.logo, sizes: '96x96', type: 'image/png' },
          { src: channel.logo, sizes: '128x128', type: 'image/png' },
          { src: channel.logo, sizes: '256x256', type: 'image/png' },
          { src: channel.logo, sizes: '512x512', type: 'image/png' },
        ]
      });

      navigator.mediaSession.setActionHandler('play', () => {
        this.audio.play().then(() => {
          this.wakeLockAudio.play().catch(e => console.warn(e));
        });
        this.setState('playing');
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.isIntentionalPause = true;
        this.audio.pause();
        this.wakeLockAudio.pause();
        this.setState('paused');
      });
      
      if (this.onNextCallback) {
        navigator.mediaSession.setActionHandler('nexttrack', this.onNextCallback);
      }
      if (this.onPrevCallback) {
        navigator.mediaSession.setActionHandler('previoustrack', this.onPrevCallback);
      }
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
