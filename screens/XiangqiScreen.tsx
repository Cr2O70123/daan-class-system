
import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RefreshCw, Flag, X, Circle, RotateCcw, HelpCircle, Eye, EyeOff } from 'lucide-react';
import { User } from '../types';

interface XiangqiScreenProps {
  onBack: () => void;
}

// Types
type PieceType = 'K' | 'A' | 'E' | 'H' | 'R' | 'C' | 'S'; // King, Advisor, Elephant, Horse, Rook, Cannon, Soldier
type PieceColor = 'red' | 'black';
type GameMode = 'STANDARD' | 'DARK';

interface Piece {
  type: PieceType;
  color: PieceColor;
  id: string; // Unique ID for key
  isHidden?: boolean; // For Dark Chess
}

interface Position {
  r: number;
  c: number;
}

// Initial Board Setup (Standard)
const INITIAL_STANDARD_BOARD: (Piece | null)[][] = [
  // Black Side (Top)
  [
    { type: 'R', color: 'black', id: 'bR1' }, { type: 'H', color: 'black', id: 'bH1' }, { type: 'E', color: 'black', id: 'bE1' }, { type: 'A', color: 'black', id: 'bA1' }, { type: 'K', color: 'black', id: 'bK' }, { type: 'A', color: 'black', id: 'bA2' }, { type: 'E', color: 'black', id: 'bE2' }, { type: 'H', color: 'black', id: 'bH2' }, { type: 'R', color: 'black', id: 'bR2' }
  ],
  Array(9).fill(null),
  [
    null, { type: 'C', color: 'black', id: 'bC1' }, null, null, null, null, null, { type: 'C', color: 'black', id: 'bC2' }, null
  ],
  [
    { type: 'S', color: 'black', id: 'bS1' }, null, { type: 'S', color: 'black', id: 'bS2' }, null, { type: 'S', color: 'black', id: 'bS3' }, null, { type: 'S', color: 'black', id: 'bS4' }, null, { type: 'S', color: 'black', id: 'bS5' }
  ],
  Array(9).fill(null),
  // River
  Array(9).fill(null),
  [
    { type: 'S', color: 'red', id: 'rS1' }, null, { type: 'S', color: 'red', id: 'rS2' }, null, { type: 'S', color: 'red', id: 'rS3' }, null, { type: 'S', color: 'red', id: 'rS4' }, null, { type: 'S', color: 'red', id: 'rS5' }
  ],
  [
    null, { type: 'C', color: 'red', id: 'rC1' }, null, null, null, null, null, { type: 'C', color: 'red', id: 'rC2' }, null
  ],
  Array(9).fill(null),
  [
    { type: 'R', color: 'red', id: 'rR1' }, { type: 'H', color: 'red', id: 'rH1' }, { type: 'E', color: 'red', id: 'rE1' }, { type: 'A', color: 'red', id: 'rA1' }, { type: 'K', color: 'red', id: 'rK' }, { type: 'A', color: 'red', id: 'rA2' }, { type: 'E', color: 'red', id: 'rE2' }, { type: 'H', color: 'red', id: 'rH2' }, { type: 'R', color: 'red', id: 'rR2' }
  ]
];

// Helper to generate Dark Chess board (4x8)
const generateDarkBoard = (): (Piece | null)[][] => {
    const allPieces: Piece[] = [];
    const colors: PieceColor[] = ['red', 'black'];
    const types: {type: PieceType, count: number}[] = [
        {type: 'K', count: 1}, {type: 'A', count: 2}, {type: 'E', count: 2}, 
        {type: 'R', count: 2}, {type: 'H', count: 2}, {type: 'C', count: 2}, {type: 'S', count: 5}
    ];

    colors.forEach(color => {
        types.forEach(t => {
            for(let i=0; i<t.count; i++) {
                allPieces.push({
                    type: t.type,
                    color: color,
                    id: `${color}_${t.type}_${i}`,
                    isHidden: true
                });
            }
        });
    });

    // Shuffle
    for (let i = allPieces.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [allPieces[i], allPieces[j]] = [allPieces[j], allPieces[i]];
    }

    // Place on 4x8 grid
    const grid: (Piece | null)[][] = [];
    for(let r=0; r<4; r++) {
        const row: (Piece | null)[] = [];
        for(let c=0; c<8; c++) {
            row.push(allPieces[r*8 + c]);
        }
        grid.push(row);
    }
    return grid;
};

