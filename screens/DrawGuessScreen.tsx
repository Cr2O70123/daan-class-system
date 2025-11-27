
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Eraser, Trash2, Palette, Send, MessageCircle, PenTool, Play, Clock, Crown, PlusCircle, Sparkles, User as UserIcon, Users, Copy, Info, CheckCircle2, HelpCircle, X, Shuffle, Trophy } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User, DrawPoint, ChatMsg, DrawGuessWord, DrawDifficulty } from '../types';
import { getDrawChoices, submitUserWord } from '../services/visualVocabService';

interface DrawGuessScreenProps {
  user: User;
  onBack: () => void;
}

const COLORS = [
    '#000000', // Black
    '#FFFFFF', // White
    '#9CA3AF', // Gray
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Yellow
    '#10B981', // Green
    '#3B82F6', // Blue
    '#8B5CF6', // Purple
    '#EC4899', // Pink
    '#78350F', // Brown
];

const WIDTHS = [2, 5, 10, 20];

// Game Stages
type GamePhase = 'MENU' | 'LOBBY' | 'SELECTING' | 'DRAWING' | 'ROUND_END' | 'GAME_END';

// Helper for UI colors
const DIFF_CONFIG = {
    'EASY': { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300', label: '簡單' },
    'MEDIUM': { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-300', label: '普通' },
    'HARD': { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', label: '困難' }
};

// --- Game Rules Modal ---
const RulesModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={24}/></button>
            <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <HelpCircle className="text-blue-600" /> 遊戲規則
            </h3>
            <ul className="space-y-4 text-sm text-gray-600">
                <li className="flex gap-3">
                    <div className="bg-blue-100 text-blue-600 font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">1</div>
                    <div>
                        <span className="font-bold text-gray-800 block">選詞繪畫</span>
                        輪到你畫畫時，從三個題目中選一個。不能寫字，只能用畫的！
                    </div>
                </li>
                <li className="flex gap-3">
                    <div className="bg-green-100 text-green-600 font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">2</div>
                    <div>
                        <span className="font-bold text-gray-800 block">競速猜題</span>
                        其他玩家在聊天室輸入答案。越快猜對分數越高！
                    </div>
                </li>
                <li className="flex gap-3">
                    <div className="bg-yellow-100 text-yellow-600 font-bold w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">3</div>
                    <div>
                        <span className="font-bold text-gray-800 block">積分獲勝</span>
                        遊戲結束時，積分最高的玩家獲得冠軍。
                    </div>
                </li>
            </ul>
            <button onClick={onClose} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700">開始遊戲</button>
        </div>
    </div>
);

export const DrawGuessScreen: React.FC<DrawGuessScreenProps> = ({ user, onBack }) => {
  // Navigation & Room State
  const [phase, setPhase] = useState<GamePhase>('MENU');
  const [roomId, setRoomId] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showRules, setShowRules] = useState(false);
  
  // Game Logic State
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [currentWord, setCurrentWord] = useState<DrawGuessWord | null>(null);
  const [timer, setTimer] = useState(0);
  const [wordChoices, setWordChoices] = useState<DrawGuessWord[]>([]);
  const [players, setPlayers] = useState<{id: string, name: string, score: number, isHost: boolean, hasGuessed: boolean}[]>([]);
  
  // Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChatMobile, setShowChatMobile] = useState(false); // Mobile chat toggle
  
  const channelRef = useRef<any>(null);
  const lastPos = useRef<DrawPoint | null>(null);
  const timerInterval = useRef<number | null>(null);

  const isDrawer = user.studentId === drawerId;
  const isHost = players.find(p => p.id === user.studentId)?.isHost || false;
  const iHaveGuessed = players.find(p => p.id === user.studentId)?.hasGuessed || false;

  // --- Initialization ---
  useEffect(() => {
    // Initialize Canvas Context
    if (canvasRef.current) {
        const context = canvasRef.current.getContext('2d');
        if (context) {
            context.lineCap = 'round';
            context.lineJoin = 'round';
            setCtx(context);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }
  }, [phase]); // Re-init when phase changes (entering game)

  // --- Room Connection Logic ---
  const joinRoom = (room: string, create: boolean = false) => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      
      const newChannel = supabase.channel(`draw_${room}`, {
          config: { presence: { key: user.studentId } }
      });

      newChannel
        .on('broadcast', { event: 'DRAW_STROKE' }, ({ payload }: { payload: any }) => handleRemoteDraw(payload))
        .on('broadcast', { event: 'CLEAR' }, () => clearCanvas(false))
        .on('broadcast', { event: 'GAME_STATE' }, ({ payload }: { payload: any }) => {
            if (payload.phase) setPhase(payload.phase);
            if (payload.drawerId) setDrawerId(payload.drawerId);
            if (payload.currentWord) setCurrentWord(payload.currentWord); 
            if (payload.timer !== undefined) setTimer(payload.timer);
            if (payload.players) setPlayers(payload.players);
            
            if (payload.phase === 'SELECTING') {
                clearCanvas(false); 
            }
        })
        .on('broadcast', { event: 'CHAT' }, ({ payload }: { payload: ChatMsg }) => {
            setMessages(prev => [...prev, payload]);
        })
        .on('presence', { event: 'sync' }, () => {
            const state = newChannel.presenceState();
            const currentUsers: any[] = [];
            for (const key in state) {
                // @ts-ignore
                if(state[key][0]) currentUsers.push(state[key][0]);
            }
            
            if (currentUsers.length === 1) {
                 setPlayers([{ id: user.studentId, name: user.name, score: 0, isHost: true, hasGuessed: false }]);
            }
        })
        .subscribe(async (status: string) => {
            if (status === 'SUBSCRIBED') {
                await newChannel.track({ 
                    userId: user.studentId, 
                    name: user.name,
                    joinedAt: Date.now() 
                });
                setRoomId(room);
                setPhase('LOBBY');
            }
        });

      channelRef.current = newChannel;
  };

  const leaveRoom = () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      setRoomId(null);
      setPhase('MENU');
      setPlayers([]);
      setMessages([]);
      setTimer(0);
  };

  // --- Game Logic (Host Side) ---
  useEffect(() => {
      if (isHost && (phase === 'DRAWING' || phase === 'SELECTING' || phase === 'ROUND_END')) {
          if (timerInterval.current) clearInterval(timerInterval.current);
          timerInterval.current = window.setInterval(() => {
              setTimer(prev => {
                  if (prev <= 1) {
                      if (phase === 'DRAWING') {
                          handleRoundEnd();
                      } else if (phase === 'SELECTING') {
                          const word = wordChoices[0] || { en: 'Timeout', zh: '超時', difficulty: 'EASY', category: 'System', points: 0 } as DrawGuessWord;
                          handleSelectWord(word); 
                      } else if (phase === 'ROUND_END') {
                          handleStartGame(); 
                      }
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      } else {
          if (timerInterval.current) clearInterval(timerInterval.current);
      }
      return () => { if (timerInterval.current) clearInterval(timerInterval.current); };
  }, [phase, isHost, wordChoices]);

  const broadcastState = (newState: any) => {
      if (newState.phase) setPhase(newState.phase);
      if (newState.drawerId) setDrawerId(newState.drawerId);
      if (newState.currentWord) setCurrentWord(newState.currentWord);
      if (newState.timer !== undefined) setTimer(newState.timer);
      if (newState.players) setPlayers(newState.players);

      channelRef.current?.send({
          type: 'broadcast',
          event: 'GAME_STATE',
          payload: newState
      });
  };

  const handleStartGame = () => {
      const resetPlayers = players.map(p => ({ ...p, hasGuessed: false }));
      const potentialDrawers = resetPlayers; 
      const nextDrawer = potentialDrawers[Math.floor(Math.random() * potentialDrawers.length)];
      setDrawerId(nextDrawer.id);
      
      broadcastState({ 
          phase: 'SELECTING', 
          drawerId: nextDrawer.id, 
          timer: 15, 
          currentWord: null,
          players: resetPlayers 
      });
  };

  useEffect(() => {
      if (phase === 'SELECTING' && isDrawer) {
          setWordChoices(getDrawChoices());
      }
  }, [phase, isDrawer]);

  const handleSelectWord = (word: DrawGuessWord) => {
      setWordChoices([]);
      clearCanvas(true);
      const payload = { phase: 'DRAWING', currentWord: word, timer: 80 };
      channelRef.current?.send({ type: 'broadcast', event: 'GAME_STATE', payload });
      setPhase('DRAWING');
      setCurrentWord(word);
      setTimer(80);
  };

  const handleRoundEnd = () => {
      if (!isHost) return;
      broadcastState({ phase: 'ROUND_END', timer: 5 });
  };

  // --- Canvas Logic ---
  const handleRemoteDraw = (data: { start: DrawPoint, end: DrawPoint, color: string, width: number }) => {
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(data.start.x, data.start.y);
      ctx.lineTo(data.end.x, data.end.y);
      ctx.strokeStyle = data.color;
      ctx.lineWidth = data.width;
      ctx.stroke();
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawer || phase !== 'DRAWING') return;
      setIsDrawing(true);
      const pos = getPos(e);
      lastPos.current = pos;
      if (ctx) {
          ctx.beginPath();
          ctx.moveTo(pos.x, pos.y);
      }
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
      if (!isDrawing || !ctx || !lastPos.current || !isDrawer || phase !== 'DRAWING') return;
      // Prevent scrolling on touch
      // if (e.type === 'touchmove') e.preventDefault(); 
      
      const currentPos = getPos(e);
      
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      channelRef.current?.send({
          type: 'broadcast',
          event: 'DRAW_STROKE',
          payload: { start: lastPos.current, end: currentPos, color: color, width: lineWidth }
      });

      lastPos.current = currentPos;
  };

  const stopDrawing = () => {
      if (isDrawing) {
          setIsDrawing(false);
          lastPos.current = null;
      }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent): DrawPoint => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: (clientX - rect.left) * scaleX, y: (clientY - rect.top) * scaleY };
  };

  const clearCanvas = (emit = true) => {
      if (ctx && canvasRef.current) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          if (emit) channelRef.current?.send({ type: 'broadcast', event: 'CLEAR', payload: {} });
      }
  };

  // --- Chat & Guessing Logic ---
  useEffect(() => {
      if (!channelRef.current) return;
      const handleGuessSuccess = (payload: { userId: string }) => {
          setPlayers(prev => prev.map(p => {
              if (p.id === payload.userId && !p.hasGuessed) {
                  return { ...p, score: p.score + 10, hasGuessed: true };
              }
              if (p.id === drawerId && !p.hasGuessed) { 
                   return { ...p, score: p.score + 2 };
              }
              return p;
          }));
      };
      channelRef.current.on('broadcast', { event: 'GUESS_SUCCESS' }, ({ payload }: any) => handleGuessSuccess(payload));
      return () => { channelRef.current?.off('broadcast', { event: 'GUESS_SUCCESS' }); };
  }, [drawerId]);

  const handleClientChat = () => {
      if (!chatInput.trim()) return;
      const input = chatInput.trim();
      
      if (!isDrawer && phase === 'DRAWING' && currentWord && input === currentWord.zh) {
          if (!iHaveGuessed) {
              channelRef.current?.send({ type: 'broadcast', event: 'GUESS_SUCCESS', payload: { userId: user.studentId } });
              const winMsg = { id: Date.now().toString(), sender: '', text: `${user.name} 猜對了答案！`, isSystem: true };
              channelRef.current?.send({ type: 'broadcast', event: 'CHAT', payload: winMsg });
              setMessages(prev => [...prev, winMsg]);
              setPlayers(prev => prev.map(p => p.id === user.studentId ? { ...p, hasGuessed: true } : p));
          }
      } else {
          const msg = { id: Date.now().toString(), sender: user.name, text: input };
          channelRef.current?.send({ type: 'broadcast', event: 'CHAT', payload: msg });
          setMessages(prev => [...prev, msg]);
      }
      setChatInput('');
  };


  // --- RENDER ---

  if (phase === 'MENU') {
      return (
          <div className="fixed inset-0 z-50 bg-indigo-50 flex flex-col items-center justify-center p-6">
              {showRules && <RulesModal onClose={() => setShowRules(false)} />}
              <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in border-4 border-indigo-100">
                  <div className="w-24 h-24 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
                      <Palette size={48} className="text-indigo-600" />
                  </div>
                  <h1 className="text-3xl font-black text-gray-800 mb-2 tracking-tight">你畫我猜</h1>
                  <p className="text-gray-500 mb-8 text-sm font-medium">發揮創意，考驗默契！</p>
                  <div className="space-y-4">
                      <div className="bg-gray-50 p-2 rounded-2xl border border-gray-200">
                          <input 
                              type="text" inputMode="numeric" placeholder="輸入房號加入" value={joinCode}
                              onChange={e => setJoinCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 4))}
                              className="w-full bg-white border-none rounded-xl px-4 py-3 text-center font-mono text-xl outline-none focus:ring-2 ring-indigo-400 mb-2 shadow-sm"
                          />
                          <div className="flex gap-2">
                              <button onClick={() => joinCode && joinRoom(joinCode)} disabled={joinCode.length < 4} className="flex-1 bg-gray-800 text-white py-3 rounded-xl font-bold disabled:opacity-50 hover:bg-gray-700">加入房間</button>
                              <button onClick={() => joinRoom(Math.floor(1000 + Math.random() * 9000).toString(), true)} className="flex-1 bg-indigo-500 text-white py-3 rounded-xl font-bold hover:bg-indigo-600 shadow-lg shadow-indigo-200">創建房間</button>
                          </div>
                      </div>
                  </div>
                  <div className="mt-8 flex justify-center gap-6 text-sm text-gray-400 font-bold">
                      <button onClick={onBack} className="hover:text-gray-600 flex items-center gap-1"><ArrowLeft size={14}/> 離開</button>
                      <button onClick={() => setShowRules(true)} className="hover:text-gray-600 flex items-center gap-1"><Info size={14}/> 規則</button>
                  </div>
              </div>
          </div>
      );
  }

  if (phase === 'LOBBY') {
      return (
          <div className="fixed inset-0 z-50 bg-indigo-50 flex flex-col h-[100dvh]">
              <div className="p-4 pt-safe flex justify-between items-center bg-white shadow-sm border-b border-gray-200 shrink-0">
                  <button onClick={leaveRoom} className="p-2 -ml-2 rounded-full hover:bg-gray-100 text-gray-500"><ArrowLeft size={24}/></button>
                  <div className="flex flex-col items-center">
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">ROOM ID</span>
                      <div className="text-3xl font-black text-indigo-600 font-mono tracking-wider flex items-center gap-2">
                          {roomId} <button onClick={() => navigator.clipboard.writeText(roomId || '')} className="text-gray-300 hover:text-indigo-500"><Copy size={18}/></button>
                      </div>
                  </div>
                  <div className="w-8"></div>
              </div>
              <div className="flex-1 p-6 overflow-y-auto">
                  <div className="grid grid-cols-2 gap-4">
                      {players.map(p => (
                          <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm flex flex-col items-center relative">
                              {p.isHost && <Crown size={20} className="absolute top-[-10px] right-[-5px] text-yellow-400 fill-yellow-400 rotate-12" />}
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3 text-gray-400"><UserIcon size={32} /></div>
                              <span className="font-bold text-gray-800 text-sm truncate w-full text-center">{p.name}</span>
                              {p.id === user.studentId && <span className="text-[10px] text-indigo-500 font-bold bg-indigo-50 px-2 py-0.5 rounded-full mt-1">YOU</span>}
                          </div>
                      ))}
                      {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                          <div key={i} className="border-2 border-dashed border-gray-300 rounded-2xl flex flex-col items-center justify-center min-h-[120px] text-gray-300 bg-gray-50/50">
                              <Users size={24} className="mb-2 opacity-50" /><span className="text-xs font-bold">等待加入...</span>
                          </div>
                      ))}
                  </div>
              </div>
              <div className="p-6 bg-white border-t border-gray-200 shrink-0 pb-safe">
                  {isHost ? (
                      <button onClick={handleStartGame} disabled={players.length < 2} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black shadow-lg disabled:opacity-50 disabled:bg-gray-400 flex items-center justify-center gap-2 text-lg">
                          {players.length < 2 ? '等待更多玩家...' : '開始遊戲'} <Play size={20} fill="currentColor"/>
                      </button>
                  ) : (
                      <div className="text-center text-gray-500 font-bold py-4 bg-gray-100 rounded-2xl animate-pulse">等待房主開始遊戲...</div>
                  )}
              </div>
          </div>
      );
  }

  // --- GAME PHASE ---
  // Using h-[100dvh] ensures it fits mobile browser viewport
  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col md:flex-row overflow-hidden font-sans h-[100dvh]">
        
        {/* --- LEFT SIDEBAR (Players & Round Info) --- */}
        <div className="bg-white border-b md:border-b-0 md:border-r border-gray-200 md:w-64 flex flex-col z-20 shrink-0">
            {/* Header Info */}
            <div className="p-3 border-b border-gray-100 bg-indigo-50/50 flex justify-between items-center md:block pt-safe md:pt-3">
                <div className="flex items-center gap-2 mb-0 md:mb-2">
                    <button onClick={leaveRoom} className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 transition-colors"><ArrowLeft size={20} /></button>
                    <span className="font-black text-gray-700">ROUND 1/5</span>
                </div>
                <div className="flex items-center gap-1 text-indigo-600 bg-white px-3 py-1 rounded-full shadow-sm border border-indigo-100 md:w-fit">
                    <Clock size={14} />
                    <span className="font-mono font-bold">{timer}s</span>
                </div>
            </div>

            {/* Desktop Player List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-2 hidden md:block">
                {players.sort((a,b) => b.score - a.score).map((p, idx) => (
                    <div key={p.id} className={`p-3 rounded-xl flex items-center gap-3 border-2 ${p.id === drawerId ? 'border-indigo-400 bg-indigo-50' : p.hasGuessed ? 'border-green-400 bg-green-50' : 'border-transparent bg-gray-50'}`}>
                        <div className="relative">
                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-gray-400 shadow-sm font-bold text-xs border border-gray-100">{p.name[0]}</div>
                            {p.id === drawerId && <div className="absolute -top-1 -right-1 bg-indigo-500 text-white p-0.5 rounded-full"><PenTool size={10}/></div>}
                            {p.hasGuessed && <div className="absolute -bottom-1 -right-1 bg-green-500 text-white p-0.5 rounded-full"><CheckCircle2 size={10}/></div>}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="font-bold text-gray-800 text-sm truncate">{p.name}</div>
                            <div className="text-xs text-gray-500 font-mono">{p.score} pts</div>
                        </div>
                    </div>
                ))}
            </div>
            
            {/* Mobile Player Summary (Scrollable Row) */}
            <div className="md:hidden flex overflow-x-auto p-2 gap-2 no-scrollbar bg-white border-b border-gray-200 shrink-0">
                 {players.sort((a,b) => b.score - a.score).map(p => (
                     <div key={p.id} className={`flex-shrink-0 flex flex-col items-center p-1 px-3 rounded-lg min-w-[60px] ${p.id === drawerId ? 'bg-indigo-50' : p.hasGuessed ? 'bg-green-50' : ''}`}>
                         <div className="relative">
                            <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-xs font-bold text-gray-600">{p.name[0]}</div>
                            {p.id === drawerId && <div className="absolute -top-1 -right-1 bg-indigo-500 text-white p-0.5 rounded-full"><PenTool size={8}/></div>}
                         </div>
                         <span className="text-[10px] font-bold text-gray-700 mt-1 truncate max-w-[50px]">{p.name}</span>
                         <span className="text-[9px] text-gray-400">{p.score}</span>
                     </div>
                 ))}
            </div>
        </div>

        {/* --- CENTER (Canvas & Word) --- */}
        <div className="flex-1 flex flex-col bg-gray-200 relative overflow-hidden min-h-0">
            
            {/* Word Banner */}
            <div className="bg-white p-2 shadow-sm flex justify-center items-center gap-4 z-10 shrink-0 h-14">
                {currentWord ? (
                    isDrawer ? (
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] text-gray-400 font-bold uppercase">DRAW THIS</span>
                            <div className="text-lg font-black text-indigo-600 leading-none">{currentWord.zh}</div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            {currentWord.zh.split('').map((_, i) => (
                                <div key={i} className="w-6 h-8 bg-gray-100 rounded border-b-2 border-gray-300 flex items-center justify-center font-bold text-gray-300">
                                    {phase === 'ROUND_END' ? currentWord?.zh[i] : '?'}
                                </div>
                            ))}
                        </div>
                    )
                ) : (
                    <div className="text-gray-400 font-bold text-sm tracking-widest animate-pulse">WAITING...</div>
                )}
            </div>

            {/* Canvas Area (Flexible Height) */}
            <div className="flex-1 relative flex items-center justify-center p-2 bg-[url('https://www.transparenttextures.com/patterns/grid-me.png')] overflow-hidden min-h-0">
                <div className="relative shadow-xl rounded-lg overflow-hidden bg-white cursor-crosshair w-full h-full max-w-[800px] max-h-[600px] flex items-center justify-center">
                    <canvas
                        ref={canvasRef}
                        width={800}
                        height={600}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="touch-none w-full h-full object-contain"
                    />
                </div>

                {/* Overlays */}
                {phase === 'SELECTING' && isDrawer && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-30">
                        <div className="bg-white rounded-3xl p-6 w-full max-w-md text-center shadow-2xl">
                            <h2 className="text-xl font-black text-gray-800 mb-4">選擇題目</h2>
                            <div className="grid grid-cols-1 gap-2">
                                {wordChoices.map((w, idx) => (
                                    <button key={idx} onClick={() => handleSelectWord(w)} className={`p-3 rounded-xl border-2 font-bold flex justify-between items-center ${DIFF_CONFIG[w.difficulty].bg} ${DIFF_CONFIG[w.difficulty].border} ${DIFF_CONFIG[w.difficulty].color}`}>
                                        <span>{w.zh}</span><span className="text-xs bg-white/50 px-2 py-1 rounded">{w.category}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
                {phase === 'SELECTING' && !isDrawer && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center z-30 text-white">
                        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center mb-4 animate-bounce"><PenTool size={32} /></div>
                        <h2 className="text-3xl font-black mb-2">畫家選題中</h2>
                    </div>
                )}
                {phase === 'ROUND_END' && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-40">
                        <div className="bg-white rounded-3xl p-8 text-center shadow-2xl">
                            <h2 className="text-gray-400 font-bold text-sm mb-2 uppercase">正確答案</h2>
                            <div className="text-4xl font-black text-indigo-600 mb-6">{currentWord?.zh}</div>
                            <div className="h-1 w-full bg-gray-100 mb-2 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 animate-[loading_5s_linear]"></div></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Tools (Bottom) - Only for Drawer */}
            {isDrawer && phase === 'DRAWING' && (
                <div className="bg-white p-2 border-t border-gray-200 flex justify-center gap-3 shadow-lg z-20 overflow-x-auto no-scrollbar shrink-0 h-16 items-center pb-safe">
                    <div className="flex gap-2 p-1 bg-gray-100 rounded-xl overflow-x-auto max-w-[200px] no-scrollbar">
                        {COLORS.map(c => (
                            <button key={c} onClick={() => setColor(c)} className={`w-8 h-8 flex-shrink-0 rounded-full border-2 ${color === c ? 'scale-110 border-gray-400 shadow-sm' : 'border-transparent'}`} style={{ backgroundColor: c }} />
                        ))}
                    </div>
                    <div className="w-[1px] bg-gray-300 h-8"></div>
                    <div className="flex gap-2 items-center">
                        {WIDTHS.map(w => (
                            <button key={w} onClick={() => setLineWidth(w)} className={`w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 ${lineWidth === w ? 'bg-gray-200' : ''}`}>
                                <div className="rounded-full bg-black" style={{ width: w, height: w }}></div>
                            </button>
                        ))}
                    </div>
                    <div className="w-[1px] bg-gray-300 h-8"></div>
                    <button onClick={() => clearCanvas(true)} className="p-2 hover:bg-red-50 text-red-500 rounded-xl"><Trash2 size={18} /></button>
                </div>
            )}
        </div>

        {/* --- RIGHT SIDEBAR (Chat) --- */}
        <div className={`
            fixed inset-0 z-50 md:static md:w-80 md:flex flex-col bg-white border-l border-gray-200 shadow-2xl md:shadow-none transition-transform duration-300
            ${showChatMobile ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        `}>
            {/* Mobile Chat Header */}
            <div className="md:hidden p-3 border-b flex justify-between items-center bg-gray-50 pt-safe">
                <span className="font-bold text-gray-700">聊天室</span>
                <button onClick={() => setShowChatMobile(false)} className="p-1"><X size={20}/></button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/50">
                {messages.map((msg, i) => (
                    <div key={i} className={`text-sm py-1 px-2 rounded-lg ${msg.isSystem ? 'bg-green-100 text-green-700 text-center font-bold' : i % 2 === 0 ? 'bg-white' : ''}`}>
                        {!msg.isSystem && <span className="font-bold text-gray-800">{msg.sender}: </span>}
                        <span className={msg.isSystem ? '' : 'text-gray-600'}>{msg.text}</span>
                    </div>
                ))}
            </div>

            {/* Input Area */}
            <div className="p-3 border-t bg-white pb-safe">
                <form onSubmit={(e) => { e.preventDefault(); handleClientChat(); }} className="flex gap-2">
                    <input 
                        type="text" value={chatInput} onChange={e => setChatInput(e.target.value)}
                        placeholder={isDrawer && phase === 'DRAWING' ? "繪畫者不能發言" : "輸入答案..."}
                        disabled={isDrawer && phase === 'DRAWING'}
                        className="flex-1 bg-gray-100 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 ring-indigo-200 disabled:opacity-50"
                    />
                    <button type="submit" disabled={!chatInput.trim() || (isDrawer && phase === 'DRAWING')} className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50">
                        <Send size={18} />
                    </button>
                </form>
            </div>
        </div>

        {/* Mobile Chat Toggle Button */}
        {!showChatMobile && (
            <button onClick={() => setShowChatMobile(true)} className="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center z-40 hover:scale-105 transition-transform mb-safe">
                <MessageCircle size={28} />
            </button>
        )}
    </div>
  );
};
