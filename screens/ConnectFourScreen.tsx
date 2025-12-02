
import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Circle } from 'lucide-react';

interface ConnectFourScreenProps {
  onBack: () => void;
}

const ROWS = 6;
const COLS = 7;

export const ConnectFourScreen: React.FC<ConnectFourScreenProps> = ({ onBack }) => {
  const [board, setBoard] = useState<(string | null)[][]>(
    Array(ROWS).fill(null).map(() => Array(COLS).fill(null))
  );
  const [turn, setTurn] = useState<'red' | 'yellow'>('red');
  const [winner, setWinner] = useState<'red' | 'yellow' | 'draw' | null>(null);
  const [winningCells, setWinningCells] = useState<[number, number][]>([]);

  const checkWin = (r: number, c: number, player: string, currentBoard: (string | null)[][]) => {
    // Directions: Horizontal, Vertical, Diagonal /, Diagonal \
    const directions = [
      [0, 1], [1, 0], [1, 1], [1, -1]
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      const cells: [number, number][] = [[r, c]];

      // Check forward
      for (let i = 1; i < 4; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || currentBoard[nr][nc] !== player) break;
        count++;
        cells.push([nr, nc]);
      }

      // Check backward
      for (let i = 1; i < 4; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || currentBoard[nr][nc] !== player) break;
        count++;
        cells.push([nr, nc]);
      }

      if (count >= 4) {
        setWinningCells(cells);
        return true;
      }
    }
    return false;
  };

  const handleColumnClick = (colIndex: number) => {
    if (winner) return;

    // Find the lowest empty spot in the column
    let rowIndex = -1;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (!board[r][colIndex]) {
        rowIndex = r;
        break;
      }
    }

    if (rowIndex === -1) return; // Column full

    const newBoard = board.map(row => [...row]);
    newBoard[rowIndex][colIndex] = turn;
    setBoard(newBoard);

    if (checkWin(rowIndex, colIndex, turn, newBoard)) {
      setWinner(turn);
    } else if (newBoard.every(row => row.every(cell => cell !== null))) {
      setWinner('draw');
    } else {
      setTurn(turn === 'red' ? 'yellow' : 'red');
    }
  };

  const resetGame = () => {
    setBoard(Array(ROWS).fill(null).map(() => Array(COLS).fill(null)));
    setTurn('red');
    setWinner(null);
    setWinningCells([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#1e293b] flex flex-col items-center justify-center font-sans overflow-hidden">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-20">
        <button onClick={onBack} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
          <ArrowLeft size={24} />
        </button>
        <div className={`px-6 py-2 rounded-full font-bold shadow-lg transition-colors border-2 ${
            winner 
                ? 'bg-white text-gray-800 border-white' 
                : turn === 'red' 
                    ? 'bg-red-500 text-white border-red-400' 
                    : 'bg-yellow-400 text-yellow-900 border-yellow-300'
        }`}>
           {winner === 'draw' ? '平手!' : winner ? `${winner === 'red' ? '紅方' : '黃方'} 獲勝!` : `${turn === 'red' ? '紅方' : '黃方'} 回合`}
        </div>
        <button onClick={resetGame} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
          <RefreshCw size={24} />
        </button>
      </div>

      {/* Game Board */}
      <div className="p-4 rounded-3xl bg-blue-600 shadow-[0_10px_30px_rgba(0,0,0,0.5)] border-4 border-blue-700 relative">
        {/* Legs */}
        <div className="absolute -bottom-12 -left-4 w-4 h-16 bg-blue-800 rounded-full transform rotate-12"></div>
        <div className="absolute -bottom-12 -right-4 w-4 h-16 bg-blue-800 rounded-full transform -rotate-12"></div>

        <div className="grid grid-cols-7 gap-2 bg-blue-600 p-2 rounded-xl">
            {/* Columns (Click Targets) */}
            {Array.from({ length: COLS }).map((_, c) => (
                <div key={`col-${c}`} className="flex flex-col gap-2 group cursor-pointer" onClick={() => handleColumnClick(c)}>
                    {/* Hover Indicator */}
                    <div className={`w-full aspect-square rounded-full mb-1 transition-opacity opacity-0 group-hover:opacity-50 ${turn === 'red' ? 'bg-red-500' : 'bg-yellow-400'} ${winner ? 'hidden' : ''}`}></div>
                    
                    {/* Rows */}
                    {Array.from({ length: ROWS }).map((_, r) => {
                        const cell = board[r][c];
                        const isWin = winningCells.some(([wr, wc]) => wr === r && wc === c);
                        return (
                            <div key={`${r}-${c}`} className="w-full aspect-square rounded-full bg-[#0f172a] relative shadow-[inset_0_4px_6px_rgba(0,0,0,0.6)] overflow-hidden">
                                {cell && (
                                    <div 
                                        className={`w-full h-full rounded-full shadow-[inset_0_-4px_4px_rgba(0,0,0,0.2)] animate-in slide-in-from-top duration-500 ${
                                            cell === 'red' ? 'bg-red-500' : 'bg-yellow-400'
                                        } ${isWin ? 'ring-4 ring-white animate-pulse z-10' : ''}`}
                                    >
                                        <div className="absolute top-1/4 left-1/4 w-1/4 h-1/4 bg-white opacity-20 rounded-full blur-[1px]"></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ))}
        </div>
      </div>
    </div>
  );
};
