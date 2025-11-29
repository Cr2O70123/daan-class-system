
import React, { useState, useEffect } from 'react';
import { ArrowLeft, Dices, Coins, ArrowUp, ArrowDown, RefreshCw, AlertTriangle, BookOpen, Info, CircleDollarSign, CheckCircle, X, Gem } from 'lucide-react';
import { User } from '../types';

interface HighLowGameScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (netBmc: number) => void;
}

// Card Deck Helper
const SUITS = ['♠', '♥', '♦', '♣'];
const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

const getRandomCard = () => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const rankIndex = Math.floor(Math.random() * RANKS.length);
    return { 
        suit, 
        rank: RANKS[rankIndex], 
        value: rankIndex + 1, // A=1, K=13
        color: (suit === '♥' || suit === '♦') ? 'text-red-600' : 'text-gray-900'
    };
};

// --- Rules Modal ---
const RulesModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[90] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-emerald-900/90 border-2 border-yellow-500/50 rounded-2xl p-6 max-w-sm w-full text-white shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-emerald-300 hover:text-white bg-black/20 p-1 rounded-full"><X size={20}/></button>
            <h3 className="text-xl font-black text-yellow-400 mb-4 flex items-center gap-2">
                <BookOpen size={24}/> 遊戲規則 (BMC)
            </h3>
            <ul className="space-y-3 text-sm text-emerald-100 font-medium">
                <li className="flex gap-2">
                    <span className="text-yellow-400 font-bold">1.</span>
                    使用 <span className="text-purple-300 font-bold">黑幣 (BMC)</span> 下注，預測下一張牌的大小。
                </li>
                <li className="flex gap-2">
                    <span className="text-yellow-400 font-bold">2.</span>
                    <span className="font-bold">HIGH</span>：下一張牌 &gt; 當前牌<br/>
                    <span className="font-bold">LOW</span>：下一張牌 &lt; 當前牌
                </li>
                <li className="flex gap-2">
                    <span className="text-yellow-400 font-bold">3.</span>
                    若點數相同 (Tie)，視為<span className="text-red-400 font-bold">莊家勝</span> (玩家輸)。
                </li>
                <li className="flex gap-2">
                    <span className="text-yellow-400 font-bold">4.</span>
                    A 最小 (1點)，K 最大 (13點)。
                </li>
                <li className="flex gap-2">
                    <span className="text-yellow-400 font-bold">5.</span>
                    猜對獲得 <span className="text-yellow-400">1倍</span> 賭金，猜錯沒收賭金。
                </li>
            </ul>
            <button onClick={onClose} className="w-full mt-6 bg-yellow-600 hover:bg-yellow-700 text-white py-3 rounded-xl font-bold shadow-lg">
                明白了
            </button>
        </div>
    </div>
);

// --- Chip Component ---
const Chip = ({ value, onClick, selected, disabled }: { value: number | 'ALL', onClick: () => void, selected: boolean, disabled?: boolean }) => (
    <button 
        onClick={onClick}
        disabled={disabled}
        className={`
            relative w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center border-4 shadow-xl transition-all active:scale-95 flex-shrink-0
            ${selected ? 'scale-110 ring-4 ring-yellow-400 z-10' : 'hover:scale-105 opacity-90'}
            ${value === 10 ? 'bg-blue-600 border-blue-400 border-dashed' : 
              value === 50 ? 'bg-red-600 border-red-400 border-dashed' : 
              value === 100 ? 'bg-green-600 border-green-400 border-dashed' :
              'bg-black border-yellow-500 border-dashed'}
            ${disabled ? 'opacity-50 cursor-not-allowed grayscale' : ''}
        `}
    >
        <div className="absolute inset-2 rounded-full border-2 border-white/20"></div>
        <span className="font-black text-white text-xs drop-shadow-md">
            {value === 'ALL' ? 'ALL' : value}
        </span>
    </button>
);

