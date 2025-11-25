
import React, { useState } from 'react';
import { ArrowLeft, Coins, Sparkles, AlertCircle } from 'lucide-react';
import { User } from '../types';

interface LuckyWheelScreenProps {
  user: User;
  onBack: () => void;
  onSpinEnd: (prize: number, cost: number) => void;
}

// Added 'weight' property. Lower weight = lower chance.
// Total weight doesn't need to be 100, logic handles the sum.
const PRIZES = [
  { label: '50 PT', value: 50, color: '#3B82F6', text: '#fff', weight: 5 },
  { label: '再接再厲', value: 0, color: '#E5E7EB', text: '#6B7280', weight: 20 },
  { label: '10 PT', value: 10, color: '#10B981', text: '#fff', weight: 30 },
  { label: '20 PT', value: 20, color: '#F59E0B', text: '#fff', weight: 15 },
  { label: '銘謝惠顧', value: 0, color: '#E5E7EB', text: '#6B7280', weight: 20 },
  { label: '100 PT', value: 100, color: '#8B5CF6', text: '#fff', weight: 3 },
  { label: '5 PT', value: 5, color: '#EC4899', text: '#fff', weight: 30 },
  { label: '大獎 500', value: 500, color: '#EF4444', text: '#fff', weight: 1 },
];

const SPIN_COST = 20;

export const LuckyWheelScreen: React.FC<LuckyWheelScreenProps> = ({ user, onBack, onSpinEnd }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastPrize, setLastPrize] = useState<{label: string, value: number} | null>(null);

  const handleSpin = () => {
    if (user.points < SPIN_COST) {
        alert("積分不足！需要 20 PT");
        return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setLastPrize(null);

    // --- Weighted Random Selection Logic ---
    const totalWeight = PRIZES.reduce((sum, item) => sum + item.weight, 0);
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

    // Calculate rotation to land on the specific index
    // Each slice is 360 / 8 = 45 deg
    const sliceAngle = 360 / PRIZES.length;
    
    // Add random noise within the slice (keep away from edges)
    const randomOffset = Math.random() * (sliceAngle - 10) + 5; 
    
    // We rotate backwards to simulate the wheel spinning clockwise.
    // Base rotation (5 full spins) + adjustment to align index 0 to top + index offset
    // Visual correction: If we want index N to be at top (0 deg), we need to rotate - (N * angle).
    const extraSpins = 360 * 5; 
    const targetAngle = selectedIndex * sliceAngle;
    
    // Calculate final rotation value
    // Current rotation + extra spins + (amount to get back to 0) - (target index position)
    // We add randomness to make it stop naturally inside the slice
    const newRotation = rotation + extraSpins + (360 - (rotation % 360)) - targetAngle - randomOffset;

    setRotation(newRotation);

    setTimeout(() => {
        setIsSpinning(false);
        setLastPrize(selectedPrize);
        // Important: This calls the App.tsx handler which updates the DB
        onSpinEnd(selectedPrize.value, SPIN_COST);
    }, 4000); // 4s animation matches CSS transition
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

        {/* Wheel Container */}
        <div className="relative z-10 scale-90 md:scale-100">
            {/* Pointer */}
            <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 z-20">
                <div className="w-0 h-0 border-l-[15px] border-l-transparent border-r-[15px] border-r-transparent border-t-[30px] border-t-red-500 drop-shadow-lg"></div>
            </div>

            {/* The Wheel */}
            <div 
                className="w-80 h-80 rounded-full border-8 border-yellow-500 shadow-[0_0_50px_rgba(234,179,8,0.3)] relative overflow-hidden transition-transform duration-[4000ms] cubic-bezier(0.15, 0, 0.2, 1)"
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
                                transformOrigin: '0% 50%', // Rotate around center
                            }}
                        >
                            <div 
                                className="absolute inset-0 w-full h-full origin-top-left"
                                style={{ 
                                    backgroundColor: prize.color,
                                    transform: `skewY(${90 - angle}deg) rotate(${angle/2}deg)`, // Correct shape
                                    borderRight: '1px solid rgba(0,0,0,0.1)'
                                }}
                            >
                            </div>
                            {/* Text Content */}
                            <span 
                                className="absolute text-xs font-bold whitespace-nowrap"
                                style={{
                                    transform: `rotate(${angle/2}deg) translate(80px, 0)`, // Push text out
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
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-14 h-14 bg-white rounded-full border-4 border-gray-200 shadow-inner flex items-center justify-center z-10">
                <Sparkles size={24} className="text-yellow-500" />
            </div>
        </div>

        {/* Action Area */}
        <div className="mt-12 text-center z-10 space-y-4">
            {lastPrize ? (
                <div className="animate-in zoom-in slide-in-from-bottom duration-300">
                    <div className="text-white text-lg font-bold mb-2">結果出爐！</div>
                    <div className="bg-white text-gray-900 px-8 py-4 rounded-2xl shadow-xl border-4 border-yellow-400">
                        <span className="text-2xl font-black">{lastPrize.label}</span>
                        {lastPrize.value > 0 && <span className="block text-sm text-yellow-600 font-bold">+{lastPrize.value} PT</span>}
                    </div>
                </div>
            ) : (
                <div className="h-[92px] flex flex-col justify-end">
                    <p className="text-gray-400 text-sm mb-2 flex items-center justify-center gap-1">
                        <AlertCircle size={14} /> 每次消耗 {SPIN_COST} PT
                    </p>
                </div>
            )}

            <button 
                onClick={handleSpin}
                disabled={isSpinning}
                className={`
                    px-10 py-4 rounded-full font-black text-xl shadow-lg transition-all transform
                    ${isSpinning 
                        ? 'bg-gray-600 text-gray-400 cursor-not-allowed scale-95' 
                        : 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white hover:scale-105 hover:shadow-orange-500/50 active:scale-95'
                    }
                `}
            >
                {isSpinning ? '好運旋轉中...' : '開始轉動！'}
            </button>
        </div>

    </div>
  );
};
