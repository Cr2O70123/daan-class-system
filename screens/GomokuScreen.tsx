
import React, { useState } from 'react';
import { ArrowLeft, RefreshCw, Circle, Trophy } from 'lucide-react';

interface GomokuScreenProps {
  onBack: () => void;
}

const BOARD_SIZE = 15;

export const GomokuScreen: React.FC<GomokuScreenProps> = ({ onBack }) => {
  const [board, setBoard] = useState<(string | null)[][]>(
    Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null))
  );
  const [turn, setTurn] = useState<'black' | 'white'>('black');
  const [winner, setWinner] = useState<'black' | 'white' | null>(null);
  const [winningLine, setWinningLine] = useState<[number, number][]>([]);

  const checkWin = (r: number, c: number, player: string, currentBoard: (string | null)[][]) => {
    const directions = [
      [0, 1],  // Horizontal
      [1, 0],  // Vertical
      [1, 1],  // Diagonal \
      [1, -1]  // Diagonal /
    ];

    for (const [dr, dc] of directions) {
      let count = 1;
      const line: [number, number][] = [[r, c]];

      // Check positive direction
      for (let i = 1; i < 5; i++) {
        const nr = r + dr * i;
        const nc = c + dc * i;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE || currentBoard[nr][nc] !== player) break;
        count++;
        line.push([nr, nc]);
      }

      // Check negative direction
      for (let i = 1; i < 5; i++) {
        const nr = r - dr * i;
        const nc = c - dc * i;
        if (nr < 0 || nr >= BOARD_SIZE || nc < 0 || nc >= BOARD_SIZE || currentBoard[nr][nc] !== player) break;
        count++;
        line.push([nr, nc]);
      }

      if (count >= 5) {
        setWinningLine(line);
        return true;
      }
    }
    return false;
  };

  const handleCellClick = (r: number, c: number) => {
    if (board[r][c] || winner) return;

    const newBoard = board.map(row => [...row]);
    newBoard[r][c] = turn;
    setBoard(newBoard);

    if (checkWin(r, c, turn, newBoard)) {
      setWinner(turn);
    } else {
      setTurn(turn === 'black' ? 'white' : 'black');
    }
  };

  const resetGame = () => {
    setBoard(Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null)));
    setTurn('black');
    setWinner(null);
    setWinningLine([]);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#e6cba5] flex flex-col items-center justify-center font-sans overflow-hidden">
      <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-20">
        <button onClick={onBack} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors text-amber-900">
          <ArrowLeft size={24} />
        </button>
        <div className="bg-amber-100/80 px-4 py-2 rounded-full border border-amber-300 shadow-sm backdrop-blur-sm">
           <span className="font-bold text-amber-900">{winner ? '遊戲結束' : `${turn === 'black' ? '黑子' : '白子'} 回合`}</span>
        </div>
        <button onClick={resetGame} className="p-2 bg-black/10 hover:bg-black/20 rounded-full transition-colors text-amber-900">
          <RefreshCw size={24} />
        </button>
      </div>

      <div className="relative p-1 bg-[#dcb35c] rounded-lg shadow-2xl border-4 border-[#8b5a2b]">
        {/* Board Grid */}
        <div 
            className="grid bg-[#eecfa1]"
            style={{ 
                gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                width: 'min(90vw, 500px)',
                aspectRatio: '1/1',
            }}
        >
            {board.map((row, r) => (
                row.map((cell, c) => {
                    const isWinningCell = winningLine.some(([wr, wc]) => wr === r && wc === c);
                    return (
                        <div 
                            key={`${r}-${c}`}
                            onClick={() => handleCellClick(r, c)}
                            className="relative flex items-center justify-center cursor-pointer"
                        >
                            {/* Grid Lines */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <div className="w-full h-[1px] bg-black/30"></div>
                                <div className="h-full w-[1px] bg-black/30 absolute"></div>
                            </div>
                            
                            {/* Star Points (Hoshi) */}
                            {((r === 3 || r === 11 || r === 7) && (c === 3 || c === 11 || c === 7)) && (
                                <div className="w-2 h-2 bg-black rounded-full absolute z-0"></div>
                            )}

                            {/* Piece */}
                            {cell && (
                                <div className={`w-[80%] h-[80%] rounded-full shadow-md z-10 transition-transform duration-200 ${cell === 'black' ? 'bg-black' : 'bg-white'} ${isWinningCell ? 'ring-4 ring-green-500 scale-110' : ''} ${winner ? '' : 'scale-100'}`}>
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-transparent to-black/20"></div>
                                </div>
                            )}
                        </div>
                    );
                })
            ))}
        </div>
      </div>

      {winner && (
          <div className="absolute inset-0 z-30 bg-black/50 flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center w-full max-w-xs animate-in zoom-in">
                  <Trophy size={64} className="mx-auto text-yellow-500 mb-4 animate-bounce" />
                  <h2 className="text-3xl font-black text-gray-800 mb-2">{winner === 'black' ? '黑子' : '白子'} 獲勝!</h2>
                  <button onClick={resetGame} className="mt-6 w-full py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold shadow-lg">
                      再玩一局
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
