
import React, { useState, useMemo } from 'react';
import { ArrowLeft, Coins, Sparkles, AlertCircle, Info, X } from 'lucide-react';
import { User } from '../types';

interface LuckyWheelScreenProps {
  user: User;
  onBack: () => void;
  onSpinEnd: (prize: number, cost: number) => void;
}

// Updated Colors for better contrast
const PRIZES = [
  { label: '50 PT', value: 50, color: '#4F46E5', text: '#fff', weight: 10 },
  { label: '再接再厲', value: 0, color: '#E5E7EB', text: '#6B7280', weight: 25 },
  { label: '10 PT', value: 10, color: '#10B981', text: '#fff', weight: 30 },
  { label: '20 PT', value: 20, color: '#F59E0B', text: '#fff', weight: 15 },
  { label: '銘謝惠顧', value: 0, color: '#E5E7EB', text: '#6B7280', weight: 25 },
  { label: '100 PT', value: 100, color: '#8B5CF6', text: '#fff', weight: 3 },
  { label: '5 PT', value: 5, color: '#EC4899', text: '#fff', weight: 30 },
  { label: '大獎 500', value: 500, color: '#EF4444', text: '#fff', weight: 1 },
];

const SPIN_COST = 20;
const WHEEL_SIZE = 320;
const RADIUS = WHEEL_SIZE / 2;

// Sound Effect Helper
const playTickSound = () => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.05);
    } catch(e) {}
};

