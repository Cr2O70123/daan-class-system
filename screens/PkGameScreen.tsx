
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, Shield, Swords, Skull, Crown, User as UserIcon, Loader2, Send } from 'lucide-react';
import { User, PkResult, Word, PkPlayerState, PkGamePayload } from '../types';
import { WORD_DATABASE } from '../services/mockData';
import { joinMatchmaking, leaveMatchmaking, joinGameRoom, leaveGameRoom, sendGameEvent } from '../services/pkService';

interface PkGameScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: PkResult) => void;
}

// --- Sound Logic ---
const playSound = (type: 'match' | 'attack' | 'damage' | 'win' | 'lose' | 'turn_switch' | 'block') => {
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
      case 'attack': // Send attack sound
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      case 'block': // Defense success
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
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
const DAMAGE_PER_HIT = 250;
const TOTAL_ROUNDS = 3; // Shorter but more intense rounds (1 round = Attack + Defend)

type BattlePhase = 'matching' | 'ready' | 'selecting_attack' | 'waiting_opponent' | 'defending' | 'round_summary' | 'result';

export const PkGameScreen: React.FC<PkGameScreenProps> = ({ user, onBack, onFinish }) => {
  const [phase, setPhase] = useState<BattlePhase>('matching');
  const [matchStatus, setMatchStatus] = useState("正在搜尋對手...");
  
  // Players
  const [opponent, setOpponent] = useState<PkPlayerState | null>(null);
  const [isHost, setIsHost] = useState(false);
  
  // Stats
  const [myHp, setMyHp] = useState(MAX_HP);
  const [opHp, setOpHp] = useState(MAX_HP);
  const [round, setRound] = useState(1);
  
  // Round Data
  const [attackOptions, setAttackOptions] = useState<Word[]>([]); // Words I can choose to send
  const [incomingWord, setIncomingWord] = useState<Word | null>(null); // Word opponent sent me
  const [defenseOptions, setDefenseOptions] = useState<string[]>([]); // Options for incoming word
  
  // Round State
  const [myAttackSent, setMyAttackSent] = useState(false);
  const [opponentAttackReceived, setOpponentAttackReceived] = useState(false);
  const [myDefenseResult, setMyDefenseResult] = useState<'success' | 'fail' | null>(null);
  const [opDefenseResult, setOpDefenseResult] = useState<'success' | 'fail' | null>(null); // Did opponent defend my attack?
  
  // Messages
  const [battleLog, setBattleLog] = useState<string>("");

  // Refs
  const timeoutFallbackRef = useRef<number | null>(null);

  // --- 1. Matchmaking Lifecycle ---
  useEffect(() => {
      joinMatchmaking(
          user,
          (op, roomId, host) => {
              setOpponent(op);
              setIsHost(host);
              setMatchStatus("配對成功！");
              playSound('match');
              leaveMatchmaking();
              joinGameRoom(roomId, handleGameEvent);

              setTimeout(() => {
                  setPhase('ready');
                  setTimeout(startRound, 2000);
              }, 1500);
          },
          (status) => setMatchStatus(status)
      );
      
      timeoutFallbackRef.current = window.setTimeout(() => {
          if (phase === 'matching') {
              setMatchStatus("線上無人，請稍後再試");
          }
      }, 20000);

      return () => {
          leaveMatchmaking();
          leaveGameRoom();
          if (timeoutFallbackRef.current) clearTimeout(timeoutFallbackRef.current);
      };
  }, []);

  // --- 2. Game Loop ---

  const startRound = () => {
      // Reset Round State
      setMyAttackSent(false);
      setOpponentAttackReceived(false);
      setIncomingWord(null);
      setMyDefenseResult(null);
      setOpDefenseResult(null);
      setBattleLog(`Round ${round} 開始！選擇題目攻擊對手！`);
      
      // Generate 3 difficult words for me to choose
      const pool = WORD_DATABASE.filter(w => w.level >= 4); // Harder words for attack
      const options = pool.sort(() => 0.5 - Math.random()).slice(0, 3);
      setAttackOptions(options);
      
      setPhase('selecting_attack');
  };

  const handleSelectAttack = (word: Word) => {
      setMyAttackSent(true);
      setBattleLog("已發送攻擊！等待對手...");
      
      // Send attack to opponent
      sendGameEvent({
          type: 'SEND_WORD',
          wordId: word.id,
          attackerId: user.studentId
      });
      playSound('attack');

      // If we already received opponent's attack, go to defend
      if (opponentAttackReceived) {
          setPhase('defending');
      } else {
          setPhase('waiting_opponent');
      }
  };

  const generateDefenseOptions = (word: Word) => {
      // Generate 3 wrong answers
      const wrongs = WORD_DATABASE
        .filter(w => w.id !== word.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.zh);
      const opts = [word.zh, ...wrongs].sort(() => 0.5 - Math.random());
      setDefenseOptions(opts);
  };

  const handleDefend = (selectedZh: string) => {
      if (!incomingWord) return;
      
      const isCorrect = selectedZh === incomingWord.zh;
      const damageTaken = isCorrect ? 0 : DAMAGE_PER_HIT;
      
      setMyHp(prev => Math.max(0, prev - damageTaken));
      setMyDefenseResult(isCorrect ? 'success' : 'fail');
      
      if (isCorrect) {
          playSound('block');
          setBattleLog("防禦成功！完美格擋！");
      } else {
          playSound('damage');
          setBattleLog("防禦失敗！受到傷害！");
      }

      // Report result to opponent so they know if their attack landed
      sendGameEvent({
          type: 'REPORT_DAMAGE',
          defenderId: user.studentId,
          damageTaken: damageTaken
      });

      checkRoundEnd();
  };

  const checkRoundEnd = () => {
      // Wait for both defense results
      // But simpler: wait for my result, and we assume we will get opponent's result event
      // We handle the phase transition in handleGameEvent when REPORT_DAMAGE is received
  };

  // --- 3. Event Handling ---
  const handleGameEvent = (payload: PkGamePayload) => {
      if (payload.type === 'SEND_WORD') {
          if (payload.attackerId !== user.studentId && payload.wordId) {
              // Opponent sent an attack
              const word = WORD_DATABASE.find(w => w.id === payload.wordId);
              if (word) {
                  setIncomingWord(word);
                  generateDefenseOptions(word);
                  setOpponentAttackReceived(true);
                  
                  // If I have already sent mine, I can start defending
                  // Using functional update to check current state ref logic is tricky in closure
                  // Relying on state update cycle logic below:
                  setPhase(prev => {
                      if (prev === 'waiting_opponent') return 'defending';
                      return prev;
                  });
              }
          }
      } 
      else if (payload.type === 'REPORT_DAMAGE') {
          if (payload.defenderId !== user.studentId) {
              // This is opponent telling me how much damage they took from MY attack
              const damage = payload.damageTaken || 0;
              setOpHp(prev => Math.max(0, prev - damage));
              setOpDefenseResult(damage === 0 ? 'success' : 'fail');
          }
      }
  };

  // Use effect to sync round end logic
  useEffect(() => {
      if (myDefenseResult && opDefenseResult && phase !== 'round_summary' && phase !== 'result') {
          setTimeout(() => {
              setPhase('round_summary');
              setTimeout(nextRoundOrEnd, 2500);
          }, 1000);
      }
  }, [myDefenseResult, opDefenseResult]);

  const nextRoundOrEnd = () => {
      // Check Game Over
      if (myHp <= 0 || opHp <= 0 || round >= TOTAL_ROUNDS) {
          // Determine Winner
          let win = false;
          if (myHp > 0 && opHp <= 0) win = true;
          else if (myHp > 0 && opHp > 0 && myHp > opHp) win = true;
          else if (myHp > 0 && opHp > 0 && myHp === opHp) win = true; // Draw gives win to player for UX
          
          playSound(win ? 'win' : 'lose');
          setPhase('result');
          
          // Calc Score
          let finalScore = win ? 100 : 20;
          finalScore += Math.floor(myHp / 10);
          onFinish({ isWin: win, score: finalScore, opponentName: opponent?.name || '' });
      } else {
          setRound(prev => prev + 1);
          startRound();
      }
  };

  // --- Renders ---

  if (phase === 'matching') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-gray-900 text-white h-screen">
            <div className="relative">
                <div className="w-48 h-48 rounded-full border-4 border-blue-500/30 animate-[spin_3s_linear_infinite]">
                    <div className="w-full h-1 bg-blue-500 absolute top-1/2 rotate-45"></div>
                </div>
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className={`w-20 h-20 rounded-full ${user.avatarColor} border-4 border-white flex items-center justify-center overflow-hidden`}>
                         {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                    </div>
                </div>
            </div>
            <div className="text-center">
                 <Loader2 className="animate-spin mb-2 mx-auto text-blue-400" size={32} />
                 <h2 className="text-xl font-bold animate-pulse">{matchStatus}</h2>
            </div>
            <button onClick={onBack} className="absolute top-10 left-4 p-2 bg-gray-800 rounded-full"><ArrowLeft size={20}/></button>
        </div>
      );
  }

  if (phase === 'result') {
      const isWin = myHp > opHp; // Simple check for render
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white p-6 h-screen">
             <div className={`absolute inset-0 opacity-20 ${isWin ? 'bg-yellow-500' : 'bg-red-900'}`}></div>
             <div className="relative z-10 text-center animate-in zoom-in">
                 {isWin ? (
                     <div><Crown size={80} className="text-yellow-400 mx-auto mb-4" /><h1 className="text-5xl font-black text-yellow-400">VICTORY</h1></div>
                 ) : (
                     <div><Skull size={80} className="text-gray-500 mx-auto mb-4" /><h1 className="text-5xl font-black text-gray-400">DEFEAT</h1></div>
                 )}
                 <div className="mt-8 bg-gray-800/80 p-6 rounded-2xl border border-gray-700">
                     <div className="flex justify-between gap-12 mb-4">
                         <div className="text-center">
                             <div className="text-xs text-gray-400">YOU</div>
                             <div className="text-2xl font-bold text-blue-400">{myHp}</div>
                         </div>
                         <div className="text-center">
                             <div className="text-xs text-gray-400">{opponent?.name}</div>
                             <div className="text-2xl font-bold text-red-400">{opHp}</div>
                         </div>
                     </div>
                     <button onClick={() => onFinish({ isWin, score: 0, opponentName: '' })} className="w-full py-3 bg-blue-600 rounded-xl font-bold">返回大廳</button>
                 </div>
             </div>
        </div>
      );
  }

  return (
      <div className="flex-1 flex flex-col bg-gray-900 text-white h-screen relative overflow-hidden">
          {/* Top Bar: Opponent */}
          <div className="bg-gray-800 p-4 pt-safe flex items-center gap-4 border-b border-gray-700">
              <div className={`relative w-14 h-14 rounded-full ${opponent?.avatarColor} flex-shrink-0 overflow-hidden border-2 border-gray-500`}>
                  {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : (opponent?.name[0] || '?')}
                  {opDefenseResult === 'fail' && <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center font-bold text-xs animate-ping">Hit!</div>}
                  {opDefenseResult === 'success' && <div className="absolute inset-0 bg-blue-500/60 flex items-center justify-center font-bold text-xs">Block</div>}
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                      <span className="font-bold">{opponent?.name}</span>
                      <span className="text-xs font-mono">{opHp} HP</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-red-500 transition-all duration-500" style={{ width: `${(opHp / MAX_HP) * 100}%` }}></div>
                  </div>
              </div>
          </div>

          {/* Center Arena */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
              <div className="absolute top-2 text-gray-500 font-bold text-sm uppercase tracking-widest">Round {round} / {TOTAL_ROUNDS}</div>
              
              {phase === 'ready' && <h1 className="text-6xl font-black text-yellow-500 animate-bounce">VS</h1>}
              
              {phase === 'selecting_attack' && (
                  <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom duration-300">
                      <h2 className="text-xl font-bold text-center mb-6 flex items-center justify-center gap-2">
                          <Swords className="text-red-500" /> 選擇題目攻擊對手
                      </h2>
                      <div className="grid gap-3">
                          {attackOptions.map((word, idx) => (
                              <button 
                                key={idx}
                                onClick={() => handleSelectAttack(word)}
                                className="bg-gray-800 hover:bg-gray-700 border border-gray-600 p-4 rounded-xl text-left transition-all hover:scale-[1.02] active:scale-95 group"
                              >
                                  <div className="flex justify-between items-center">
                                      <span className="font-bold text-lg group-hover:text-red-400">{word.en}</span>
                                      <span className="text-xs bg-gray-700 px-2 py-1 rounded text-gray-300">Lv.{word.level}</span>
                                  </div>
                                  <div className="text-sm text-gray-400 mt-1">{word.zh}</div>
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {phase === 'waiting_opponent' && (
                  <div className="text-center animate-pulse">
                      <Shield size={64} className="text-blue-500 mx-auto mb-4 opacity-50" />
                      <h2 className="text-xl font-bold text-gray-300">等待對手出招...</h2>
                  </div>
              )}

              {phase === 'defending' && incomingWord && (
                  <div className="w-full max-w-sm animate-in zoom-in duration-200">
                      <div className="bg-red-500/20 border border-red-500/50 rounded-2xl p-6 text-center mb-6 relative overflow-hidden">
                          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-[shrink_10s_linear]"></div>
                          <div className="text-xs text-red-300 font-bold mb-2 uppercase">Incoming Attack!</div>
                          <h2 className="text-4xl font-black text-white mb-1">{incomingWord.en}</h2>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3">
                          {defenseOptions.map((opt, idx) => (
                              <button
                                  key={idx}
                                  onClick={() => handleDefend(opt)}
                                  className="bg-white text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-200 active:scale-95 transition-all"
                              >
                                  {opt}
                              </button>
                          ))}
                      </div>
                  </div>
              )}

              {phase === 'round_summary' && (
                  <div className="bg-gray-800 p-6 rounded-2xl border border-gray-600 text-center animate-in zoom-in">
                      <h2 className="text-xl font-bold mb-4">回合結算</h2>
                      <div className="space-y-3">
                          <div className="flex justify-between items-center gap-8">
                              <span className="text-gray-400">你的攻擊</span>
                              <span className={`font-bold ${opDefenseResult === 'fail' ? 'text-green-400' : 'text-gray-500'}`}>
                                  {opDefenseResult === 'fail' ? '命中! -250' : '被格擋'}
                              </span>
                          </div>
                          <div className="flex justify-between items-center gap-8">
                              <span className="text-gray-400">你的防禦</span>
                              <span className={`font-bold ${myDefenseResult === 'success' ? 'text-blue-400' : 'text-red-500'}`}>
                                  {myDefenseResult === 'success' ? '完美!' : '失敗 -250'}
                              </span>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {/* Bottom Bar: Me */}
          <div className="bg-gray-800 p-4 pb-8 flex items-center gap-4 border-t border-gray-700">
              <div className="flex-1 text-right">
                  <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-mono text-gray-400">{myHp}/{MAX_HP}</span>
                      <span className="font-bold text-blue-400">YOU</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(myHp / MAX_HP) * 100}%` }}></div>
                  </div>
              </div>
              <div className={`relative w-14 h-14 rounded-full ${user.avatarColor} flex-shrink-0 overflow-hidden border-2 border-white`}>
                  {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                  {myDefenseResult === 'fail' && <div className="absolute inset-0 bg-red-500/60 flex items-center justify-center font-bold text-xs animate-ping">Hit!</div>}
              </div>
          </div>
      </div>
  );
};
