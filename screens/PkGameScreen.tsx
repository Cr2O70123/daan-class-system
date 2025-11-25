

import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Swords, Trophy, Timer, Zap, User as UserIcon, XCircle, Skull, Crown } from 'lucide-react';
import { User, PkResult, Word, LeaderboardEntry } from '../types';
import { WORD_DATABASE } from '../services/mockData';
import { fetchClassLeaderboard } from '../services/dataService';

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
        // Fanfare
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

// --- Game Logic Constants ---
const MAX_HP = 1000;
const TIME_PER_ROUND = 10;
const DAMAGE_BASE = 200;
const TOTAL_ROUNDS = 5;

export const PkGameScreen: React.FC<PkGameScreenProps> = ({ user, onBack, onFinish }) => {
  const [phase, setPhase] = useState<'matching' | 'fighting' | 'result'>('matching');
  const [opponent, setOpponent] = useState<LeaderboardEntry | null>(null);
  const [matchStatus, setMatchStatus] = useState("正在搜尋對手...");
  
  // Fight State
  const [myHp, setMyHp] = useState(MAX_HP);
  const [opHp, setOpHp] = useState(MAX_HP);
  const [currentRound, setCurrentRound] = useState(1);
  const [currentQuestion, setCurrentQuestion] = useState<Word | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(TIME_PER_ROUND);
  const [isAnswered, setIsAnswered] = useState(false);
  const [myAnswerResult, setMyAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [opAnswerResult, setOpAnswerResult] = useState<'correct' | 'wrong' | null>(null);
  const [battleLog, setBattleLog] = useState<string[]>([]);

  const timerRef = useRef<number | null>(null);
  const opActionTimerRef = useRef<number | null>(null);

  // --- Matching Phase ---
  useEffect(() => {
    if (phase === 'matching') {
        const findOpponent = async () => {
            // Simulate network delay
            setTimeout(async () => {
                setMatchStatus("正在鎖定目標...");
                try {
                    const leaderboard = await fetchClassLeaderboard();
                    // Filter out self and get random
                    const candidates = leaderboard.filter(u => u.studentId !== user.studentId);
                    
                    let target: LeaderboardEntry;
                    if (candidates.length > 0) {
                        target = candidates[Math.floor(Math.random() * candidates.length)];
                    } else {
                        // Fallback bot if no one else exists
                        target = {
                            rank: 99, name: "測試員Bot", studentId: "bot001", points: 1000, level: 5,
                            avatarColor: 'bg-gray-500', avatarImage: undefined, avatarFrame: undefined
                        };
                    }
                    
                    // Artificial delay for tension
                    setTimeout(() => {
                        setOpponent(target);
                        playSound('match');
                        setTimeout(() => {
                            startBattle(target);
                        }, 2000); // Show matched opponent for 2s
                    }, 1000);

                } catch(e) {
                    setMatchStatus("連線失敗，請重試");
                }
            }, 1500);
        };
        findOpponent();
    }
  }, [phase]);

  // --- Battle Phase ---
  const startBattle = (target: LeaderboardEntry) => {
      setPhase('fighting');
      setMyHp(MAX_HP);
      setOpHp(MAX_HP);
      setCurrentRound(1);
      setBattleLog([`對戰開始！ VS ${target.name}`]);
      generateRound();
  };

  const generateRound = () => {
      // Clean up previous round
      setIsAnswered(false);
      setMyAnswerResult(null);
      setOpAnswerResult(null);
      setTimeLeft(TIME_PER_ROUND);

      // Pick word
      const word = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)];
      setCurrentQuestion(word);

      // Options
      const wrongs = WORD_DATABASE
        .filter(w => w.id !== word.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.zh);
      setOptions([word.zh, ...wrongs].sort(() => 0.5 - Math.random()));

      // Start Timer
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

      // Simulate Opponent Action
      // Higher level = faster response, higher accuracy
      if (opponent) {
        const opLevel = opponent.level || 1;
        // Base reaction: 2s ~ 8s. Higher level reduces max time.
        const reactionTime = Math.random() * (8000 - opLevel * 500) + 1000; 
        
        opActionTimerRef.current = window.setTimeout(() => {
            handleOpponentAnswer(word);
        }, Math.max(1000, reactionTime)); // Min 1s
      }
  };

  const handleTimeout = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (!isAnswered) {
          // Timeout counts as wrong
          handleMyAnswer(null); 
      }
  };

  const handleMyAnswer = (selectedZh: string | null) => {
      if (isAnswered) return; // Prevent double click
      setIsAnswered(true);

      const isCorrect = selectedZh === currentQuestion?.zh;
      
      if (isCorrect) {
          setMyAnswerResult('correct');
          playSound('attack');
          // Calculate Damage: Base + Time Bonus
          const damage = DAMAGE_BASE + (timeLeft * 10);
          setOpHp(prev => Math.max(0, prev - damage));
          setBattleLog(prev => [`你對 ${opponent?.name} 造成 ${damage} 點傷害！`, ...prev]);
      } else {
          setMyAnswerResult('wrong');
          playSound('damage');
          const damage = DAMAGE_BASE / 2; // Self damage for wrong? Or just take damage from enemy? 
          // Let's say wrong answer exposes you, taking flat damage or just 0 damage dealt.
          // For excitement, let's just deal 0 damage, but if enemy hits, we hurt.
          setBattleLog(prev => [`你答錯了！錯失攻擊機會。`, ...prev]);
      }

      checkRoundEnd();
  };

  const handleOpponentAnswer = (targetWord: Word) => {
      if (!opponent) return;
      // Accuracy based on level. Lv1 = 50%, Lv10 = 95%
      const opLevel = opponent.level || 1;
      const accuracy = 0.5 + (Math.min(opLevel, 20) * 0.025); 
      const isCorrect = Math.random() < accuracy;

      if (isCorrect) {
          setOpAnswerResult('correct');
          // Damage logic
          const damage = DAMAGE_BASE + (Math.floor(Math.random() * 5) * 10); // Random speed bonus sim
          setMyHp(prev => Math.max(0, prev - damage));
          // Only show log if I haven't answered or handled result? 
          // Actually updating HP is enough visual feedback.
      } else {
          setOpAnswerResult('wrong');
      }
      checkRoundEnd();
  };

  const checkRoundEnd = () => {
     // We need to wait for both or timeout? 
     // Actually, in async flow, we just wait a bit after user interacts then move next.
     // But we need to ensure opponent has "acted" visually?
     // For simplicity: If User answered, wait 1.5s then next round. 
     // Opponent damage happens independently via the timeoutRef.
     
     // BUT, if HP hits 0, game ends immediately.
  };

  // Monitor HP for Game Over
  useEffect(() => {
      if (myHp <= 0 || opHp <= 0) {
          endBattle();
      }
  }, [myHp, opHp]);

  // Monitor Answer State to auto-advance
  useEffect(() => {
      if (isAnswered) {
          if (timerRef.current) clearInterval(timerRef.current);
          
          // Wait for opponent visual if they haven't acted? 
          // Simplification: Wait 2s then next round
          const nextTimer = setTimeout(() => {
              if (myHp > 0 && opHp > 0) {
                  if (currentRound < TOTAL_ROUNDS) {
                      setCurrentRound(prev => prev + 1);
                      generateRound();
                  } else {
                      endBattle();
                  }
              }
          }, 2000);
          return () => clearTimeout(nextTimer);
      }
  }, [isAnswered]);


  const endBattle = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (opActionTimerRef.current) clearTimeout(opActionTimerRef.current);

      setPhase('result');
      const isWin = myHp > 0 && (myHp > opHp || opHp <= 0);
      playSound(isWin ? 'win' : 'lose');

      // Calculate rewards
      // Win = 50 PT, Lose = 10 PT. + Bonus for remaining HP.
      let finalScore = isWin ? 50 : 10;
      if (isWin) finalScore += Math.floor(myHp / 10);
      
      onFinish({
          isWin,
          score: finalScore,
          opponentName: opponent?.name || '對手'
      });
  };

  // --- Renders ---

  const renderMatching = () => (
      <div className="flex-1 flex flex-col items-center justify-center space-y-8 bg-gray-900 text-white relative overflow-hidden">
          {/* Radar Animation */}
          <div className="relative">
              <div className="w-48 h-48 rounded-full border-4 border-blue-500/30 flex items-center justify-center animate-[spin_3s_linear_infinite]">
                  <div className="w-full h-1 bg-gradient-to-r from-transparent to-blue-500 absolute top-1/2 left-0 rotate-45 origin-center"></div>
              </div>
              <div className="absolute inset-0 flex items-center justify-center">
                  <div className={`w-20 h-20 rounded-full ${user.avatarColor} border-4 border-white flex items-center justify-center text-2xl font-bold z-10`}>
                       {user.name[0]}
                  </div>
              </div>
          </div>
          
          <div className="text-center z-10 h-20">
              {opponent ? (
                  <div className="animate-in zoom-in duration-300">
                      <p className="text-sm text-gray-400 mb-2">MATCH FOUND!</p>
                      <div className="flex items-center gap-3 bg-gray-800 p-3 rounded-2xl border border-gray-600">
                           <div className={`w-12 h-12 rounded-full ${opponent.avatarColor} flex items-center justify-center font-bold text-white border-2 border-white`}>
                               {opponent.name[0]}
                           </div>
                           <div className="text-left">
                               <div className="font-bold text-lg">{opponent.name}</div>
                               <div className="text-xs text-yellow-400 font-bold">Lv.{opponent.level}</div>
                           </div>
                      </div>
                  </div>
              ) : (
                  <h2 className="text-xl font-bold animate-pulse">{matchStatus}</h2>
              )}
          </div>
          
          <button onClick={onBack} className="absolute top-safe left-4 p-2 bg-gray-800 rounded-full">
               <ArrowLeft size={20}/>
          </button>
      </div>
  );

  const renderBattle = () => {
      if (!opponent) return null;

      return (
          <div className="flex-1 flex flex-col bg-gray-900 text-white relative">
              {/* Opponent Area (Top) */}
              <div className="p-4 flex items-center gap-4 bg-gray-800/50 border-b border-gray-700 relative overflow-hidden">
                   {/* Hurt Flash Overlay */}
                   {opAnswerResult === 'wrong' || (myAnswerResult === 'correct' && isAnswered) ? (
                        <div className="absolute inset-0 bg-red-500/20 animate-pulse z-0"></div>
                   ) : null}

                   <div className={`relative w-16 h-16 rounded-full ${opponent.avatarColor} flex items-center justify-center text-2xl font-bold border-4 border-gray-600 z-10 ${getFrameStyle(opponent.avatarFrame)}`}>
                       {opponent.name[0]}
                       {opAnswerResult === 'correct' && <div className="absolute -bottom-2 -right-2 bg-green-500 text-white rounded-full p-1"><Zap size={12} fill="white"/></div>}
                       {opAnswerResult === 'wrong' && <div className="absolute -bottom-2 -right-2 bg-red-500 text-white rounded-full p-1"><XCircle size={12}/></div>}
                   </div>
                   <div className="flex-1 z-10">
                       <div className="flex justify-between items-end mb-1">
                           <span className="font-bold text-lg">{opponent.name}</span>
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

                  {/* Question Card */}
                  <div className="w-full max-w-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white p-6 rounded-3xl shadow-2xl text-center border-4 border-gray-200 dark:border-gray-700 animate-in zoom-in duration-300">
                      <div className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Round {currentRound} / {TOTAL_ROUNDS}</div>
                      <h2 className="text-4xl font-black mb-4">{currentQuestion?.en}</h2>
                  </div>

                  {/* Battle Log (Floating) */}
                  <div className="absolute bottom-4 left-0 right-0 px-4 pointer-events-none">
                      {battleLog.slice(0, 2).map((log, i) => (
                          <div key={i} className="text-center text-sm font-bold text-yellow-400 drop-shadow-md mb-1 animate-in slide-in-from-bottom fade-in duration-500">
                              {log}
                          </div>
                      ))}
                  </div>
              </div>

              {/* Player Area (Bottom) */}
              <div className="bg-gray-800 p-4 pb-safe rounded-t-[2rem] border-t border-gray-700 shadow-[0_-5px_20px_rgba(0,0,0,0.5)]">
                   {/* HP Bar */}
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
                        <div className={`relative w-12 h-12 rounded-full ${user.avatarColor} flex items-center justify-center text-lg font-bold border-2 border-white ${getFrameStyle(user.avatarFrame)}`}>
                            {user.name[0]}
                        </div>
                   </div>

                   {/* Options */}
                   <div className="grid grid-cols-2 gap-3">
                       {options.map((opt, idx) => {
                           let btnStyle = "bg-gray-700 hover:bg-gray-600 border-gray-600";
                           if (isAnswered) {
                               if (opt === currentQuestion?.zh) btnStyle = "bg-green-600 border-green-500 ring-2 ring-green-400";
                               else if (opt !== currentQuestion?.zh && myAnswerResult === 'wrong') btnStyle = "opacity-50";
                           }

                           return (
                               <button
                                   key={idx}
                                   onClick={() => handleMyAnswer(opt)}
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

  const renderResult = () => {
      const isWin = myHp > 0 && (myHp > opHp || opHp <= 0);
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white p-6 relative overflow-hidden">
             {/* Background Flash */}
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
                             <div className={`w-12 h-12 rounded-full ${user.avatarColor} flex items-center justify-center font-bold border-2 border-white mb-1`}>
                                 {user.name[0]}
                             </div>
                             <span className="text-sm font-bold">{user.name}</span>
                         </div>
                         <div className="text-2xl font-black font-mono">VS</div>
                         <div className="flex flex-col items-center">
                             <div className={`w-12 h-12 rounded-full ${opponent?.avatarColor} flex items-center justify-center font-bold border-2 border-white mb-1 grayscale`}>
                                 {opponent?.name[0]}
                             </div>
                             <span className="text-sm font-bold text-gray-400">{opponent?.name}</span>
                         </div>
                     </div>

                     <div className="text-lg font-bold text-gray-300 mb-6">
                         積分獎勵: <span className="text-yellow-400">+{isWin ? (50 + Math.floor(myHp/10)) : 10} PT</span>
                     </div>

                     <button 
                        onClick={() => setPhase('matching')} // Re-match? Or finish? Let's finish to save state
                        className="w-full py-3 bg-blue-600 hover:bg-blue-700 rounded-xl font-bold mb-3"
                     >
                         再來一局
                     </button>
                     <button 
                        onClick={() => onFinish({ isWin, score: isWin ? (50 + Math.floor(myHp/10)) : 10, opponentName: opponent?.name || '' })}
                        className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-xl font-bold"
                     >
                         返回大廳
                     </button>
                 </div>
             </div>
        </div>
      );
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col">
        {phase === 'matching' && renderMatching()}
        {phase === 'fighting' && renderBattle()}
        {phase === 'result' && renderResult()}
    </div>
  );
};
