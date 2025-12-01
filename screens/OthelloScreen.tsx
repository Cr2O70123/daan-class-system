
import React, { useState, useEffect } from 'react';
import { ArrowLeft, RefreshCw, Trophy, Circle, X } from 'lucide-react';

interface OthelloScreenProps {
  onBack: () => void;
}

const BOARD_SIZE = 8;

export const OthelloScreen: React.FC<OthelloScreenProps> = ({ onBack }) => {
  const [board, setBoard] = useState<(string | null)[][]>([]);
  const [turn, setTurn] = useState<'black' | 'white'>('black');
  const [validMoves, setValidMoves] = useState<number[][]>([]);
  const [scores, setScores] = useState({ black: 2, white: 2 });
  const [gameOver, setGameOver] = useState(false);
  const [noMoveAlert, setNoMoveAlert] = useState(false);

  useEffect(() => {
      resetGame();
  }, []);

  const resetGame = () => {
      const newBoard = Array(BOARD_SIZE).fill(null).map(() => Array(BOARD_SIZE).fill(null));
      // Initial Setup
      const mid = BOARD_SIZE / 2;
      newBoard[mid-1][mid-1] = 'white';
      newBoard[mid][mid] = 'white';
      newBoard[mid-1][mid] = 'black';
      newBoard[mid][mid-1] = 'black';
      
      setBoard(newBoard);
      setTurn('black');
      setGameOver(false);
      setScores({ black: 2, white: 2 });
      
      // Calculate moves for black immediately
      setTimeout(() => calculateValidMoves(newBoard, 'black'), 0);
  };

  const getFlippablePieces = (r: number, c: number, player: string, currentBoard: (string|null)[][]) => {
      if (currentBoard[r][c] !== null) return [];
      const opponent = player === 'black' ? 'white' : 'black';
      const directions = [[0,1],[0,-1],[1,0],[-1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
      let allFlips: {r: number, c: number}[] = [];

      for (const [dr, dc] of directions) {
          let nr = r + dr;
          let nc = c + dc;
          let flipsInDir: {r: number, c: number}[] = [];
          
          while (nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && currentBoard[nr][nc] === opponent) {
              flipsInDir.push({r: nr, c: nc});
              nr += dr;
              nc += dc;
          }
          
          if (flipsInDir.length > 0 && nr >= 0 && nr < BOARD_SIZE && nc >= 0 && nc < BOARD_SIZE && currentBoard[nr][nc] === player) {
              allFlips = [...allFlips, ...flipsInDir];
          }
      }
      return allFlips;
  };

  const calculateValidMoves = (currentBoard: (string|null)[][], player: 'black' | 'white') => {
      const moves = [];
      for (let r = 0; r < BOARD_SIZE; r++) {
          for (let c = 0; c < BOARD_SIZE; c++) {
              if (getFlippablePieces(r, c, player, currentBoard).length > 0) {
                  moves.push([r, c]);
              }
          }
      }
      setValidMoves(moves);
      
      // Check for pass or game over
      if (moves.length === 0) {
          // Check if opponent has moves
          const opponent = player === 'black' ? 'white' : 'black';
          let opMoves = false;
          for (let r = 0; r < BOARD_SIZE; r++) {
              for (let c = 0; c < BOARD_SIZE; c++) {
                  if (getFlippablePieces(r, c, opponent, currentBoard).length > 0) {
                      opMoves = true;
                      break;
                  }
              }
              if (opMoves) break;
          }

          if (!opMoves) {
              setGameOver(true);
          } else {
              setNoMoveAlert(true);
              setTimeout(() => {
                  setNoMoveAlert(false);
                  setTurn(opponent);
                  calculateValidMoves(currentBoard, opponent);
              }, 1500);
          }
      }
  };

  const handleMove = (r: number, c: number) => {
      if (gameOver || noMoveAlert) return;
      
      // Check if valid
      if (!validMoves.some(m => m[0] === r && m[1] === c)) return;

      const flips = getFlippablePieces(r, c, turn, board);
      if (flips.length === 0) return;

      const newBoard = board.map(row => [...row]);
      newBoard[r][c] = turn;
      flips.forEach(p => {
          newBoard[p.r][p.c] = turn;
      });

      setBoard(newBoard);
      
      // Update scores
      let b = 0, w = 0;
      newBoard.forEach(row => row.forEach(cell => {
          if (cell === 'black') b++;
          else if (cell === 'white') w++;
      }));
      setScores({ black: b, white: w });

      const nextTurn = turn === 'black' ? 'white' : 'black';
      setTurn(nextTurn);
      calculateValidMoves(newBoard, nextTurn);
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#2c3e50] flex flex-col items-center justify-center font-sans overflow-hidden">
      
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-20 pointer-events-none">
        <button onClick={onBack} className="p-2 bg-gray-800/80 text-white rounded-full pointer-events-auto backdrop-blur-md shadow-lg hover:bg-gray-700">
          <ArrowLeft size={24} />
        </button>
        <button onClick={resetGame} className="p-2 bg-gray-800/80 text-white rounded-full pointer-events-auto backdrop-blur-md shadow-lg hover:bg-gray-700">
          <RefreshCw size={24} />
        </button>
      </div>

      {/* Score Board */}
      <div className="flex gap-8 mb-6 mt-16 w-full max-w-sm justify-center">
          <div className={`flex flex-col items-center p-3 rounded-2xl w-32 transition-all ${turn === 'black' ? 'bg-black/40 border-2 border-green-500 scale-110 shadow-lg shadow-green-500/20' : 'bg-black/20'}`}>
              <div className="w-8 h-8 bg-black rounded-full mb-1 border-2 border-gray-600 shadow-inner"></div>
              <span className="text-white font-bold text-sm">Black</span>
              <span className="text-2xl font-black text-white">{scores.black}</span>
          </div>
          <div className={`flex flex-col items-center p-3 rounded-2xl w-32 transition-all ${turn === 'white' ? 'bg-white/20 border-2 border-green-500 scale-110 shadow-lg shadow-green-500/20' : 'bg-black/20'}`}>
              <div className="w-8 h-8 bg-white rounded-full mb-1 border-2 border-gray-300 shadow-sm"></div>
              <span className="text-white font-bold text-sm">White</span>
              <span className="text-2xl font-black text-white">{scores.white}</span>
          </div>
      </div>

      {/* Board - Fixed Layout using Borders */}
      <div className="bg-[#219150] p-1 rounded-xl shadow-2xl border-4 border-[#145a32] relative select-none">
          <div 
              className="grid"
              style={{ 
                  gridTemplateColumns: `repeat(${BOARD_SIZE}, 1fr)`,
                  width: 'min(90vw, 360px)',
                  aspectRatio: '1/1',
              }}
          >
              {board.map((row, r) => (
                  row.map((cell, c) => {
                      const isValid = validMoves.some(m => m[0] === r && m[1] === c);
                      return (
                          <div 
                              key={`${r}-${c}`}
                              onClick={() => handleMove(r, c)}
                              className="relative flex items-center justify-center cursor-pointer border border-[#145a32]/20"
                          >
                              {/* Valid Move Indicator */}
                              {isValid && !gameOver && (
                                  <div className="w-3 h-3 rounded-full bg-black/20 ring-4 ring-black/5"></div>
                              )}

                              {/* Pieces - Absolute Positioning for stability */}
                              {cell && (
                                  <div className={`absolute inset-1 rounded-full shadow-md z-10 transition-all duration-300 transform ${cell === 'black' ? 'bg-black' : 'bg-white'} animate-in zoom-in`}>
                                      <div className="w-full h-full rounded-full bg-gradient-to-br from-transparent to-black/20"></div>
                                  </div>
                              )}
                          </div>
                      );
                  })
              ))}
          </div>
          
          {/* No Move Alert */}
          {noMoveAlert && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-lg animate-in fade-in z-20">
                  <div className="bg-white px-6 py-3 rounded-xl shadow-xl font-bold text-gray-800 border-2 border-red-500">
                      Pass! (No moves)
                  </div>
              </div>
          )}
      </div>

      {/* Game Over Modal */}
      {gameOver && (
          <div className="absolute inset-0 z-30 bg-black/70 flex items-center justify-center p-6 animate-in fade-in">
              <div className="bg-white p-8 rounded-3xl shadow-2xl text-center w-full max-w-xs animate-in zoom-in">
                  <Trophy size={64} className="mx-auto text-yellow-500 mb-4 animate-bounce" />
                  <h2 className="text-3xl font-black text-gray-800 mb-2">
                      {scores.black > scores.white ? '黑方獲勝!' : scores.white > scores.black ? '白方獲勝!' : '平手!'}
                  </h2>
                  <div className="flex justify-center gap-8 my-4 text-xl font-bold">
                      <div className="flex items-center gap-2"><div className="w-4 h-4 bg-black rounded-full"></div> {scores.black}</div>
                      <div className="flex items-center gap-2"><div className="w-4 h-4 bg-white border border-gray-300 rounded-full"></div> {scores.white}</div>
                  </div>
                  <button onClick={resetGame} className="mt-4 w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg">
                      再玩一局
                  </button>
              </div>
          </div>
      )}
    </div>
  );
};
