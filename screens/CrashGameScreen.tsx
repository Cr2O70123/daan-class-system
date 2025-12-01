
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Rocket, AlertTriangle, TrendingUp, Gem, X } from 'lucide-react';
import { User } from '../types';

interface CrashGameScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (netBmc: number) => void;
}

export const CrashGameScreen: React.FC<CrashGameScreenProps> = ({ user, onBack, onFinish }) => {
    const [bet, setBet] = useState<string>('10');
    const [multiplier, setMultiplier] = useState(1.00);
    const [gameState, setGameState] = useState<'IDLE' | 'RUNNING' | 'CRASHED' | 'CASHED_OUT'>('IDLE');
    const [cashedOutAt, setCashedOutAt] = useState<number | null>(null);
    const [crashPoint, setCrashPoint] = useState(0);
    const [history, setHistory] = useState<number[]>([]);
    
    // Animation refs
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);

    const houseEdge = 0.04; // 4% House Edge

    const generateCrashPoint = () => {
        // Classic Crash Formula: E = 1 / (rand * (1 - edge))
        // If E < 1.00, it crashes instantly (represented as 1.00 usually or handle separately)
        const r = Math.random();
        const crash = 1 / (r * (1 - houseEdge));
        return Math.max(1.00, Math.floor(crash * 100) / 100);
    };

    const startGame = () => {
        const betAmount = parseInt(bet);
        if (isNaN(betAmount) || betAmount <= 0) {
            alert("請輸入有效賭注");
            return;
        }
        if (betAmount > (user.blackMarketCoins || 0)) {
            alert("黑幣不足");
            return;
        }

        setGameState('RUNNING');
        setCashedOutAt(null);
        setMultiplier(1.00);
        
        const point = generateCrashPoint();
        setCrashPoint(point);
        // console.log("Crash Point (Debug):", point); 

        startTimeRef.current = Date.now();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const gameLoop = () => {
        const now = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000; // seconds
        
        // Growth function: M = e^(0.06 * t)
        // Adjust speed constant to make it feel right
        const currentM = Math.pow(Math.E, 0.1 * elapsed);
        
        if (currentM >= crashPoint) {
            setMultiplier(crashPoint);
            handleCrash(crashPoint);
        } else {
            setMultiplier(currentM);
            requestRef.current = requestAnimationFrame(gameLoop);
        }
    };

    const handleCrash = (finalPoint: number) => {
        cancelAnimationFrame(requestRef.current!);
        setGameState('CRASHED');
        setHistory(prev => [finalPoint, ...prev].slice(0, 5));
        
        // If user didn't cash out, they lose
        if (cashedOutAt === null) {
            onFinish(-parseInt(bet));
        }
    };

    const cashOut = () => {
        if (gameState !== 'RUNNING') return;
        const currentM = multiplier;
        setCashedOutAt(currentM);
        // User wins immediately in UI, but game continues in background until crash for visual
        // Actually, typically game continues visually. 
        // We just mark the state as CASHED_OUT visually for the user button area,
        // but keeps the loop running to show where it crashes.
    };

    // Effect to handle cash out payout when game actually crashes (or handle immediately)
    // To simplify: calculate win immediately
    useEffect(() => {
        if (cashedOutAt !== null && gameState === 'CRASHED') {
            const betAmount = parseInt(bet);
            const winnings = Math.floor(betAmount * cashedOutAt);
            const profit = winnings - betAmount;
            onFinish(profit);
        }
    }, [gameState]); // When state changes to CRASHED, finalize if cashed out

    useEffect(() => {
        return () => cancelAnimationFrame(requestRef.current!);
    }, []);

    // Helper to get color
    const getMultiplierColor = (val: number) => {
        if (val < 2) return 'text-white';
        if (val < 10) return 'text-green-400';
        return 'text-yellow-400';
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0F172A] flex flex-col text-white font-mono overflow-hidden">
            {/* Background Grid */}
            <div className="absolute inset-0 pointer-events-none opacity-20" 
                 style={{ 
                     backgroundImage: 'linear-gradient(#334155 1px, transparent 1px), linear-gradient(90deg, #334155 1px, transparent 1px)', 
                     backgroundSize: '40px 40px' 
                 }}>
            </div>

            {/* Header */}
            <div className="p-4 pt-safe flex justify-between items-center bg-slate-900/80 backdrop-blur z-10 border-b border-slate-700">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <Rocket size={20} className="text-rose-500" />
                    <span className="font-black text-lg tracking-widest text-rose-500">CYBER CRASH</span>
                </div>
                <div className="flex items-center gap-1 bg-slate-800 px-3 py-1 rounded-full text-xs border border-slate-700">
                    <Gem size={12} className="text-purple-400"/>
                    <span>{user.blackMarketCoins || 0}</span>
                </div>
            </div>

            {/* Game Canvas / Graph Area */}
            <div className="flex-1 relative flex flex-col items-center justify-center overflow-hidden">
                {/* Rocket Animation Placeholder */}
                <div className={`relative transition-transform duration-100 ${gameState === 'RUNNING' ? 'animate-vibrate' : ''}`}>
                    {gameState === 'CRASHED' ? (
                        <div className="text-center animate-in zoom-in duration-200">
                            <h1 className="text-6xl font-black text-red-600 mb-2">{crashPoint.toFixed(2)}x</h1>
                            <p className="text-red-400 font-bold uppercase tracking-widest">CRASHED</p>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h1 className={`text-7xl font-black ${getMultiplierColor(multiplier)} mb-4 tabular-nums tracking-tighter`}>
                                {multiplier.toFixed(2)}x
                            </h1>
                            {gameState === 'RUNNING' && (
                                <div className="absolute -right-20 top-0 animate-bounce">
                                    <Rocket size={48} className="text-rose-500 rotate-45 transform" />
                                    <div className="w-2 h-16 bg-gradient-to-t from-transparent to-orange-500 absolute top-full left-1/2 -translate-x-1/2 blur-sm"></div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* History Ticker */}
                <div className="absolute top-4 right-4 flex flex-col gap-2 items-end">
                    <span className="text-xs text-slate-500 font-bold uppercase">Recent</span>
                    {history.map((h, i) => (
                        <div key={i} className={`px-2 py-1 rounded text-xs font-bold ${h >= 2 ? 'bg-green-900/50 text-green-400' : 'bg-slate-800 text-slate-400'}`}>
                            {h.toFixed(2)}x
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 bg-slate-900 border-t border-slate-800 z-10 space-y-4">
                
                {/* Status Bar */}
                {cashedOutAt && (
                    <div className="bg-green-900/30 border border-green-500/30 p-3 rounded-xl flex justify-between items-center animate-in slide-in-from-bottom">
                        <span className="text-green-400 font-bold flex items-center gap-2"><TrendingUp size={16}/> CASHED OUT</span>
                        <span className="text-white font-black text-lg">+{Math.floor(parseInt(bet) * cashedOutAt - parseInt(bet))} BMC</span>
                    </div>
                )}

                {/* Bet Input */}
                <div className="flex gap-4">
                    <div className="flex-1">
                        <label className="text-xs text-slate-500 font-bold uppercase mb-1 block">Bet Amount</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={bet}
                                onChange={e => setBet(e.target.value)}
                                disabled={gameState === 'RUNNING'}
                                className="w-full bg-slate-800 text-white p-3 pl-10 rounded-xl border border-slate-700 outline-none focus:border-rose-500 font-mono text-lg"
                            />
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500"><Gem size={16}/></div>
                            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                                <button onClick={() => setBet(Math.floor(parseInt(bet)/2).toString())} disabled={gameState === 'RUNNING'} className="px-2 py-1 bg-slate-700 rounded text-xs hover:bg-slate-600">1/2</button>
                                <button onClick={() => setBet((parseInt(bet)*2).toString())} disabled={gameState === 'RUNNING'} className="px-2 py-1 bg-slate-700 rounded text-xs hover:bg-slate-600">x2</button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Action Button */}
                {gameState === 'IDLE' || gameState === 'CRASHED' || gameState === 'CASHED_OUT' ? (
                    <button 
                        onClick={startGame}
                        className="w-full py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-xl shadow-[0_0_20px_rgba(225,29,72,0.4)] transition-all active:scale-[0.98]"
                    >
                        PLACE BET
                    </button>
                ) : (
                    <button 
                        onClick={cashOut}
                        disabled={cashedOutAt !== null} // Disable if already cashed out
                        className={`w-full py-4 rounded-xl font-black text-xl shadow-lg transition-all active:scale-[0.98] ${cashedOutAt ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400 text-black shadow-[0_0_20px_rgba(34,197,94,0.4)]'}`}
                    >
                        {cashedOutAt ? 'WAITED' : `CASH OUT (${(parseInt(bet) * multiplier).toFixed(0)})`}
                    </button>
                )}
            </div>
        </div>
    );
};
