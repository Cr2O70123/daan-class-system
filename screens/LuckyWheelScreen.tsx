
import React, { useState } from 'react';
import { ArrowLeft, Coins, Sparkles, AlertCircle, Info, X } from 'lucide-react';
import { User } from '../types';

interface LuckyWheelScreenProps {
  user: User;
  onBack: () => void;
  onSpinEnd: (prize: number, cost: number) => void;
}

// Added 'weight' property. Lower weight = lower chance.
const PRIZES = [
  { label: '50 PT', value: 50, color: '#3B82F6', text: '#fff', weight: 10 },
  { label: '再接再厲', value: 0, color: '#E5E7EB', text: '#6B7280', weight: 25 },
  { label: '10 PT', value: 10, color: '#10B981', text: '#fff', weight: 30 },
  { label: '20 PT', value: 20, color: '#F59E0B', text: '#fff', weight: 15 },
  { label: '銘謝惠顧', value: 0, color: '#E5E7EB', text: '#6B7280', weight: 25 },
  { label: '100 PT', value: 100, color: '#8B5CF6', text: '#fff', weight: 3 },
  { label: '5 PT', value: 5, color: '#EC4899', text: '#fff', weight: 30 },
  { label: '大獎 500', value: 500, color: '#EF4444', text: '#fff', weight: 1 },
];

const SPIN_COST = 20;

