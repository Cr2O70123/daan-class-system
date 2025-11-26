
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, XCircle, Skull, Crown, User as UserIcon, Loader2, WifiOff } from 'lucide-react';
import { User, PkResult, Word, PkPlayerState, PkGamePayload } from '../types';
import { WORD_DATABASE } from '../services/mockData';
import { joinMatchmaking, leaveMatchmaking, joinGameRoom, leaveGameRoom, sendGameEvent } from '../services/pkService';

interface PkGameScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: PkResult) => void;
}

// --- Sound Logic ---
const playSound = (type: 'match' | 'attack' | 'damage' | 'win' | 'lose' | 'bgm_battle') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    switch(type) {
      case 'match':
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(800, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
        break;
      case 'attack':
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'damage':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.3);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'win':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(523.25, now);
        osc.frequency.setValueAtTime(659.25, now + 0.1);
        osc.frequency.setValueAtTime(783.99, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(now);
        osc.stop(now + 1);
        break;
      case 'lose':
         osc.type = 'triangle';
         osc.frequency.setValueAtTime(300, now);
         osc.frequency.linearRampToValueAtTime(100, now + 1);
         gain.gain.setValueAtTime(0.2, now);
         gain.gain.linearRampToValueAtTime(0, now + 1);
         osc.start(now);
         osc.stop(now + 1);
         break;
    }
  } catch(e) {}
};

const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      case 'frame_beta': return 'ring-2 ring-amber-500 border-2 border-dashed border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
};

// --- Constants ---
const MAX_HP = 1000;
const TIME_PER_ROUND = 10;
const DAMAGE_BASE = 200;
const TOTAL_ROUNDS = 5;

