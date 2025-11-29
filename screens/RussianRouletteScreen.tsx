
import React, { useState } from 'react';
import { ArrowLeft, Crosshair, Skull, CheckCircle, Gem, DollarSign, RotateCcw, HelpCircle, X } from 'lucide-react';
import { User } from '../types';

interface RussianRouletteScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (netBmc: number) => void;
}

// --- Rules Modal ---
const RulesModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
        <div className="bg-[#1a0505] border-2 border-red-800 rounded-2xl p-6 max-w-sm w-full text-white shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-red-500 hover:text-white bg-black/40 p-1 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-red-500 mb-4 flex items-center gap-2 uppercase tracking-wider">
                <Skull size={24}/> Death Game Rules
            </h3>
            <ul className="space-y-4 text-sm text-gray-300 font-medium leading-relaxed">
                <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-lg">01.</span>
                    <span>左輪手槍中有 <span className="text-white font-bold">1 發子彈</span> 與 <span className="text-white font-bold">5 個空膛</span>。</span>
                </li>
                <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-lg">02.</span>
                    <span>使用 <span className="text-purple-400 font-bold">黑幣 (BMC)</span> 下注。每一回合扣下扳機，若存活則獎金倍率上升。</span>
                </li>
                <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-lg">03.</span>
                    <span>倍率表：<br/>
                        Round 1: <span className="text-yellow-400">1.2x</span><br/>
                        Round 2: <span className="text-yellow-400">1.5x</span><br/>
                        Round 3: <span className="text-yellow-400">2.0x</span><br/>
                        Round 4: <span className="text-yellow-400">3.0x</span><br/>
                        Round 5: <span className="text-yellow-400">6.0x</span>
                    </span>
                </li>
                <li className="flex gap-3">
                    <span className="text-red-500 font-bold text-lg">04.</span>
                    <span>隨時可以選擇 <span className="text-green-400 font-bold">CASH OUT</span> 取走獎金。一旦中彈，所有賭注歸零。</span>
                </li>
            </ul>
            <button onClick={onClose} className="w-full mt-8 bg-red-900 hover:bg-red-800 text-white py-3 rounded-xl font-bold shadow-lg border border-red-700 transition-all">
                I UNDERSTAND
            </button>
        </div>
    </div>
);

