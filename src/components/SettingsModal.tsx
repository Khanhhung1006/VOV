import React from 'react';
import { X, Moon, Sun, Clock, Speaker, Eye, EyeOff } from 'lucide-react';
import { cn } from '../utils/cn';
import { ThemeMode } from '../hooks/useTheme';
import { CHANNELS } from '../config/channels';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
  audioBoost?: number;
  setAudioBoost?: (val: number) => void;
  hiddenChannels?: string[];
  toggleHiddenChannel?: (id: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  theme, 
  setTheme,
  audioBoost = 1,
  setAudioBoost,
  hiddenChannels = [],
  toggleHiddenChannel
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#152C46] w-full max-w-sm max-h-[85vh] overflow-y-auto rounded-[32px] shadow-2xl p-6 transform transition-all border border-gray-100 dark:border-white/10 animate-in zoom-in-95 hide-scrollbar">
        <div className="flex items-center justify-between mb-6 sticky top-0 bg-white dark:bg-[#152C46] z-10 pb-2">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">Cài đặt</h2>
          <button onClick={onClose} className="p-2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider">Giao diện</h3>
            <div className="flex space-x-2">
              <button 
                onClick={() => setTheme('light')}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                  theme === 'light' 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" 
                    : "border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20 text-gray-500 dark:text-gray-400"
                )}
              >
                <Sun className={cn("w-6 h-6 mb-2", theme === 'light' ? "text-blue-500" : "")} />
                <span className={cn("text-sm font-medium", theme === 'light' ? "text-blue-600" : "")}>Sáng</span>
              </button>
              
              <button 
                onClick={() => setTheme('dark')}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                  theme === 'dark' 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" 
                    : "border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20 text-gray-500 dark:text-gray-400"
                )}
              >
                <Moon className={cn("w-6 h-6 mb-2", theme === 'dark' ? "text-blue-400" : "")} />
                <span className={cn("text-sm font-medium", theme === 'dark' ? "text-blue-400" : "")}>Tối</span>
              </button>

              <button 
                onClick={() => setTheme('auto')}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center p-3 rounded-2xl border-2 transition-all",
                  theme === 'auto' 
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10" 
                    : "border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20 text-gray-500 dark:text-gray-400"
                )}
              >
                <Clock className={cn("w-6 h-6 mb-2", theme === 'auto' ? "text-blue-500 dark:text-blue-400" : "")} />
                <span className={cn("text-sm font-medium", theme === 'auto' ? "text-blue-600 dark:text-blue-400" : "")}>Tự động</span>
              </button>
            </div>
            {theme === 'auto' && (
              <p className="text-xs text-center mt-3 text-gray-500 dark:text-gray-400">
                Sáng (6:00 - 18:00) / Tối (18:00 - 6:00)
              </p>
            )}
          </div>

          <div className="border-t border-gray-100 dark:border-white/10 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Khuếch đại âm thanh</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Tăng âm lượng lớn hơn mức tối đa cho các kênh nhỏ tiếng (giữ nguyên chất lượng).
            </p>
            
            <div className="flex space-x-2">
              {[
                { label: 'Mặc định', value: 1 },
                { label: '150%', value: 1.5 },
                { label: '200%', value: 2 }
              ].map(option => (
                <button 
                  key={option.value}
                  onClick={() => setAudioBoost && setAudioBoost(option.value)}
                  className={cn(
                    "flex-1 py-2.5 px-3 rounded-xl border-2 font-medium text-sm transition-all",
                    audioBoost === option.value 
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400" 
                      : "border-gray-200 dark:border-white/10 hover:border-blue-300 dark:hover:border-white/20 text-gray-600 dark:text-gray-400"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="border-t border-gray-100 dark:border-white/10 pt-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Quản lý kênh hiển thị</h3>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
              Ẩn các kênh bạn không muốn thấy trong danh sách phát và khi chuyển bài.
            </p>
            
            <div className="space-y-2">
              {CHANNELS.map(channel => {
                const isHidden = hiddenChannels.includes(channel.id);
                return (
                  <div key={channel.id} className="flex items-center justify-between p-3 rounded-xl border border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                    <div className="flex items-center space-x-3 truncate">
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-white dark:bg-black/20 flex-shrink-0">
                        <img src={channel.logo} alt={channel.name} className="w-full h-full object-cover opacity-80" />
                      </div>
                      <span className={cn("text-sm font-medium truncate", isHidden ? "text-gray-400 dark:text-gray-500 line-through" : "text-gray-700 dark:text-gray-300")}>
                        {channel.name}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleHiddenChannel && toggleHiddenChannel(channel.id)}
                      className={cn(
                        "p-2 rounded-lg transition-colors flex-shrink-0",
                        isHidden 
                          ? "bg-gray-200 dark:bg-gray-800 text-gray-500 hover:bg-gray-300 dark:hover:bg-gray-700" 
                          : "bg-blue-100 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-500/30"
                      )}
                    >
                      {isHidden ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
