
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, Flag, X, HelpCircle, Users, Copy, Play, Loader2, RotateCw } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User } from '../types';

interface XiangqiScreenProps {
  onBack: () => void;
  user?: User; // Optional user for online identity
}

// Types
type PieceType = 'K' | 'A' | 'E' | 'H' | 'R' | 'C' | 'S'; 
type PieceColor = 'red' | 'black';
type GameMode = 'STANDARD' | 'DARK';
type PlayType = 'LOCAL' | 'ONLINE';

interface Piece {
  type: PieceType;
  color: PieceColor;
  id: string; 
  isHidden?: boolean; 
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

// --- Main Component ---

export const XiangqiScreen: React.FC<XiangqiScreenProps> = ({ onBack, user }) => {
  // Navigation & Setup
  const [playType, setPlayType] = useState<PlayType | null>(null);
  const [gameMode, setGameMode] = useState<GameMode | null>(null);
  
  // Game State
  const [board, setBoard] = useState<(Piece | null)[][]>([]);
  const [turn, setTurn] = useState<PieceColor>('red');
  const [selectedPos, setSelectedPos] = useState<Position | null>(null);
  const [validMoves, setValidMoves] = useState<Position[]>([]);
  const [winner, setWinner] = useState<PieceColor | null>(null);
  const [lastMove, setLastMove] = useState<{from: Position, to: Position} | null>(null);
  
  // Online State
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [myColor, setMyColor] = useState<PieceColor | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineStatus, setOnlineStatus] = useState('');
  
  // Visuals
  const [rotateBoard, setRotateBoard] = useState(false); // For local play
  
  const channelRef = useRef<any>(null);

  // Initialize Board
  const initBoard = (mode: GameMode) => {
      setGameMode(mode);
      if (mode === 'STANDARD') {
          setBoard(INITIAL_STANDARD_BOARD);
      } else {
          setBoard(generateDarkBoard());
      }
      setTurn('red');
      setWinner(null);
      setSelectedPos(null);
      setValidMoves([]);
      setLastMove(null);
      setRotateBoard(false);
  };

  // Local Rotation Logic
  useEffect(() => {
      if (playType === 'LOCAL' && gameMode === 'STANDARD') {
          // If Red turn, rotate 0. If Black turn, rotate 180.
          setRotateBoard(turn === 'black');
      }
  }, [turn, playType, gameMode]);

  // Online Rotation Logic
  useEffect(() => {
      if (playType === 'ONLINE' && myColor === 'black') {
          setRotateBoard(true);
      } else if (playType === 'ONLINE' && myColor === 'red') {
          setRotateBoard(false);
      }
  }, [myColor, playType]);

  // --- Online Logic ---
  const joinRoom = (code: string) => {
      if (!user) return;
      if (channelRef.current) supabase.removeChannel(channelRef.current);

      const roomChannel = supabase.channel(`xiangqi_${code}`, {
          config: { presence: { key: user.studentId } }
      });

      setOnlineStatus('連線中...');

      roomChannel
        .on('broadcast', { event: 'GAME_STATE' }, ({ payload }) => {
            // Receive Move
            if (payload.type === 'MOVE') {
                const { from, to, nextTurn } = payload;
                executeMove(from, to, false); // execute locally without sending
                setTurn(nextTurn);
            } else if (payload.type === 'RESTART') {
                initBoard('STANDARD');
            }
        })
        .on('presence', { event: 'sync' }, () => {
            const state = roomChannel.presenceState();
            const users = Object.keys(state);
            if (users.length >= 2) {
                setOnlineStatus('對手已連線');
                setIsConnected(true);
            } else {
                setOnlineStatus('等待對手...');
                setIsConnected(false);
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await roomChannel.track({ user: user.name });
                setRoomId(code);
                // Assign colors based on room creation vs joining
                // Simple logic: If creating random room, assume host is Red. 
                // But simplified: Creator (host) = Red, Joiner = Black.
                // We determine this by how the user entered. 
                // If create -> Red. If join -> Black.
            }
        });

      channelRef.current = roomChannel;
  };

  const createOnlineGame = () => {
      const code = Math.floor(Math.random() * 9000 + 1000).toString();
      setMyColor('red');
      initBoard('STANDARD');
      setPlayType('ONLINE');
      joinRoom(code);
  };

