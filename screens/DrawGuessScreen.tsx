
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Eraser, Trash2, Palette, Send, MessageCircle, PenTool, Play, Clock, Crown, PlusCircle, Sparkles, User as UserIcon, Users, Copy, Info, CheckCircle2, HelpCircle, X, Shuffle, Trophy, Eye, RotateCcw, Image as ImageIcon, ChevronRight, BookOpen } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User, DrawPoint, ChatMsg } from '../types';

interface DrawGuessScreenProps {
  user: User;
  onBack: () => void;
}

// Extended Color Palette
const COLORS = [
    '#000000', '#FFFFFF', '#9CA3AF', // Mono
    '#EF4444', '#F97316', '#F59E0B', // Warm
    '#10B981', '#06B6D4', '#3B82F6', // Cool
    '#8B5CF6', '#EC4899', '#78350F'  // Misc
];
const WIDTHS = [2, 6, 12, 24];

type GamePhase = 'MENU' | 'LOBBY' | 'WRITE' | 'DRAW' | 'GUESS' | 'REVIEW';

type ChainStep = {
    type: 'TEXT' | 'IMAGE';
    content: string;
    authorName: string;
};

interface GameChain {
    ownerId: string;
    steps: ChainStep[];
}

export const DrawGuessScreen: React.FC<DrawGuessScreenProps> = ({ user, onBack }) => {
  // Navigation
  const [phase, setPhase] = useState<GamePhase>('MENU');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showRules, setShowRules] = useState(false);
  
  // Players
  const [players, setPlayers] = useState<{id: string, name: string, isHost: boolean, isDone: boolean}[]>([]);
  const isHost = players.find(p => p.id === user.studentId)?.isHost || false;

  // Game Logic
  const [timer, setTimer] = useState(0);
  const [round, setRound] = useState(0); 
  
  // Local Input State
  const [inputText, setInputText] = useState('');
  const [currentPrompt, setCurrentPrompt] = useState<string | null>(null);
  const [currentImageToGuess, setCurrentImageToGuess] = useState<string | null>(null);
  const [reviewChains, setReviewChains] = useState<GameChain[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);

  // Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(6);
  const [history, setHistory] = useState<ImageData[]>([]); // Undo History
  const lastPos = useRef<DrawPoint | null>(null);

  const channelRef = useRef<any>(null);

  // --- 1. Connection & Room Logic ---

  const joinRoom = (room: string) => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      
      const channel = supabase.channel(`gartic_${room}`, {
          config: { presence: { key: user.studentId } }
      });

      channel
        .on('broadcast', { event: 'GAME_STATE_UPDATE' }, ({ payload }) => {
            if (payload.phase) setPhase(payload.phase);
            if (payload.timer !== undefined) setTimer(payload.timer);
            if (payload.round !== undefined) setRound(payload.round);
            if (payload.players) setPlayers(payload.players);
            
            if (payload.phase === 'WRITE') {
                setInputText('');
                setIsDrawing(false);
                setHistory([]);
            }
        })
        .on('broadcast', { event: 'ASSIGN_TASK' }, ({ payload }) => {
            if (payload.targetId === user.studentId) {
                if (payload.type === 'DRAW') {
                    setCurrentPrompt(payload.content);
                    setCurrentImageToGuess(null);
                    setTimeout(clearCanvas, 100); // Ensure canvas is ready
                } else if (payload.type === 'GUESS') {
                    setCurrentImageToGuess(payload.content);
                    setCurrentPrompt(null);
                    setInputText('');
                }
            }
        })
        .on('broadcast', { event: 'REVIEW_DATA' }, ({ payload }) => {
            setReviewChains(payload.chains);
        })
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            const users: any[] = [];
            for (const key in state) {
                // @ts-ignore
                if(state[key][0]) users.push(state[key][0]);
            }
            if (players.length === 0 && users.length > 0) {
                 const sorted = users.sort((a,b) => a.joinedAt - b.joinedAt);
                 const mappedPlayers = sorted.map(u => ({
                     id: u.userId,
                     name: u.name,
                     isHost: u.userId === sorted[0].userId,
                     isDone: false
                 }));
                 setPlayers(mappedPlayers);
            } else {
                setPlayers(prev => {
                    const hostId = prev.find(p => p.isHost)?.id;
                    return users.map(u => ({
                        id: u.userId,
                        name: u.name,
                        isHost: u.userId === hostId,
                        isDone: false
                    }));
                });
            }
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ userId: user.studentId, name: user.name, joinedAt: Date.now() });
                setRoomId(room);
                setPhase('LOBBY');
            }
        });

      channelRef.current = channel;
  };

  const leaveRoom = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      setRoomId(null);
      setPhase('MENU');
      setPlayers([]);
  };

  // --- 2. Host Logic ---
  
  const [hostChains, setHostChains] = useState<Record<string, GameChain>>({});

  useEffect(() => {
      if (!isHost) return;

      const subscription = channelRef.current?.on('broadcast', { event: 'SUBMIT_STEP' }, ({ payload }: any) => {
          const { userId, type, content } = payload;
          
          setPlayers(prev => {
              const next = prev.map(p => p.id === userId ? { ...p, isDone: true } : p);
              return next;
          });
          
          setHostChains(prev => {
              const chainId = payload.chainId;
              const chain = prev[chainId] || { ownerId: chainId, steps: [] };
              const newSteps = [...chain.steps, { type, content, authorName: payload.authorName }];
              return { ...prev, [chainId]: { ...chain, steps: newSteps } };
          });
      });

      return () => {};
  }, [isHost, phase]);

  const handleStartGame = () => {
      if (!isHost) return;
      const chains: Record<string, GameChain> = {};
      players.forEach(p => {
          chains[p.id] = { ownerId: p.id, steps: [] };
      });
      setHostChains(chains);
      
      broadcastUpdate({ phase: 'WRITE', timer: 60, round: 0, players: players.map(p => ({...p, isDone: false})) });
  };

  const broadcastUpdate = (update: any) => {
      channelRef.current?.send({ type: 'broadcast', event: 'GAME_STATE_UPDATE', payload: update });
  };

  // Check Phase Completion
  useEffect(() => {
      if (!isHost || players.length === 0) return;
      
      if (players.every(p => p.isDone)) {
          setTimeout(() => {
              if (phase === 'WRITE') {
                  // WRITE -> DRAW
                  const shuffledPlayers = [...players];
                  shuffledPlayers.forEach((p, i) => {
                      const targetChainOwner = shuffledPlayers[(i + 1) % shuffledPlayers.length].id;
                      const chain = hostChains[targetChainOwner];
                      const prompt = chain.steps[0].content;
                      
                      channelRef.current?.send({ 
                          type: 'broadcast', 
                          event: 'ASSIGN_TASK', 
                          payload: { targetId: p.id, type: 'DRAW', content: prompt, chainId: targetChainOwner } 
                      });
                  });
                  broadcastUpdate({ phase: 'DRAW', timer: 90, round: 1, players: players.map(p => ({...p, isDone: false})) });

              } else if (phase === 'DRAW') {
                  // DRAW -> GUESS
                  const shuffledPlayers = [...players];
                  shuffledPlayers.forEach((p, i) => {
                      const targetChainOwner = shuffledPlayers[(i + 2) % shuffledPlayers.length].id;
                      const chain = hostChains[targetChainOwner];
                      const drawing = chain.steps[1].content;
                      
                      channelRef.current?.send({ 
                          type: 'broadcast', 
                          event: 'ASSIGN_TASK', 
                          payload: { targetId: p.id, type: 'GUESS', content: drawing, chainId: targetChainOwner } 
                      });
                  });
                  broadcastUpdate({ phase: 'GUESS', timer: 60, round: 2, players: players.map(p => ({...p, isDone: false})) });

              } else if (phase === 'GUESS') {
                  // GUESS -> REVIEW
                  const allChains = Object.values(hostChains);
                  channelRef.current?.send({ type: 'broadcast', event: 'REVIEW_DATA', payload: { chains: allChains } });
                  broadcastUpdate({ phase: 'REVIEW', round: 3 });
              }
          }, 1000);
      }
  }, [players, isHost, phase, hostChains]);


  // --- 3. Client Submission Logic ---

  const currentTaskChainId = useRef<string>('');
  
  useEffect(() => {
      const listener = channelRef.current?.on('broadcast', { event: 'ASSIGN_TASK' }, ({ payload }: any) => {
          if (payload.targetId === user.studentId) {
              currentTaskChainId.current = payload.chainId;
          }
      });
      return () => { listener?.unsubscribe() };
  }, [channelRef.current]);

  const handleSubmitWrite = () => {
      if (!inputText.trim()) return;
      channelRef.current?.send({ 
          type: 'broadcast', event: 'SUBMIT_STEP', 
          payload: { userId: user.studentId, chainId: user.studentId, type: 'TEXT', content: inputText, authorName: user.name } 
      });
      setPlayers(prev => prev.map(p => p.id === user.studentId ? { ...p, isDone: true } : p));
  };

  const submitDraw = () => {
      if (!canvasRef.current) return;
      const dataUrl = canvasRef.current.toDataURL('image/jpeg', 0.5);
      channelRef.current?.send({ 
          type: 'broadcast', event: 'SUBMIT_STEP', 
          payload: { userId: user.studentId, chainId: currentTaskChainId.current, type: 'IMAGE', content: dataUrl, authorName: user.name } 
      });
      setPlayers(prev => prev.map(p => p.id === user.studentId ? { ...p, isDone: true } : p));
  };

  const submitGuess = () => {
      if (!inputText.trim()) return;
      channelRef.current?.send({ 
          type: 'broadcast', event: 'SUBMIT_STEP', 
          payload: { userId: user.studentId, chainId: currentTaskChainId.current, type: 'TEXT', content: inputText, authorName: user.name } 
      });
      setPlayers(prev => prev.map(p => p.id === user.studentId ? { ...p, isDone: true } : p));
  };

  // --- Canvas Logic ---
  useEffect(() => {
    if (phase === 'DRAW' && canvasRef.current) {
        const context = canvasRef.current.getContext('2d', { willReadFrequently: true });
        if (context) {
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            setCtx(context);
            // Initial state for undo
            setHistory([context.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)]);
        }
    }
  }, [phase]);

  const startDrawing = (e: any) => {
      if (phase !== 'DRAW') return;
      setIsDrawing(true);
      lastPos.current = getPos(e);
  };
  const draw = (e: any) => {
      if (!isDrawing || !ctx || !lastPos.current) return;
      const newPos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(newPos.x, newPos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();
      lastPos.current = newPos;
  };
  
  const stopDrawing = () => {
      if (isDrawing && ctx && canvasRef.current) {
          setIsDrawing(false);
          // Save state for undo
          const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
          setHistory(prev => [...prev.slice(-9), imageData]); // Keep last 10
      }
  };

  const handleUndo = () => {
      if (history.length > 1 && ctx) {
          const newHistory = [...history];
          newHistory.pop(); // Remove current
          const previousState = newHistory[newHistory.length - 1];
          ctx.putImageData(previousState, 0, 0);
          setHistory(newHistory);
      }
  };

  const getPos = (e: any) => {
      const rect = canvasRef.current!.getBoundingClientRect();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      const scaleX = canvasRef.current!.width / rect.width;
      const scaleY = canvasRef.current!.height / rect.height;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };
  
  const clearCanvas = () => {
      if(ctx && canvasRef.current) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          setHistory([ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height)]);
      }
  }

  // --- RENDER ---

  if (phase === 'MENU') {
      return (
          <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
              {showRules && (
                  <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                      <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl max-w-sm w-full relative shadow-2xl">
                          <button onClick={() => setShowRules(false)} className="absolute top-4 right-4 text-gray-400 hover:text-white"><X size={20}/></button>
                          <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-indigo-500">
                              <BookOpen size={24}/> 遊戲規則
                          </h3>
                          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                              <li className="flex gap-2"><span className="text-indigo-500 font-bold">1.</span> 所有人同時出題 (寫一個詞)。</li>
                              <li className="flex gap-2"><span className="text-indigo-500 font-bold">2.</span> 題目會傳給下一位，他必須畫出來。</li>
                              <li className="flex gap-2"><span className="text-indigo-500 font-bold">3.</span> 畫作再傳給下一位，他必須猜是什麼。</li>
                              <li className="flex gap-2"><span className="text-indigo-500 font-bold">4.</span> 循環直到傳回原主，最後展示結果！</li>
                          </ul>
                          <button onClick={() => setShowRules(false)} className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-xl font-bold">了解</button>
                      </div>
                  </div>
              )}

              <div className="absolute top-4 right-4">
                  <button onClick={() => setShowRules(true)} className="p-2 bg-white/10 rounded-full hover:bg-white/20 text-indigo-500">
                      <Info size={24} />
                  </button>
              </div>

              <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl w-full max-w-sm text-center border border-slate-200 dark:border-slate-700 animate-in zoom-in relative">
                  <div className="w-20 h-20 bg-indigo-100 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Palette size={40} className="text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <h1 className="text-3xl font-black text-gray-800 dark:text-white mb-2">畫畫接龍</h1>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 text-sm">你畫我猜 • 創意傳話</p>
                  
                  <input 
                      type="text" 
                      inputMode="numeric"
                      placeholder="輸入 4 位數房號" 
                      className="w-full bg-gray-50 dark:bg-gray-700 rounded-xl px-4 py-4 text-center text-xl font-mono font-bold mb-4 outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                      value={joinCode}
                      onChange={e => setJoinCode(e.target.value)}
                  />
                  <div className="flex gap-3">
                      <button 
                        onClick={() => joinCode && joinRoom(joinCode)} 
                        disabled={joinCode.length < 4}
                        className="flex-1 bg-slate-800 dark:bg-slate-700 text-white py-3.5 rounded-xl font-bold hover:bg-slate-700 transition-colors disabled:opacity-50"
                      >
                          加入房間
                      </button>
                      <button 
                        onClick={() => joinRoom(Math.floor(Math.random()*9000+1000).toString())} 
                        className="flex-1 bg-indigo-600 text-white py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-500/30 hover:bg-indigo-700 transition-colors"
                      >
                          創建房間
                      </button>
                  </div>
                  <button onClick={onBack} className="mt-8 text-gray-400 dark:text-gray-500 font-bold text-sm hover:text-gray-600">返回主頁</button>
              </div>
          </div>
      )
  }

  // ... (Rest of game phases are identical to previous turn) ...
  // [Due to XML constraints, I'm providing the key change: adding the rules modal logic above and keeping the rest standard]
  // In a full replacement, I'd include the LOBBY, WRITE, DRAW etc phases here. 
  // For brevity in this fix block, assume standard logic flows. 
  // Let me just provide the full file to be safe.

  if (phase === 'LOBBY') {
      return (
          <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col">
              <div className="bg-white dark:bg-gray-800 p-4 pt-safe flex justify-between items-center shadow-sm z-10">
                  <button onClick={leaveRoom} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"><ArrowLeft size={20} className="text-gray-600 dark:text-gray-300"/></button>
                  <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">ROOM ID</span>
                      <div 
                        className="text-2xl font-black text-indigo-600 dark:text-indigo-400 font-mono tracking-widest cursor-pointer flex items-center gap-2"
                        onClick={() => {navigator.clipboard.writeText(roomId!); alert("已複製房號")}}
                      >
                          {roomId} <Copy size={14} className="opacity-50"/>
                      </div>
                  </div>
                  <div className="w-10"></div>
              </div>

              <div className="flex-1 overflow-y-auto p-6">
                  <div className="grid grid-cols-2 gap-4">
                      {players.map(p => (
                          <div key={p.id} className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center relative animate-in fade-in">
                              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/30 rounded-full flex items-center justify-center mb-2 font-bold text-xl text-indigo-500">
                                  {p.name[0]}
                              </div>
                              <span className="font-bold text-gray-800 dark:text-white text-sm truncate w-full text-center">{p.name}</span>
                              {p.isHost && <span className="absolute top-2 right-2 text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold flex items-center gap-1"><Crown size={10}/> 房主</span>}
                          </div>
                      ))}
                      {Array.from({length: Math.max(0, 4 - players.length)}).map((_, i) => (
                          <div key={`empty-${i}`} className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-4 flex flex-col items-center justify-center opacity-50">
                              <div className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-800 mb-2"></div>
                              <div className="h-4 w-16 bg-gray-100 dark:bg-gray-800 rounded"></div>
                          </div>
                      ))}
                  </div>
              </div>

              <div className="p-6 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                  {isHost ? (
                      <button 
                        onClick={handleStartGame} 
                        disabled={players.length < 2} 
                        className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black text-lg shadow-lg shadow-indigo-500/30 disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] transition-transform"
                      >
                          {players.length < 2 ? '等待玩家加入...' : `開始遊戲 (${players.length}人)`}
                      </button>
                  ) : (
                      <div className="text-center text-gray-500 dark:text-gray-400 font-bold py-4 animate-pulse flex items-center justify-center gap-2">
                          <Clock size={20}/> 等待房主開始...
                      </div>
                  )}
              </div>
          </div>
      )
  }

  // ... (Standard WRITE, DRAW, GUESS, REVIEW phases - kept consistent)
  // For brevity, assuming standard phases exist as per previous context. 
  // I will just return loading if phase is weird to satisfy XML length if needed, 
  // but let's assume full file content is preserved. 
  // Actually, to ensure it works, I must provide full file.

  const isDone = players.find(p => p.id === user.studentId)?.isDone;

  if (phase === 'WRITE') {
      return (
          <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
              {isDone ? (
                  <div className="text-center animate-in zoom-in">
                      <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                          <CheckCircle2 size={48} />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">題目已提交！</h2>
                      <p className="text-gray-500 dark:text-gray-400">正在等待其他玩家...</p>
                  </div>
              ) : (
                  <div className="w-full max-w-md bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl border border-gray-100 dark:border-gray-700">
                      <div className="text-center mb-8">
                          <span className="bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Round 1</span>
                          <h2 className="text-2xl font-black text-gray-800 dark:text-white mt-3">請出一道題目</h2>
                          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">越有創意越好玩！</p>
                      </div>
                      
                      <input 
                          value={inputText}
                          onChange={e => setInputText(e.target.value)}
                          placeholder="例如: 騎腳踏車的恐龍"
                          className="w-full bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-lg font-bold mb-6 outline-none border-2 border-transparent focus:border-indigo-500 focus:bg-white dark:focus:bg-gray-900 transition-all dark:text-white"
                          autoFocus
                      />
                      <button 
                        onClick={handleSubmitWrite} 
                        disabled={!inputText} 
                        className="w-full py-4 bg-indigo-600 text-white rounded-xl font-bold text-lg shadow-lg hover:bg-indigo-700 disabled:opacity-50 disabled:shadow-none transition-all"
                      >
                          提交題目
                      </button>
                  </div>
              )}
          </div>
      )
  }

  if (phase === 'DRAW') {
      return (
          <div className="fixed inset-0 z-50 bg-slate-900 flex flex-col touch-none">
              {isDone ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-white p-6 text-center">
                      <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
                          <CheckCircle2 size={40} className="text-green-400"/>
                      </div>
                      <h2 className="text-2xl font-bold mb-2">繪畫完成！</h2>
                      <p className="text-slate-400">稍後片刻...</p>
                  </div>
              ) : (
                  <>
                    <div className="bg-slate-800 p-4 pb-6 text-center z-10 shadow-md">
                        <div className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">請畫出</div>
                        <div className="text-2xl font-black text-white">{currentPrompt}</div>
                    </div>
                    <div className="flex-1 relative bg-white m-4 rounded-2xl overflow-hidden shadow-2xl cursor-crosshair">
                        <canvas 
                            ref={canvasRef} 
                            width={800} height={600}
                            className="w-full h-full object-contain touch-none"
                            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                        />
                    </div>
                    <div className="bg-slate-800 p-4 pb-safe border-t border-slate-700">
                        <div className="flex justify-between items-center mb-4 overflow-x-auto no-scrollbar gap-3 pb-2">
                            {COLORS.map(c => (
                                <button 
                                    key={c} 
                                    onClick={() => setColor(c)} 
                                    className={`w-8 h-8 rounded-full border-2 flex-shrink-0 transition-transform ${color===c ? 'border-white scale-110 ring-2 ring-indigo-500' : 'border-transparent'}`} 
                                    style={{background:c}}
                                />
                            ))}
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-1">
                                <button onClick={() => setLineWidth(Math.max(2, lineWidth-4))} className="p-2 text-white hover:bg-slate-600 rounded"><span className="text-xs">•</span></button>
                                <span className="text-white text-xs font-mono w-4 text-center">{lineWidth}</span>
                                <button onClick={() => setLineWidth(Math.min(24, lineWidth+4))} className="p-2 text-white hover:bg-slate-600 rounded"><span className="text-lg">●</span></button>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleUndo} disabled={history.length <= 1} className="p-3 bg-slate-700 rounded-xl text-white disabled:opacity-30 hover:bg-slate-600">
                                    <RotateCcw size={20}/>
                                </button>
                                <button onClick={clearCanvas} className="p-3 bg-slate-700 rounded-xl text-red-400 hover:bg-slate-600">
                                    <Trash2 size={20}/>
                                </button>
                            </div>
                            <button onClick={submitDraw} className="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-500 transition-colors flex items-center justify-center gap-2">
                                <CheckCircle2 size={20} /> 完成
                            </button>
                        </div>
                    </div>
                  </>
              )}
          </div>
      )
  }

  if (phase === 'GUESS') {
      return (
          <div className="fixed inset-0 z-50 bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-6">
              {isDone ? (
                  <div className="text-center animate-in zoom-in">
                      <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-green-500">
                          <CheckCircle2 size={48} />
                      </div>
                      <h2 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">猜測已提交！</h2>
                      <p className="text-gray-500 dark:text-gray-400">坐等結果揭曉...</p>
                  </div>
              ) : (
                  <div className="w-full max-w-md bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-xl flex flex-col h-[85vh]">
                      <div className="text-center mb-4">
                          <span className="bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">Round 2</span>
                          <h2 className="text-xl font-black text-gray-800 dark:text-white mt-2">這是什麼？</h2>
                      </div>
                      <div className="flex-1 bg-gray-100 dark:bg-gray-900 rounded-2xl mb-6 border-4 border-gray-200 dark:border-gray-700 overflow-hidden relative shadow-inner">
                          {currentImageToGuess ? (
                              <img src={currentImageToGuess} className="w-full h-full object-contain" />
                          ) : (
                              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                  <ImageIcon size={48} />
                              </div>
                          )}
                      </div>
                      <div className="flex gap-2">
                          <input 
                              value={inputText}
                              onChange={e => setInputText(e.target.value)}
                              placeholder="輸入你的猜測..."
                              className="flex-1 bg-gray-50 dark:bg-gray-700 p-4 rounded-xl text-lg font-bold outline-none border-2 border-transparent focus:border-purple-500 focus:bg-white dark:focus:bg-gray-900 transition-all dark:text-white"
                              autoFocus
                          />
                          <button 
                            onClick={submitGuess} 
                            disabled={!inputText} 
                            className="bg-purple-600 text-white p-4 rounded-xl shadow-lg hover:bg-purple-700 disabled:opacity-50 disabled:shadow-none transition-all"
                          >
                              <Send size={24} />
                          </button>
                      </div>
                  </div>
              )}
          </div>
      )
  }

  if (phase === 'REVIEW') {
      const currentChain = reviewChains[reviewIndex];
      return (
          <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col">
              <div className="p-4 pt-safe flex justify-between items-center bg-slate-800 border-b border-slate-700 shadow-md z-10">
                  <div>
                      <h1 className="font-bold text-lg">作品展示</h1>
                      <p className="text-xs text-slate-400">第 {reviewIndex+1} / {reviewChains.length} 組</p>
                  </div>
                  {isHost ? (
                      <button onClick={() => setPhase('LOBBY')} className="bg-indigo-600 hover:bg-indigo-500 px-4 py-2 rounded-xl text-sm font-bold transition-colors">回到大廳</button>
                  ) : (
                      <button onClick={onBack} className="text-slate-400 hover:text-white">離開</button>
                  )}
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-8 pb-24">
                  {currentChain?.steps.map((step, i) => (
                      <div key={i} className="flex flex-col items-center animate-in slide-in-from-bottom-4 duration-700" style={{animationDelay: `${i*150}ms`}}>
                          <div className="flex items-center gap-2 mb-2 bg-slate-800 px-3 py-1 rounded-full text-xs border border-slate-700">
                              <span className="font-bold text-indigo-400">{step.type === 'TEXT' ? (i===0 ? '題目' : '猜測') : '繪畫'}</span>
                              <span className="text-slate-500">•</span>
                              <span className="text-slate-300">{step.authorName}</span>
                          </div>
                          {step.type === 'TEXT' ? (
                              <div className="bg-white text-slate-900 text-2xl font-black px-8 py-6 rounded-3xl shadow-[0_10px_30px_rgba(0,0,0,0.3)] transform rotate-1 border-4 border-slate-200 relative max-w-full break-words text-center">
                                  "{step.content}"
                                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white transform rotate-45 border-t-4 border-l-4 border-slate-200"></div>
                              </div>
                          ) : (
                              <div className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-sm border-4 border-slate-700 transform -rotate-1">
                                  <img src={step.content} className="w-full h-auto" />
                              </div>
                          )}
                          {i < currentChain.steps.length - 1 && (
                              <div className="h-10 w-0.5 bg-slate-700 my-2 relative">
                                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-slate-600 rounded-full"></div>
                              </div>
                          )}
                      </div>
                  ))}
                  <div className="text-center pt-8 pb-4">
                      <div className="inline-block px-4 py-1 rounded-full bg-slate-800 text-xs text-slate-500">End of Chain</div>
                  </div>
              </div>

              {isHost && (
                  <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-between gap-4 z-10 pb-safe">
                      <button 
                        onClick={() => setReviewIndex(Math.max(0, reviewIndex-1))}
                        disabled={reviewIndex === 0}
                        className="flex-1 bg-slate-700 hover:bg-slate-600 py-4 rounded-2xl disabled:opacity-50 font-bold transition-colors"
                      >
                          上一組
                      </button>
                      <button 
                        onClick={() => setReviewIndex(Math.min(reviewChains.length-1, reviewIndex+1))}
                        disabled={reviewIndex === reviewChains.length-1}
                        className="flex-1 bg-indigo-600 hover:bg-indigo-500 py-4 rounded-2xl disabled:opacity-50 font-bold text-white shadow-lg transition-colors"
                      >
                          下一組
                      </button>
                  </div>
              )}
          </div>
      )
  }

  return <div className="flex items-center justify-center h-screen bg-slate-900 text-white"><Clock className="animate-spin mr-2"/> Loading...</div>;
};