export const PkGameScreen: React.FC<PkGameScreenProps> = ({ user, onBack, onFinish }) => {
  const [phase, setPhase] = useState<'matching' | 'ready' | 'fighting' | 'result'>('matching');
  const [matchStatus, setMatchStatus] = useState("正在連線...");
  
  // Players
  const [opponent, setOpponent] = useState<PkPlayerState | null>(null);
  const [isHost, setIsHost] = useState(false);
  
  // Game Logic
  const [myHp, setMyHp] = useState(MAX_HP);
  const [opHp, setOpHp] = useState(MAX_HP);
  const [round, setRound] = useState(0); // 0-indexed internally
  
  // The full game data (synced from Host)
  const [gameWords, setGameWords] = useState<Word[]>([]);
  const [gameOptions, setGameOptions] = useState<string[][]>([]);

  // Round State
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [isAnswered, setIsAnswered] = useState(false);
  const [myAnswerResult, setMyAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [opAnswerResult, setOpAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);
  
  // Refs
  const timerRef = useRef<number | null>(null);
  const timeoutFallbackRef = useRef<number | null>(null);

  // --- 1. Matchmaking Lifecycle ---
  useEffect(() => {
      // Start matchmaking on mount
      joinMatchmaking(
          user,
          (op, roomId, host) => {
              setOpponent(op);
              setIsHost(host);
              setMatchStatus("配對成功！建立連線中...");
              playSound('match');
              
              // Move to Game Room
              leaveMatchmaking(); // Stop looking for others
              joinGameRoom(roomId, handleGameEvent);

              // Transition UI
              setTimeout(() => {
                  setPhase('ready');
                  // If host, generate data and send START
                  if (host) {
                      initGameData();
                  }
              }, 1500);
          },
          (status) => setMatchStatus(status)
      );
      
      // Fallback: If no match in 20s, allow exit
      timeoutFallbackRef.current = window.setTimeout(() => {
          if (phase === 'matching') {
              setMatchStatus("線上無人配對，請稍後再試");
          }
      }, 20000);

      return () => {
          leaveMatchmaking();
          leaveGameRoom();
          if (timerRef.current) clearInterval(timerRef.current);
          if (timeoutFallbackRef.current) clearTimeout(timeoutFallbackRef.current);
      };
  }, []);

  // --- 2. Host Logic: Generate Game Data ---
  const initGameData = () => {
      const words: Word[] = [];
      const optionsList: string[][] = [];

      for(let i=0; i<TOTAL_ROUNDS; i++) {
          const w = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)];
          words.push(w);
          
          const wrongs = WORD_DATABASE
            .filter(wd => wd.id !== w.id)
            .sort(() => 0.5 - Math.random())
            .slice(0, 3)
            .map(wd => wd.zh);
          const opts = [w.zh, ...wrongs].sort(() => 0.5 - Math.random());
          optionsList.push(opts);
      }

      setGameWords(words);
      setGameOptions(optionsList);

      // Send Start Event
      setTimeout(() => {
          sendGameEvent({
              type: 'START_GAME',
              words: words,
              optionsList: optionsList
          });
          // Host starts locally too
          startGameSequence(words, optionsList);
      }, 1000);
  };

  // --- 3. Event Handling ---
  const handleGameEvent = (payload: PkGamePayload) => {
      if (payload.type === 'START_GAME') {
          if (!isHost && payload.words && payload.optionsList) {
              setGameWords(payload.words);
              setGameOptions(payload.optionsList);
              startGameSequence(payload.words, payload.optionsList);
          }
      } 
      else if (payload.type === 'ATTACK') {
          // Received damage from opponent
          if (payload.attackerId !== user.studentId) {
              const dmg = payload.damage || 0;
              setMyHp(prev => Math.max(0, prev - dmg));
              setOpAnswerResult('correct'); // Visual feedback
              setTimeout(() => setOpAnswerResult(null), 1000); // Clear feedback
          }
      }
      else if (payload.type === 'GAME_OVER') {
          // Force end if opponent quits or sync issues? 
          // Currently reliance on local HP calc is mostly fine for casual PvP
      }
  };

  const startGameSequence = (words: Word[], opts: string[][]) => {
      setPhase('fighting');
      setMyHp(MAX_HP);
      setOpHp(MAX_HP);
      setRound(0);
      setBattleLog(["對戰開始！"]);
      startRoundTimer();
  };

  // --- 4. Round Logic ---
  const startRoundTimer = () => {
      setIsAnswered(false);
      setMyAnswerResult(null);
      setOpAnswerResult(null);
      setTimeLeft(TIME_PER_ROUND);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  handleTimeout();
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const handleTimeout = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!isAnswered) {
          // Missed turn
          setIsAnswered(true);
          setMyAnswerResult('wrong');
          advanceRound();
      }
  };

  const handleAnswer = (selectedZh: string) => {
      if (isAnswered) return;
      setIsAnswered(true);

      const currentWord = gameWords[round];
      const isCorrect = selectedZh === currentWord.zh;

      if (isCorrect) {
          setMyAnswerResult('correct');
          playSound('attack');
          const damage = DAMAGE_BASE + (timeLeft * 10);
          
          // 1. Update Local View of Opponent
          setOpHp(prev => Math.max(0, prev - damage));
          setBattleLog(prev => [`造成 ${damage} 傷害！`, ...prev]);

          // 2. Send Attack to Opponent
          sendGameEvent({
              type: 'ATTACK',
              damage: damage,
              attackerId: user.studentId
          });

      } else {
          setMyAnswerResult('wrong');
          playSound('damage');
          setBattleLog(prev => [`答錯了！`, ...prev]);
      }

      if (timerRef.current) clearInterval(timerRef.current);
      advanceRound();
  };

  const advanceRound = () => {
      // Delay before next round to show result
      setTimeout(() => {
          // Check death
          if (myHp <= 0 || opHp <= 0) {
              endBattle();
              return;
          }

          if (round < TOTAL_ROUNDS - 1) {
              setRound(prev => prev + 1);
              startRoundTimer();
          } else {
              endBattle();
          }
      }, 1500);
  };

  const endBattle = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setPhase('result');
      
      const isWin = myHp > 0 && (myHp > opHp || opHp <= 0);
      playSound(isWin ? 'win' : 'lose');

      // Calculate score
      let finalScore = isWin ? 100 : 20;
      if (isWin) finalScore += Math.floor(myHp / 10);

      // Submit
      onFinish({
          isWin,
          score: finalScore,
          opponentName: opponent?.name || '對手'
      });
  };

  // --- Renders ---

  if (phase === 'matching') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-gray-900 text-white relative overflow-hidden h-screen">
            <div className="relative">
                <div className="w-48 h-48 rounded-full border-4 border-blue-500/30 flex items-center justify-center animate-[spin_3s_linear_infinite]">
                    <div className="w-full h-1 bg-gradient-to-r from-transparent to-blue-500 absolute top-1/2 left-0 rotate-45 origin-center"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full ${user.avatarColor} border-4 border-white flex items-center justify-center text-2xl font-bold z-10 overflow-hidden`}>
                         {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                    </div>
                </div>
            </div>
            
            <div className="text-center z-10 h-20 flex flex-col items-center">
                 <Loader2 className="animate-spin mb-2 text-blue-400" size={32} />
                 <h2 className="text-xl font-bold animate-pulse">{matchStatus}</h2>
                 {matchStatus.includes("無人") && (
                     <div className="mt-4 bg-gray-800 px-4 py-2 rounded-lg text-xs text-gray-400">
                         建議找一位同學同時按下進入PK模式
                     </div>
                 )}
            </div>
            
            <button onClick={onBack} className="absolute top-10 left-4 p-2 bg-gray-800 rounded-full hover:bg-gray-700">
                 <ArrowLeft size={20}/>
            </button>
        </div>
      );
  }

  if (phase === 'ready') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white h-screen">
            <h1 className="text-5xl font-black text-yellow-500 animate-bounce mb-8">VS</h1>
            <div className="flex items-center gap-8">
                 <div className="flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full ${user.avatarColor} border-4 border-blue-500 overflow-hidden shadow-lg shadow-blue-500/50`}>
                        {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                    </div>
                    <span className="font-bold mt-2 text-lg">{user.name}</span>
                 </div>
                 <div className="flex flex-col items-center">
                    <div className={`w-24 h-24 rounded-full ${opponent?.avatarColor || 'bg-gray-500'} border-4 border-red-500 overflow-hidden shadow-lg shadow-red-500/50`}>
                        {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : (opponent?.name[0] || '?')}
                    </div>
                    <span className="font-bold mt-2 text-lg">{opponent?.name || '???'}</span>
                 </div>
            </div>
            <p className="mt-10 text-gray-400 font-mono">Loading battle data...</p>
        </div>
      );
  }

  if (phase === 'result') {
      const isWin = myHp > 0 && (myHp > opHp || opHp <= 0);
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white p-6 h-screen relative overflow-hidden">
             <div className={`absolute inset-0 opacity-20 ${isWin ? 'bg-yellow-500' : 'bg-red-900'}`}></div>

             <div className="relative z-10 text-center animate-in zoom-in duration-500">
                 {isWin ? (
                     <div className="mb-6">
                         <Crown size={80} className="text-yellow-400 fill-yellow-400 mx-auto drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] animate-bounce" />
                         <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mt-2">VICTORY</h1>
                     </div>
                 ) : (
                     <div className="mb-6">
                         <Skull size={80} className="text-gray-500 mx-auto drop-shadow-lg" />
                         <h1 className="text-5xl font-black text-gray-400 mt-2">DEFEAT</h1>
                     </div>
                 )}

                 <div className="bg-gray-800/80 backdrop-blur-md p-6 rounded-3xl border border-gray-700 shadow-xl w-full max-w-xs mx-auto">
                     <div className="flex justify-between items-center mb-4 border-b border-gray-700 pb-4">
                         <div className="flex flex-col items-center">
                             <div className={`w-12 h-12 rounded-full ${user.avatarColor} flex items-center justify-center font-bold border-2 border-white mb-1 overflow-hidden`}>
                                 {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                             </div>
                             <span className="text-sm font-bold">{user.name}</span>
                         </div>
                         <div className="text-2xl font-black font-mono">VS</div>
                         <div className="flex flex-col items-center">
                             <div className={`w-12 h-12 rounded-full ${opponent?.avatarColor} flex items-center justify-center font-bold border-2 border-white mb-1 overflow-hidden grayscale`}>
                                 {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : opponent?.name[0]}
                             </div>
                             <span className="text-sm font-bold text-gray-400">{opponent?.name}</span>
                         </div>
                     </div>

                     <div className="text-lg font-bold text-gray-300 mb-6">
                         積分獎勵: <span className="text-yellow-400">+{isWin ? (100 + Math.floor(myHp/10)) : 20} PT</span>
                     </div>

                     <button 
                        onClick={() => {
                            setPhase('matching');
                            setOpponent(null);
                            joinMatchmaking(user, (op, id, h) => {
                                setOpponent(op); setIsHost(h);
                                setMatchStatus("Re-matched!");
                                leaveMatchmaking();
                                joinGameRoom(id, handleGameEvent);
                                setTimeout(() => {
                                    setPhase('ready');
                                    if(h) initGameData();
                                }, 1500);
                            }, s => setMatchStatus(s));
                        }}
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold mb-3"
                     >
                         再來一局
                     </button>
                     <button 
                        onClick={() => onFinish({ isWin, score: 0, opponentName: '' })} // Score handled internally before this screen usually, or passed back
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
                     >
                         返回大廳
                     </button>
                 </div>
             </div>
        </div>
      );
  }

  // --- Battle Phase Render ---
  return (
      <div className="flex-1 flex flex-col bg-gray-900 text-white relative h-screen">
          {/* Opponent Area (Top) */}
          <div className="p-4 flex items-center gap-4 bg-gray-800/50 border-b border-gray-700 relative overflow-hidden h-24">
                {opAnswerResult === 'correct' && (
                    <div className="absolute inset-0 bg-red-500/30 animate-pulse z-0 pointer-events-none"></div>
                )}
                <div className={`relative w-16 h-16 rounded-full ${opponent?.avatarColor} flex items-center justify-center text-2xl font-bold border-4 border-gray-600 z-10 overflow-hidden ${getFrameStyle(opponent?.avatarFrame)}`}>
                    {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : opponent?.name[0]}
                    {opAnswerResult === 'correct' && <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center font-bold text-xs">Hit!</div>}
                </div>
                <div className="flex-1 z-10">
                    <div className="flex justify-between items-end mb-1">
                        <span className="font-bold text-lg">{opponent?.name}</span>
                        <span className="text-xs font-mono text-gray-400">{opHp}/{MAX_HP}</span>
                    </div>
                    <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-red-500 transition-all duration-300" 
                            style={{ width: `${(opHp / MAX_HP) * 100}%` }}
                        ></div>
                    </div>
                </div>
          </div>

          {/* Arena Center */}
          <div className="flex-1 flex flex-col items-center justify-center p-6 relative">
              {/* Timer */}
              <div className="absolute top-4 left-1/2 transform -translate-x-1/2">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-black border-4 ${timeLeft <= 3 ? 'border-red-500 text-red-500 scale-110 animate-pulse' : 'border-blue-500 text-blue-400 bg-gray-900'}`}>
                      {timeLeft}
                  </div>
              </div>

              {/* Question */}
              <div className="w-full max-w-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 rounded-3xl shadow-2xl text-center border-4 border-gray-200 dark:border-gray-700 animate-in zoom-in duration-300 relative">
                  <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Round {round + 1} / {TOTAL_ROUNDS}</div>
                  <h2 className="text-4xl font-black mb-4">{gameWords[round]?.en || 'Loading...'}</h2>
                  
                  {/* Local Feedback Overlay */}
                  {myAnswerResult && (
                      <div className={`absolute inset-0 flex items-center justify-center rounded-2xl bg-black/60 z-10 ${myAnswerResult === 'correct' ? 'text-green-400' : 'text-red-400'}`}>
                           <span className="text-4xl font-black uppercase">{myAnswerResult}!</span>
                      </div>
                  )}
              </div>

              {/* Log */}
              <div className="absolute bottom-4 left-0 right-0 px-4 pointer-events-none h-16 overflow-hidden flex flex-col justify-end">
                  {battleLog.slice(0, 1).map((log, i) => (
                      <div key={i} className="text-center text-sm font-bold text-yellow-400 drop-shadow-md mb-1 animate-in slide-in-from-bottom fade-in duration-300">
                          {log}
                      </div>
                  ))}
              </div>
          </div>

          {/* Player Area */}
          <div className="bg-gray-800 p-4 pb-safe rounded-t-[2rem] border-t border-gray-700 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                <div className="flex items-center gap-3 mb-4 px-2">
                    <div className="flex-1">
                        <div className="flex justify-between items-end mb-1">
                            <span className="text-xs font-mono text-gray-400">{myHp}/{MAX_HP}</span>
                            <span className="font-bold text-lg text-blue-400">YOU</span>
                        </div>
                        <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                                    className="h-full bg-blue-500 transition-all duration-300" 
                                    style={{ width: `${(myHp / MAX_HP) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                    <div className={`relative w-12 h-12 rounded-full ${user.avatarColor} flex items-center justify-center text-lg font-bold border-2 border-white overflow-hidden ${getFrameStyle(user.avatarFrame)}`}>
                        {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {gameOptions[round]?.map((opt, idx) => {
                        let btnStyle = "bg-gray-700 hover:bg-gray-600 border-gray-600";
                        if (isAnswered) {
                            if (opt === gameWords[round]?.zh) btnStyle = "bg-green-600 border-green-500 ring-2 ring-green-400";
                            else btnStyle = "opacity-30";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(opt)}
                                disabled={isAnswered}
                                className={`py-4 rounded-xl font-bold text-lg border-b-4 active:border-b-0 active:translate-y-1 transition-all ${btnStyle}`}
                            >
                                {opt}
                            </button>
                        );
                    })}
                </div>
          </div>
      </div>
  );
};
