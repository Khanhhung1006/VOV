import React, { useEffect, useRef } from 'react';
import { audioService } from '../services/audioService';

interface VisualizerProps {
  isActive: boolean;
  isLandscape?: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, isLandscape = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);
  
  // Keep animation state in a ref to stay smooth across React renders
  const stateRef = useRef({
    cumulativePhase: 0,
    smoothedVolume: 0,
    overallOpacity: 0,
    lastTime: performance.now(),
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    // Use ResizeObserver for ultra-precise high-DPI scaling on all screen rotations/resizes
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Get precise content bounding box
        const width = entry.contentRect.width || parent.clientWidth;
        const height = entry.contentRect.height || parent.clientHeight;
        const dpr = window.devicePixelRatio || 1;
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        ctx.scale(dpr, dpr);
      }
    });

    resizeObserver.observe(parent);

    // Initial frequency array sizing
    let dataArray = new Uint8Array(0);
    const getAnalyserData = () => {
      const analyser = audioService.analyser;
      if (analyser) {
        if (dataArray.length !== analyser.frequencyBinCount) {
          dataArray = new Uint8Array(analyser.frequencyBinCount);
        }
        analyser.getByteFrequencyData(dataArray);
      }
    };

    // Premium glowing colors requested: violet, purple, pink, subtle blue highlight
    const ringColorsRGB = [
      { r: 139, g: 92, b: 246 },  // Violet (#8B5CF6)
      { r: 59, g: 130, b: 246 },   // Subtle Blue highlight (#3B82F6)
      { r: 167, g: 139, b: 250 },  // Purple (#A78BFA)
      { r: 236, g: 72, b: 153 },   // Pink (#EC4899)
      { r: 124, g: 58, b: 237 },   // Deep Violet-Purple (#7C3AED)
      { r: 14, g: 165, b: 233 },   // Light Blue highlight (#0EA5E9)
    ];

    const draw = (now: number) => {
      requestRef.current = requestAnimationFrame(draw);

      const state = stateRef.current;
      const deltaTime = now - state.lastTime;
      state.lastTime = now;

      // Ensure consistent pacing even after background tab sleep
      const dt = Math.min(deltaTime, 100);

      // 1. Compute current volume based on real-time low-to-mid audio frequencies
      let targetVolume = 0;
      if (isActive && audioService.analyser) {
        getAnalyserData();
        if (dataArray.length > 0) {
          let sum = 0;
          const scanLimit = Math.min(dataArray.length, 36); // Focus on bass & percussion beats
          for (let i = 0; i < scanLimit; i++) {
            sum += dataArray[i];
          }
          targetVolume = (sum / scanLimit) / 255;
        }
      }

      // Linear interpolation (lerp) for smooth, fluid pulsations
      state.smoothedVolume += (targetVolume - state.smoothedVolume) * 0.12;

      // 2. Control fade-in/out of rings smoothly when playing/paused
      const targetOverallOpacity = isActive ? 1.0 : 0.0;
      state.overallOpacity += (targetOverallOpacity - state.overallOpacity) * 0.05;

      // Stop requesting frames if fully faded out and inactive to preserve battery
      if (state.overallOpacity < 0.002 && !isActive) {
        const clientWidth = canvas.width / (window.devicePixelRatio || 1);
        const clientHeight = canvas.height / (window.devicePixelRatio || 1);
        ctx.clearRect(0, 0, clientWidth, clientHeight);
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = undefined;
        }
        return;
      }

      // 3. Update radial wave expansion phase based on audio tempo
      const baseSpeed = 0.00012; // Base speed of radiating expansion
      const speed = baseSpeed + state.smoothedVolume * 0.00028; // Radiates faster with audio level
      state.cumulativePhase += speed * dt;

      // Clear the canvas
      const clientWidth = canvas.width / (window.devicePixelRatio || 1);
      const clientHeight = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, clientWidth, clientHeight);

      // Set beautiful translucent 'screen' blending
      ctx.globalCompositeOperation = 'screen';

      const centerX = clientWidth / 2;
      const centerY = clientHeight / 2;

      // Limit expansion so rings expand smoothly behind the layout boundaries
      const maxRadius = Math.min(clientWidth, clientHeight) * 0.48;
      
      // Expand outer bounds based on audio volume
      const scaleFactor = 1.0 + state.smoothedVolume * 0.15;

      const ringCount = 6;
      for (let i = 0; i < ringCount; i++) {
        // Space rings out perfectly by offset
        const baseOffset = i / ringCount;
        const normalizedPos = (baseOffset + state.cumulativePhase) % 1.0;

        // Radiate outward starting from exact center
        const radius = normalizedPos * maxRadius * scaleFactor;

        // Sinusoidal opacity envelope: fades in from center, peaks in mid, fades out at edge
        const ringOpacityFactor = Math.sin(normalizedPos * Math.PI);
        
        // Calculate peak opacity based on prompt's strict 15% to 45% specification
        const maxPeakOpacity = 0.15 + state.smoothedVolume * 0.30; // 15% to 45%
        const finalOpacity = ringOpacityFactor * maxPeakOpacity * state.overallOpacity;

        if (finalOpacity <= 0) continue;

        const color = ringColorsRGB[i % ringColorsRGB.length];
        const strokeColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${finalOpacity})`;
        const auraColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${finalOpacity * 0.25})`;

        // Bloom and glow effect (tight glow)
        ctx.shadowBlur = 8 + state.smoothedVolume * 12;
        ctx.shadowColor = `rgba(${color.r}, ${color.g}, ${color.b}, ${finalOpacity * 0.9})`;

        // Pass 1: Thin, bright focal core ring
        ctx.lineWidth = 1.2 + state.smoothedVolume * 1.6;
        ctx.strokeStyle = strokeColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();

        // Pass 2: Volumetric glow aura (drawn with thick translucent lines, no shadowBlur to keep it ultra fast)
        ctx.shadowBlur = 0;
        ctx.lineWidth = 12 + state.smoothedVolume * 20; // Soft bloom halo
        ctx.strokeStyle = auraColor;
        ctx.beginPath();
        ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Reset back to normal source-over blend mode
      ctx.globalCompositeOperation = 'source-over';
    };

    // Trigger animation loop
    requestRef.current = requestAnimationFrame(draw);

    return () => {
      resizeObserver.disconnect();
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, isLandscape]);

  return (
    <div className="w-full h-full flex items-center justify-center relative">
      {/* Background radial ambient halo */}
      <div className={`absolute inset-0 bg-gradient-to-tr from-violet-500/5 via-fuchsia-500/5 to-cyan-500/5 blur-[80px] rounded-full pointer-events-none transition-opacity duration-1000 ${
        isActive ? 'opacity-100' : 'opacity-30'
      }`} />
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
