import React from 'react';
import { X, Clock } from 'lucide-react';
import { cn } from '../utils/cn';

interface SleepTimerModalProps {
  isOpen: boolean;
  onClose: () => void;
  timeLeft: number | null;
  setTimer: (minutes: number) => void;
  clearTimer: () => void;
}

export const SleepTimerModal: React.FC<SleepTimerModalProps> = ({
  isOpen,
  onClose,
  timeLeft,
  setTimer,
  clearTimer
}) => {
  if (!isOpen) return null;

  const options = [15, 30, 45, 60];

  const handleSelect = (minutes: number) => {
    setTimer(minutes);
    onClose();
  };

  const handleTurnOff = () => {
    clearTimer();
    onClose();
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-0 pb-safe">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#152C46] w-full max-w-sm rounded-[32px] shadow-2xl p-6 transform transition-all border border-gray-100 dark:border-white/10 animate-in slide-in-from-bottom-8 sm:slide-in-from-bottom-0 sm:zoom-in-95">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3 text-gray-900 dark:text-white">
            <Clock className="w-6 h-6 text-blue-500" />
            <h2 className="text-xl font-bold">Hẹn giờ tắt</h2>
          </div>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        {timeLeft !== null && (
          <div className="mb-6 p-4 rounded-2xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 flex flex-col items-center justify-center">
            <span className="text-sm text-blue-600 dark:text-blue-400 font-medium mb-1">Thời gian còn lại</span>
            <span className="text-3xl font-bold text-blue-700 dark:text-blue-300 tracking-wider">
              {formatTime(timeLeft)}
            </span>
          </div>
        )}

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {options.map(mins => (
              <button
                key={mins}
                onClick={() => handleSelect(mins)}
                className="p-4 rounded-2xl border-2 border-gray-100 dark:border-white/5 hover:border-blue-300 dark:hover:border-white/20 hover:bg-blue-50 dark:hover:bg-white/5 text-gray-700 dark:text-gray-300 font-medium transition-all active:scale-95"
              >
                {mins} phút
              </button>
            ))}
          </div>
          
          <button
            onClick={handleTurnOff}
            disabled={timeLeft === null}
            className={cn(
              "w-full p-4 rounded-2xl font-medium transition-all active:scale-95",
              timeLeft !== null 
                ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20" 
                : "bg-gray-100 dark:bg-white/5 text-gray-400 dark:text-white/20 cursor-not-allowed"
            )}
          >
            Tắt hẹn giờ
          </button>
        </div>
      </div>
    </div>
  );
};
