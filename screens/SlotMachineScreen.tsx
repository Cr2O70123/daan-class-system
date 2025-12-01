
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Coins, Gem, RefreshCw, Trophy, Info, X, Zap, Star } from 'lucide-react';
import { User } from '../types';

interface SlotMachineScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (netBmc: number) => void;
}

const SYMBOLS = ['🍒', '🍋', '🍇', '🔔', '💎', '7️⃣'];
const WEIGHTS = [30, 25, 20, 15, 8, 2]; // Probabilities (Higher index = rarer)

// Payouts
const PAYOUTS: Record<string, number> = {
    '🍒': 3,
    '🍋': 5,
    '🍇': 8,
    '🔔': 10,
    '💎': 50,
    '7️⃣': 100
};

// --- Sound Helper (Simple) ---
const playTone = (freq: number, type: OscillatorType, dur: number) => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + dur);
    } catch(e) {}
};

// --- Rules Modal ---
const RulesModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
        <div className="bg-[#120a2e] border-2 border-purple-500 rounded-2xl p-6 max-w-sm w-full text-white shadow-[0_0_50px_rgba(168,85,247,0.3)] relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-purple-400 hover:text-white bg-white/10 p-1 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Info size={24} className="text-purple-500"/> Game Rules
            </h3>
            <ul className="space-y-4 text-sm text-gray-300 font-medium leading-relaxed">
                <li className="flex gap-3">
                    <span className="text-purple-500 font-bold text-lg">01.</span>
                    <span>本機台僅接受 <span className="text-purple-400 font-bold">黑幣 (BMC)</span> 投注。</span>
                </li>
                <li className="flex gap-3">
                    <span className="text-purple-500 font-bold text-lg">02.</span>
                    <span>達成 <span className="text-white font-bold">3 個相同圖案</span> 連線即可獲得獎勵。</span>
                </li>
                <li className="flex gap-3">
                    <span className="text-purple-500 font-bold text-lg">03.</span>
                    <span>
                        賠率表 (3連線)：<br/>
                        <span className="text-yellow-400">7️⃣ x100</span> | <span className="text-cyan-400">💎 x50</span> | <span className="text-white">🔔 x10</span><br/>
                        <span className="text-gray-400">🍇 x8 | 🍋 x5 | 🍒 x3</span>
                    </span>
                </li>
                <li className="flex gap-3">
                    <span className="text-purple-500 font-bold text-lg">04.</span>
                    <span>特殊規則：若出現 2 個 🍒，返還 1 倍賭金 (保本)。</span>
                </li>
            </ul>
            <button onClick={onClose} className="w-full mt-8 bg-purple-700 hover:bg-purple-600 text-white py-3 rounded-xl font-bold shadow-lg border border-purple-500 transition-all">
                開始遊戲
            </button>
        </div>
    </div>
);

