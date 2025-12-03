
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ArrowLeft, Rocket, Gem, XCircle, CheckCircle2 } from 'lucide-react';
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
    
    // Refs for Game Logic (Mutable values that don't trigger re-renders directly inside loop)
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const startTimeRef = useRef<number>(0);
    const crashPointRef = useRef<number>(0);
    const animationRef = useRef<number>(0);

    // House Edge 4%
    const houseEdge = 0.04; 

    // Resize Canvas Helper
    const updateCanvasSize = useCallback(() => {
        if (containerRef.current && canvasRef.current) {
            const { width, height } = containerRef.current.getBoundingClientRect();
            // Set resolution to match device pixel ratio for sharp rendering
            const dpr = window.devicePixelRatio || 1;
            canvasRef.current.width = width * dpr;
            canvasRef.current.height = height * dpr;
            
            // Force redraw if idle
            if (gameState === 'IDLE') {
                drawGraph(1.00, false);
            }
        }
    }, [gameState]);

    // Initial Resize
    useEffect(() => {
        window.addEventListener('resize', updateCanvasSize);
        // Delay slightly to ensure layout is ready
        const timer = setTimeout(updateCanvasSize, 50);
        return () => {
            window.removeEventListener('resize', updateCanvasSize);
            clearTimeout(timer);
            cancelAnimationFrame(animationRef.current);
        };
    }, [updateCanvasSize]);

    const generateCrashPoint = () => {
        const r = Math.random();
        const crash = 1 / (r * (1 - houseEdge));
        if (Math.random() < 0.01) return 1.00; // 1% Instant crash
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
        setMultiplier(1.00);
        setCashedOutAt(null);
        setGameState('RUNNING');
        
        // Init Game Refs
        crashPointRef.current = generateCrashPoint();
        startTimeRef.current = Date.now();
    };

    const stopGame = () => {
        if (gameState === 'RUNNING') {
            const currentM = multiplier; // Capture current state
            setCashedOutAt(currentM);
            setGameState('CASHED_OUT');
            
            const betAmount = parseInt(bet);
            const winnings = Math.floor(betAmount * currentM);
            const profit = winnings - betAmount;
            
            onFinish(profit);
        }
    };

    // The Game Loop
    useEffect(() => {
        if (gameState !== 'RUNNING' && gameState !== 'CASHED_OUT') return;

        const loop = () => {
            const now = Date.now();
            const elapsed = (now - startTimeRef.current) / 1000;
            
            // Growth Function: Exponential
            // M(t) = e^(0.06 * t)
            const currentM = Math.pow(Math.E, 0.06 * elapsed);
            
            if (currentM >= crashPointRef.current) {
                // CRASH!
                setMultiplier(crashPointRef.current);
                setGameState('CRASHED');
                setHistory(prev => [crashPointRef.current, ...prev].slice(0, 8));
                
                // If user didn't cash out, they lose
                if (gameState === 'RUNNING') {
                    const betAmount = parseInt(bet);
                    onFinish(-betAmount);
                }
                
                drawGraph(crashPointRef.current, true);
            } else {
                // Continue
                setMultiplier(currentM);
                drawGraph(currentM, false);
                animationRef.current = requestAnimationFrame(loop);
            }
        };

        animationRef.current = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationRef.current);
    }, [gameState]); // Re-run effect only when gameState changes drastically

    // Draw Logic
    const drawGraph = (currentM: number, isCrashed: boolean) => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const dpr = window.devicePixelRatio || 1;
        const width = canvas.width / dpr;
        const height = canvas.height / dpr;
        
        ctx.resetTransform();
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, width, height);

        const padding = 40;
        const originX = padding;
        const originY = height - padding;
        const graphWidth = width - padding * 2;
        const graphHeight = height - padding * 2;

        // Dynamic Y-Axis Scaling
        // Keep the rocket vertically centered roughly, so Max Y is roughly CurrentM * 1.5
        const maxY = Math.max(2, currentM * 1.2);
        
        // Dynamic X-Axis (Time) Scaling
        // Let's say 10 seconds fits on screen initially, then scales
        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        const maxX = Math.max(10, elapsed * 1.2);

        // Draw Grid
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.font = '10px monospace';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'right';

        // Y Axis Labels
        for (let i = 0; i <= 5; i++) {
            const val = 1 + (maxY - 1) * (i / 5);
            const y = originY - (i / 5) * graphHeight;
            ctx.beginPath();
            ctx.moveTo(originX, y);
            ctx.lineTo(originX + graphWidth, y);
            ctx.stroke();
            ctx.fillText(val.toFixed(1) + 'x', originX - 5, y + 3);
        }

        // Rocket Curve Calculation
        // We plot from t=0 to t=elapsed
        ctx.beginPath();
        ctx.moveTo(originX, originY);

        // Plot points
        const step = Math.max(0.1, elapsed / 100);
        let finalX = originX;
        let finalY = originY;

        for (let t = 0; t <= elapsed; t += step) {
            const m = Math.pow(Math.E, 0.06 * t);
            
            const x = originX + (t / maxX) * graphWidth;
            const y = originY - ((m - 1) / (maxY - 1)) * graphHeight;
            
            ctx.lineTo(x, y);
            finalX = x;
            finalY = y;
        }
        
        // Complete path to current pos
        const currentYPixel = originY - ((currentM - 1) / (maxY - 1)) * graphHeight;
        const currentXPixel = originX + (elapsed / maxX) * graphWidth;
        ctx.lineTo(currentXPixel, currentYPixel);

        ctx.lineWidth = 3;
        ctx.strokeStyle = isCrashed ? '#ef4444' : (cashedOutAt ? '#10b981' : '#3b82f6');
        ctx.stroke();

        // Fill
        ctx.lineTo(currentXPixel, originY);
        ctx.lineTo(originX, originY);
        ctx.fillStyle = isCrashed 
            ? 'rgba(239, 68, 68, 0.1)' 
            : (cashedOutAt ? 'rgba(16, 185, 129, 0.1)' : 'rgba(59, 130, 246, 0.1)');
        ctx.fill();

        // Rocket Icon
        ctx.save();
        ctx.translate(currentXPixel, currentYPixel);
        if (isCrashed) {
            ctx.font = '30px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("💥", 0, 0);
        } else {
            // Angle based on derivative? Or just fixed 45deg for style
            // Actual derivative of e^0.06t is always positive increasing.
            const angle = -45 * (Math.PI / 180);
            ctx.rotate(angle);
            ctx.font = '24px sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText("🚀", 0, 0);
        }
        ctx.restore();
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

            {/* Game Area */}
            <div className="flex-1 relative flex flex-col min-h-0 bg-[#0F172A]">
                {/* Canvas Container */}
                <div ref={containerRef} className="absolute inset-0 z-0">
                    <canvas ref={canvasRef} className="block w-full h-full" />
                </div>

                {/* Overlay UI */}
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
                            <h1 className={`text-7xl font-black ${multiplier < 2 ? 'text-white' : 'text-green-400'} mb-2 tabular-nums tracking-tighter transition-all`}>
                                {multiplier.toFixed(2)}x
                            </h1>
                            {gameState === 'RUNNING' && (
                                <div className="text-blue-400 text-xs font-bold uppercase tracking-[0.3em] animate-pulse">Taking Off...</div>
                            )}
                        </div>
                    )}
                </div>

                {/* History Bar */}
                <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end z-20 max-h-[200px] overflow-hidden pointer-events-none">
                    {history.map((h, i) => (
                        <div key={i} className={`px-2 py-1 rounded text-[10px] font-bold backdrop-blur-sm border ${h >= 2 ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-slate-700/50 border-slate-600 text-slate-400'}`}>
                            {h.toFixed(2)}x
                        </div>
                    ))}
                </div>
            </div>

            {/* Controls */}
            <div className="bg-slate-800 border-t border-slate-700 p-4 shrink-0 z-20 pb-safe">
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

                <div className="flex gap-3 items-stretch h-14">
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
                                onClick={stopGame}
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
