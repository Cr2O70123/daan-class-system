
import React, { useEffect, useState } from 'react';
import { X, Calendar, Check, Gift, Flame, Star, Loader2 } from 'lucide-react';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: () => void;
  streak: number;
  isCheckedInToday: boolean;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, onCheckIn, streak, isCheckedInToday }) => {
  const [animate, setAnimate] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
      if (isOpen) {
          setAnimate(true);
      } else {
          setAnimate(false);
          setIsLoading(false); // Reset loading when closed
      }
  }, [isOpen]);

  const handleCheckInClick = () => {
      if (isLoading || isCheckedInToday) return;
      setIsLoading(true);
      // Small delay to show animation before calling parent logic
      setTimeout(() => {
          onCheckIn();
      }, 500);
  };

  if (!isOpen) return null;

  // Calculate visuals for 7 days
  const currentCycleDay = streak % 7 === 0 ? (isCheckedInToday ? 7 : 0) : streak % 7;
  
  const displayStreak = isCheckedInToday ? streak : streak; 
  const daysInCycle = [];
  
  for (let i = 1; i <= 7; i++) {
      let status: 'done' | 'active' | 'future' = 'future';
      
      const currentDayIndex = isCheckedInToday 
        ? ((streak - 1) % 7) + 1 
        : (streak % 7) + 1;

      if (i < currentDayIndex) status = 'done';
      else if (i === currentDayIndex) status = isCheckedInToday ? 'done' : 'active';
      else status = 'future';

      daysInCycle.push({ day: i, status, reward: i === 7 ? 100 : 20 });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-300">
      <div className={`bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden transition-all duration-500 transform ${animate ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}`}>
        
        {/* Header with Gradient */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-center relative overflow-hidden">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20 pointer-events-none"></div>
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            
            {/* Close Button - Increased Z-Index */}
            <button 
                onClick={onClose} 
                className="absolute top-4 right-4 bg-black/20 hover:bg-black/30 text-white p-2 rounded-full transition-colors z-50 cursor-pointer"
            >
                <X size={20} />
            </button>
            
            <div className="relative z-10 pointer-events-none">
                <div className="inline-flex p-3 bg-white/20 rounded-2xl mb-3 backdrop-blur-md shadow-inner border border-white/20">
                    <Calendar size={32} className="text-white drop-shadow-md" />
                </div>
                <h2 className="text-2xl font-black text-white mb-1 tracking-tight">每日簽到</h2>
                <p className="text-blue-100 text-xs font-medium opacity-90">保持連續登入，獲取更多積分！</p>
            </div>
        </div>

        {/* Content */}
        <div className="p-6">
            
            {/* Stats Row */}
            <div className="flex justify-between items-center mb-6 bg-gray-50 dark:bg-gray-700/50 p-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                    <div className="bg-orange-100 dark:bg-orange-900/30 p-2 rounded-xl text-orange-500">
                        <Flame size={20} fill="currentColor" />
                    </div>
                    <div className="text-left">
                        <div className="text-xl font-black text-gray-800 dark:text-white leading-none">{streak} <span className="text-xs font-normal text-gray-500">天</span></div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">連續簽到</div>
                    </div>
                </div>
                <div className="h-8 w-[1px] bg-gray-200 dark:bg-gray-600"></div>
                <div className="flex items-center gap-3">
                    <div className="bg-yellow-100 dark:bg-yellow-900/30 p-2 rounded-xl text-yellow-600">
                        <Star size={20} fill="currentColor" />
                    </div>
                    <div className="text-left">
                        <div className="text-xl font-black text-gray-800 dark:text-white leading-none">+{streak > 0 && streak % 7 === 0 ? '100' : '20'}</div>
                        <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">今日獎勵</div>
                    </div>
                </div>
            </div>

            {/* 7 Day Progress Grid */}
            <div className="grid grid-cols-7 gap-2 mb-8">
                {daysInCycle.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1">
                        <div className={`
                            w-full aspect-[4/5] rounded-lg flex flex-col items-center justify-center text-[10px] font-bold border-b-4 transition-all duration-300 relative overflow-hidden
                            ${item.status === 'done' 
                                ? 'bg-blue-500 border-blue-700 text-white shadow-blue-200' 
                                : item.status === 'active'
                                    ? 'bg-blue-100 dark:bg-gray-700 border-blue-400 text-blue-600 dark:text-blue-300 ring-2 ring-blue-400 ring-offset-2 dark:ring-offset-gray-800'
                                    : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-400'
                            }
                        `}>
                            {item.status === 'done' && (
                                <div className="absolute inset-0 flex items-center justify-center bg-blue-600">
                                    <Check size={14} strokeWidth={4} />
                                </div>
                            )}
                            
                            {item.day === 7 ? (
                                <Gift size={16} className={item.status === 'done' ? 'text-white' : 'text-yellow-500 animate-bounce'} />
                            ) : (
                                <span>{item.reward}</span>
                            )}
                        </div>
                        <span className={`text-[9px] font-bold ${item.status === 'active' ? 'text-blue-600' : 'text-gray-300'}`}>
                            {item.day}天
                        </span>
                    </div>
                ))}
            </div>

            <button 
                onClick={handleCheckInClick}
                disabled={isCheckedInToday || isLoading}
                className={`w-full py-4 rounded-2xl font-black text-lg shadow-lg transition-all flex items-center justify-center gap-2 transform active:scale-95 ${
                    isCheckedInToday 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-default shadow-none'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white shadow-blue-500/30'
                }`}
            >
                {isLoading ? (
                    <>
                        <Loader2 className="animate-spin" size={22} />
                        <span>簽到中...</span>
                    </>
                ) : isCheckedInToday ? (
                    <>
                        <Check size={22} strokeWidth={3} />
                        <span>今日已領取</span>
                    </>
                ) : (
                    <span>立即簽到</span>
                )}
            </button>
            
            {!isCheckedInToday && !isLoading && (
                <p className="text-center text-[10px] text-gray-400 mt-4 flex items-center justify-center gap-1">
                    <Gift size={12} /> 連續簽到 7 天可獲得 <span className="text-yellow-500 font-bold">100 PT</span> 大獎！
                </p>
            )}
        </div>
      </div>
    </div>
  );
};
