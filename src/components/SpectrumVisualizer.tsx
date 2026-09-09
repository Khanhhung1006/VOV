import React, { useEffect, useRef } from 'react';
import { cn } from '../utils/cn';

interface SpectrumVisualizerProps {
  isActive: boolean;
  className?: string;
}

export const SpectrumVisualizer: React.FC<SpectrumVisualizerProps> = ({ isActive, className }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let lastTime = performance.now();

    const updateSize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (rect) {
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
      }
    };
    
    updateSize();
    window.addEventListener('resize', updateSize);

    const BAR_WIDTH = 2.5;
    const GAP = 1.5;
    
    interface BarState {
      val: number;
      peakHoldTime: number;
    }
    
    let bars: BarState[] = [];
    
    let bassPhase = 0;
    let midPhase = 0;
    let treblePhase = 0;

    const draw = (currentTime: number) => {
      animationFrameId = requestAnimationFrame(draw);
      
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect || rect.width === 0) return;
      
      const w = rect.width;
      const h = rect.height;

      const numBars = Math.floor(w / (BAR_WIDTH + GAP));
      
      if (bars.length !== numBars) {
        bars = Array.from({ length: numBars }, () => ({ val: 0.05, peakHoldTime: 0 }));
      }

      if (isActive) {
        // Different speeds for realistic varying frequencies
        bassPhase += deltaTime * 0.003;
        midPhase += deltaTime * 0.007;
        treblePhase += deltaTime * 0.015;
      }
      
      // Simulated audio energy
      const globalBass = isActive ? Math.pow(Math.sin(bassPhase) * 0.5 + 0.5, 4) * 0.9 : 0;
      const globalMid = isActive ? (Math.sin(midPhase * 0.8) * Math.cos(midPhase * 1.3) * 0.5 + 0.5) * 0.6 + Math.random() * 0.2 : 0;
      const globalTreble = isActive ? Math.random() * 0.4 + 0.1 : 0;

      ctx.clearRect(0, 0, w, h);

      // Create Gradient: #00C6FF -> #0099FF -> #0066FF -> #0050FF
      const gradient = ctx.createLinearGradient(0, 0, w, 0);
      gradient.addColorStop(0, '#00C6FF');
      gradient.addColorStop(0.33, '#0099FF');
      gradient.addColorStop(0.66, '#0066FF');
      gradient.addColorStop(1, '#0050FF');
      
      // Add subtle glow
      ctx.shadowBlur = 8;
      ctx.shadowColor = '#0099FF';

      for (let i = 0; i < numBars; i++) {
        const nx = (i / (numBars - 1)) * 2 - 1; // -1 to 1
        const distFromCenter = Math.abs(nx);

        let target = 0.03; // idle height
        
        if (isActive) {
          // Bass in center, mid/treble on sides
          const bassInfluence = Math.max(0, 1 - distFromCenter * 2.5);
          const midInfluence = Math.max(0, 1 - Math.abs(distFromCenter - 0.5) * 3);
          const trebleInfluence = Math.max(0, 1 - Math.abs(distFromCenter - 0.85) * 4);
          
          const barNoise = Math.random() * 0.4 + 0.6;
          
          target = (
            globalBass * bassInfluence + 
            globalMid * midInfluence + 
            globalTreble * trebleInfluence
          ) * barNoise;
          
          target = Math.min(1, target * 1.5 + 0.03); 
        } else {
          target = 0.03 + Math.random() * 0.02;
        }

        const bar = bars[i];
        
        // Easing & Inertia Physics
        if (target > bar.val) {
          // Attack (ease out approx)
          bar.val += (target - bar.val) * 0.5;
          bar.peakHoldTime = 120; // Hold peak for 120ms
        } else {
          bar.peakHoldTime -= deltaTime;
          if (bar.peakHoldTime <= 0) {
             // Decay linearly over ~180ms
             bar.val = Math.max(target, bar.val - (deltaTime / 180));
          }
        }

        const barHeight = Math.max(2, bar.val * h);
        const x = i * (BAR_WIDTH + GAP);
        const y = h - barHeight;

        ctx.fillStyle = gradient;
        
        // Base Bar
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, barHeight, BAR_WIDTH / 2);
        ctx.fill();
        
        // Bright Top (20% brighter approx by using white overlay)
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.beginPath();
        ctx.roundRect(x, y, BAR_WIDTH, Math.min(barHeight, BAR_WIDTH * 2), BAR_WIDTH / 2);
        ctx.fill();
      }
    };

    draw(performance.now());

    return () => {
      window.removeEventListener('resize', updateSize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive]);

  return (
    <div className={cn("w-full h-full relative", className)}>
      <canvas ref={canvasRef} className="block w-full h-full" />
    </div>
  );
};
