
import React, { useState } from 'react';
import { ArrowLeft, Gem, Bomb, DollarSign, RefreshCw } from 'lucide-react';
import { User } from '../types';

interface MinesScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (netBmc: number) => void;
}

const GRID_SIZE = 25; // 5x5

export const MinesScreen: React.FC<MinesScreenProps> = ({ user, onBack, onFinish }) => {
    const [gameState, setGameState] = useState<'BETTING' | 'PLAYING' | 'GAMEOVER' | 'CASHED_OUT'>('BETTING');
    const [bet, setBet] = useState(10);
    const [mineCount, setMineCount] = useState(3);
    const [grid, setGrid] = useState<('GEM' | 'BOMB' | null)[]>([]); // null = not revealed content
    const [revealed, setRevealed] = useState<boolean[]>([]);
    const [multiplier, setMultiplier] = useState(1.0);

    const handleStart = () => {
        if ((user.blackMarketCoins || 0) < bet) {
            alert("黑幣不足");
            return;
        }
        
        // Generate grid
        const newGrid = Array(GRID_SIZE).fill('GEM');
        let placedMines = 0;
        while (placedMines < mineCount) {
            const idx = Math.floor(Math.random() * GRID_SIZE);
            if (newGrid[idx] !== 'BOMB') {
                newGrid[idx] = 'BOMB';
                placedMines++;
            }
        }
        
        setGrid(newGrid);
        setRevealed(Array(GRID_SIZE).fill(false));
        setGameState('PLAYING');
        setMultiplier(1.0);
    };

    const handleTileClick = (index: number) => {
        if (gameState !== 'PLAYING' || revealed[index]) return;

        const newRevealed = [...revealed];
        newRevealed[index] = true;
        setRevealed(newRevealed);

        if (grid[index] === 'BOMB') {
            setGameState('GAMEOVER');
            onFinish(-bet);
        } else {
            // Calculate new multiplier
            // Formula: PreviousMult * (RemainingTiles / RemainingSafeTiles)
            const tilesLeft = GRID_SIZE - newRevealed.filter(Boolean).length + 1; // +1 because we just clicked
            const safeLeft = GRID_SIZE - mineCount - (newRevealed.filter(Boolean).length - 1);
            
            // Simplified multiplier growth
            const growth = 1 + (mineCount / (25 - mineCount)) * 0.2; // Arbitrary logic for fun
            setMultiplier(prev => prev + (prev * (mineCount/25)));
        }
    };

    const cashOut = () => {
        const winnings = Math.floor(bet * multiplier);
        const netWin = winnings - bet;
        setGameState('CASHED_OUT');
        onFinish(netWin);
    };

    return (
        <div className="fixed inset-0 z-50 bg-[#0d1117] flex flex-col text-white font-mono overflow-hidden">
            {/* Header */}
            <div className="p-4 pt-safe flex justify-between items-center border-b border-gray-800 bg-gray-900/80">
                <button onClick={onBack} className="p-2 hover:bg-gray-800 rounded-full text-gray-400">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex items-center gap-2">
                    <Bomb size={20} className="text-red-500" />
                    <span className="font-black text-lg tracking-widest">MINES</span>
                </div>
                <div className="flex items-center gap-1 bg-gray-800 px-3 py-1 rounded-full text-xs">
                    <Gem size={12} className="text-purple-400"/>
                    <span>{user.blackMarketCoins || 0}</span>
                </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center p-4">
                
                {/* Stats / Controls Area */}
                <div className="w-full max-w-sm mb-6 flex justify-between items-end">
                    {gameState === 'BETTING' ? (
                        <div className="w-full space-y-4">
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                                <div className="flex justify-between mb-2 text-xs text-gray-400 font-bold uppercase">
                                    <span>Bet Amount</span>
                                    <span>Mines</span>
                                </div>
                                <div className="flex gap-4">
                                    <input 
                                        type="number" 
                                        value={bet} 
                                        onChange={e => setBet(Math.max(1, parseInt(e.target.value)))}
                                        className="flex-1 bg-gray-900 rounded-lg p-2 text-center font-black outline-none border border-gray-600 focus:border-purple-500"
                                    />
                                    <div className="flex items-center gap-2 bg-gray-900 rounded-lg px-2 border border-gray-600">
                                        <button onClick={() => setMineCount(Math.max(1, mineCount-1))} className="text-gray-400 hover:text-white font-bold p-2">-</button>
                                        <span className="font-black w-4 text-center">{mineCount}</span>
                                        <button onClick={() => setMineCount(Math.min(24, mineCount+1))} className="text-gray-400 hover:text-white font-bold p-2">+</button>
                                    </div>
                                </div>
                            </div>
                            <button onClick={handleStart} className="w-full py-4 bg-green-600 hover:bg-green-500 text-white font-black rounded-xl shadow-lg">START GAME</button>
                        </div>
                    ) : (
                        <div className="w-full flex justify-between items-center bg-gray-800 p-4 rounded-xl border border-gray-700">
                            <div>
                                <div className="text-xs text-gray-400 font-bold uppercase">Current Profit</div>
                                <div className={`text-xl font-black ${gameState === 'GAMEOVER' ? 'text-red-500' : 'text-green-400'}`}>
                                    {Math.floor(bet * multiplier)} <span className="text-xs text-gray-500">({multiplier.toFixed(2)}x)</span>
                                </div>
                            </div>
                            {gameState === 'PLAYING' && (
                                <button onClick={cashOut} className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-lg">
                                    CASH OUT
                                </button>
                            )}
                            {(gameState === 'GAMEOVER' || gameState === 'CASHED_OUT') && (
                                <button onClick={() => setGameState('BETTING')} className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1">
                                    <RefreshCw size={14}/> RESET
                                </button>
                            )}
                        </div>
                    )}
                </div>

                {/* Grid */}
                <div className="grid grid-cols-5 gap-2 w-full max-w-sm aspect-square">
                    {Array.from({ length: GRID_SIZE }).map((_, i) => {
                        const isRevealed = revealed[i] || gameState === 'GAMEOVER' || gameState === 'CASHED_OUT';
                        const content = grid[i];
                        
                        return (
                            <button
                                key={i}
                                disabled={gameState !== 'PLAYING' || revealed[i]}
                                onClick={() => handleTileClick(i)}
                                className={`
                                    rounded-lg transition-all duration-200 relative overflow-hidden flex items-center justify-center
                                    ${!isRevealed 
                                        ? 'bg-gray-700 hover:bg-gray-600 active:scale-95 shadow-[0_4px_0_rgba(0,0,0,0.3)]' 
                                        : 'bg-gray-900 shadow-inner'
                                    }
                                `}
                            >
                                {isRevealed && (
                                    <div className="animate-in zoom-in duration-300">
                                        {content === 'BOMB' ? (
                                            <Bomb size={24} className="text-red-500" />
                                        ) : (
                                            <Gem size={24} className="text-green-400" />
                                        )}
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

            </div>
        </div>
    );
};