export const LuckyWheelScreen: React.FC<LuckyWheelScreenProps> = ({ user, onBack, onSpinEnd }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastPrize, setLastPrize] = useState<{label: string, value: number} | null>(null);
  const [showProbabilities, setShowProbabilities] = useState(false);

  const totalWeight = PRIZES.reduce((sum, item) => sum + item.weight, 0);

  const handleSpin = () => {
    if (user.points < SPIN_COST) {
        alert("積分不足！需要 20 PT");
        return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setLastPrize(null);

    // --- Weighted Random Selection Logic ---
    let randomNum = Math.random() * totalWeight;
    let selectedIndex = 0;

    for (let i = 0; i < PRIZES.length; i++) {
        if (randomNum < PRIZES[i].weight) {
            selectedIndex = i;
            break;
        }
        randomNum -= PRIZES[i].weight;
    }

    const selectedPrize = PRIZES[selectedIndex];
    // ---------------------------------------

    // Calculate rotation
    const sliceAngle = 360 / PRIZES.length;
    // Random offset within the slice to look natural
    const randomOffset = Math.random() * (sliceAngle - 10) + 5; 
    
    // Spins (at least 5 full rotations)
    const extraSpins = 360 * 5; 
    const targetAngle = selectedIndex * sliceAngle;
    
    // Current rotation + extra spins + (amount to get back to 0) - (target index position)
    const newRotation = rotation + extraSpins + (360 - (rotation % 360)) - targetAngle - randomOffset;

    setRotation(newRotation);

    setTimeout(() => {
        setIsSpinning(false);
        setLastPrize(selectedPrize);
        onSpinEnd(selectedPrize.value, SPIN_COST);
    }, 4000); // 4s animation
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-900 flex flex-col items-center justify-center overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900 via-gray-900 to-black opacity-80"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-10">
            <button onClick={onBack} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md">
                <Coins className="text-yellow-400" size={18} />
                <span className="font-bold text-white font-mono">{user.points} PT</span>
            </div>
        </div>

        {/* Probability Modal */}
        {showProbabilities && (
            <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 relative">
                    <button 
                        onClick={() => setShowProbabilities(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X size={20} />
                    </button>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center">獎項機率一覽</h3>
                    <div className="space-y-2 text-sm">
                        {PRIZES.map((prize, idx) => (
                            <div key={idx} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2">
                                <span className="font-medium text-gray-700 dark:text-gray-300">{prize.label}</span>
                                <span className="font-mono text-gray-500 dark:text-gray-400">
                                    {((prize.weight / totalWeight) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Wheel Container */}
        <div className="relative z-10 scale-90 md:scale-100 mb-8">
            {/* Pointer */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-500 drop-shadow-lg filter drop-shadow-[0_4px_4px_rgba(0,0,0,0.5)]"></div>
            </div>

            {/* The Wheel */}
            <div 
                className="w-80 h-80 rounded-full border-8 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.4)] relative overflow-hidden transition-transform duration-[4000ms] cubic-bezier(0.15, 0, 0.2, 1)"
                style={{ 
                    transform: `rotate(${rotation}deg)`,
                    background: 'conic-gradient(from 0deg, transparent 0%, transparent 100%)' 
                }}
            >
                {PRIZES.map((prize, idx) => {
                    const angle = 360 / PRIZES.length;
                    const rotate = idx * angle;
                    return (
                        <div 
                            key={idx}
                            className="absolute top-0 left-1/2 w-1/2 h-full origin-left flex items-center justify-center"
                            style={{ 
                                transform: `rotate(${rotate}deg) skewY(-${90 - angle}deg)`,
                                transformOrigin: '0% 50%', 
                            }}
                        >
                            <div 
                                className="absolute inset-0 w-full h-full origin-top-left"
                                style={{ 
                                    backgroundColor: prize.color,
                                    transform: `skewY(${90 - angle}deg) rotate(${angle/2}deg)`,
                                    borderRight: '1px solid rgba(0,0,0,0.1)'
                                }}
                            >
                            </div>
                            <span 
                                className="absolute text-xs font-bold whitespace-nowrap shadow-black drop-shadow-md"
                                style={{
                                    transform: `rotate(${angle/2}deg) translate(80px, 0)`,
                                    color: prize.text
                                }}
                            >
                                {prize.label}
                            </span>
                        </div>
                    )
                })}
            </div>

            {/* Center Cap */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 bg-gradient-to-br from-white to-gray-200 rounded-full border-4 border-yellow-500 shadow-xl flex items-center justify-center z-10">
                <Sparkles size={28} className="text-yellow-600" />
            </div>
        </div>

        {/* Action Area */}
        <div className="text-center z-10 w-full max-w-xs px-4">
            {lastPrize ? (
                <div className="animate-in zoom-in slide-in-from-bottom duration-300 mb-6">
                    <div className="text-yellow-300 text-lg font-bold mb-2 animate-pulse">RESULT</div>
                    <div className="bg-white/90 backdrop-blur text-gray-900 px-8 py-4 rounded-2xl shadow-[0_0_30px_rgba(255,255,255,0.2)] border-4 border-yellow-400">
                        <span className="text-2xl font-black block">{lastPrize.label}</span>
                        {lastPrize.value > 0 ? (
                            <span className="text-sm text-green-600 font-bold">+{lastPrize.value} PT</span>
                        ) : (
                            <span className="text-sm text-gray-500 font-bold">再試一次！</span>
                        )}
                    </div>
                </div>
            ) : (
                <div className="h-[92px] flex flex-col justify-end mb-6">
                    <p className="text-blue-200 text-sm mb-2 flex items-center justify-center gap-1 bg-blue-900/40 py-1 px-3 rounded-full mx-auto w-fit">
                        <AlertCircle size={14} /> 每次消耗 {SPIN_COST} PT
                    </p>
                </div>
            )}

            <button 
                onClick={handleSpin}
                disabled={isSpinning}
                className={`
                    w-full py-4 rounded-2xl font-black text-xl shadow-[0_10px_20px_rgba(0,0,0,0.3)] transition-all transform
                    ${isSpinning 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed scale-95' 
                        : 'bg-gradient-to-b from-yellow-400 to-orange-600 text-white hover:scale-105 hover:shadow-orange-500/50 active:scale-95 border-b-4 border-orange-800'
                    }
                `}
            >
                {isSpinning ? '好運旋轉中...' : 'SPIN!'}
            </button>

            <button 
                onClick={() => setShowProbabilities(true)}
                className="mt-6 text-gray-400 text-xs flex items-center justify-center gap-1 hover:text-white transition-colors"
            >
                <Info size={12} /> 查看機率表
            </button>
        </div>

    </div>
  );
};