export const LuckyWheelScreen: React.FC<LuckyWheelScreenProps> = ({ user, onBack, onSpinEnd }) => {
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [lastPrize, setLastPrize] = useState<{label: string, value: number} | null>(null);
  const [showProbabilities, setShowProbabilities] = useState(false);

  const totalWeight = PRIZES.reduce((sum, item) => sum + item.weight, 0);

  // Generate SVG Paths for Slices
  const slices = useMemo(() => {
    const totalSlices = PRIZES.length;
    const anglePerSlice = 360 / totalSlices;

    return PRIZES.map((prize, index) => {
      const startAngle = index * anglePerSlice;
      const endAngle = (index + 1) * anglePerSlice;

      // Convert polar to cartesian
      const x1 = RADIUS + RADIUS * Math.cos(Math.PI * startAngle / 180);
      const y1 = RADIUS + RADIUS * Math.sin(Math.PI * startAngle / 180);
      const x2 = RADIUS + RADIUS * Math.cos(Math.PI * endAngle / 180);
      const y2 = RADIUS + RADIUS * Math.sin(Math.PI * endAngle / 180);

      // SVG Path Command
      const d = `M ${RADIUS} ${RADIUS} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`;
      
      // Calculate text position (mid-angle)
      const midAngle = startAngle + anglePerSlice / 2;
      // Position text at 70% radius
      const textRadius = RADIUS * 0.7; 
      const textX = RADIUS + textRadius * Math.cos(Math.PI * midAngle / 180);
      const textY = RADIUS + textRadius * Math.sin(Math.PI * midAngle / 180);

      return {
          d,
          fill: prize.color,
          textFill: prize.text,
          label: prize.label,
          textX,
          textY,
          rotation: midAngle // Text rotation to face center
      };
    });
  }, []);

  const handleSpin = () => {
    if (user.points < SPIN_COST) {
        alert("積分不足！需要 20 PT");
        return;
    }
    if (isSpinning) return;

    setIsSpinning(true);
    setLastPrize(null);

    // Weighted Random Selection
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
    
    // Calculate final rotation
    const sliceAngle = 360 / PRIZES.length;
    // We need the pointer (at 270deg / -90deg top) to land on the slice
    // Slice 0 starts at 0deg (3 o'clock). 
    // To land Slice 0 at Top (270deg), we need to rotate -90deg or 270deg.
    // The pointer is static at top. 
    
    // Calculate the CENTER angle of the target slice
    const targetSliceCenterAngle = (selectedIndex * sliceAngle) + (sliceAngle / 2);
    
    // We want this angle to be at 270 degrees (Top) after rotation
    // Current Position + Delta = Final Position
    // We want Final Position % 360 such that the slice aligns with 270.
    // Actually easier: We rotate the WHEEL counter-clockwise to bring the slice to top.
    // Or clockwise. Let's spin huge clockwise.
    
    const extraSpins = 360 * 5; // 5 full spins
    // Random jitter +/- 40% of slice width
    const jitter = (Math.random() - 0.5) * (sliceAngle * 0.8);
    
    // To align `targetSliceCenterAngle` with 270deg:
    // rotation = 270 - targetSliceCenterAngle + 360*N
    const finalRotation = 270 - targetSliceCenterAngle + extraSpins + jitter;
    
    // Adjust from current rotation to ensure smooth forward spin
    // Current rotation might be e.g. 1080. We want to go to a value > 1080.
    const currentRotMod = rotation % 360;
    const diff = finalRotation - currentRotMod;
    // Ensure we always spin forward at least a few times
    const realFinalRotation = rotation + diff + (360 * 5);

    setRotation(realFinalRotation);
    
    // Fake Ticking Sound Logic
    let tickCount = 0;
    const interval = setInterval(() => {
        tickCount++;
        if (tickCount < 20) playTickSound(); // Play some ticks
        else clearInterval(interval);
    }, 200);

    setTimeout(() => {
        setIsSpinning(false);
        setLastPrize(selectedPrize);
        onSpinEnd(selectedPrize.value, SPIN_COST);
        clearInterval(interval);
    }, 4500); // slightly longer than CSS transition to be safe
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1a1a2e] flex flex-col items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-900/50 via-[#1a1a2e] to-black"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')]"></div>

        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-10">
            <button onClick={onBack} className="p-2 bg-white/10 rounded-full text-white hover:bg-white/20 transition-colors">
                <ArrowLeft size={24} />
            </button>
            <div className="flex items-center gap-2 bg-black/40 px-4 py-2 rounded-full border border-white/10 backdrop-blur-md shadow-lg">
                <Coins className="text-yellow-400" size={18} />
                <span className="font-bold text-white font-mono">{user.points} PT</span>
            </div>
        </div>

        {/* Probability Modal */}
        {showProbabilities && (
            <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 relative border border-gray-700 shadow-2xl">
                    <button 
                        onClick={() => setShowProbabilities(false)}
                        className="absolute top-4 right-4 text-gray-400 hover:text-white"
                    >
                        <X size={20} />
                    </button>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 text-center border-b border-gray-700 pb-2">獎項機率一覽</h3>
                    <div className="space-y-2 text-sm max-h-[60vh] overflow-y-auto">
                        {PRIZES.map((prize, idx) => (
                            <div key={idx} className="flex justify-between items-center py-2 px-2 hover:bg-gray-700 rounded transition-colors">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 rounded-full" style={{background: prize.color}}></div>
                                    <span className="font-medium text-gray-700 dark:text-gray-200">{prize.label}</span>
                                </div>
                                <span className="font-mono text-gray-500 dark:text-gray-400 font-bold">
                                    {((prize.weight / totalWeight) * 100).toFixed(1)}%
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Wheel Container */}
        <div className="relative z-10 scale-90 md:scale-100 mb-8 mt-10">
            
            {/* Bezel (Lights Ring) */}
            <div className="absolute -inset-4 rounded-full border-[12px] border-[#2d2d44] shadow-[0_0_50px_rgba(0,0,0,0.8)] flex items-center justify-center">
                 {/* Decorative dots representing lights */}
                 {Array.from({length: 24}).map((_, i) => (
                     <div 
                        key={i}
                        className={`absolute w-3 h-3 rounded-full ${isSpinning ? 'animate-pulse' : ''}`}
                        style={{
                            background: i % 2 === 0 ? '#fbbf24' : '#ef4444',
                            top: '50%',
                            left: '50%',
                            transform: `translate(-50%, -50%) rotate(${i * 15}deg) translate(176px)`,
                            boxShadow: `0 0 10px ${i % 2 === 0 ? '#fbbf24' : '#ef4444'}`
                        }}
                     ></div>
                 ))}
            </div>

            {/* Pointer */}
            <div className="absolute -top-10 left-1/2 transform -translate-x-1/2 z-30 filter drop-shadow-xl">
                <div className="w-8 h-12 bg-gradient-to-b from-red-500 to-red-700 clip-path-polygon-[50%_100%,_0%_0%,_100%_0%] rounded-t-lg"></div>
                <div className="w-2 h-2 bg-white rounded-full absolute top-1 left-1/2 -translate-x-1/2 opacity-50"></div>
            </div>

            {/* SVG Wheel */}
            <div 
                className="w-[320px] h-[320px] rounded-full relative overflow-hidden shadow-2xl"
                style={{ 
                    transform: `rotate(${rotation}deg)`,
                    transition: isSpinning ? 'transform 4s cubic-bezier(0.2, 0, 0.2, 1)' : 'none'
                }}
            >
                <svg viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`} className="w-full h-full transform rotate-0">
                    {slices.map((slice, i) => (
                        <g key={i}>
                            <path d={slice.d} fill={slice.fill} stroke="#1a1a2e" strokeWidth="2" />
                            <text
                                x={slice.textX}
                                y={slice.textY}
                                fill={slice.textFill}
                                textAnchor="middle"
                                dominantBaseline="middle"
                                fontSize="14"
                                fontWeight="bold"
                                transform={`rotate(${slice.rotation + 180}, ${slice.textX}, ${slice.textY})`} // +180 to read from outside in
                                style={{ textShadow: '0px 1px 2px rgba(0,0,0,0.5)' }}
                            >
                                {slice.label}
                            </text>
                        </g>
                    ))}
                </svg>
            </div>

            {/* Center Cap */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-20 h-20 bg-gradient-to-b from-gray-800 to-black rounded-full border-4 border-[#fbbf24] shadow-2xl flex items-center justify-center z-20">
                <div className="w-16 h-16 rounded-full border border-gray-600 bg-gray-900 flex items-center justify-center">
                    <Sparkles size={28} className="text-yellow-500 animate-pulse" />
                </div>
            </div>
        </div>

        {/* Action Area */}
        <div className="text-center z-10 w-full max-w-xs px-4 relative mt-4">
            {lastPrize ? (
                <div className="animate-in zoom-in slide-in-from-bottom duration-300 mb-6 relative">
                     {/* Glow behind result */}
                    <div className="absolute inset-0 bg-yellow-500/20 blur-xl rounded-full"></div>
                    
                    <div className="relative">
                        <div className="text-yellow-400 text-sm font-bold mb-2 tracking-widest uppercase animate-pulse">Winner</div>
                        <div className="bg-gradient-to-b from-gray-800 to-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl border-2 border-yellow-500/50">
                            <span className="text-3xl font-black block text-transparent bg-clip-text bg-gradient-to-r from-yellow-200 to-yellow-500">{lastPrize.label}</span>
                            {lastPrize.value > 0 ? (
                                <span className="text-sm text-green-400 font-bold mt-1 block">+{lastPrize.value} PT</span>
                            ) : (
                                <span className="text-sm text-gray-500 font-bold mt-1 block">再試一次！</span>
                            )}
                        </div>
                    </div>
                </div>
            ) : (
                <div className="h-[100px] flex flex-col justify-end mb-6">
                    <div className="text-blue-200 text-xs mb-2 flex items-center justify-center gap-1 bg-black/40 py-1.5 px-4 rounded-full mx-auto w-fit border border-blue-500/30">
                        <AlertCircle size={12} /> 每次消耗 {SPIN_COST} PT
                    </div>
                </div>
            )}

            <button 
                onClick={handleSpin}
                disabled={isSpinning}
                className={`
                    w-full py-4 rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(234,179,8,0.3)] transition-all transform relative overflow-hidden group
                    ${isSpinning 
                        ? 'bg-gray-700 text-gray-500 cursor-not-allowed scale-95' 
                        : 'bg-gradient-to-r from-yellow-500 to-orange-600 text-white hover:scale-105 active:scale-95 border-b-4 border-orange-800'
                    }
                `}
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300"></div>
                <span className="relative flex items-center justify-center gap-2">
                    {isSpinning ? 'SPINNING...' : <><Sparkles size={20}/> SPIN!</>}
                </span>
            </button>

            <button 
                onClick={() => setShowProbabilities(true)}
                className="mt-6 text-gray-400 text-xs flex items-center justify-center gap-1 hover:text-white transition-colors uppercase tracking-wider"
            >
                <Info size={12} /> 查看機率表
            </button>
        </div>
    </div>
  );
};