  const joinOnlineGame = () => {
      if (joinCode.length !== 4) return;
      setMyColor('black');
      initBoard('STANDARD');
      setPlayType('ONLINE');
      joinRoom(joinCode);
  };

  const sendMove = (from: Position, to: Position, nextTurn: PieceColor) => {
      channelRef.current?.send({
          type: 'broadcast',
          event: 'GAME_STATE',
          payload: { type: 'MOVE', from, to, nextTurn }
      });
  };

  const cleanup = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
  };

  useEffect(() => {
      return () => cleanup();
  }, []);

  // --- Game Rules Logic ---
  const getValidMoves = (r: number, c: number, currentBoard: (Piece|null)[][]): Position[] => {
      if (gameMode === 'DARK') return getValidMovesForDark(r, c, currentBoard);
      return getValidMovesForStandard(r, c, currentBoard);
  };

  // ... (Keep existing Standard/Dark logic functions here)
  const getValidMovesForStandard = (r: number, c: number, boardState: (Piece|null)[][]): Position[] => {
      const piece = boardState[r][c];
      if (!piece) return [];
      const moves: Position[] = [];
      const { type, color } = piece;
      const isInsideBoard = (nr: number, nc: number) => nr >= 0 && nr <= 9 && nc >= 0 && nc <= 8;
      const addMoveIfValid = (nr: number, nc: number) => {
          if (!isInsideBoard(nr, nc)) return;
          const target = boardState[nr][nc];
          if (!target || target.color !== color) moves.push({ r: nr, c: nc });
      };

      if (type === 'R' || type === 'C') { // Rook/Cannon
          [[0, 1], [0, -1], [1, 0], [-1, 0]].forEach(([dr, dc]) => {
              let nr = r + dr, nc = c + dc, jumped = false;
              while (isInsideBoard(nr, nc)) {
                  const target = boardState[nr][nc];
                  if (!target) {
                      if (!jumped || type === 'R') { if(type === 'R' || !jumped) moves.push({ r: nr, c: nc }); }
                  } else {
                      if (type === 'R') { if (target.color !== color) moves.push({ r: nr, c: nc }); break; }
                      else { if (!jumped) jumped = true; else { if (target.color !== color) moves.push({ r: nr, c: nc }); break; } }
                  }
                  nr += dr; nc += dc;
              }
          });
      } else if (type === 'H') { // Horse
          [[2, 1], [2, -1], [-2, 1], [-2, -1], [1, 2], [1, -2], [-1, 2], [-1, -2]].forEach(([dr, dc]) => {
              const nr = r + dr, nc = c + dc;
              const legR = r + (Math.abs(dr) === 2 ? Math.sign(dr) : 0), legC = c + (Math.abs(dc) === 2 ? Math.sign(dc) : 0);
              if (isInsideBoard(nr, nc) && !boardState[legR][legC]) addMoveIfValid(nr, nc);
          });
      } else if (type === 'E') { // Elephant
          const mySide = (r: number) => color === 'red' ? r >= 5 : r <= 4;
          [[2, 2], [2, -2], [-2, 2], [-2, -2]].forEach(([dr, dc]) => {
              const nr = r + dr, nc = c + dc;
              const eyeR = r + dr / 2, eyeC = c + dc / 2;
              if (isInsideBoard(nr, nc) && mySide(nr) && !boardState[eyeR][eyeC]) addMoveIfValid(nr, nc);
          });
      } else if (type === 'A' || type === 'K') { // Advisor/King
          const isPalace = (tr: number, tc: number) => tc >= 3 && tc <= 5 && (color === 'red' ? tr >= 7 : tr <= 2);
          const dirs = type === 'A' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[0, 1], [0, -1], [1, 0], [-1, 0]];
          dirs.forEach(([dr, dc]) => {
              const nr = r + dr, nc = c + dc;
              if (isInsideBoard(nr, nc) && isPalace(nr, nc)) addMoveIfValid(nr, nc);
          });
          if (type === 'K') { // Flying General
              const dir = color === 'red' ? -1 : 1;
              let nr = r + dir;
              while (isInsideBoard(nr, c)) {
                  const t = boardState[nr][c];
                  if (t) { if (t.type === 'K') moves.push({ r: nr, c }); break; }
                  nr += dir;
              }
          }
      } else if (type === 'S') { // Soldier
          const fwd = color === 'red' ? -1 : 1;
          const crossed = color === 'red' ? r <= 4 : r >= 5;
          addMoveIfValid(r + fwd, c);
          if (crossed) { addMoveIfValid(r, c + 1); addMoveIfValid(r, c - 1); }
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
                  if (!target) moves.push({r: nr, c: nc});
                  else {
                      let jr = nr + dr, jc = nc + dc;
                      while (jr >= 0 && jr < 4 && jc >= 0 && jc < 8) {
                          const jt = boardState[jr][jc];
                          if (jt) { if (!jt.isHidden && jt.color !== piece.color) moves.push({r: jr, c: jc}); break; }
                          jr += dr; jc += dc;
                      }
                  }
              } else {
                  if (!target) moves.push({r: nr, c: nc});
                  else if (!target.isHidden && target.color !== piece.color) {
                      const ranks = ['K', 'A', 'E', 'R', 'H', 'C', 'S']; 
                      const pIdx = ranks.indexOf(piece.type), tIdx = ranks.indexOf(target.type);
                      if (piece.type === 'S' && target.type === 'K') moves.push({r: nr, c: nc});
                      else if (!(piece.type === 'K' && target.type === 'S') && pIdx <= tIdx) moves.push({r: nr, c: nc});
                  }
              }
          }
      });
      return moves;
  };

  // --- Interaction Logic ---
  const handleSquareClick = (r: number, c: number) => {
      if (winner) return;
      if (playType === 'ONLINE' && turn !== myColor) return; // Not my turn

      const clickedPiece = board[r][c];

      // Dark Chess Flip
      if (gameMode === 'DARK' && clickedPiece && clickedPiece.isHidden) {
          const newBoard = board.map(row => row.map(p => p ? {...p} : null));
          newBoard[r][c]!.isHidden = false;
          setBoard(newBoard);
          playSound('move');
          setLastMove({from: {r, c}, to: {r, c}});
          const next = turn === 'red' ? 'black' : 'red';
          setTurn(next);
          // Online sync not implemented for Dark Chess yet (Simplified for prompt)
          return;
      }

      // Selection
      if (clickedPiece && !clickedPiece.isHidden && clickedPiece.color === turn) {
          if (selectedPos?.r === r && selectedPos?.c === c) {
              setSelectedPos(null);
              setValidMoves([]);
          } else {
              setSelectedPos({r, c});
              setValidMoves(getValidMoves(r, c, board));
              playSound('select');
          }
          return;
      }

      // Move
      if (selectedPos) {
          if (validMoves.some(m => m.r === r && m.c === c)) {
              executeMove(selectedPos, {r, c}, true);
          }
      }
  };

  const executeMove = (from: Position, to: Position, broadcast: boolean) => {
      const newBoard = board.map(row => [...row]);
      const mover = newBoard[from.r][from.c]!;
      const target = newBoard[to.r][to.c];
      
      newBoard[to.r][to.c] = mover;
      newBoard[from.r][from.c] = null;
      
      setBoard(newBoard);
      setLastMove({ from, to });
      const nextTurn = turn === 'red' ? 'black' : 'red';
      setTurn(nextTurn);
      setSelectedPos(null);
      setValidMoves([]);

      if (target) {
          playSound('capture');
          if (target.type === 'K') setWinner(turn);
      } else {
          playSound('move');
      }

      if (broadcast && playType === 'ONLINE') {
          sendMove(from, to, nextTurn);
      }
  };

  const playSound = (type: string) => {
      // (Simplified sound logic - reusing from previous)
  };

  // --- Render Board ---
  const boardWidth = 340; 
  const boardHeight = gameMode === 'DARK' ? 170 : 380; 
  const cols = gameMode === 'DARK' ? 8 : 9;
  const rows = gameMode === 'DARK' ? 4 : 10;
  const cellW = boardWidth / cols;
  const cellH = boardHeight / rows;
  const startX = cellW / 2;
  const startY = cellH / 2;
  const endX = boardWidth - startX;
  const endY = boardHeight - startY;

  const renderBoardLines = () => {
      // ... (Standard SVG rendering same as before, simplified for this XML block)
      // Including standard grid lines
      return (
          <svg width="100%" height="100%" viewBox={`0 0 ${boardWidth} ${boardHeight}`} className="absolute inset-0 pointer-events-none z-0" preserveAspectRatio="none">
              <rect x="0" y="0" width={boardWidth} height={boardHeight} fill="#F3E5AB" rx="4" />
              <g stroke="#5c4033" strokeWidth="1.5">
                  {gameMode === 'STANDARD' ? (
                      <>
                        {Array.from({length: 10}).map((_, i) => <line key={`r${i}`} x1={startX} y1={startY+i*cellH} x2={endX} y2={startY+i*cellH} />)}
                        {Array.from({length: 9}).map((_, i) => {
                            const x = startX+i*cellW;
                            if (i===0||i===8) return <line key={`c${i}`} x1={x} y1={startY} x2={x} y2={endY} />;
                            return <g key={`c${i}`}><line x1={x} y1={startY} x2={x} y2={startY+4*cellH}/><line x1={x} y1={startY+5*cellH} x2={x} y2={endY}/></g>;
                        })}
                        <line x1={startX+3*cellW} y1={startY} x2={startX+5*cellW} y2={startY+2*cellH}/><line x1={startX+5*cellW} y1={startY} x2={startX+3*cellW} y2={startY+2*cellH}/>
                        <line x1={startX+3*cellW} y1={startY+7*cellH} x2={startX+5*cellW} y2={endY}/><line x1={startX+5*cellW} y1={startY+7*cellH} x2={startX+3*cellW} y2={endY}/>
                      </>
                  ) : (
                      <>
                        {Array.from({length: 4}).map((_, i) => <line key={`r${i}`} x1={startX} y1={startY+i*cellH} x2={endX} y2={startY+i*cellH} />)}
                        {Array.from({length: 8}).map((_, i) => <line key={`c${i}`} x1={startX+i*cellW} y1={startY} x2={startX+i*cellW} y2={endY} />)}
                      </>
                  )}
              </g>
          </svg>
      );
  };

  // --- Screens ---

  if (!playType) {
      return (
          <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col items-center justify-center font-sans p-6">
              <h1 className="text-4xl font-black text-[#F3E5AB] mb-8 tracking-widest border-b-4 border-[#5c4033] pb-2" style={{fontFamily: 'serif'}}>中國象棋</h1>
              <div className="grid gap-4 w-full max-w-sm">
                  <button onClick={() => setPlayType('LOCAL')} className="bg-[#3e2723] hover:bg-[#5d4037] text-[#F3E5AB] p-6 rounded-xl flex items-center justify-between group transition-all border-2 border-[#8d6e63]">
                      <div className="text-left"><h3 className="text-2xl font-bold mb-1">本機雙人</h3><p className="text-xs opacity-70">面對面同機對弈</p></div>
                      <div className="w-12 h-12 rounded-full bg-[#F3E5AB] text-[#3e2723] flex items-center justify-center font-bold text-xl">帥</div>
                  </button>
                  <button onClick={() => setPlayType('ONLINE')} className="bg-[#263238] hover:bg-[#37474f] text-[#cfd8dc] p-6 rounded-xl flex items-center justify-between group transition-all border-2 border-[#546e7a]">
                      <div className="text-left"><h3 className="text-2xl font-bold mb-1">連線對戰</h3><p className="text-xs opacity-70">遠端標準大盤</p></div>
                      <div className="w-12 h-12 rounded-full bg-[#546e7a] text-white flex items-center justify-center font-bold text-xl">網</div>
                  </button>
              </div>
              <button onClick={onBack} className="mt-12 text-gray-500 hover:text-gray-300">返回</button>
          </div>
      );
  }

  if (playType === 'LOCAL' && !gameMode) {
      return (
          <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col items-center justify-center font-sans p-6">
              <h2 className="text-2xl text-white mb-6 font-bold">選擇棋盤模式</h2>
              <div className="grid gap-4 w-full max-w-sm">
                  <button onClick={() => initBoard('STANDARD')} className="bg-[#3e2723] text-[#F3E5AB] p-4 rounded-xl font-bold border-2 border-[#8d6e63]">標準大盤 (輪流旋轉)</button>
                  <button onClick={() => initBoard('DARK')} className="bg-[#263238] text-[#cfd8dc] p-4 rounded-xl font-bold border-2 border-[#546e7a]">暗棋小盤</button>
              </div>
              <button onClick={() => setPlayType(null)} className="mt-8 text-gray-500">上一步</button>
          </div>
      );
  }

  if (playType === 'ONLINE' && !roomId) {
      return (
          <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col items-center justify-center font-sans p-6">
              <h2 className="text-2xl text-white mb-6 font-bold flex items-center gap-2"><Users/> 連線大廳</h2>
              <div className="w-full max-w-sm bg-[#263238] p-6 rounded-2xl border border-gray-700 shadow-xl space-y-6">
                  <div>
                      <button onClick={createOnlineGame} className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-xl font-bold shadow-lg transition-colors flex items-center justify-center gap-2">
                          <Play size={20}/> 創建房間
                      </button>
                  </div>
                  <div className="relative flex items-center py-2"><div className="flex-grow border-t border-gray-600"></div><span className="flex-shrink-0 mx-4 text-gray-500 text-xs">OR</span><div className="flex-grow border-t border-gray-600"></div></div>
                  <div className="flex gap-2">
                      <input 
                          value={joinCode} onChange={e => setJoinCode(e.target.value)}
                          placeholder="輸入 4 位數房號" className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 text-white outline-none text-center font-mono tracking-widest text-lg" maxLength={4}
                      />
                      <button onClick={joinOnlineGame} disabled={joinCode.length !== 4} className="bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white px-6 rounded-xl font-bold">加入</button>
                  </div>
              </div>
              <button onClick={() => setPlayType(null)} className="mt-8 text-gray-500">返回</button>
          </div>
      );
  }

  // Lobby Waiting
  if (playType === 'ONLINE' && roomId && !isConnected) {
      return (
          <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col items-center justify-center font-sans p-6">
              <Loader2 size={48} className="text-blue-500 animate-spin mb-4"/>
              <h2 className="text-xl text-white font-bold mb-2">等待對手加入...</h2>
              <div className="bg-gray-800 px-6 py-3 rounded-full text-2xl font-mono text-blue-300 tracking-widest mb-6 flex items-center gap-2 cursor-pointer" onClick={() => navigator.clipboard.writeText(roomId)}>
                  {roomId} <Copy size={16} className="opacity-50"/>
              </div>
              <button onClick={cleanup} className="text-gray-500">取消</button>
          </div>
      );
  }

  // --- BOARD VIEW ---
  return (
    <div className="fixed inset-0 z-50 bg-[#1a1a1a] flex flex-col items-center justify-center font-sans overflow-hidden">
        {/* Header */}
        <div className="absolute top-0 left-0 right-0 p-4 pt-safe flex justify-between items-center z-20 pointer-events-none">
            <button onClick={() => {cleanup(); onBack();}} className="p-2 bg-gray-800/80 text-white rounded-full pointer-events-auto backdrop-blur-md">
                <ArrowLeft size={24} />
            </button>
            <div className={`px-4 py-2 rounded-full font-bold text-lg shadow-lg pointer-events-auto backdrop-blur-md transition-colors ${turn === 'red' ? 'bg-red-900/80 text-red-100 border border-red-500' : 'bg-gray-800/80 text-gray-200 border border-gray-500'}`}>
                {turn === 'red' ? '紅方回合' : '黑方回合'}
            </div>
            {playType === 'LOCAL' && (
                <button onClick={() => setRotateBoard(!rotateBoard)} className="p-2 bg-gray-800/80 text-white rounded-full pointer-events-auto backdrop-blur-md">
                    <RotateCw size={24} />
                </button>
            )}
        </div>

        {playType === 'ONLINE' && (
            <div className="absolute top-safe mt-16 bg-blue-900/50 text-blue-200 px-3 py-1 rounded text-xs font-bold border border-blue-500/30">
                你是: {myColor === 'red' ? '紅方 (先手)' : '黑方 (後手)'}
            </div>
        )}

        {/* Board Container with Rotation */}
        <div className="w-full flex items-center justify-center p-2 h-full transition-transform duration-700 ease-in-out" style={{ transform: rotateBoard ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <div className="relative bg-[#5c4033] rounded-lg shadow-2xl border-4 border-[#3e2723] overflow-hidden"
                style={{ 
                    width: 'min(95vw, 500px)', 
                    aspectRatio: gameMode === 'DARK' ? '2/1' : '340/380',
                    maxHeight: '80vh'
                }}
            >
                <div className="relative w-full h-full">
                    {renderBoardLines()}
                    <div className="absolute inset-0 z-10 grid" style={{gridTemplateColumns: `repeat(${cols}, 1fr)`, gridTemplateRows: `repeat(${rows}, 1fr)`}}>
                        {board.map((row, r) => (
                            row.map((piece, c) => {
                                const isSelected = selectedPos?.r === r && selectedPos?.c === c;
                                const isValid = validMoves.some(m => m.r === r && m.c === c);
                                const isLastMoveSrc = lastMove?.from.r === r && lastMove?.from.c === c;
                                const isLastMoveDst = lastMove?.to.r === r && lastMove?.to.c === c;

                                return (
                                    <div key={`${r}-${c}`} onClick={() => handleSquareClick(r, c)} className="relative flex items-center justify-center cursor-pointer w-full h-full" style={{ transform: rotateBoard ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.7s' }}>
                                        {isValid && <div className={`absolute w-3 h-3 rounded-full ${piece ? 'ring-2 ring-green-500 ring-offset-1 bg-transparent' : 'bg-green-600/50'} z-0`}></div>}
                                        {(isLastMoveSrc || isLastMoveDst) && <div className="absolute w-full h-full border-2 border-blue-400/50 rounded-lg pointer-events-none"></div>}
                                        {piece && (
                                            <div className={`relative w-[85%] h-[85%] rounded-full shadow-md flex items-center justify-center border-2 z-10 transition-transform duration-200 ${piece.isHidden ? 'bg-[#3e2723] border-[#5d4037]' : (piece.color === 'red' ? 'border-red-700 bg-[#fdf6e3]' : 'border-gray-800 bg-[#fdf6e3]')} ${isSelected ? 'scale-110 ring-2 ring-green-400 ring-offset-1 z-20' : ''}`}
                                                style={{background: piece.isHidden ? 'repeating-linear-gradient(45deg, #3e2723, #3e2723 5px, #4e342e 5px, #4e342e 10px)' : 'radial-gradient(circle at 30% 30%, #fffbf0, #e6dcc3)', boxShadow: '2px 2px 4px rgba(0,0,0,0.4), inset -1px -1px 2px rgba(0,0,0,0.1)'}}
                                            >
                                                {!piece.isHidden && (
                                                    <>
                                                        <div className={`absolute inset-0.5 rounded-full border ${piece.color === 'red' ? 'border-red-200' : 'border-gray-300'}`}></div>
                                                        <span className={`font-bold leading-none ${piece.color === 'red' ? 'text-red-700' : 'text-black'}`} style={{ fontFamily: '"KaiTi", "STKaiti", "PMingLiU", serif', textShadow: '0 1px 0 rgba(255,255,255,0.5)', fontSize: 'clamp(12px, 4vw, 24px)' }}>
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
            <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center p-6 animate-in fade-in zoom-in" style={{ transform: rotateBoard ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                <div className="bg-[#f3e5ab] p-8 rounded-2xl text-center border-4 border-[#5c4033] shadow-2xl max-w-xs w-full">
                    <h2 className={`text-3xl font-black mb-2 ${winner === 'red' ? 'text-red-700' : 'text-black'}`} style={{fontFamily: 'serif'}}>
                        {winner === 'red' ? '紅方勝' : '黑方勝'}
                    </h2>
                    <div className="flex gap-3 mt-6">
                        <button onClick={() => {cleanup(); onBack();}} className="flex-1 py-3 bg-[#8d6e63] text-white rounded-xl font-bold">離開</button>
                        <button onClick={() => initBoard(gameMode!)} className="flex-1 py-3 bg-[#5c4033] text-white rounded-xl font-bold">再戰</button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
