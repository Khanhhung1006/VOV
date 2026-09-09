import React, { useEffect, useRef } from 'react';
import { audioService } from '../services/audioService';

interface VisualizerProps {
  isActive: boolean;
  isLandscape?: boolean;
}

export const Visualizer: React.FC<VisualizerProps> = ({ isActive, isLandscape = false }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    if (!isActive) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // We'll resize the canvas dynamically
    const updateCanvasSize = () => {
      const parent = canvas.parentElement;
      if (parent) {
        canvas.width = parent.clientWidth;
        canvas.height = parent.clientHeight;
      }
    };
    updateCanvasSize();
    window.addEventListener('resize', updateCanvasSize);

    const analyser = audioService.analyser;
    if (!analyser) return;

    // Analyser setup (already 256 fftSize from service, giving 128 bins)
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      requestRef.current = requestAnimationFrame(draw);

      if (!canvas || !ctx) return;

      analyser.getByteFrequencyData(dataArray);

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const barCount = Math.min(100, bufferLength); // Use about 100 bars
      // We'll skip some lower/upper bins if we want to focus on mid ranges, but let's use first 100
      
      const spaceBetween = 2; // pixel space between bars
      const barWidth = (canvas.width / barCount) - spaceBetween;
      
      const centerY = canvas.height / 2;

      // Create Gradient Blue -> Purple -> Pink
      const gradient = ctx.createLinearGradient(0, canvas.height, 0, 0);
      gradient.addColorStop(0, '#2F8DFF');
      gradient.addColorStop(0.5, '#7B61FF');
      gradient.addColorStop(1, '#FF61A6');

      // Glow effect
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#7B61FF';
      ctx.fillStyle = gradient;

      for (let i = 0; i < barCount; i++) {
        // Smooth out the data a bit
        const rawValue = dataArray[i];
        const percent = rawValue / 255;
        
        // Scale height so it fits well. In landscape maybe we make it taller.
        const maxBarHeight = canvas.height * 0.8; 
        const minHeight = 4;
        let barHeight = (percent * maxBarHeight) + minHeight;

        // Draw centered vertically
        const x = i * (barWidth + spaceBetween);
        const y = centerY - (barHeight / 2);

        // Draw rounded rectangle
        ctx.beginPath();
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2);
        ctx.fill();
      }
    };

    draw();

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, isLandscape]);

  return (
    <div className="w-full h-full min-h-[100px] flex items-center justify-center relative">
      {/* Optional blur backdrop */}
      <div className="absolute inset-0 bg-blue-500/5 blur-[80px] rounded-full pointer-events-none" />
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
