import Hls from 'hls.js';
import { Channel, getStreamUrlFallback } from '../config/channels';

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

  private onStateChangeCallback: ((state: PlayerState) => void) | null = null;
  private state: PlayerState = 'idle';
  private isIntentionalPause: boolean = true; // Default to true so it doesn't auto-resume without playing once

  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = 'anonymous';
    // Increase preload buffer if possible
    this.audio.preload = 'auto';

    this.setupAudioListeners();
    this.setupVisibilityListener();
  }

  private setupVisibilityListener() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !this.isIntentionalPause && this.currentChannel) {
          // Attempt to resume playback if the user returns to the app and didn't intentionally pause it
          this.audio.play().catch(e => console.warn('Auto-resume failed:', e));
        }
      });
    }
  }

  public setOnStateChange(cb: (state: PlayerState) => void) {
    this.onStateChangeCallback = cb;
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
      this.setupWebAudio(); // Resume or init audio context
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
    // Only init if not already done, and user has interacted
    if (!this.audioContext) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        this.audioContext = new AudioCtx();
        this.analyser = this.audioContext.createAnalyser();
        
        // Setup Visualizer properties
        this.analyser.fftSize = 256;
        this.analyser.smoothingTimeConstant = 0.8;

        this.sourceNode = this.audioContext.createMediaElementSource(this.audio);

        // Audio Enhancement Nodes
        // Audio Boost (Volume Multiplier)
        this.boostNode = this.audioContext.createGain();
        this.boostNode.gain.value = parseFloat(localStorage.getItem('audioBoost') || '1');

        // Dynamics Compressor (Limiter / Peak Protection)
        const compressor = this.audioContext.createDynamicsCompressor();
        compressor.threshold.value = -3;
        compressor.knee.value = 5;
        compressor.ratio.value = 12;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.050;

        // Bass Enhancement (LowShelf)
        const bassFilter = this.audioContext.createBiquadFilter();
        bassFilter.type = 'lowshelf';
        bassFilter.frequency.value = 100;
        bassFilter.gain.value = 3; // +3dB

        // Treble Enhancement (HighShelf)
        const trebleFilter = this.audioContext.createBiquadFilter();
        trebleFilter.type = 'highshelf';
        trebleFilter.frequency.value = 8000;
        trebleFilter.gain.value = 2; // +2dB

        // Connect chain: Source -> EQ -> Boost -> Compressor -> Analyser -> Destination
        this.sourceNode
          .connect(bassFilter)
          .connect(trebleFilter)
          .connect(this.boostNode)
          .connect(compressor)
          .connect(this.analyser)
          .connect(this.audioContext.destination);

      } catch (e) {
        console.warn('Web Audio API not supported or failed to init', e);
      }
    }

    if (this.audioContext && this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
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
        this.audio.play().catch(e => {
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
      this.audio.play().catch(e => {
        this.isIntentionalPause = true;
        console.warn('Autoplay prevented', e);
        this.setState('paused');
      });
    }
  }

  public pause() {
    this.isIntentionalPause = true;
    this.audio.pause();
    this.setState('paused');
  }

  public togglePlay() {
    if (this.state === 'playing') {
      this.pause();
    } else if (this.currentChannel) {
      this.isIntentionalPause = false;
      // If we are suspended due to interruption, we should resume. 
      // Re-triggering play helps with background execution
      this.audio.play().catch(e => {
        this.isIntentionalPause = true;
        console.warn(e);
      });
      this.setupWebAudio();
    }
  }

  public setVolume(val: number) {
    this.audio.volume = val;
  }

  private setupMediaSession(channel: Channel) {
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
        this.audio.play();
        this.setState('playing');
      });
      navigator.mediaSession.setActionHandler('pause', () => {
        this.isIntentionalPause = true;
        this.audio.pause();
        this.setState('paused');
      });
      // We can also add nexttrack/previoustrack if we have a playlist managed in state
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