export const SlotMachineScreen: React.FC<SlotMachineScreenProps> = ({ user, onBack, onFinish }) => {
    const [reels, setReels] = useState(['7️⃣', '7️⃣', '7️⃣']);
    const [isSpinning, setIsSpinning] = useState(false);
    const [betStr, setBetStr] = useState('10');
    const [winAmount, setWinAmount] = useState(0);
    const [message, setMessage] = useState("READY TO SPIN");
    const [showRules, setShowRules] = useState(false);

    // Generate random symbol based on weights
    const getRandomSymbol = () => {
        const totalWeight = WEIGHTS.reduce((a, b) => a + b, 0);
        let random = Math.random() * totalWeight;
        for (let i = 0; i < WEIGHTS.length; i++) {
            if (random < WEIGHTS[i]) return SYMBOLS[i];
            random -= WEIGHTS[i];
        }
        return SYMBOLS[0];
    };

    const spin = () => {
        if (isSpinning) return;
        const bet = parseInt(betStr);
        if (isNaN(bet) || bet <= 0) {
            alert("請輸入有效金額");
            return;
        }
        if ((user.blackMarketCoins || 0) < bet) {
            alert("黑幣不足！請前往交易所");
            return;
        }

        setIsSpinning(true);
        setWinAmount(0);
        setMessage("SPINNING...");
        
        // Animation
        let spins = 0;
        const interval = setInterval(() => {
            setReels([getRandomSymbol(), getRandomSymbol(), getRandomSymbol()]);
            playTone(200 + Math.random()*100, 'square', 0.05);
            spins++;
            if (spins > 20) {
                clearInterval(interval);
                finalizeSpin(bet);
            }
        }, 100);
    };

    const finalizeSpin = (bet: number) => {
        // Determine final result
        const finalReels = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
        setReels(finalReels);
        setIsSpinning(false);

        // Check Win
        let multiplier = 0;
        if (finalReels[0] === finalReels[1] && finalReels[1] === finalReels[2]) {
            // 3 Match
            multiplier = PAYOUTS[finalReels[0]];
        } else if ((finalReels[0] === '🍒' && finalReels[1] === '🍒') || (finalReels[1] === '🍒' && finalReels[2] === '🍒') || (finalReels[0] === '🍒' && finalReels[2] === '🍒')) {
            // 2 Cherries Small Win
            multiplier = 1; 
        }

        const winnings = bet * multiplier;
        const netChange = winnings - bet; // Deduct bet cost, add winnings

        if (winnings > 0) {
            setWinAmount(winnings);
            setMessage(winnings >= bet * 50 ? "JACKPOT!!!" : "WINNER!");
            playTone(600, 'sine', 0.1);
            setTimeout(() => playTone(800, 'sine', 0.2), 100);
            setTimeout(() => playTone(1000, 'sine', 0.4), 200);
        } else {
            setMessage("NO WIN");
        }

        onFinish(netChange);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0d0221] flex flex-col text-white font-sans overflow-hidden">
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}

            {/* Background Grid & Effects */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)]"></div>
            <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-purple-900/20 to-transparent"></div>

            {/* Header */}
            <div className="p-4 pt-safe flex items-center justify-between z-10 border-b border-purple-800/50 bg-black/40 backdrop-blur-sm sticky top-0">
                <button onClick={onBack} className="p-2 bg-purple-900/50 rounded-full hover:bg-purple-800 transition-colors">
                    <ArrowLeft size={20} className="text-purple-300" />
                </button>
                <div className="flex items-center gap-2">
                    <Gem size={20} className="text-pink-500 animate-pulse" />
                    <span className="font-black text-xl tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-600 drop-shadow-md">
                        NEON SLOTS
                    </span>
                </div>
                <button onClick={() => setShowRules(true)} className="p-2 bg-purple-900/50 rounded-full hover:bg-purple-800 transition-colors">
                    <Info size={20} className="text-purple-300" />
                </button>
            </div>

            {/* Main Game */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                
                {/* Machine Body */}
                <div className="bg-[#1a1a2e] p-6 rounded-[2.5rem] shadow-[0_0_60px_rgba(192,38,211,0.2)] border-4 border-purple-600/50 relative w-full max-w-sm overflow-hidden">
                    
                    {/* Top Decor */}
                    <div className="absolute top-4 left-1/2 -translate-x-1/2 w-32 h-2 bg-gradient-to-r from-transparent via-pink-500 to-transparent blur-sm"></div>

                    {/* Balance */}
                    <div className="flex justify-between items-center mb-6 bg-black/40 p-3 rounded-2xl border border-white/5">
                        <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">Balance</div>
                        <div className="font-mono font-black text-purple-300 flex items-center gap-2 text-lg">
                            <Gem size={14} className="text-purple-500" /> {user.blackMarketCoins || 0}
                        </div>
                    </div>

                    {/* Reels Screen */}
                    <div className="bg-black border-4 border-purple-500/30 rounded-2xl h-40 mb-6 flex items-center justify-center gap-1 overflow-hidden relative shadow-[inset_0_0_20px_rgba(0,0,0,0.8)]">
                        {/* Scanline Overlay */}
                        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')] opacity-10 pointer-events-none z-20"></div>
                        
                        {/* Reels */}
                        {reels.map((symbol, i) => (
                            <div key={i} className="flex-1 h-full flex items-center justify-center border-r border-purple-900/20 last:border-0 bg-gradient-to-b from-[#0a0a0a] via-[#1a1a1a] to-[#0a0a0a]">
                                <span className={`text-5xl filter drop-shadow-[0_0_10px_rgba(255,255,255,0.5)] transform transition-all duration-100 ${isSpinning ? 'blur-sm scale-75 opacity-50' : 'scale-100 opacity-100'}`}>
                                    {symbol}
                                </span>
                            </div>
                        ))}
                        
                        {/* Winning Line */}
                        <div className="absolute top-1/2 left-2 right-2 h-[2px] bg-red-500/40 pointer-events-none z-10 shadow-[0_0_5px_red]"></div>
                    </div>

                    {/* Message / Win Amount */}
                    <div className="text-center mb-6 h-12 flex flex-col justify-center">
                        <p className={`text-xs font-bold uppercase tracking-[0.3em] ${winAmount > 0 ? 'text-yellow-400' : 'text-purple-500'}`}>{message}</p>
                        {winAmount > 0 && (
                            <p className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-600 animate-bounce">
                                +{winAmount}
                            </p>
                        )}
                    </div>

                    {/* Controls */}
                    <div className="space-y-4">
                        {/* Bet Input */}
                        <div className="bg-[#0f0f1a] p-3 rounded-xl border border-purple-800/30 flex flex-col items-center">
                            <label className="text-[9px] text-gray-500 uppercase tracking-wider font-bold mb-1">Bet Amount (BMC)</label>
                            <div className="flex w-full gap-2">
                                <input 
                                    type="number"
                                    value={betStr}
                                    onChange={(e) => setBetStr(e.target.value)}
                                    disabled={isSpinning}
                                    className="flex-1 bg-transparent text-center text-xl font-black text-white outline-none border-b-2 border-purple-500 focus:border-pink-500 transition-colors"
                                />
                                <button 
                                    onClick={() => setBetStr((user.blackMarketCoins || 0).toString())}
                                    disabled={isSpinning}
                                    className="text-xs bg-purple-900/50 text-purple-300 px-2 rounded font-bold hover:bg-purple-800"
                                >
                                    MAX
                                </button>
                            </div>
                        </div>

                        <button 
                            onClick={spin}
                            disabled={isSpinning}
                            className={`
                                w-full py-5 rounded-2xl font-black text-2xl tracking-[0.2em] shadow-lg transform transition-all flex items-center justify-center gap-2 group relative overflow-hidden
                                ${isSpinning 
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed scale-95' 
                                    : 'bg-gradient-to-r from-pink-600 to-purple-600 hover:from-pink-500 hover:to-purple-500 text-white active:scale-95 shadow-purple-500/40'}
                            `}
                        >
                            {/* Shiny Effect */}
                            {!isSpinning && <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 pointer-events-none"></div>}
                            
                            {isSpinning ? <RefreshCw className="animate-spin"/> : 'SPIN'}
                        </button>
                    </div>
                </div>
                
                {/* Footer Decor */}
                <div className="mt-8 opacity-30 flex gap-4">
                    <Zap size={24} className="text-purple-500" />
                    <Star size={24} className="text-pink-500" />
                    <Trophy size={24} className="text-yellow-500" />
                </div>
            </div>
        </div>
    );
};
