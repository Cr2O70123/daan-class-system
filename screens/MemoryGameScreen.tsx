
import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Zap, Star, Heart, Moon, Sun, Cloud, Music, Ghost, Crown, Smile, Anchor, Camera, Bell, Clock, Move } from 'lucide-react';
import { User, GameResult } from '../types';
import { submitGameScore } from '../services/dataService';

interface MemoryGameScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: GameResult) => void;
}

const ICONS = [Zap, Star, Heart, Moon, Sun, Cloud, Music, Ghost, Crown, Smile]; // 10 pairs = 20 cards

type Card = {
    id: number;
    icon: React.ElementType;
    isFlipped: boolean;
    isMatched: boolean;
    color: string;
};

const COLORS = [
    'text-yellow-400', 'text-red-400', 'text-pink-400', 'text-purple-400', 'text-orange-400', 
    'text-blue-400', 'text-green-400', 'text-cyan-400', 'text-amber-400', 'text-indigo-400'
];

export const MemoryGameScreen: React.FC<MemoryGameScreenProps> = ({ user, onBack, onFinish }) => {
  const [cards, setCards] = useState<Card[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [timer, setTimer] = useState(0);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
      startNewGame();
  }, []);

  useEffect(() => {
      let interval: number;
      if (startTime && !isGameOver) {
          interval = window.setInterval(() => {
              setTimer(Math.floor((Date.now() - startTime) / 1000));
          }, 1000);
      }
      return () => clearInterval(interval);
  }, [startTime, isGameOver]);

  const startNewGame = () => {
      const deck = [...ICONS, ...ICONS].map((Icon, index) => ({
          id: index,
          icon: Icon,
          isFlipped: false,
          isMatched: false,
          color: COLORS[index % COLORS.length]
      }));
      
      // Shuffle
      for (let i = deck.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [deck[i], deck[j]] = [deck[j], deck[i]];
      }

      setCards(deck);
      setFlippedCards([]);
      setMoves(0);
      setTimer(0);
      setStartTime(Date.now());
      setIsGameOver(false);
      setIsProcessing(false);
  };

  const handleCardClick = (index: number) => {
      if (isProcessing || cards[index].isFlipped || cards[index].isMatched) return;

      const newCards = [...cards];
      newCards[index].isFlipped = true;
      setCards(newCards);

      const newFlipped = [...flippedCards, index];
      setFlippedCards(newFlipped);

      if (newFlipped.length === 2) {
          setIsProcessing(true);
          setMoves(prev => prev + 1);
          checkForMatch(newFlipped, newCards);
      }
  };

  const checkForMatch = (flipped: number[], currentCards: Card[]) => {
      const [first, second] = flipped;
      
      if (currentCards[first].icon === currentCards[second].icon) {
          // Match
          setTimeout(() => {
              const matchedCards = [...currentCards];
              matchedCards[first].isMatched = true;
              matchedCards[second].isMatched = true;
              setCards(matchedCards);
              setFlippedCards([]);
              setIsProcessing(false);
              
              if (matchedCards.every(c => c.isMatched)) {
                  finishGame();
              }
          }, 500);
      } else {
          // No Match
          setTimeout(() => {
              const resetCards = [...currentCards];
              resetCards[first].isFlipped = false;
              resetCards[second].isFlipped = false;
              setCards(resetCards);
              setFlippedCards([]);
              setIsProcessing(false);
          }, 1000);
      }
  };

  const finishGame = async () => {
      setIsGameOver(true);
      
      // Calculate Score: 10000 - (Time * 10) - (Moves * 10)
      const finalScore = Math.max(0, 5000 - (timer * 10) - (moves * 20));
      
      try {
          await submitGameScore(user, finalScore, 'memory_game');
          // Wait a bit then show finish
      } catch(e) {}
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2d1b4e] flex flex-col items-center font-sans overflow-hidden">
        {/* Header */}
        <div className="w-full p-4 pt-safe flex justify-between items-center bg-[#1c1132] shadow-lg z-10 border-b border-purple-800">
            <button onClick={onBack} className="p-2 bg-purple-900/50 hover:bg-purple-800 rounded-full transition-colors text-purple-200">
                <ArrowLeft size={24} />
            </button>
            <div className="flex gap-4">
                <div className="flex items-center gap-2 bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-500/30">
                    <Clock size={16} className="text-purple-400"/>
                    <span className="text-white font-mono font-bold">{timer}s</span>
                </div>
                <div className="flex items-center gap-2 bg-purple-900/30 px-3 py-1.5 rounded-full border border-purple-500/30">
                    <Move size={16} className="text-purple-400"/>
                    <span className="text-white font-mono font-bold">{moves}</span>
                </div>
            </div>
            <button onClick={startNewGame} className="p-2 bg-purple-900/50 hover:bg-purple-800 rounded-full transition-colors text-purple-200">
                <RefreshCw size={24} />
            </button>
        </div>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto p-4 flex items-center justify-center w-full max-w-lg">
            <div className="grid grid-cols-4 gap-3 w-full aspect-[4/5]">
                {cards.map((card, idx) => (
                    <div 
                        key={idx} 
                        className="relative w-full h-full perspective-1000 cursor-pointer"
                        onClick={() => handleCardClick(idx)}
                    >
                        <div className={`w-full h-full relative transition-all duration-500 transform-style-3d ${card.isFlipped ? 'rotate-y-180' : ''}`}>
                            
                            {/* Front (Hidden) */}
                            <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl shadow-lg flex items-center justify-center backface-hidden border-2 border-purple-400/30">
                                <span className="text-3xl font-black text-purple-300 opacity-20">?</span>
                            </div>

                            {/* Back (Revealed) */}
                            <div className={`absolute inset-0 w-full h-full bg-[#1c1132] rounded-xl shadow-xl flex items-center justify-center backface-hidden rotate-y-180 border-2 ${card.isMatched ? 'border-green-500 shadow-[0_0_15px_rgba(34,197,94,0.5)]' : 'border-purple-300'}`}>
                                <card.icon size={32} className={`${card.color} ${card.isMatched ? 'animate-bounce' : ''}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>

        {/* Game Over Modal */}
        {isGameOver && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-in fade-in">
                <div className="bg-[#1c1132] p-8 rounded-3xl text-center w-full max-w-xs border-2 border-purple-500 shadow-[0_0_50px_rgba(168,85,247,0.3)] animate-in zoom-in">
                    <Trophy size={64} className="mx-auto text-yellow-400 mb-4 animate-bounce" />
                    <h2 className="text-3xl font-black text-white mb-2">Memory Master!</h2>
                    <div className="flex justify-center gap-6 my-4 text-purple-200 text-sm">
                        <div className="text-center">
                            <div className="text-white font-bold text-xl">{timer}s</div>
                            <div>Time</div>
                        </div>
                        <div className="text-center">
                            <div className="text-white font-bold text-xl">{moves}</div>
                            <div>Moves</div>
                        </div>
                    </div>
                    <div className="bg-purple-900/50 p-4 rounded-xl mb-6">
                        <div className="text-xs text-purple-300 uppercase tracking-widest mb-1">Total Score</div>
                        <div className="text-3xl font-black text-yellow-400">{Math.max(0, 5000 - (timer * 10) - (moves * 20))}</div>
                    </div>
                    <button onClick={() => { onFinish({score: Math.max(0, 5000 - (timer * 10) - (moves * 20)), maxCombo: 0, correctCount: 10}); onBack(); }} className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg transition-colors">
                        領取獎勵
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
