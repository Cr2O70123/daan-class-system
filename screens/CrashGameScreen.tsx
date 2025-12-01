
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Rocket, TrendingUp, Gem, Zap, History, XCircle, RotateCcw, CheckCircle2 } from 'lucide-react';
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
    const [history, setHistory] = useState<number[]>([]);
    
    // Refs for Game Logic
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);
    const startTimeRef = useRef<number>(0);
    const crashPointRef = useRef<number>(0);
    const stateRef = useRef<'IDLE' | 'RUNNING' | 'CRASHED' | 'CASHED_OUT'>('IDLE'); // Ref to access state inside animation loop

    // House Edge 4%
    const houseEdge = 0.04; 

    // --- Logic ---

    const generateCrashPoint = () => {
        // E = 1 / (rand * (1 - edge))
        const r = Math.random();
        const crash = 1 / (r * (1 - houseEdge));
        // 1% chance of instant crash at 1.00x
        if (Math.random() < 0.01) return 1.00;
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

        // Reset State
        setGameState('RUNNING');
        stateRef.current = 'RUNNING';
        setCashedOutAt(null);
        setMultiplier(1.00);
        
        crashPointRef.current = generateCrashPoint();
        // console.log("Crash Point (Dev):", crashPointRef.current);

        startTimeRef.current = Date.now();
        requestRef.current = requestAnimationFrame(gameLoop);
    };

    const gameLoop = () => {
        const now = Date.now();
        const elapsed = (now - startTimeRef.current) / 1000; // seconds
        
        // Growth function: Exponential
        // Starts slow, speeds up
        const currentM = 1.00 + Math.pow(elapsed, 2) * 0.1 + elapsed * 0.05;
        
        // Check Crash
        if (currentM >= crashPointRef.current) {
            handleCrash(crashPointRef.current);
        } else {
            setMultiplier(currentM);
            drawGraph(currentM, false);
            if (stateRef.current === 'RUNNING' || stateRef.current === 'CASHED_OUT') {
                requestRef.current = requestAnimationFrame(gameLoop);
            }
        }
    };

    const handleCrash = (finalPoint: number) => {
        // Stop Loop
        cancelAnimationFrame(requestRef.current!);
        
        setGameState('CRASHED');
        stateRef.current = 'CRASHED';
        setMultiplier(finalPoint);
        setHistory(prev => [finalPoint, ...prev].slice(0, 8));
        
        drawGraph(finalPoint, true);

        // Calculate Result
        const betAmount = parseInt(bet);
        if (cashedOutAt !== null) {
            // Already cashed out, nothing to do (profit handled in cashOut)
        } else {
            // Lost
            onFinish(-betAmount);
        }
    };

    const cashOut = () => {
        if (stateRef.current !== 'RUNNING') return;
        
        const currentM = multiplier; // Capture current multiplier
        setCashedOutAt(currentM);
        setGameState('CASHED_OUT');
        stateRef.current = 'CASHED_OUT';

        const betAmount = parseInt(bet);
        const winnings = Math.floor(betAmount * currentM);
        const profit = winnings - betAmount;
        
        onFinish(profit);
    };

    // --- Drawing ---

    const drawGraph = (currentM: number, isCrashed: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const width = canvas.width;
        const height = canvas.height;

        // Clear
        ctx.clearRect(0, 0, width, height);

        // Dynamic Scale: As multiplier grows, we zoom out the graph vertically
        // Max Y axis is roughly currentM + padding
        const maxY = Math.max(2, currentM * 1.2);
        const padding = 40;
        const graphWidth = width - padding;
        const graphHeight = height - padding;

        // Origin at bottom-left (padding, height-padding)
        const originX = padding;
        const originY = height - padding;

        // Draw Grid Lines (Horizontal)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';

        const step = Math.ceil(maxY / 5);
        for (let i = 0; i <= 5; i++) {
            const val = i * step;
            if (val === 0) continue;
            const y = originY - (val / maxY) * graphHeight;
            
            ctx.beginPath();
            ctx.moveTo(padding, y);
            ctx.lineTo(width, y);
            ctx.stroke();
            
            ctx.fillText(val + 'x', padding - 5, y + 3);
        }

        // Draw Curve
        // X represents time (approx). Let's map X from 0 to width based on time elapsed?
        // Or simpler: Draw a bezier curve from origin to current point.
        // As game progresses, the rocket moves UP and RIGHT.
        
        // Progress (0 to 1) for X axis based on time. 
        // To keep the rocket visible, we shift X back if it gets too far, creating a scrolling effect.
        // Simplified visual: Rocket moves diagonally.
        
        const timeElapsed = (Date.now() - startTimeRef.current) / 1000;
        // visualX goes from 0 to 1 over approx 10 seconds?
        // Let's keep the rocket fixed at 80% width if time > X
        
        let rocketX = originX + (timeElapsed * 50); // Move 50px per second
        if (rocketX > width - 100) rocketX = width - 100; // Cap visual X

        const rocketY = originY - ((currentM - 1) / (maxY - 1)) * graphHeight;

        // Draw Line
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        // Quadratic curve for smoothness
        ctx.quadraticCurveTo(
            originX + (rocketX - originX) / 2, 
            originY, 
            rocketX, 
            rocketY
        );
        
        ctx.lineWidth = 4;
        ctx.strokeStyle = isCrashed ? '#ef4444' : (cashedOutAt ? '#10b981' : '#3b82f6');
        ctx.stroke();

        // Fill area under graph
        ctx.lineTo(rocketX, originY);
        ctx.lineTo(originX, originY);
        ctx.fillStyle = isCrashed 
            ? 'rgba(239, 68, 68, 0.1)' 
            : (cashedOutAt ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)');
        ctx.fill();

        // Draw Rocket / Crash Icon
        ctx.save();
        ctx.translate(rocketX, rocketY);
        
        if (isCrashed) {
            // Draw Explosion or Text
            ctx.fillStyle = '#ef4444';
            ctx.font = 'bold 16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText("💥", 0, 0);
        } else {
            // Draw Rocket
            const angle = -45 * (Math.PI / 180); // 45 degree up
            ctx.rotate(angle);
            ctx.fillStyle = '#facc15'; // Yellow fire
            ctx.font = '20px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("🚀", 0, 0);
        }
        ctx.restore();
    };

    useEffect(() => {
        // Initial Canvas Draw
        drawGraph(1.00, false);
        return () => cancelAnimationFrame(requestRef.current!);
    }, []);

    // Helper color
    const getMultiplierColor = (val: number) => {
        if (val < 2) return 'text-white';
        if (val < 10) return 'text-green-400 drop-shadow-[0_0_10px_rgba(74,222,128,0.5)]';
        return 'text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)] animate-pulse';
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0F172A] flex flex-col font-mono text-white overflow-hidden">
            {/* Header */}
            <div className="bg-slate-900/90 backdrop-blur border-b border-slate-700 p-3 pt-safe flex justify-between items-center z-20 shrink-0">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <Rocket size={20} className="text-rose-500" />
                    <span className="font-black text-lg tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-rose-400 to-orange-400">
                        CYBER CRASH
                    </span>
                </div>
                <div className="flex items-center gap-1 bg-slate-800 border border-slate-600 px-3 py-1.5 rounded-full shadow-inner">
                    <Gem size={14} className="text-purple-400" />
                    <span className="text-sm font-bold text-white">{user.blackMarketCoins || 0}</span>
                </div>
            </div>

            {/* Game Area (Flexible) */}
            <div className="flex-1 relative flex flex-col min-h-0">
                
                {/* Canvas Layer */}
                <div className="absolute inset-0 z-0">
                    <canvas 
                        ref={canvasRef} 
                        width={window.innerWidth} 
                        height={window.innerHeight * 0.6} // 60% of height for canvas
                        className="w-full h-full"
                    />
                </div>

                {/* Overlay UI (Multiplier Center) */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 flex-col">
                    {gameState === 'CRASHED' ? (
                        <div className="text-center animate-in zoom-in duration-200">
                            <h1 className="text-6xl font-black text-red-500 mb-2 drop-shadow-lg">{multiplier.toFixed(2)}x</h1>
                            <div className="bg-red-500/20 border border-red-500 text-red-400 px-4 py-1 rounded-full text-sm font-bold uppercase tracking-widest backdrop-blur-md inline-flex items-center gap-2">
                                <XCircle size={16} /> CRASHED
                            </div>
                        </div>
                    ) : (
                        <div className="text-center">
                            <h1 className={`text-7xl font-black ${getMultiplierColor(multiplier)} mb-2 tabular-nums tracking-tighter transition-all`}>
                                {multiplier.toFixed(2)}x
                            </h1>
                            {gameState === 'RUNNING' && (
                                <div className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Flying...</div>
                            )}
                        </div>
                    )}
                </div>

                {/* History Bar (Top) */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end z-20 max-h-[200px] overflow-hidden pointer-events-none">
                    {history.map((h, i) => (
                        <div key={i} className={`px-2 py-1 rounded text-[10px] font-bold backdrop-blur-sm border ${h >= 2 ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
                            {h.toFixed(2)}x
                        </div>
                    ))}
                </div>
            </div>

            {/* Control Panel (Fixed Bottom) */}
            <div className="bg-slate-800 border-t border-slate-700 p-4 shrink-0 z-20 pb-safe">
                
                {/* Cash Out Status Info */}
                {cashedOutAt && (
                    <div className="mb-3 bg-green-500/20 border border-green-500/50 rounded-xl p-3 flex justify-between items-center animate-in slide-in-from-bottom duration-300">
                        <div className="flex items-center gap-2 text-green-400 font-bold">
                            <CheckCircle2 size={18} />
                            <span>CASHED OUT</span>
                        </div>
                        <div className="text-right">
                            <span className="block text-xs text-green-300">@{cashedOutAt.toFixed(2)}x</span>
                            <span className="block text-lg font-black text-white leading-none">
                                +{Math.floor(parseInt(bet) * cashedOutAt - parseInt(bet))}
                            </span>
                        </div>
                    </div>
                )}

                {/* Controls Grid */}
                <div className="flex gap-3 items-stretch h-14">
                    {/* Bet Input */}
                    <div className="flex-1 bg-slate-900 rounded-xl border border-slate-600 flex items-center px-3 focus-within:border-blue-500 transition-colors relative">
                        <span className="text-xs text-slate-500 font-bold uppercase absolute top-1 left-3">Bet</span>
                        <input 
                            type="number" 
                            value={bet}
                            onChange={e => setBet(e.target.value)}
                            disabled={gameState === 'RUNNING'}
                            className="w-full bg-transparent text-white font-black text-lg pt-3 outline-none text-right pr-14"
                        />
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1 pt-3">
                            <button onClick={() => setBet(Math.floor(parseInt(bet)/2).toString())} disabled={gameState === 'RUNNING'} className="px-2 bg-slate-700 rounded text-[10px] hover:bg-slate-600 text-slate-300">1/2</button>
                            <button onClick={() => setBet((parseInt(bet)*2).toString())} disabled={gameState === 'RUNNING'} className="px-2 bg-slate-700 rounded text-[10px] hover:bg-slate-600 text-slate-300">2x</button>
                        </div>
                    </div>

                    {/* Main Button */}
                    <div className="flex-1">
                        {gameState === 'IDLE' || gameState === 'CRASHED' || gameState === 'CASHED_OUT' ? (
                            <button 
                                onClick={startGame}
                                className="w-full h-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-black text-lg shadow-[0_4px_0_#1e40af] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-2"
                            >
                                <Rocket size={20} className="fill-white" />
                                START
                            </button>
                        ) : (
                            <button 
                                onClick={cashOut}
                                disabled={cashedOutAt !== null}
                                className={`w-full h-full rounded-xl font-black text-xl shadow-[0_4px_0_rgba(0,0,0,0.2)] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center justify-center leading-none ${cashedOutAt ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-green-500 hover:bg-green-400 text-white'}`}
                            >
                                <span>CASH OUT</span>
                                <span className="text-xs opacity-80 mt-1">
                                    +{(parseInt(bet) * multiplier).toFixed(0)}
                                </span>
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