export const HighLowGameScreen: React.FC<HighLowGameScreenProps> = ({ user, onBack, onFinish }) => {
  const [showRules, setShowRules] = useState(true);
  
  const [currentCard, setCurrentCard] = useState(getRandomCard());
  const [nextCard, setNextCard] = useState<ReturnType<typeof getRandomCard> | null>(null);
  const [betAmount, setBetAmount] = useState<number>(10);
  const [gameState, setGameState] = useState<'IDLE' | 'PLAYING' | 'RESULT'>('IDLE');
  const [result, setResult] = useState<'WIN' | 'LOSE' | 'PUSH' | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false); // New lock state

  const handleBet = (guess: 'HIGH' | 'LOW') => {
      // SECURITY FIX: Prevent spam clicking
      if (isProcessing) return;
      
      if (betAmount <= 0) {
          alert("請選擇下注金額");
          return;
      }
      if (betAmount > (user.blackMarketCoins || 0)) {
          alert("黑幣不足！請前往交易所兌換。");
          return;
      }

      setIsProcessing(true); // Lock
      setGameState('PLAYING');
      
      // Draw next card
      let draw = getRandomCard();
      while (draw.rank === currentCard.rank && draw.suit === currentCard.suit) {
          draw = getRandomCard(); // Avoid exact duplicate card for realism
      }
      
      setNextCard(draw);

      // Determine outcome
      let outcome: 'WIN' | 'LOSE' | 'PUSH' = 'LOSE';
      
      if (draw.value === currentCard.value) {
          outcome = 'LOSE'; // House wins on tie
      } else if (guess === 'HIGH' && draw.value > currentCard.value) {
          outcome = 'WIN';
      } else if (guess === 'LOW' && draw.value < currentCard.value) {
          outcome = 'WIN';
      }

      // Simulate server delay and reveal
      setTimeout(() => {
          setResult(outcome);
          setGameState('RESULT');
          
          let netChange = 0;
          if (outcome === 'WIN') {
              netChange = betAmount; 
              setHistory(prev => [`WIN +${betAmount}`, ...prev.slice(0, 4)]);
          } else {
              netChange = -betAmount; 
              setHistory(prev => [`LOST -${betAmount}`, ...prev.slice(0, 4)]);
          }
          
          onFinish(netChange);
          setIsProcessing(false); // Unlock only after finish
      }, 1000); 
  };

  const resetGame = () => {
      setCurrentCard(nextCard || getRandomCard());
      setNextCard(null);
      setGameState('IDLE');
      setResult(null);
  };

  const setBet = (val: number | 'ALL') => {
      if (gameState !== 'IDLE') return;
      if (val === 'ALL') setBetAmount(user.blackMarketCoins || 0);
      else setBetAmount(val);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0f2e1a] flex flex-col overflow-hidden text-white font-sans">
        {showRules && <RulesModal onClose={() => setShowRules(false)} />}

        {/* Casino Background Texture */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e4620_0%,_#05180a_100%)] opacity-100"></div>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/felt.png')] pointer-events-none"></div>

        {/* Header */}
        <div className="p-4 pt-safe flex items-center justify-between z-10 border-b border-yellow-600/30 bg-black/20 backdrop-blur-sm sticky top-0">
            <div className="flex items-center gap-3">
                <button onClick={onBack} className="p-2 rounded-full bg-black/40 hover:bg-black/60 border border-yellow-600/30 text-yellow-500 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col">
                    <h1 className="font-black text-lg text-yellow-400 tracking-wider flex items-center gap-2">
                        <Dices size={20} /> HIGH-LOW
                    </h1>
                    <span className="text-[10px] text-emerald-300 font-bold tracking-[0.2em] uppercase">Black Market Edition</span>
                </div>
            </div>
            
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-black/60 px-4 py-1.5 rounded-full border border-purple-600/50 shadow-inner">
                    <Gem size={16} className="text-purple-400" />
                    <span className="font-mono font-bold text-purple-100">{user.blackMarketCoins || 0}</span>
                </div>
                <button 
                    onClick={() => setShowRules(true)}
                    className="p-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-full shadow-lg border border-emerald-500 transition-transform active:scale-95"
                >
                    <BookOpen size={20} />
                </button>
            </div>
        </div>

        {/* Main Content (Scrollable Container for small screens) */}
        <div className="flex-1 overflow-y-auto p-4 relative z-10 flex flex-col items-center">
            
            {/* Game Table */}
            <div className="w-full max-w-sm bg-emerald-800 rounded-[2rem] md:rounded-[3rem] border-8 border-[#3e2723] shadow-[0_0_50px_rgba(0,0,0,0.5)] relative flex flex-col items-center p-4 md:p-6 mb-4 min-h-[500px]">
                
                {/* Table Felt Decoration */}
                <div className="absolute inset-2 md:inset-4 border-2 border-yellow-500/10 rounded-[2rem] pointer-events-none"></div>
                <div className="absolute top-6 md:top-10 text-yellow-500/20 font-black tracking-[0.5em] text-xs md:text-sm uppercase">Dealer pays 1:1</div>

                {/* Cards Container */}
                <div className="flex gap-4 md:gap-6 items-center justify-center mt-8 md:mt-12 mb-6 perspective-1000">
                    {/* Current Card */}
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-yellow-400/30 rounded-xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="w-24 h-36 md:w-28 md:h-40 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-between p-3 transform transition-transform duration-500 relative z-10 border border-gray-300">
                            <div className={`text-xl font-black self-start ${currentCard.color}`}>{currentCard.rank}</div>
                            <div className={`text-5xl ${currentCard.color}`}>{currentCard.suit}</div>
                            <div className={`text-xl font-black self-end ${currentCard.color} rotate-180`}>{currentCard.rank}</div>
                        </div>
                        <div className="text-xs font-bold text-emerald-200 text-center mt-3 uppercase tracking-wider">Current</div>
                    </div>

                    {/* Next Card Slot */}
                    <div className="relative">
                        {gameState === 'IDLE' || gameState === 'PLAYING' ? (
                            <div className="w-24 h-36 md:w-28 md:h-40 bg-emerald-900/50 rounded-xl border-2 border-dashed border-emerald-400/30 flex items-center justify-center shadow-inner relative overflow-hidden">
                                {gameState === 'PLAYING' && <div className="absolute inset-0 bg-white/10 animate-pulse"></div>}
                                <span className="text-4xl text-emerald-400/20 font-black">?</span>
                            </div>
                        ) : (
                            <div className={`w-24 h-36 md:w-28 md:h-40 bg-white rounded-xl shadow-2xl flex flex-col items-center justify-between p-3 animate-in zoom-in duration-300 border border-gray-300 ${nextCard ? '' : 'opacity-0'}`}>
                                {nextCard && (
                                    <>
                                        <div className={`text-xl font-black self-start ${nextCard.color}`}>{nextCard.rank}</div>
                                        <div className={`text-5xl ${nextCard.color}`}>{nextCard.suit}</div>
                                        <div className={`text-xl font-black self-end ${nextCard.color} rotate-180`}>{nextCard.rank}</div>
                                    </>
                                )}
                            </div>
                        )}
                        <div className="text-xs font-bold text-emerald-200 text-center mt-3 uppercase tracking-wider">Next</div>
                    </div>
                </div>

                {/* Result Overlay */}
                {gameState === 'RESULT' && result && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm z-20 rounded-[1.5rem] md:rounded-[2.5rem] animate-in fade-in duration-300">
                        <div className={`text-5xl md:text-6xl font-black mb-4 drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] ${result === 'WIN' ? 'text-yellow-400' : 'text-red-500'}`}>
                            {result === 'WIN' ? 'WIN' : 'LOSE'}
                        </div>
                        <div className={`text-xl md:text-2xl font-bold mb-8 px-6 py-2 rounded-full border-2 ${result === 'WIN' ? 'bg-yellow-500/20 border-yellow-500 text-yellow-100' : 'bg-red-500/20 border-red-500 text-red-100'}`}>
                            {result === 'WIN' ? `+${betAmount} BMC` : `-${betAmount} BMC`}
                        </div>
                        <button 
                            onClick={resetGame}
                            className="bg-gradient-to-b from-white to-gray-200 text-emerald-900 px-8 py-3 rounded-full font-black text-lg flex items-center gap-2 hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.3)]"
                        >
                            <RefreshCw size={24} /> 再玩一次
                        </button>
                    </div>
                )}

                {/* Chips Area */}
                <div className={`w-full mt-auto mb-2 transition-opacity duration-300 ${gameState !== 'IDLE' ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
                    <div className="flex justify-center gap-2 mb-6 overflow-x-auto py-2 no-scrollbar">
                        <Chip value={10} onClick={() => setBet(10)} selected={betAmount === 10} />
                        <Chip value={50} onClick={() => setBet(50)} selected={betAmount === 50} />
                        <Chip value={100} onClick={() => setBet(100)} selected={betAmount === 100} />
                        <Chip value="ALL" onClick={() => setBet('ALL')} selected={betAmount === (user.blackMarketCoins || 0)} />
                    </div>

                    <div className="bg-black/40 rounded-xl p-2 flex items-center justify-center border border-yellow-600/30 mb-6">
                        <span className="text-yellow-500 text-xs font-bold mr-2 uppercase tracking-wider">Bet Amount</span>
                        <span className="text-2xl font-mono font-black text-white">{betAmount}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-4">
                        <button 
                            onClick={() => handleBet('HIGH')}
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-to-b from-blue-600 to-blue-800 hover:from-blue-500 hover:to-blue-700 py-3 md:py-4 rounded-xl font-black text-lg md:text-xl shadow-[0_4px_0_#1e3a8a] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center border border-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowUp size={24} className="mb-1 text-blue-200" />
                            HIGH
                        </button>
                        <button 
                            onClick={() => handleBet('LOW')}
                            disabled={isProcessing}
                            className="flex-1 bg-gradient-to-b from-red-600 to-red-800 hover:from-red-500 hover:to-red-700 py-3 md:py-4 rounded-xl font-black text-lg md:text-xl shadow-[0_4px_0_#7f1d1d] active:shadow-none active:translate-y-1 transition-all flex flex-col items-center border border-red-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <ArrowDown size={24} className="mb-1 text-red-200" />
                            LOW
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Ticker Tape History (Fixed Bottom) */}
        <div className="bg-black/80 backdrop-blur-md border-t border-yellow-600/30 py-2 overflow-hidden whitespace-nowrap z-20">
            <div className="flex items-center gap-4 px-4 overflow-x-auto no-scrollbar">
                <span className="text-[10px] text-yellow-600 font-bold uppercase tracking-wider sticky left-0 bg-black/80 pr-2">History:</span>
                {history.length === 0 && <span className="text-xs text-gray-600 italic">No games yet</span>}
                {history.map((h, i) => (
                    <div key={i} className={`flex-shrink-0 px-3 py-1 rounded text-xs font-black font-mono ${h.includes('WIN') ? 'bg-green-900/50 text-green-400 border border-green-700' : 'bg-red-900/50 text-red-400 border border-red-700'}`}>
                        {h}
                    </div>
                ))}
            </div>
        </div>
    </div>
  );
};