export const RussianRouletteScreen: React.FC<RussianRouletteScreenProps> = ({ user, onBack, onFinish }) => {
    const [gameState, setGameState] = useState<'BETTING' | 'PLAYING' | 'GAMEOVER' | 'CASHED_OUT'>('BETTING');
    const [bet, setBet] = useState(10);
    const [multiplier, setMultiplier] = useState(1.0);
    const [chambers, setChambers] = useState([0,0,0,0,0,1]); // 1 = Bullet, 0 = Empty
    const [currentRound, setCurrentRound] = useState(0); // 0 to 5
    const [history, setHistory] = useState<boolean[]>([]); // true = survived, false = died
    const [showRules, setShowRules] = useState(false);

    const handleStart = () => {
        if ((user.blackMarketCoins || 0) < bet) {
            alert("黑幣不足，請前往交易所兌換");
            return;
        }
        if (bet <= 0) return;

        // Shuffle chambers
        const newChambers = [0,0,0,0,0,0];
        const bulletIndex = Math.floor(Math.random() * 6);
        newChambers[bulletIndex] = 1;
        
        setChambers(newChambers);
        setGameState('PLAYING');
        setMultiplier(1.0);
        setCurrentRound(0);
        setHistory([]);
    };

    const pullTrigger = () => {
        // Check current chamber
        const isBullet = chambers[currentRound] === 1;
        
        if (isBullet) {
            setGameState('GAMEOVER');
            onFinish(-bet); // Lose bet
        } else {
            // Survived
            const nextRound = currentRound + 1;
            const mults = [1.2, 1.5, 2.0, 3.0, 6.0, 10.0];
            const newMult = mults[currentRound]; // Index 0 gives Round 1 multiplier
            
            setMultiplier(newMult);
            setCurrentRound(nextRound);
            setHistory([...history, true]);
            
            // Auto cash out if survived 5 rounds (last safe spot)
            if (nextRound >= 5) {
                // Actually round 5 means 5 clicks done. Next is death guaranteed if not shuffled.
                // But logic above allows 6th click if bullet was at index 5.
                // Let's force cashout at 5 for safety/gameplay loop
            }
        }
    };

    const cashOut = () => {
        const winnings = Math.floor(bet * multiplier);
        const netWin = winnings - bet;
        setGameState('CASHED_OUT');
        onFinish(netWin);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0a0a0a] flex flex-col text-white font-mono overflow-hidden">
            {showRules && <RulesModal onClose={() => setShowRules(false)} />}

            {/* Background Texture - Leather/Table */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/black-scales.png')] opacity-20 pointer-events-none"></div>
            <div className="absolute inset-0 bg-gradient-to-b from-black via-transparent to-red-900/20 pointer-events-none"></div>

            {/* Header */}
            <div className="p-4 pt-safe flex items-center justify-between border-b border-red-900/30 z-10 bg-black/80 backdrop-blur-sm shadow-lg">
                <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="text-center">
                    <h1 className="font-black text-red-600 tracking-[0.5em] uppercase text-lg text-shadow-red">ROULETTE</h1>
                    <span className="text-[10px] text-gray-500 font-bold">HIGH STAKES • DEATH GAME</span>
                </div>
                <button onClick={() => setShowRules(true)} className="p-2 hover:bg-gray-800 rounded-full text-gray-400 transition-colors">
                    <HelpCircle size={20} />
                </button>
            </div>

            {/* Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10">
                
                {gameState === 'BETTING' && (
                    <div className="w-full max-w-xs space-y-8 animate-in fade-in zoom-in duration-300">
                        <div className="text-center">
                            <div className="text-gray-500 text-xs font-bold mb-2 uppercase tracking-widest">Available Balance</div>
                            <div className="text-4xl font-black text-purple-500 flex items-center justify-center gap-2 drop-shadow-md">
                                <Gem size={32} /> {user.blackMarketCoins || 0}
                            </div>
                        </div>

                        <div className="bg-[#150505] p-6 rounded-2xl border border-red-900/50 shadow-2xl relative overflow-hidden">
                            {/* Decorative screw heads */}
                            <div className="absolute top-2 left-2 w-2 h-2 rounded-full bg-gray-800"></div>
                            <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-gray-800"></div>
                            <div className="absolute bottom-2 left-2 w-2 h-2 rounded-full bg-gray-800"></div>
                            <div className="absolute bottom-2 right-2 w-2 h-2 rounded-full bg-gray-800"></div>

                            <label className="text-xs text-red-600 font-bold uppercase tracking-widest mb-4 block text-center">Bet Amount (BMC)</label>
                            
                            <div className="flex items-center justify-between bg-black p-3 rounded-xl mb-6 border border-gray-800 shadow-inner">
                                <button onClick={() => setBet(Math.max(10, bet - 10))} className="w-10 h-10 bg-gray-900 rounded-lg font-bold text-xl hover:bg-gray-800 text-gray-400 transition-colors border border-gray-700">-</button>
                                <span className="text-3xl font-black text-white">{bet}</span>
                                <button onClick={() => setBet(Math.min((user.blackMarketCoins || 0), bet + 10))} className="w-10 h-10 bg-gray-900 rounded-lg font-bold text-xl hover:bg-gray-800 text-gray-400 transition-colors border border-gray-700">+</button>
                            </div>
                            
                            <button 
                                onClick={handleStart}
                                className="w-full py-4 bg-gradient-to-r from-red-800 to-red-600 hover:from-red-700 hover:to-red-500 text-white rounded-xl font-black text-lg shadow-[0_0_25px_rgba(220,38,38,0.4)] transition-all active:scale-95 flex items-center justify-center gap-3 border border-red-500/30"
                            >
                                <Crosshair size={24}/> START GAME
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'PLAYING' && (
                    <div className="w-full max-w-sm text-center space-y-8 animate-in fade-in">
                        {/* Gun Cylinder Visual */}
                        <div className="relative w-56 h-56 mx-auto">
                            <div className={`w-full h-full rounded-full border-8 border-gray-800 bg-[#1a1a1a] flex items-center justify-center relative shadow-[0_0_50px_black] ${history.length > 0 ? 'animate-[spin_0.2s_ease-out]' : ''}`}>
                                {/* Barrel Holes */}
                                {Array.from({length: 6}).map((_, i) => (
                                    <div key={i} className="absolute w-12 h-12 rounded-full bg-black border-2 border-gray-800 shadow-inner" 
                                         style={{ 
                                             top: '50%', left: '50%', 
                                             transform: `translate(-50%, -50%) rotate(${i * 60}deg) translate(80px)`
                                         }}
                                    >
                                        {/* Show passed chambers */}
                                        {i < currentRound && <div className="w-full h-full rounded-full bg-gray-800 opacity-50"></div>}
                                    </div>
                                ))}
                                
                                {/* Center Hub */}
                                <div className="w-20 h-20 rounded-full bg-gray-800 border-4 border-gray-700 flex items-center justify-center shadow-lg z-10">
                                    <div className="text-4xl font-black text-gray-500">{6 - currentRound}</div>
                                </div>
                                <div className="absolute top-4 text-xs font-bold text-red-900 tracking-widest uppercase opacity-50">Smith & Wesson</div>
                            </div>
                        </div>

                        <div className="space-y-1">
                            <div className="text-xs text-gray-500 font-bold uppercase tracking-widest">Potential Payout</div>
                            <div className="text-6xl font-black text-green-500 drop-shadow-lg tracking-tighter">
                                {Math.floor(bet * multiplier)}
                            </div>
                            <div className="text-sm text-purple-400 font-bold bg-purple-900/30 px-3 py-1 rounded-full inline-block border border-purple-500/30">
                                Current Multiplier: x{multiplier.toFixed(1)}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 pt-4">
                            <button 
                                onClick={cashOut}
                                className="py-4 bg-green-900/80 hover:bg-green-800 text-green-100 rounded-xl font-black text-lg flex items-center justify-center gap-2 border border-green-700 shadow-lg active:scale-95 transition-all"
                            >
                                <DollarSign size={20}/> CASH OUT
                            </button>
                            <button 
                                onClick={pullTrigger}
                                className="py-4 bg-red-900 hover:bg-red-800 text-white rounded-xl font-black text-lg flex items-center justify-center gap-2 border border-red-700 shadow-[0_0_20px_rgba(153,27,27,0.5)] active:scale-95 transition-all"
                            >
                                <Skull size={20}/> PULL TRIGGER
                            </button>
                        </div>
                    </div>
                )}

                {gameState === 'GAMEOVER' && (
                    <div className="text-center animate-in zoom-in duration-300 w-full max-w-xs">
                        <div className="relative mb-8">
                            <Skull size={120} className="text-red-900 mx-auto animate-pulse filter drop-shadow-[0_0_30px_rgba(220,38,38,0.5)]" />
                            <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full"></div>
                        </div>
                        <h2 className="text-5xl font-black text-red-600 mb-2 tracking-tighter">WASTED</h2>
                        <div className="bg-red-900/20 border border-red-900/50 p-4 rounded-xl mb-8">
                            <p className="text-gray-300 font-bold uppercase tracking-wider text-sm">Lost Bet</p>
                            <p className="text-2xl font-black text-white">{bet} BMC</p>
                        </div>
                        <button onClick={() => setGameState('BETTING')} className="w-full bg-white text-black px-8 py-4 rounded-xl font-black text-lg hover:bg-gray-200 flex items-center justify-center gap-2 mx-auto shadow-xl transition-colors">
                            <RotateCcw size={20}/> TRY AGAIN
                        </button>
                    </div>
                )}

                {gameState === 'CASHED_OUT' && (
                    <div className="text-center animate-in zoom-in duration-300 w-full max-w-xs">
                        <div className="relative mb-8">
                            <CheckCircle size={120} className="text-green-500 mx-auto filter drop-shadow-[0_0_30px_rgba(34,197,94,0.5)]" />
                            <div className="absolute inset-0 bg-green-500/20 blur-3xl rounded-full"></div>
                        </div>
                        <h2 className="text-4xl font-black text-white mb-2 tracking-tight">SURVIVED</h2>
                        <div className="bg-green-900/20 border border-green-900/50 p-6 rounded-xl mb-8">
                            <p className="text-gray-400 font-bold uppercase tracking-wider text-xs mb-1">Total Winnings</p>
                            <p className="text-4xl font-black text-green-400">+{Math.floor(bet * multiplier) - bet} BMC</p>
                        </div>
                        <button onClick={() => setGameState('BETTING')} className="w-full bg-white text-black px-8 py-4 rounded-xl font-black text-lg hover:bg-gray-200 flex items-center justify-center gap-2 mx-auto shadow-xl transition-colors">
                            <RotateCcw size={20}/> PLAY AGAIN
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};