// Helpers
const getPieceLabel = (type: PieceType, color: PieceColor): string => {
  if (color === 'red') {
    switch (type) {
      case 'K': return '帥'; case 'A': return '仕'; case 'E': return '相'; case 'H': return '傌'; case 'R': return '俥'; case 'C': return '炮'; case 'S': return '兵';
    }
  } else {
    switch (type) {
      case 'K': return '將'; case 'A': return '士'; case 'E': return '象'; case 'H': return '馬'; case 'R': return '車'; case 'C': return '包'; case 'S': return '卒';
    }
  }
  return '';
};

// --- Game Logic ---

export const XiangqiScreen: React.FC<XiangqiScreenProps> = ({ onBack }) => {
  const [mode, setMode] = useState<GameMode | null>(null);
  const [board, setBoard] = useState<(Piece | null)[][]>([]);
  const [turn, setTurn] = useState<PieceColor>('red'); // Red usually goes first
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [lastMove, setLastMove] = useState<{from: Position, to: Position} | null>(null);
  
  const [playerColor, setPlayerColor] = useState<PieceColor | null>(null); 

  useEffect(() => {
      if (mode === 'STANDARD') {
          setBoard(INITIAL_STANDARD_BOARD);
      } else if (mode === 'DARK') {
          setBoard(generateDarkBoard());
      }
  }, [mode]);

  // Sound Helper
  const playSound = (type: 'move' | 'capture' | 'select') => {
      try {
          const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
          if (!AudioContext) return;
          const ctx = new AudioContext();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          
          const now = ctx.currentTime;
          if (type === 'select') {
              osc.frequency.setValueAtTime(400, now);
              gain.gain.setValueAtTime(0.05, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
              osc.start(now);
              osc.stop(now + 0.05);
          } else if (type === 'move') {
              osc.type = 'triangle'; // Thud sound
              osc.frequency.setValueAtTime(200, now);
              gain.gain.setValueAtTime(0.1, now);
              gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
              osc.start(now);
              osc.stop(now + 0.1);
          } else if (type === 'capture') {
              osc.type = 'square';
              osc.frequency.setValueAtTime(150, now);
              osc.frequency.linearRampToValueAtTime(100, now + 0.1);
              gain.gain.setValueAtTime(0.1, now);
              gain.gain.linearRampToValueAtTime(0, now + 0.15);
              osc.start(now);
              osc.stop(now + 0.15);
          }
      } catch (e) {}
  };

  const getValidMovesForStandard = (r: number, c: number, boardState: (Piece|null)[][]): Position[] => {
      const piece = boardState[r][c];
      if (!piece) return [];
      const moves: Position[] = [];
      const { type, color } = piece;

      const isInsideBoard = (nr: number, nc: number) => nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8;
      
      const addMoveIfValid = (nr: number, nc: number) => {
          if (!isInsideBoard(nr, nc)) return;
          const target = boardState[nr][nc];
          if (!target || target.color !== color) {
              moves.push({ r: nr, c: nc });
          }
      };

      const checkLineMoves = (dr: number, dc: number, isCannon: boolean) => {
          let nr = r + dr;
          let nc = c + dc;
          let jumped = false;
          while (isInsideBoard(nr, nc)) {
              const target = boardState[nr][nc];
              if (!target) {
                  if (!isCannon || !jumped) moves.push({ r: nr, c: nc });
              } else {
                  if (isCannon) {
                      if (!jumped) {
                          jumped = true; // First piece (screen)
                      } else {
                          if (target.color !== color) moves.push({ r: nr, c: nc }); // Kill
                          break;
                      }
                  } else {
                      // Rook
                      if (target.color !== color) moves.push({ r: nr, c: nc });
                      break;
                  }
              }
              nr += dr;
              nc += dc;
          }
      };

      if (type === 'R' || type === 'C') { // Rook or Cannon
          [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => checkLineMoves(dr, dc, type === 'C'));
      } 
      else if (type === 'H') { // Horse (Sun Move)
          [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              if (isInsideBoard(nr, nc)) {
                  // Check blocking leg
                  const legR = r + (Math.abs(dr) === 2 ? Math.sign(dr) : 0);
                  const legC = c + (Math.abs(dc) === 2 ? Math.sign(dc) : 0);
                  if (!boardState[legR][legC]) addMoveIfValid(nr, nc);
              }
          });
      }
      else if (type === 'E') { // Elephant
          // Cannot cross river: Red (r>=5), Black (r<=4)
          const canCrossRiver = false; 
          const mySide = (r: number) => color === 'red' ? r >= 5 : r <= 4;

          [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              if (isInsideBoard(nr, nc) && mySide(nr)) {
                  // Check Eye
                  const eyeR = r + dr / 2;
                  const eyeC = c + dc / 2;
                  if (!boardState[eyeR][eyeC]) addMoveIfValid(nr, nc);
              }
          });
      }
      else if (type === 'A' || type === 'K') { // Advisor or King
          // Palace Bounds
          const isPalace = (tr: number, tc: number) => {
              if (tc < 3 || tc > 5) return false;
              if (color === 'red') return tr >= 7 && tr <= 9;
              return tr >= 0 && tr <= 2;
          };

          const directions = type === 'A' 
              ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] 
              : [[0, 1], [0, -1], [1, 0], [-1, 0]];

          directions.forEach(([dr, dc]) => {
              const nr = r + dr;
              const nc = c + dc;
              if (isInsideBoard(nr, nc) && isPalace(nr, nc)) addMoveIfValid(nr, nc);
          });
          
          // King Facing King Rule (Flying General)
          if (type === 'K') {
              const dir = color === 'red' ? -1 : 1;
              let nr = r + dir;
              while (isInsideBoard(nr, c)) {
                  const target = boardState[nr][c];
                  if (target) {
                      if (target.type === 'K') moves.push({ r: nr, c }); // Can kill opposing king directly
                      break;
                  }
                  nr += dir;
              }
          }
      }
      else if (type === 'S') { // Soldier
          const forward = color === 'red' ? -1 : 1;
          const crossedRiver = color === 'red' ? r <= 4 : r >= 5;
          
          // Forward
          addMoveIfValid(r + forward, c);
          
          // Sideways if crossed river
          if (crossedRiver) {
              addMoveIfValid(r, c + 1);
              addMoveIfValid(r, c - 1);
          }
      }

      return moves;
  };

  const getValidMovesForDark = (r: number, c: number, boardState: (Piece|null)[][]): Position[] => {
      const piece = boardState[r][c];
      if (!piece || piece.isHidden) return [];
      
      const moves: Position[] = [];
      const directions = [[0,1], [0,-1], [1,0], [-1,0]];
      
      directions.forEach(([dr, dc]) => {
          const nr = r + dr;
          const nc = c + dc;
          
          if (nr >= 0 && nr < 4 && nc >= 0 && nc < 8) {
              const target = boardState[nr][nc];
              
              if (piece.type === 'C') {
                  // Cannon Move (1 space to empty)
                  if (!target) {
                      moves.push({r: nr, c: nc});
                  } else {
                      // Cannon Capture (Must Jump 1 piece)
                      // In Dark Chess, Cannon needs a screen to eat ANY piece
                      let jumpR = nr + dr;
                      let jumpC = nc + dc;
                      while (jumpR >= 0 && jumpR < 4 && jumpC >= 0 && jumpC < 8) {
                          const jumpTarget = boardState[jumpR][jumpC];
                          if (jumpTarget) {
                              if (!jumpTarget.isHidden && jumpTarget.color !== piece.color) {
                                  moves.push({r: jumpR, c: jumpC});
                              }
                              break; // Stop after finding target or blocked
                          }
                          jumpR += dr;
                          jumpC += dc;
                      }
                  }
              } else {
                  // Regular Move (1 adjacent)
                  if (!target) {
                      moves.push({r: nr, c: nc});
                  } else if (!target.isHidden && target.color !== piece.color) {
                      // Hierarchy: K > A > E > R > H > C > S
                      // Exception: S > K
                      const ranks = ['K', 'A', 'E', 'R', 'H', 'C', 'S']; 
                      const pIdx = ranks.indexOf(piece.type);
                      const tIdx = ranks.indexOf(target.type);
                      
                      // Special case: S eats K
                      if (piece.type === 'S' && target.type === 'K') {
                          moves.push({r: nr, c: nc});
                      } 
                      // Special case: K cannot eat S
                      else if (piece.type === 'K' && target.type === 'S') {
                          // Invalid
                      }
                      // Normal rank comparison (Smaller index = Higher rank)
                      else if (pIdx <= tIdx) { 
                          moves.push({r: nr, c: nc});
                      }
                  }
              }
          }
      });
      return moves;
  };

  const handleSquareClick = (r: number, c: number) => {
      if (winner) return;
      const clickedPiece = board[r][c];

      // --- DARK CHESS LOGIC ---
      if (mode === 'DARK') {
          if (clickedPiece && clickedPiece.isHidden) {
              const newBoard = board.map(row => row.map(p => p ? {...p} : null));
              const p = newBoard[r][c]!;
              p.isHidden = false;
              
              setBoard(newBoard);
              playSound('move');
              setLastMove({from: {r, c}, to: {r, c}}); 
              setTurn(turn === 'red' ? 'black' : 'red');
              setSelectedPos(null);
              setValidMoves([]);
              return;
          }
          
          const isOwnPiece = clickedPiece && !clickedPiece.isHidden && clickedPiece.color === turn;
          
          if (isOwnPiece) {
              if (selectedPos?.r === r && selectedPos?.c === c) {
                  setSelectedPos(null); setValidMoves([]);
              } else {
                  setSelectedPos({r, c});
                  setValidMoves(getValidMovesForDark(r, c, board));
                  playSound('select');
              }
              return;
          }
          
          if (selectedPos) {
              const isValid = validMoves.some(m => m.r === r && m.c === c);
              if (isValid) {
                  const newBoard = board.map(row => row.map(p => p));
                  newBoard[r][c] = newBoard[selectedPos.r][selectedPos.c];
                  newBoard[selectedPos.r][selectedPos.c] = null;
                  
                  setBoard(newBoard);
                  setLastMove({from: selectedPos, to: {r, c}});
                  setTurn(turn === 'red' ? 'black' : 'red');
                  setSelectedPos(null);
                  setValidMoves([]);
                  playSound(clickedPiece ? 'capture' : 'move');
              }
          }
          return;
      }

      // --- STANDARD CHESS LOGIC ---
      const isOwnPiece = clickedPiece && clickedPiece.color === turn;
      if (isOwnPiece) {
          if (selectedPos?.r === r && selectedPos?.c === c) {
              setSelectedPos(null);
              setValidMoves([]);
          } else {
              setSelectedPos({r, c});
              setValidMoves(getValidMovesForStandard(r, c, board));
              playSound('select');
          }
          return;
      }

      if (selectedPos) {
          const isValid = validMoves.some(m => m.r === r && m.c === c);
          if (isValid) {
              const newBoard = board.map(row => [...row]);
              const pieceToMove = newBoard[selectedPos.r][selectedPos.c]!;
              const targetPiece = newBoard[r][c];
              
              newBoard[r][c] = pieceToMove;
              newBoard[selectedPos.r][selectedPos.c] = null;
              
              setBoard(newBoard);
              setLastMove({ from: selectedPos, to: {r, c} });
              setTurn(turn === 'red' ? 'black' : 'red');
              setSelectedPos(null);
              setValidMoves([]);

              if (targetPiece) {
                  playSound('capture');
                  if (targetPiece.type === 'K') setWinner(turn);
              } else {
                  playSound('move');
              }
          }
      }
  };

  const restartGame = () => {
      setMode(null); 
      setWinner(null);
      setSelectedPos(null);
      setValidMoves([]);
      setLastMove(null);
      setPlayerColor(null);
  };

  // --- Render Helpers ---
  const boardWidth = 340; 
  const boardHeight = mode === 'DARK' ? 170 : 380; 
  const cellW = boardWidth / (mode === 'DARK' ? 8 : 8);
  const cellH = boardHeight / (mode === 'DARK' ? 4 : 9);

  const renderBoardLines = () => {
      return (
          <svg 
            width="100%" 
            height="100%" 
            viewBox={`0 0 ${boardWidth} ${boardHeight}`} 
            className="absolute inset-0 pointer-events-none z-0"
            preserveAspectRatio="none"
          >
              <rect x="0" y="0" width={boardWidth} height={boardHeight} fill="#F3E5AB" rx="4" />
              
              <g stroke="#5c4033" strokeWidth="1.5">
                  {mode === 'STANDARD' ? (
                      <>
                        {/* Rows */}
                        {Array.from({length: 10}).map((_, i) => (
                            <line key={`r${i}`} x1={0} y1={i * cellH} x2={boardWidth} y2={i * cellH} />
                        ))}
                        {/* Cols */}
                        {Array.from({length: 7}).map((_, i) => (
                            <line key={`ct${i}`} x1={(i + 1) * cellW} y1={0} x2={(i + 1) * cellW} y2={4 * cellH} />
                        ))}
                        {Array.from({length: 7}).map((_, i) => (
                            <line key={`cb${i}`} x1={(i + 1) * cellW} y1={5 * cellH} x2={(i + 1) * cellW} y2={9 * cellH} />
                        ))}
                        {/* Palaces */}
                        <line x1={3*cellW} y1={0} x2={5*cellW} y2={2*cellH} />
                        <line x1={5*cellW} y1={0} x2={3*cellW} y2={2*cellH} />
                        <line x1={3*cellW} y1={7*cellH} x2={5*cellW} y2={9*cellH} />
                        <line x1={5*cellW} y1={7*cellH} x2={3*cellW} y2={9*cellH} />
                        {/* River Text */}
                        <text x={boardWidth * 0.2} y={4.65 * cellH} fontSize="20" fill="#5c4033" fontWeight="bold" textAnchor="middle" style={{fontFamily: 'serif'}}>楚 河</text>
                        <text x={boardWidth * 0.8} y={4.65 * cellH} fontSize="20" fill="#5c4033" fontWeight="bold" textAnchor="middle" style={{fontFamily: 'serif'}}>漢 界</text>
                      </>
                  ) : (
                      <>
                        {/* Dark Chess Grid (4x8) */}
                        {Array.from({length: 5}).map((_, i) => (
                            <line key={`r${i}`} x1={0} y1={i * cellH} x2={boardWidth} y2={i * cellH} />
                        ))}
                        {Array.from({length: 9}).map((_, i) => (
                            <line key={`c${i}`} x1={i * cellW} y1={0} x2={i * cellW} y2={4 * cellH} />
                        ))}
                      </>
                  )}
                  {/* Border */}
                  <rect x="2" y="2" width={boardWidth-4} height={boardHeight-4} fill="none" strokeWidth="3" />
              </g>
          </svg>
      );
  };

  if (!mode) {
      return (
          <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col items-center justify-center font-sans p-6">
              <h1 className="text-4xl font-black text-[#F3E5AB] mb-8 tracking-widest border-b-4 border-[#5c4033] pb-2" style={{fontFamily: 'serif'}}>
                  中國象棋
              </h1>
              <div className="grid gap-4 w-full max-w-sm">
                  <button 
                    onClick={() => setMode('STANDARD')}
                    className="bg-[#3e2723] hover:bg-[#5d4037] text-[#F3E5AB] p-6 rounded-xl flex items-center justify-between group transition-all border-2 border-[#8d6e63]"
                  >
                      <div className="text-left">
                          <h3 className="text-2xl font-bold mb-1">標準大盤</h3>
                          <p className="text-xs opacity-70">楚河漢界，正規對弈規則</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#F3E5AB] text-[#3e2723] flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">帥</div>
                  </button>

                  <button 
                    onClick={() => setMode('DARK')}
                    className="bg-[#263238] hover:bg-[#37474f] text-[#cfd8dc] p-6 rounded-xl flex items-center justify-between group transition-all border-2 border-[#546e7a]"
                  >
                      <div className="text-left">
                          <h3 className="text-2xl font-bold mb-1">暗棋小盤</h3>
                          <p className="text-xs opacity-70">翻牌運氣，4x8 快節奏廝殺</p>
                      </div>
                      <div className="w-12 h-12 rounded-full bg-[#546e7a] text-white flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">?</div>
                  </button>
              </div>
              <button onClick={onBack} className="mt-12 text-gray-500 hover:text-gray-300">返回</button>
          </div>
      );
  }

  // --- GAME SCREEN ---
  return (
    <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col items-center justify-center font-sans overflow-hidden">
        
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-20 pointer-events-none">
            <button onClick={onBack} className="p-2 bg-gray-800/80 text-white rounded-full pointer-events-auto backdrop-blur-md">
                <ArrowLeft size={24} />
            </button>
            <div className={`px-4 py-2 rounded-full font-bold text-lg shadow-lg pointer-events-auto backdrop-blur-md transition-colors ${turn === 'red' ? 'bg-red-900/80 text-red-100 border border-red-500' : 'bg-gray-800/80 text-gray-200 border border-gray-500'}`}>
                {turn === 'red' ? '紅方回合' : '黑方回合'}
            </div>
            <button onClick={restartGame} className="p-2 bg-gray-800/80 text-white rounded-full pointer-events-auto backdrop-blur-md">
                <RefreshCw size={24} />
            </button>
        </div>

        {/* Game Container - Force aspect ratio and contain */}
        <div className="w-full flex items-center justify-center p-2 h-full">
            <div 
                className="relative bg-[#5c4033] rounded-lg shadow-2xl border-4 border-[#3e2723] overflow-hidden"
                style={{ 
                    width: 'min(95vw, 500px)', 
                    aspectRatio: mode === 'DARK' ? '2/1' : '340/380',
                    maxHeight: '80vh'
                }}
            >
                {/* The Board */}
                <div className="relative w-full h-full">
                    {renderBoardLines()}

                    {/* Grid Overlay for Pieces */}
                    <div 
                        className="absolute inset-0 z-10 grid"
                        style={{
                            gridTemplateColumns: `repeat(${mode === 'DARK' ? 8 : 9}, 1fr)`,
                            gridTemplateRows: `repeat(${mode === 'DARK' ? 4 : 10}, 1fr)`,
                            width: '100%',
                            height: '100%'
                        }}
                    >
                        {board.map((row, r) => (
                            row.map((piece, c) => {
                                const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                                const isValid = validMoves.some(m => m.r === r && m.c === c);
                                const isLastMoveSrc = lastMove?.from.r === r && lastMove?.from.c === c;
                                const isLastMoveDst = lastMove?.to.r === r && lastMove?.to.c === c;

                                return (
                                    <div 
                                        key={`${r}-${c}`}
                                        onClick={() => handleSquareClick(r, c)}
                                        className="relative flex items-center justify-center cursor-pointer w-full h-full"
                                    >
                                        {isValid && (
                                            <div className={`absolute w-3 h-3 rounded-full ${piece ? 'ring-2 ring-green-500 ring-offset-1 bg-transparent' : 'bg-green-600/50'} z-0`}></div>
                                        )}

                                        {(isLastMoveSrc || isLastMoveDst) && (
                                            <div className="absolute w-full h-full border-2 border-blue-400/50 rounded-lg pointer-events-none"></div>
                                        )}

                                        {piece && (
                                            <div 
                                                className={`
                                                    relative w-[85%] h-[85%] rounded-full shadow-md flex items-center justify-center border-2 z-10 transition-transform duration-200
                                                    ${piece.isHidden 
                                                        ? 'bg-[#3e2723] border-[#5d4037]'
                                                        : (piece.color === 'red' ? 'border-red-700 bg-[#fdf6e3]' : 'border-gray-800 bg-[#fdf6e3]')
                                                    }
                                                    ${isSelected ? 'scale-110 ring-2 ring-green-400 ring-offset-1 z-20' : ''}
                                                `}
                                                style={{
                                                    background: piece.isHidden 
                                                        ? 'repeating-linear-gradient(45deg, #3e2723, #3e2723 5px, #4e342e 5px, #4e342e 10px)' 
                                                        : 'radial-gradient(circle at 30% 30%, #fffbf0, #e6dcc3)',
                                                    boxShadow: '2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(0,0,0,0.1)'
                                                }}
                                            >
                                                {!piece.isHidden && (
                                                    <>
                                                        <div className={`absolute inset-0.5 rounded-full border ${piece.color === 'red' ? 'border-red-200' : 'border-gray-300'}`}></div>
                                                        <span 
                                                            className={`font-bold leading-none ${piece.color === 'red' ? 'text-red-700' : 'text-black'}`}
                                                            style={{ 
                                                                fontFamily: '"KaiTi", "STKaiti", "PMingLiU", serif', 
                                                                textShadow: '0 1px 0 rgba(255,255,255,0.5)',
                                                                fontSize: 'clamp(12px, 4vw, 24px)' // Dynamic font sizing
                                                            }}
                                                        >
                                                            {getPieceLabel(piece.type, piece.color)}
                                                        </span>
                                                    </>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })
                        ))}
                    </div>
                </div>
            </div>
        </div>

        {winner && (
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-in fade-in zoom-in">
                <div className="bg-[#f3e5ab] p-8 rounded-2xl text-center border-4 border-[#5c4033] shadow-2xl max-w-xs w-full">
                    <div className="mb-4">
                        {winner === 'red' ? <Flag size={48} className="text-red-600 mx-auto"/> : <Flag size={48} className="text-black mx-auto"/>}
                    </div>
                    <h2 className={`text-3xl font-black mb-2 ${winner === 'red' ? 'text-red-700' : 'text-black'}`} style={{fontFamily: 'serif'}}>
                        {winner === 'red' ? '紅方勝' : '黑方勝'}
                    </h2>
                    <p className="text-[#5c4033] text-sm mb-6 font-bold">勝敗乃兵家常事</p>
                    <div className="flex gap-3">
                        <button onClick={onBack} className="flex-1 py-3 bg-[#8d6e63] text-white rounded-xl font-bold">離開</button>
                        <button onClick={restartGame} className="flex-1 py-3 bg-[#5c4033] text-white rounded-xl font-bold">再戰一局</button>
                    </div>
                </div>
            </div>
        )}

        <div className="absolute bottom-6 text-gray-500 text-xs font-mono">
            {mode === 'STANDARD' ? '雙人同機 • 標準規則' : '雙人同機 • 暗棋規則'}
        </div>
    </div>
  );
};
