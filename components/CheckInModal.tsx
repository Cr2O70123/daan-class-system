import React from 'react';
import { X, Calendar, Check, Gift, Flame } from 'lucide-react';

interface CheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCheckIn: () => void;
  streak: number;
  isCheckedInToday: boolean;
}

export const CheckInModal: React.FC<CheckInModalProps> = ({ isOpen, onClose, onCheckIn, streak, isCheckedInToday }) => {
  if (!isOpen) return null;

  // Helper to determine state of each day (1-7)
  const renderDay = (day: number) => {
    // Logic: 
    // If streak is 3, then days 1,2,3 are "completed". Day 4 is "today/pending".
    // However, since streak resets if missed, we usually just show the CURRENT streak progress.
    // E.g. Streak 3 -> Day 1, 2 completed. Day 3 is today.
    
    // But for a visual reward calendar, we map streak % 7.
    // If streak is 0, we are at day 1.
    // If streak is 3, we are at day 4 (pending) or day 3 (completed) depending on isCheckedInToday.
    
    // Let's simplify: Display a 7-day cycle. 
    // Current position in cycle = (streak - (isCheckedInToday ? 1 : 0)) % 7 + 1
    
    const rawStreak = isCheckedInToday ? streak : streak + 1;
    const currentCycleDay = ((rawStreak - 1) % 7) + 1;
    
    const isCompleted = day < currentCycleDay || (day === currentCycleDay && isCheckedInToday);
    const isToday = day === currentCycleDay;
    const isBigReward = day === 7;

    return (
        <div key={day} className={`flex flex-col items-center flex-1 relative ${isToday ? 'scale-110 z-10' : 'opacity-70'}`}>
            {isToday && !isCheckedInToday && (
                <div className="absolute -top-8 animate-bounce text-blue-500 font-bold text-xs bg-blue-100 px-2 py-1 rounded-full">
                    今天
                </div>
            )}
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center border-2 mb-2 transition-all ${
                isCompleted 
                    ? 'bg-green-500 border-green-500 text-white' 
                    : isToday
                        ? 'bg-blue-50 border-blue-500 text-blue-500'
                        : 'bg-gray-50 border-gray-200 text-gray-300'
            }`}>
                {isCompleted ? (
                    <Check size={20} />
                ) : isBigReward ? (
                    <Gift size={20} className={isToday ? "text-orange-500 animate-pulse" : "text-gray-300"} />
                ) : (
                    <span className="font-bold text-sm">{day}</span>
                )}
            </div>
            <span className="text-[10px] font-bold text-gray-500">Day {day}</span>
            <span className={`text-[10px] font-bold mt-0.5 ${isBigReward ? 'text-orange-500' : 'text-blue-600'}`}>
                +{isBigReward ? 100 : 20}
            </span>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white text-center relative">
            <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1 rounded-full transition-colors">
                <X size={20} />
            </button>
            <h2 className="text-2xl font-black mb-1 flex items-center justify-center gap-2">
                <Calendar /> 每日簽到
            </h2>
            <p className="text-blue-100 text-sm mb-4">連續簽到，獎勵加倍！</p>
            
            <div className="inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10">
                <Flame className="text-orange-400 fill-orange-400 animate-pulse" size={18} />
                <span className="font-bold">已連續 {streak} 天</span>
            </div>
        </div>

        {/* Calendar Grid */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900">
            <div className="flex justify-between gap-1">
                {[1, 2, 3, 4, 5, 6, 7].map(day => renderDay(day))}
            </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-white dark:bg-gray-800">
            <button 
                onClick={onCheckIn}
                disabled={isCheckedInToday}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isCheckedInToday 
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-default'
                        : 'bg-blue-600 hover:bg-blue-700 text-white hover:scale-[1.02] active:scale-95 shadow-blue-500/30'
                }`}
            >
                {isCheckedInToday ? (
                    <>
                        <Check size={20} />
                        <span>今日已簽到</span>
                    </>
                ) : (
                    <>
                        <Gift size={20} />
                        <span>立即簽到領獎</span>
                    </>
                )}
            </button>
            {isCheckedInToday && (
                <p className="text-center text-xs text-gray-400 mt-3">明天記得再來喔！</p>
            )}
        </div>
      </div>
    </div>
  );
};