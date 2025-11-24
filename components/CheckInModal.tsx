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
    // Current day in cycle of 7
    const rawStreak = isCheckedInToday ? streak : streak + 1;
    const currentCycleDay = ((rawStreak - 1) % 7) + 1;
    
    // Logic for visual state
    const isCompleted = day < currentCycleDay || (day === currentCycleDay && isCheckedInToday);
    const isToday = day === currentCycleDay;
    const isBigReward = day === 7;

    return (
        <div key={day} className={`relative flex flex-col items-center p-3 rounded-2xl border transition-all ${
            isToday ? 'bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 scale-105 shadow-sm z-10' : 'bg-gray-50 border-gray-100 dark:bg-gray-700/30 dark:border-gray-700'
        }`}>
            {isToday && !isCheckedInToday && (
                <div className="absolute -top-2 -right-2 bg-red-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-full animate-bounce">
                    今天
                </div>
            )}
            
            <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 transition-all ${
                isCompleted 
                    ? 'bg-green-500 text-white shadow-green-200' 
                    : isToday
                        ? 'bg-blue-500 text-white shadow-blue-200'
                        : 'bg-gray-200 dark:bg-gray-600 text-gray-400 dark:text-gray-500'
            }`}>
                {isCompleted ? (
                    <Check size={18} strokeWidth={3} />
                ) : isBigReward ? (
                    <Gift size={20} className={isToday ? "animate-pulse" : ""} />
                ) : (
                    <span className="font-bold text-sm">{day}</span>
                )}
            </div>
            
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium mb-0.5">Day {day}</span>
            <span className={`text-xs font-black ${isBigReward ? 'text-orange-500' : 'text-blue-600 dark:text-blue-400'}`}>
                +{isBigReward ? 100 : 20}
            </span>
        </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-gray-800 rounded-[2rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 text-white text-center relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-white via-transparent to-transparent"></div>
            
            <button onClick={onClose} className="absolute top-4 right-4 bg-white/20 hover:bg-white/30 p-1.5 rounded-full transition-colors z-10">
                <X size={18} />
            </button>
            
            <h2 className="text-2xl font-black mb-1 flex items-center justify-center gap-2 relative z-10">
                <Calendar className="text-blue-200" /> 每日簽到
            </h2>
            <p className="text-blue-100 text-sm mb-5 relative z-10">連續簽到，累積獎勵加倍！</p>
            
            <div className="inline-flex items-center gap-2 bg-black/20 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/10 relative z-10">
                <Flame className="text-orange-400 fill-orange-400 animate-pulse" size={16} />
                <span className="font-bold text-sm">已連續 {streak} 天</span>
            </div>
        </div>

        {/* Grid Layout for Days */}
        <div className="p-6 bg-white dark:bg-gray-800 overflow-y-auto">
            {/* Top Row: 4 Days */}
            <div className="grid grid-cols-4 gap-3 mb-3">
                {[1, 2, 3, 4].map(day => renderDay(day))}
            </div>
            {/* Bottom Row: 3 Days (Centered visually by grid placement or flex) */}
            <div className="grid grid-cols-3 gap-3 w-[75%] mx-auto">
                {[5, 6, 7].map(day => renderDay(day))}
            </div>
        </div>

        {/* Footer Action */}
        <div className="p-6 bg-gray-50 dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800">
            <button 
                onClick={onCheckIn}
                disabled={isCheckedInToday}
                className={`w-full py-4 rounded-2xl font-bold text-lg shadow-lg transition-all flex items-center justify-center gap-2 ${
                    isCheckedInToday 
                        ? 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-default'
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white hover:scale-[1.02] active:scale-95 shadow-blue-500/30'
                }`}
            >
                {isCheckedInToday ? (
                    <>
                        <Check size={20} />
                        <span>今日已簽到</span>
                    </>
                ) : (
                    <>
                        <Gift size={20} className="animate-bounce" />
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