
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Eraser, Trash2, Palette, Send, MessageCircle, PenTool, Play, Clock, Crown, PlusCircle, Sparkles, User as UserIcon, Users, Copy, Info, CheckCircle2, HelpCircle } from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import { User, DrawPoint, ChatMsg, DrawGuessWord } from '../types';
import { getDrawChoices, submitUserWord } from '../services/visualVocabService';

interface DrawGuessScreenProps {
  user: User;
  onBack: () => void;
}

const COLORS = ['#000000', '#EF4444', '#3B82F6', '#10B981', '#F59E0B', '#8B5CF6'];
const WIDTHS = [2, 5, 10, 20];

// Game Stages
type GamePhase = 'MENU' | 'LOBBY' | 'SELECTING' | 'DRAWING' | 'ENDED';

// Helper for UI colors
const DIFF_CONFIG = {
    'EASY': { color: 'text-green-600', bg: 'bg-green-100', border: 'border-green-300', label: '簡單' },
    'MEDIUM': { color: 'text-yellow-600', bg: 'bg-yellow-100', border: 'border-yellow-300', label: '普通' },
    'HARD': { color: 'text-red-600', bg: 'bg-red-100', border: 'border-red-300', label: '困難' }
};

// --- Game Rules Modal ---
const RulesModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl relative">
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><PlusCircle className="rotate-45" size={24}/></button>
            <h3 className="text-xl font-black text-gray-800 mb-4 flex items-center gap-2">
                <HelpCircle className="text-blue-600" /> 遊戲說明
            </h3>
            <ul className="space-y-3 text-sm text-gray-600">
                <li className="flex gap-3">
                    <span className="bg-blue-100 text-blue-600 font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">1</span>
                    <span><span className="font-bold text-gray-800">多人連線：</span>創建房間或輸入房號加入，至少 2 人即可開始。</span>
                </li>
                <li className="flex gap-3">
                    <span className="bg-blue-100 text-blue-600 font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">2</span>
                    <span><span className="font-bold text-gray-800">輪流作畫：</span>房主開始遊戲後，系統隨機選一位畫家，其他人猜題。</span>
                </li>
                <li className="flex gap-3">
                    <span className="bg-blue-100 text-blue-600 font-bold w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0">3</span>
                    <span><span className="font-bold text-gray-800">即時互動：</span>在聊天室輸入答案，答對者獲勝！</span>
                </li>
            </ul>
            <button onClick={onClose} className="w-full mt-6 bg-blue-600 text-white py-3 rounded-xl font-bold">了解</button>
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
  const [players, setPlayers] = useState<{id: string, name: string, score: number, isHost: boolean}[]>([]);
  const [winner, setWinner] = useState<string | null>(null);

  // Drawing State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(5);
  const [isEraser, setIsEraser] = useState(false);
  
  // Chat State
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  // Submission Modal
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [submitEn, setSubmitEn] = useState('');
  const [submitZh, setSubmitZh] = useState('');
  
  const channelRef = useRef<any>(null);
  const lastPos = useRef<DrawPoint | null>(null);
  const timerInterval = useRef<number | null>(null);

  const isDrawer = user.studentId === drawerId;
  const isHost = players.find(p => p.id === user.studentId)?.isHost || false;

  // --- Initialization ---
  useEffect(() => {
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
  }, [phase]); // Re-init when phase changes (e.g. entering game)

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
            // Sync Game State
            if (payload.phase) setPhase(payload.phase);
            if (payload.drawerId) setDrawerId(payload.drawerId);
            if (payload.currentWord) setCurrentWord(payload.currentWord); 
            if (payload.timer !== undefined) setTimer(payload.timer);
            if (payload.winner) setWinner(payload.winner);
            // Reset local chat/canvas if new game
            if (payload.phase === 'SELECTING') clearCanvas(false);
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
            
            // First user is host logic (Simplified)
            const sortedUsers = currentUsers.sort((a,b) => a.joinedAt - b.joinedAt);
            setPlayers(sortedUsers.map((p, idx) => ({ 
                id: p.userId, 
                name: p.name, 
                score: 0, 
                isHost: idx === 0 
            })));
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
  };

  // --- Game Logic (Host Side) ---
  useEffect(() => {
      if (isHost && (phase === 'DRAWING' || phase === 'SELECTING')) {
          if (timerInterval.current) clearInterval(timerInterval.current);
          timerInterval.current = window.setInterval(() => {
              setTimer(prev => {
                  if (prev <= 1) {
                      if (phase === 'DRAWING') broadcastState({ phase: 'ENDED', timer: 0, winner: null }); 
                      else if (phase === 'SELECTING') {
                          // Auto select random if timeout
                          const word = wordChoices[0] || { en: 'Timeout', zh: '超時', difficulty: 'EASY' };
                          handleSelectWord(word);
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
  }, [phase, isHost]);

  const broadcastState = (newState: any) => {
      // Local Update
      if (newState.phase) setPhase(newState.phase);
      if (newState.drawerId) setDrawerId(newState.drawerId);
      if (newState.currentWord) setCurrentWord(newState.currentWord);
      if (newState.timer !== undefined) setTimer(newState.timer);
      if (newState.winner !== undefined) setWinner(newState.winner);

      channelRef.current?.send({
          type: 'broadcast',
          event: 'GAME_STATE',
          payload: newState
      });
  };

  const handleStartGame = () => {
      // Randomly pick a drawer
      const randomPlayer = players[Math.floor(Math.random() * players.length)];
      setDrawerId(randomPlayer.id);
      
      // If I am the drawer, generate choices locally
      if (randomPlayer.id === user.studentId) {
          setWordChoices(getDrawChoices());
      }
      
      // Notify everyone
      broadcastState({ phase: 'SELECTING', drawerId: randomPlayer.id, timer: 15, winner: null, currentWord: null });
  };

  const handleSelectWord = (word: DrawGuessWord) => {
      setWordChoices([]);
      clearCanvas(true);
      broadcastState({ phase: 'DRAWING', currentWord: word, timer: 90, winner: null });
  };

  const handleCorrectGuess = (winnerName: string) => {
      broadcastState({ phase: 'ENDED', winner: winnerName });
  };

  // --- Canvas & Chat Logic (Same as before) ---
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
      const currentPos = getPos(e);
      
      ctx.beginPath();
      ctx.moveTo(lastPos.current.x, lastPos.current.y);
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.strokeStyle = isEraser ? '#ffffff' : color;
      ctx.lineWidth = lineWidth;
      ctx.stroke();

      channelRef.current?.send({
          type: 'broadcast',
          event: 'DRAW_STROKE',
          payload: { start: lastPos.current, end: currentPos, color: isEraser ? '#ffffff' : color, width: lineWidth }
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
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const clearCanvas = (emit = true) => {
      if (ctx && canvasRef.current) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          if (emit) channelRef.current?.send({ type: 'broadcast', event: 'CLEAR', payload: {} });
      }
  };

  const sendMessage = () => {
      if (!chatInput.trim()) return;
      
      const msg: ChatMsg = {
          id: Date.now().toString(),
          sender: user.name,
          text: chatInput
      };

      // Check win condition (Client-side check for responsiveness)
      // Note: In a real secure app, answer checking should be server-side or host-side only.
      if (!isDrawer && phase === 'DRAWING' && currentWord && chatInput.trim().toLowerCase() === currentWord.en.toLowerCase()) {
          const winMsg = { ...msg, text: '🎉 猜對了！正確答案！', isSystem: true };
          channelRef.current?.send({ type: 'broadcast', event: 'CHAT', payload: winMsg });
          setMessages(prev => [...prev, winMsg]);
          
          if (isHost) handleCorrectGuess(user.name); // If I am host, I end it. If not, host receives chat and ends it.
      } else {
          setMessages(prev => [...prev, msg]);
          channelRef.current?.send({ type: 'broadcast', event: 'CHAT', payload: msg });
      }
      setChatInput('');
  };

  // Host watches chat for correct answer (if host is not the guesser)
  useEffect(() => {
      if (isHost && phase === 'DRAWING' && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          if (currentWord && !lastMsg.isSystem && lastMsg.text.toLowerCase() === currentWord.en.toLowerCase()) {
               handleCorrectGuess(lastMsg.sender);
          }
      }
  }, [messages, isHost, phase, currentWord]);

  // Submit Word Logic
  const handleSubmitWord = async () => {
      if (!submitEn || !submitZh) return;
      await submitUserWord(submitEn, submitZh);
      alert("感謝您的投稿！獲得 50 PT 獎勵！");
      setShowSubmitModal(false);
      setSubmitEn('');
      setSubmitZh('');
  };


  // --- RENDER ---

  // 1. MENU PHASE (Start)
  if (phase === 'MENU') {
      return (
          <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col items-center justify-center p-6">
              {showRules && <RulesModal onClose={() => setShowRules(false)} />}
              
              <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8 text-center animate-in zoom-in">
                  <div className="w-24 h-24 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-6">
                      <PenTool size={48} className="text-pink-500" />
                  </div>
                  <h1 className="text-3xl font-black text-gray-800 mb-2">畫畫接龍</h1>
                  <p className="text-gray-500 mb-8 text-sm">多人即時連線，發揮你的創意！</p>

                  <div className="space-y-4">
                      <button 
                          onClick={() => joinRoom(Math.floor(1000 + Math.random() * 9000).toString(), true)}
                          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                      >
                          <PlusCircle size={20} /> 創建房間
                      </button>
                      
                      <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                              <div className="w-full border-t border-gray-200"></div>
                          </div>
                          <div className="relative flex justify-center text-sm">
                              <span className="px-2 bg-white text-gray-400">或</span>
                          </div>
                      </div>

                      <div className="flex gap-2">
                          <input 
                              type="text" 
                              placeholder="輸入房號" 
                              value={joinCode}
                              onChange={e => setJoinCode(e.target.value)}
                              className="flex-1 bg-gray-100 border-none rounded-xl px-4 text-center font-mono text-lg outline-none focus:ring-2 ring-blue-400"
                          />
                          <button 
                              onClick={() => joinCode && joinRoom(joinCode)}
                              disabled={!joinCode}
                              className="px-6 bg-gray-800 text-white rounded-xl font-bold disabled:opacity-50"
                          >
                              加入
                          </button>
                      </div>
                  </div>

                  <div className="mt-8 flex justify-center gap-4 text-sm text-gray-400">
                      <button onClick={onBack} className="hover:text-gray-600">退出</button>
                      <button onClick={() => setShowRules(true)} className="hover:text-gray-600 flex items-center gap-1"><Info size={14}/> 規則</button>
                  </div>
              </div>
          </div>
      );
  }

  // 2. LOBBY PHASE (Waiting)
  if (phase === 'LOBBY') {
      return (
          <div className="fixed inset-0 z-50 bg-gray-50 flex flex-col">
              <div className="p-4 pt-safe flex justify-between items-center bg-white shadow-sm">
                  <button onClick={leaveRoom} className="p-2 -ml-2 rounded-full hover:bg-gray-100"><ArrowLeft size={24} className="text-gray-600"/></button>
                  <div className="flex flex-col items-center">
                      <span className="text-xs text-gray-400 font-bold uppercase tracking-widest">ROOM CODE</span>
                      <div className="text-2xl font-black text-blue-600 font-mono tracking-wider flex items-center gap-2">
                          {roomId}
                          <button onClick={() => navigator.clipboard.writeText(roomId || '')} className="text-gray-300 hover:text-blue-500"><Copy size={16}/></button>
                      </div>
                  </div>
                  <div className="w-8"></div>
              </div>

              <div className="flex-1 p-6 flex flex-col items-center">
                  <div className="flex-1 w-full max-w-sm grid grid-cols-2 gap-4 content-start">
                      {players.map(p => (
                          <div key={p.id} className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center relative">
                              {p.isHost && <Crown size={16} className="absolute top-2 right-2 text-yellow-500 fill-current" />}
                              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-2 text-gray-400">
                                  <UserIcon size={32} />
                              </div>
                              <span className="font-bold text-gray-800">{p.name}</span>
                              {p.id === user.studentId && <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-2 py-0.5 rounded-full mt-1">YOU</span>}
                          </div>
                      ))}
                      {/* Empty Slots placeholders */}
                      {Array.from({ length: Math.max(0, 4 - players.length) }).map((_, i) => (
                          <div key={i} className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center min-h-[120px] text-gray-300">
                              <Users size={24} className="mb-2 opacity-50" />
                              <span className="text-xs font-bold">等待加入...</span>
                          </div>
                      ))}
                  </div>

                  <div className="w-full max-w-sm mt-6">
                      {isHost ? (
                          <button 
                              onClick={handleStartGame}
                              disabled={players.length < 2}
                              className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black shadow-lg shadow-blue-200 disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                          >
                              {players.length < 2 ? '等待更多玩家...' : '開始遊戲'}
                          </button>
                      ) : (
                          <div className="text-center text-gray-500 font-bold animate-pulse">
                              等待房主開始遊戲...
                          </div>
                      )}
                  </div>
              </div>
          </div>
      );
  }

  // 3. GAME PHASES (Selecting / Drawing / Ended)
  return (
    <div className="fixed inset-0 z-50 bg-gray-100 flex flex-col overflow-hidden font-sans">
        
        {/* --- Top Bar --- */}
        <div className="bg-white p-2 pt-safe flex items-center justify-between shadow-sm z-20 border-b border-gray-200">
            <button onClick={leaveRoom} className="p-2 hover:bg-gray-100 rounded-full text-red-500"><ArrowLeft size={20} /></button>
            
            <div className="flex flex-col items-center flex-1">
                {phase === 'DRAWING' && currentWord ? (
                    <>
                        {isDrawer ? (
                            <div className="flex flex-col items-center animate-in slide-in-from-top">
                                <div className="text-xl font-black text-blue-600 flex items-center gap-2 leading-none">
                                    {currentWord.en} <span className="text-gray-400 text-sm font-normal">({currentWord.zh})</span>
                                </div>
                                <span className={`text-[10px] font-bold px-2 rounded mt-1 ${DIFF_CONFIG[currentWord.difficulty].bg} ${DIFF_CONFIG[currentWord.difficulty].color}`}>
                                    {DIFF_CONFIG[currentWord.difficulty].label} 題目
                                </span>
                            </div>
                        ) : (
                            <div className="text-2xl font-black text-gray-800 tracking-[0.2em] animate-pulse">
                                {currentWord.en.replace(/[a-zA-Z0-9]/g, '_ ')}
                            </div>
                        )}
                        <div className={`text-xs font-bold flex items-center gap-1 mt-1 ${timer <= 10 ? 'text-red-500 animate-pulse' : 'text-gray-500'}`}>
                            <Clock size={12} /> {timer}s
                        </div>
                    </>
                ) : (
                    <span className="font-bold text-gray-600 flex items-center gap-2"><PenTool size={18}/> 畫畫接龍</span>
                )}
            </div>

            <button 
                onClick={() => setShowChat(!showChat)} 
                className={`p-2 rounded-full relative ${showChat ? 'bg-blue-100 text-blue-600' : 'hover:bg-gray-100 text-gray-600'}`}
            >
                <MessageCircle size={20} />
                {messages.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>}
            </button>
        </div>

        {/* --- Main Canvas --- */}
        <div className="flex-1 relative bg-gray-200 cursor-crosshair overflow-hidden flex flex-col items-center justify-center">
            <div className="relative bg-white shadow-xl">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="touch-none block"
                />
            </div>

            {/* Selecting Overlay (Drawer Only) */}
            {phase === 'SELECTING' && isDrawer && (
                <div className="absolute inset-0 bg-gray-900/90 backdrop-blur-sm flex items-center justify-center p-6 z-30">
                    <div className="w-full max-w-sm">
                        <h3 className="text-2xl font-black text-white mb-6 text-center">選擇題目</h3>
                        <div className="grid grid-cols-1 gap-4">
                            {wordChoices.map((word, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => handleSelectWord(word)}
                                    className={`relative p-4 rounded-2xl border-l-8 shadow-xl transition-all hover:scale-105 active:scale-95 bg-white flex items-center justify-between group overflow-hidden ${DIFF_CONFIG[word.difficulty].border}`}
                                >
                                    <div className="z-10">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`text-[10px] font-black px-2 py-0.5 rounded ${DIFF_CONFIG[word.difficulty].bg} ${DIFF_CONFIG[word.difficulty].color}`}>
                                                {DIFF_CONFIG[word.difficulty].label} ({word.points}分)
                                            </span>
                                            <span className="text-xs text-gray-400 font-bold">{word.category}</span>
                                        </div>
                                        <div className="text-xl font-black text-gray-800">{word.en}</div>
                                        <div className="text-sm text-gray-500">{word.zh}</div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Waiting Overlay (Guesser) */}
            {phase === 'SELECTING' && !isDrawer && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-30">
                    <div className="text-white text-center animate-pulse">
                        <div className="text-4xl font-black mb-2">畫家選題中...</div>
                        <div className="text-sm opacity-70">請稍候，題目即將揭曉</div>
                    </div>
                </div>
            )}

            {/* Ended Overlay */}
            {phase === 'ENDED' && (
                <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-6 z-40">
                    <div className="bg-white w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in">
                        <div className="mb-4">
                            {winner ? <Crown size={60} className="text-yellow-500 mx-auto animate-bounce" /> : <Clock size={60} className="text-gray-400 mx-auto" />}
                        </div>
                        <h2 className="text-3xl font-black text-gray-800 mb-2">{winner ? '有人猜對了！' : '時間到！'}</h2>
                        <div className="text-lg text-gray-600 mb-6 bg-gray-50 p-4 rounded-xl border border-gray-200">
                            答案是
                            <div className="text-blue-600 font-black text-3xl mt-1">{currentWord?.en}</div>
                            <div className="text-gray-400 text-sm font-bold">{currentWord?.zh}</div>
                        </div>
                        {winner && <div className="bg-green-50 text-green-700 px-4 py-2 rounded-lg font-bold mb-6 inline-block">贏家: {winner}</div>}
                        
                        {isHost ? (
                            <button onClick={handleStartGame} className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold">下一回合</button>
                        ) : (
                            <div className="text-gray-400 text-sm">等待房主開始下一局...</div>
                        )}
                    </div>
                </div>
            )}

            {/* Drawer Tools */}
            {isDrawer && phase === 'DRAWING' && (
                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur shadow-xl rounded-2xl p-2 border border-gray-200 flex flex-col gap-3 z-10 animate-in slide-in-from-left">
                    <div className="flex flex-col gap-2 p-1 bg-gray-100 rounded-xl">
                        {COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => { setColor(c); setIsEraser(false); }}
                                className={`w-6 h-6 rounded-full border-2 transition-transform ${color === c && !isEraser ? 'border-gray-600 scale-125' : 'border-transparent'}`}
                                style={{ backgroundColor: c }}
                            />
                        ))}
                    </div>
                    <div className="h-[1px] bg-gray-200 w-full"></div>
                    <button onClick={() => setIsEraser(!isEraser)} className={`p-2 rounded-xl flex justify-center transition-colors ${isEraser ? 'bg-blue-100 text-blue-600' : 'text-gray-500 hover:bg-gray-100'}`}><Eraser size={20} /></button>
                    <button onClick={() => clearCanvas(true)} className="p-2 hover:bg-red-50 text-red-500 rounded-xl"><Trash2 size={20} /></button>
                    <div className="h-[1px] bg-gray-200 w-full"></div>
                    <div className="flex flex-col items-center gap-3 py-1">
                        {WIDTHS.map(w => (
                            <button key={w} onClick={() => setLineWidth(w)} className={`w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 ${lineWidth === w ? 'bg-gray-200' : ''}`}><div className="rounded-full bg-black" style={{ width: w, height: w }}></div></button>
                        ))}
                    </div>
                </div>
            )}
        </div>

        {/* Chat Drawer */}
        {showChat && (
            <div className="absolute bottom-0 right-0 left-0 md:left-auto md:w-80 h-1/2 md:h-full bg-white shadow-2xl border-l border-gray-200 flex flex-col z-50 animate-in slide-in-from-bottom md:slide-in-from-right duration-300">
                <div className="p-3 border-b flex justify-between items-center bg-gray-50">
                    <span className="font-bold text-sm text-gray-600">聊天室 ({players.length}人)</span>
                    <button onClick={() => setShowChat(false)}><ArrowLeft className="rotate-270 md:rotate-180 text-gray-400" size={18}/></button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50/50">
                    {messages.map((msg, i) => (
                        <div key={i} className={`text-sm ${msg.isSystem ? 'text-green-600 font-bold bg-green-50 p-2 rounded text-center' : ''}`}>
                            {!msg.isSystem && <span className="font-bold text-gray-700">{msg.sender}: </span>}
                            <span className={msg.isSystem ? '' : 'text-gray-600'}>{msg.text}</span>
                        </div>
                    ))}
                </div>
                <div className="p-3 border-t bg-white flex gap-2">
                    <input 
                        type="text" 
                        value={chatInput} 
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && sendMessage()}
                        placeholder={isDrawer && phase === 'DRAWING' ? "畫家無法發言" : "輸入答案..."}
                        disabled={isDrawer && phase === 'DRAWING'}
                        className="flex-1 bg-gray-100 rounded-full px-4 py-2 text-sm outline-none focus:ring-2 ring-blue-200 disabled:opacity-50"
                    />
                    <button onClick={sendMessage} disabled={isDrawer && phase === 'DRAWING'} className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50">
                        <Send size={16} />
                    </button>
                </div>
            </div>
        )}
    </div>
  );
};
