
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, Shield, Swords, Skull, Crown, User as UserIcon, Loader2, Send, Heart, EyeOff, BookOpen, BarChart, Trophy, X, Info, HelpCircle, Flag, Timer, AlertTriangle, CheckCircle } from 'lucide-react';
import { User, PkResult, Word, PkPlayerState, PkGamePayload, BattleCard, SkillType, LeaderboardEntry, PkMistake } from '../types';
import { WORD_DATABASE } from '../services/mockData';
import { joinMatchmaking, leaveMatchmaking, joinGameRoom, leaveGameRoom, sendGameEvent } from '../services/pkService';
import { fetchPkLeaderboard } from '../services/dataService';

interface PkGameScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: PkResult) => void;
}

// --- Ranks System ---
const RANKS = [
    { name: '青銅', color: 'text-orange-700 border-orange-700', min: 0, bg: 'bg-orange-900/30' },
    { name: '白銀', color: 'text-gray-300 border-gray-400', min: 1000, bg: 'bg-gray-800/50' },
    { name: '黃金', color: 'text-yellow-400 border-yellow-500', min: 2000, bg: 'bg-yellow-900/30' },
    { name: '白金', color: 'text-cyan-400 border-cyan-400', min: 3000, bg: 'bg-cyan-900/30' },
    { name: '鑽石', color: 'text-blue-400 border-blue-500', min: 4000, bg: 'bg-blue-900/30' },
    { name: '星耀', color: 'text-purple-400 border-purple-500', min: 5000, bg: 'bg-purple-900/30' },
    { name: '傳說', color: 'text-rose-500 border-rose-500', min: 6000, bg: 'bg-rose-900/30' },
];

const getRank = (points: number) => {
    return [...RANKS].reverse().find(r => points >= r.min) || RANKS[0];
};

const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      case 'frame_beta': return 'ring-2 ring-amber-500 border-2 border-dashed border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      default: return 'ring-2 ring-white/20';
    }
};

const playSound = (type: 'match' | 'attack' | 'damage' | 'win' | 'lose' | 'skill' | 'block' | 'card_flip' | 'tick') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;

    if (type === 'attack') {
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(50, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
    } else if (type === 'skill') {
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.3);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
    } else if (type === 'damage') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);
    } else if (type === 'tick') {
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
    }
    osc.start(now);
    osc.stop(now + 0.3);
  } catch(e) {}
};

const MAX_HP = 1000;
const DAMAGE_PER_HIT = 150; 
const TOTAL_ROUNDS = 10;
const TURN_TIME_LIMIT = 15; // Seconds

type BattlePhase = 'menu' | 'matching' | 'connecting' | 'ready' | 'selecting_attack' | 'waiting_opponent' | 'defending' | 'round_summary' | 'result';

const RankOverviewModal = ({ onClose }: { onClose: () => void }) => (
    <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
        <div className="bg-gray-900 w-full max-w-sm rounded-2xl border border-gray-700 overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
                <h3 className="font-bold text-white flex items-center gap-2"><Trophy size={18} className="text-yellow-500" /> 段位一覽</h3>
                <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20}/></button>
            </div>
            <div className="p-4 space-y-2">
                {RANKS.map(rank => (
                    <div key={rank.name} className="flex justify-between items-center p-3 rounded-lg bg-gray-800/50 border border-gray-700/50">
                        <div className={`font-bold ${rank.color.split(' ')[0]}`}>{rank.name}</div>
                        <div className="text-xs text-gray-400 font-mono">{rank.min}+ PT</div>
                    </div>
                ))}
            </div>
        </div>
    </div>
);

export const PkGameScreen: React.FC<PkGameScreenProps> = ({ user, onBack, onFinish }) => {
  const [phase, setPhase] = useState<BattlePhase>('menu');
  const [menuTab, setMenuTab] = useState<'lobby' | 'rank' | 'help'>('lobby');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [matchStatus, setMatchStatus] = useState("正在掃描對手訊號...");
  const [showRankModal, setShowRankModal] = useState(false);
  
  const [opponent, setOpponent] = useState<PkPlayerState | null>(null);
  
  const [myHp, setMyHp] = useState(MAX_HP);
  const [opHp, setOpHp] = useState(MAX_HP);
  const [round, setRound] = useState(1);
  const myRating = user.pkRating || 0;
  const myRank = getRank(myRating);
  
  const [battleCards, setBattleCards] = useState<BattleCard[]>([]); 
  const [incomingWord, setIncomingWord] = useState<Word | null>(null); 
  const [incomingSkill, setIncomingSkill] = useState<SkillType>('NONE'); 
  const [defenseOptions, setDefenseOptions] = useState<string[]>([]); 
  const [blindEffect, setBlindEffect] = useState(false); 
  
  const [myActionSent, setMyActionSent] = useState(false);
  const [opActionReceived, setOpActionReceived] = useState(false);
  const [myDefenseResult, setMyDefenseResult] = useState<'success' | 'fail' | 'skill_hit' | null>(null);
  const [opDefenseResult, setOpDefenseResult] = useState<'success' | 'fail' | 'skill_hit' | null>(null);
  
  const [battleLog, setBattleLog] = useState<string>("");
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT);
  const [mistakes, setMistakes] = useState<PkMistake[]>([]);
  const [endReason, setEndReason] = useState<'normal' | 'surrender' | 'opponent_left' | 'timeout'>('normal');

  const timeoutFallbackRef = useRef<number | null>(null);
  const turnTimerRef = useRef<number | null>(null);

  // --- 0. Data Loading ---
  useEffect(() => {
      if (phase === 'menu' && menuTab === 'rank') {
          const loadLeaderboard = async () => {
              const data = await fetchPkLeaderboard();
              const padded = [...data];
              while(padded.length < 10) {
                  padded.push({
                      rank: padded.length + 1,
                      name: '虛位以待',
                      studentId: 'placeholder',
                      points: 0,
                      level: 0,
                      avatarColor: 'bg-gray-800',
                      avatarFrame: undefined
                  });
              }
              setLeaderboard(padded);
          };
          loadLeaderboard();
      }
  }, [phase, menuTab]);

  // --- 1. Matchmaking & Connection ---
  useEffect(() => {
      if (phase === 'matching') {
          setMatchStatus("正在掃描對手訊號...");
          joinMatchmaking(
              user,
              (op, roomId, host) => {
                  setOpponent(op);
                  setMatchStatus("配對成功！連線中...");
                  playSound('match');
                  leaveMatchmaking();
                  
                  // Join Game Room & Wait for Presence Sync
                  setPhase('connecting');
                  joinGameRoom(
                      roomId, 
                      user.studentId, // Pass userId
                      handleGameEvent,
                      () => { // On Opponent Left (Detected via Presence Drop)
                          console.log("Opponent Left via Presence");
                          handleOpponentLeft();
                      },
                      () => { // On Room Ready (Sync count >= 2)
                          console.log("Room Ready - 2 Players Present!");
                          setPhase('ready');
                          setTimeout(startRound, 2000);
                      }
                  );
              },
              (status) => setMatchStatus(status)
          );
          
          timeoutFallbackRef.current = window.setTimeout(() => {
              if (phase === 'matching') {
                  setMatchStatus("無人回應，請稍後再試");
              }
          }, 20000);
      }

      return () => {
          if (phase === 'matching' || phase === 'menu') {
              leaveMatchmaking();
              leaveGameRoom();
              if (timeoutFallbackRef.current) clearTimeout(timeoutFallbackRef.current);
          }
      };
  }, [phase]);

  const handleStartMatch = () => {
      setPhase('matching');
  };

  const handleOpponentLeft = () => {
      if (phase === 'result') return; // Already ended
      setEndReason('opponent_left');
      setOpHp(0);
      setPhase('result');
  };

  const handleSurrender = async () => {
      if (confirm("確定要投降嗎？將會扣除積分。")) {
          // Send event first
          try {
            await sendGameEvent({ type: 'SURRENDER', winnerId: opponent?.studentId });
          } catch(e) { console.error(e); }
          
          setEndReason('surrender');
          setMyHp(0);
          setPhase('result');
      }
  };

  // --- Timer Logic ---
  useEffect(() => {
      if (phase === 'selecting_attack' || phase === 'defending') {
          setTurnTimeLeft(TURN_TIME_LIMIT);
          if (turnTimerRef.current) clearInterval(turnTimerRef.current);
          
          turnTimerRef.current = window.setInterval(() => {
              setTurnTimeLeft(prev => {
                  if (prev <= 5 && prev > 0) playSound('tick');
                  if (prev <= 1) {
                      handleTurnTimeout();
                      return 0;
                  }
                  return prev - 1;
              });
          }, 1000);
      } else {
          if (turnTimerRef.current) clearInterval(turnTimerRef.current);
      }
      return () => { if (turnTimerRef.current) clearInterval(turnTimerRef.current); };
  }, [phase]);

  const handleTurnTimeout = () => {
      setBattleLog("時間到！");
      
      if (phase === 'selecting_attack') {
          // Auto play first card
          if (battleCards.length > 0) {
              handleSelectCard(battleCards[0]);
          }
      } else if (phase === 'defending') {
          // Auto fail
          if (incomingWord) {
              const damageTaken = DAMAGE_PER_HIT;
              setMyHp(prev => Math.max(0, prev - damageTaken));
              setMyDefenseResult('fail');
              sendGameEvent({
                  type: 'REPORT_RESULT',
                  defenderId: user.studentId,
                  damageTaken: damageTaken,
                  isCorrect: false
              });
              setTimeout(() => setPhase('round_summary'), 1000);
          }
      }
  };

  // --- 2. Game Logic ---

  const generateCards = (roundNum: number): BattleCard[] => {
      let minLevel = 3;
      if (roundNum >= 4) minLevel = 4;
      if (roundNum >= 7) minLevel = 5;
      if (roundNum >= 9) minLevel = 6;

      const wordPool = WORD_DATABASE.filter(w => w.level >= minLevel);
      const selectedWords = wordPool.sort(() => 0.5 - Math.random()).slice(0, 3);
      
      const cards: BattleCard[] = selectedWords.map(w => ({
          type: 'WORD',
          word: w,
          id: `word_${w.id}`
      }));

      const skills: SkillType[] = ['HEAL', 'SHIELD', 'CRIT', 'BLIND'];
      const randomSkill = skills[Math.floor(Math.random() * skills.length)];
      cards.push({
          type: 'SKILL',
          skill: randomSkill,
          id: `skill_${Date.now()}`
      });

      return cards.sort(() => 0.5 - Math.random());
  };

  const startRound = () => {
      setMyActionSent(false);
      setOpActionReceived(false);
      setIncomingWord(null);
      setIncomingSkill('NONE');
      setMyDefenseResult(null);
      setOpDefenseResult(null);
      setBlindEffect(false);
      setBattleLog(`Round ${round} / ${TOTAL_ROUNDS}`);
      
      setBattleCards(generateCards(round));
      setPhase('selecting_attack');
  };

  const handleSelectCard = (card: BattleCard) => {
      if (myActionSent) return;
      playSound('card_flip');
      setMyActionSent(true);
      
      if (card.type === 'SKILL') {
          if (card.skill === 'HEAL') {
              setMyHp(prev => Math.min(MAX_HP, prev + 150));
              setBattleLog("使用回復！HP +150");
              playSound('skill');
          } else if (card.skill === 'SHIELD') {
              setBattleLog("展開護盾！抵擋下一次攻擊");
              playSound('skill');
          } else {
              setBattleLog(`發動技能: ${card.skill}`);
              playSound('skill');
          }
          
          sendGameEvent({
              type: 'SEND_ACTION',
              attackerId: user.studentId,
              skill: card.skill
          });
      } else {
          setBattleLog(`發送攻擊：${card.word?.en}`);
          playSound('attack');
          
          // Ensure wordId is defined
          if (card.word && card.word.id) {
              sendGameEvent({
                  type: 'SEND_ACTION',
                  attackerId: user.studentId,
                  wordId: card.word.id
              });
          } else {
              console.error("Error: Selected card has no word ID");
          }
      }

      // State Transition Logic
      if (opActionReceived) {
          if (incomingWord) {
              setPhase('defending');
          } else if (incomingSkill !== 'NONE') {
              setTimeout(() => setPhase('round_summary'), 1500);
          } else {
              setPhase('waiting_opponent');
          }
      } else {
          setPhase('waiting_opponent');
      }
  };

  const handleDefend = (selectedZh: string) => {
      if (!incomingWord) return;
      
      const isCorrect = selectedZh === incomingWord.zh;
      let damageTaken = 0;

      if (isCorrect) {
          playSound('block');
          setBattleLog("防禦成功！");
          setMyDefenseResult('success');
      } else {
          damageTaken = DAMAGE_PER_HIT;
          if (incomingSkill === 'CRIT') damageTaken = Math.floor(damageTaken * 1.5);
          
          setMyHp(prev => Math.max(0, prev - damageTaken));
          playSound('damage');
          setBattleLog("防禦失敗！");
          setMyDefenseResult('fail');
          
          setMistakes(prev => [...prev, {
              word: incomingWord!,
              correctAnswer: incomingWord!.zh,
              timestamp: Date.now()
          }]);
      }

      sendGameEvent({
          type: 'REPORT_RESULT',
          defenderId: user.studentId,
          damageTaken: damageTaken,
          isCorrect: isCorrect
      });

      setTimeout(() => setPhase('round_summary'), 1000);
  };

  // --- 3. Event Handling ---
  const handleGameEvent = (payload: PkGamePayload) => {
      console.log("Game Event Received:", payload);

      if (payload.type === 'SURRENDER') {
          if (payload.winnerId === user.studentId) {
              setEndReason('opponent_left');
              setOpHp(0);
              setPhase('result');
          }
          return;
      }

      if (payload.type === 'OPPONENT_LEFT') {
          handleOpponentLeft();
          return;
      }

      if (payload.type === 'SEND_ACTION') {
          if (payload.attackerId !== user.studentId) {
              setOpActionReceived(true);
              
              if (payload.skill) {
                  setIncomingSkill(payload.skill);
                  if (payload.skill === 'BLIND') {
                      setBlindEffect(true);
                      setBattleLog("對手使用了閃光彈！");
                  }
                  if (payload.skill === 'HEAL') {
                      setOpHp(prev => Math.min(MAX_HP, prev + 150));
                  }
                  
                  setPhase(prev => {
                      if (prev === 'waiting_opponent') {
                          setTimeout(() => setPhase('round_summary'), 1500);
                          return prev; 
                      }
                      return prev;
                  });

              } else if (payload.wordId) {
                  const word = WORD_DATABASE.find(w => w.id === payload.wordId);
                  if (word) {
                      console.log("Opponent attacked with:", word.en);
                      setIncomingWord(word);
                      const wrongs = WORD_DATABASE
                        .filter(w => w.id !== word.id)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 3)
                        .map(w => w.zh);
                      const opts = [word.zh, ...wrongs].sort(() => 0.5 - Math.random());
                      setDefenseOptions(opts);

                      setPhase(prev => {
                          if (prev === 'waiting_opponent') return 'defending';
                          return prev;
                      });
                  } else {
                      console.error("Unknown word ID received:", payload.wordId);
                  }
              }
          }
      } 
      else if (payload.type === 'REPORT_RESULT') {
          if (payload.defenderId !== user.studentId) {
              const damage = payload.damageTaken || 0;
              setOpHp(prev => Math.max(0, prev - damage));
              setOpDefenseResult(damage === 0 ? 'success' : 'fail');
              
              setPhase(prev => {
                  if (prev === 'waiting_opponent') return 'round_summary';
                  return prev;
              });
          }
      }
  };

  useEffect(() => {
      if (phase === 'round_summary') {
           const timer = setTimeout(nextRoundOrEnd, 3000);
           return () => clearTimeout(timer);
      }
  }, [phase]);

  const nextRoundOrEnd = () => {
      if (myHp <= 0 || opHp <= 0 || round >= TOTAL_ROUNDS) {
          let win = false;
          if (myHp > 0 && opHp <= 0) win = true;
          else if (myHp > 0 && opHp > 0 && myHp > opHp) win = true;
          else if (myHp === opHp) win = true; 
          
          playSound(win ? 'win' : 'lose');
          setPhase('result');
          
          let score = win ? 100 : 20;
          score += Math.floor(myHp / 10);
          const ratingChange = win ? 25 : -10;
          
          onFinish({ 
              isWin: win, 
              score: score, 
              ratingChange: ratingChange,
              opponentName: opponent?.name || '',
              mistakes: mistakes
          });
      } else {
          setRound(prev => prev + 1);
          startRound();
      }
  };

  // --- RENDER: Menu Phase ---
  if (phase === 'menu') {
      return (
          <div className="fixed inset-0 z-[60] flex flex-col bg-gray-900 text-white overflow-hidden">
              {showRankModal && <RankOverviewModal onClose={() => setShowRankModal(false)} />}
              
              {/* Header */}
              <div className="p-4 pt-safe flex justify-between items-center bg-gray-900 border-b border-gray-800 z-10">
                  <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
                      <ArrowLeft size={24} className="text-gray-400" />
                  </button>
                  <div className="flex gap-2 items-center">
                        <div className="px-3 py-1.5 rounded-full bg-gray-800 border border-gray-700 flex items-center gap-2">
                            <Swords size={16} className="text-rose-500" />
                            <span className="text-sm font-bold text-gray-200">PK Battle</span>
                        </div>
                  </div>
                  <div className="w-8"></div>
              </div>

              {/* Tab Navigation */}
              <div className="p-4 pb-0 bg-gray-900">
                  <div className="flex bg-gray-800 p-1 rounded-xl border border-gray-700">
                      <button onClick={() => setMenuTab('lobby')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${menuTab === 'lobby' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>大廳</button>
                      <button onClick={() => setMenuTab('rank')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${menuTab === 'rank' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>排行榜</button>
                      <button onClick={() => setMenuTab('help')} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${menuTab === 'help' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>說明</button>
                  </div>
              </div>

              <div className="flex-1 p-6 flex flex-col items-center justify-center relative">
                  {/* Background Decor */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-rose-900/20 rounded-full blur-3xl"></div>
                      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-indigo-900/20 rounded-full blur-3xl"></div>
                  </div>

                  {menuTab === 'lobby' && (
                      <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-300 z-10">
                          <div className="relative w-28 h-28 mb-6">
                              <div className="absolute inset-0 bg-rose-500 rounded-full blur-xl opacity-30 animate-pulse"></div>
                              <div className={`relative w-full h-full rounded-full ${user.avatarColor} ring-4 ring-gray-800 flex items-center justify-center overflow-hidden shadow-2xl ${getFrameStyle(user.avatarFrame)}`}>
                                  {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : <UserIcon size={50}/>}
                              </div>
                              <button 
                                onClick={() => setShowRankModal(true)}
                                className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border bg-gray-900 text-[10px] font-bold whitespace-nowrap flex items-center gap-1 ${myRank.color}`}
                              >
                                  <Crown size={10} /> {myRank.name}
                              </button>
                          </div>
                          
                          <div className="text-center mb-8">
                              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">知識對決</h2>
                              <p className="text-gray-400 text-xs font-medium px-4 leading-relaxed">
                                  實時匹配 • 策略卡牌 • 積分排位<br/>
                                  展現你的詞彙量與戰術智慧
                              </p>
                          </div>

                          <button 
                              onClick={handleStartMatch}
                              className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl font-black text-lg shadow-lg shadow-rose-900/50 flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10"
                          >
                              <Swords size={20} /> 開始配對
                          </button>
                      </div>
                  )}

                  {menuTab === 'rank' && (
                      <div className="w-full h-full flex flex-col animate-in slide-in-from-right z-10">
                          <div className="flex justify-between items-center mb-4 px-2">
                              <h3 className="font-bold text-gray-300 flex items-center gap-2">
                                  <Trophy size={16} className="text-yellow-500" /> 賽季排行
                              </h3>
                              <button onClick={() => setShowRankModal(true)} className="text-xs text-gray-500 hover:text-gray-300 flex items-center gap-1">
                                  <Info size={12} /> 段位說明
                              </button>
                          </div>
                          <div className="flex-1 overflow-y-auto space-y-2 pr-2 pb-20">
                              {leaderboard.map((entry, idx) => {
                                  const isPlaceholder = entry.studentId === 'placeholder';
                                  return (
                                    <div key={idx} className={`p-3 rounded-xl flex items-center border ${isPlaceholder ? 'bg-gray-800/30 border-dashed border-gray-800' : 'bg-gray-800 border-gray-700'}`}>
                                        <div className={`w-8 text-center font-black text-lg ${idx < 3 ? 'text-yellow-500' : 'text-gray-600'}`}>{entry.rank}</div>
                                        
                                        {isPlaceholder ? (
                                            <div className="flex-1 flex items-center gap-3 opacity-50">
                                                <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center">
                                                    <UserIcon size={16} className="text-gray-600" />
                                                </div>
                                                <div className="text-sm text-gray-500 font-bold">虛位以待...</div>
                                            </div>
                                        ) : (
                                            <>
                                                <div className={`w-10 h-10 rounded-full mx-3 ${entry.avatarColor} flex items-center justify-center font-bold text-xs overflow-hidden ${getFrameStyle(entry.avatarFrame)}`}>
                                                    {entry.avatarImage ? <img src={entry.avatarImage} className="w-full h-full object-cover"/> : entry.name[0]}
                                                </div>
                                                <div className="flex-1">
                                                    <span className="font-bold text-gray-200 block text-sm">{entry.name}</span>
                                                    <span className="text-[10px] text-gray-500">{getRank(entry.points).name}</span>
                                                </div>
                                                <div className="font-mono font-bold text-rose-400 text-sm">{entry.points}</div>
                                            </>
                                        )}
                                    </div>
                                  );
                              })}
                          </div>
                      </div>
                  )}

                  {menuTab === 'help' && (
                      <div className="w-full h-full overflow-y-auto animate-in slide-in-from-right space-y-4 text-gray-300 text-sm z-10 pb-20">
                          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                              <h4 className="text-white font-bold mb-3 flex items-center gap-2"><Zap size={16} className="text-yellow-400"/> 核心玩法</h4>
                              <p className="leading-relaxed text-xs text-gray-400">
                                  雙方每回合獲得 3 張單字卡與 1 張技能卡。<br/>
                                  選擇 <span className="text-white font-bold">單字卡</span> 進行攻擊，對手需在時限內選出正確中文解釋進行防禦。<br/>
                                  選擇 <span className="text-white font-bold">技能卡</span> 發動特殊效果，無須進行防禦判定。
                              </p>
                          </div>
                          <div className="bg-gray-800 p-5 rounded-2xl border border-gray-700">
                              <h4 className="text-white font-bold mb-3 flex items-center gap-2"><Shield size={16} className="text-blue-400"/> 技能說明</h4>
                              <ul className="space-y-3 text-xs">
                                  <li className="flex gap-3">
                                      <span className="text-green-400 font-black bg-green-900/30 px-2 py-0.5 rounded">HEAL</span>
                                      <span className="text-gray-400">回復 150 點生命值。</span>
                                  </li>
                                  <li className="flex gap-3">
                                      <span className="text-blue-400 font-black bg-blue-900/30 px-2 py-0.5 rounded">SHIELD</span>
                                      <span className="text-gray-400">展開護盾，抵擋下一次受到的傷害。</span>
                                  </li>
                                  <li className="flex gap-3">
                                      <span className="text-yellow-400 font-black bg-yellow-900/30 px-2 py-0.5 rounded">CRIT</span>
                                      <span className="text-gray-400">下次攻擊造成 1.5 倍傷害。</span>
                                  </li>
                                  <li className="flex gap-3">
                                      <span className="text-purple-400 font-black bg-purple-900/30 px-2 py-0.5 rounded">BLIND</span>
                                      <span className="text-gray-400">干擾對手視線 (遮蔽螢幕)。</span>
                                  </li>
                              </ul>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- RENDER: Matching/Connecting Phase ---
  if (phase === 'matching' || phase === 'connecting') {
      return (
        <div className="fixed inset-0 z-[60] bg-gray-900 flex flex-col items-center justify-center">
            <div className="relative w-64 h-64 flex items-center justify-center">
                <div className="absolute inset-0 border border-rose-500/20 rounded-full animate-ping" style={{ animationDuration: '2s' }}></div>
                <div className="absolute inset-10 border border-rose-500/40 rounded-full animate-ping" style={{ animationDuration: '2s', animationDelay: '0.5s' }}></div>
                <div className="relative z-10 w-24 h-24 rounded-full bg-gray-800 border-2 border-rose-500/50 flex items-center justify-center overflow-hidden shadow-[0_0_30px_rgba(225,29,72,0.3)]">
                    {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : <UserIcon size={40} className="text-gray-500"/>}
                </div>
            </div>
            
            <div className="mt-8 text-center">
                 <h2 className="text-xl font-bold text-white animate-pulse tracking-widest mb-2">
                     {phase === 'connecting' ? '建立戰場連線中...' : matchStatus}
                 </h2>
                 <div className="text-xs text-gray-500 font-mono">Matching Protocol v2.1</div>
            </div>
            
            {phase === 'matching' && (
                <button onClick={onBack} className="absolute top-safe left-4 p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white mt-4">
                    <ArrowLeft size={20}/>
                </button>
            )}
        </div>
      );
  }

  // --- RENDER: Result Phase ---
  if (phase === 'result') {
      const isWin = myHp > opHp;
      return (
        <div className="fixed inset-0 z-[60] bg-gray-900 flex flex-col items-center justify-center p-6 overflow-y-auto">
             <div className={`absolute inset-0 opacity-20 ${isWin ? 'bg-gradient-to-t from-yellow-600 to-black' : 'bg-gradient-to-t from-red-900 to-black'}`}></div>
             
             <div className="relative z-10 text-center animate-in zoom-in duration-500 w-full max-w-md pt-10 pb-10">
                 {isWin ? (
                     <div className="mb-6">
                         <Crown size={80} className="text-yellow-400 mx-auto mb-4 drop-shadow-[0_0_20px_rgba(250,204,21,0.5)] animate-bounce" />
                         <h1 className="text-5xl font-black text-white mb-2 tracking-tighter">VICTORY</h1>
                         <p className="text-yellow-500 text-sm font-bold tracking-widest uppercase">
                             {endReason === 'opponent_left' ? '對手已離開' : 'Dominating Performance'}
                         </p>
                     </div>
                 ) : (
                     <div className="mb-6">
                         <Skull size={80} className="text-gray-600 mx-auto mb-4" />
                         <h1 className="text-5xl font-black text-gray-400 mb-2 tracking-tighter">DEFEAT</h1>
                         <p className="text-gray-600 text-sm font-bold tracking-widest uppercase">
                             {endReason === 'surrender' ? '您已投降' : 'Mission Failed'}
                         </p>
                     </div>
                 )}

                 <div className="bg-gray-800/50 backdrop-blur-md border border-gray-700 rounded-3xl p-6 mb-6">
                     <div className="flex justify-between items-center">
                         <div className="text-center">
                             <div className="w-14 h-14 rounded-full bg-gray-700 mx-auto mb-2 overflow-hidden border-2 border-gray-600">
                                 {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                             </div>
                             <div className="text-lg font-bold text-white">{myHp}</div>
                         </div>
                         <div className="text-2xl font-black text-gray-600">VS</div>
                         <div className="text-center">
                             <div className="w-14 h-14 rounded-full bg-gray-700 mx-auto mb-2 overflow-hidden border-2 border-gray-600 opacity-80">
                                 {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : (opponent?.name[0] || '?')}
                             </div>
                             <div className="text-lg font-bold text-gray-400">{opHp}</div>
                         </div>
                     </div>
                     
                     <div className="border-t border-gray-700 mt-4 pt-4 flex justify-between text-sm">
                         <span className="text-gray-400 font-bold">積分變動</span>
                         <span className={`font-mono font-black ${isWin ? "text-green-400" : "text-red-400"}`}>
                             {isWin ? "+25" : "-10"}
                         </span>
                     </div>
                 </div>

                 {mistakes.length > 0 && (
                     <div className="bg-gray-800/50 backdrop-blur-md border border-red-500/30 rounded-3xl p-4 mb-6 text-left">
                         <h4 className="text-red-400 font-bold text-sm mb-3 flex items-center gap-2">
                             <AlertTriangle size={16} /> 錯誤複習
                         </h4>
                         <div className="space-y-2 max-h-40 overflow-y-auto pr-2">
                             {mistakes.map((m, idx) => (
                                 <div key={idx} className="text-xs bg-black/30 p-2 rounded flex justify-between items-center">
                                     <span className="text-white font-bold">{m.word.en}</span>
                                     <span className="text-gray-400">{m.word.zh}</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                 )}
                 
                 <button 
                    onClick={() => onFinish({ isWin, score: 0, ratingChange: 0, opponentName: '' })} 
                    className="w-full py-4 bg-white text-black rounded-2xl font-black text-lg hover:scale-[1.02] transition-transform"
                 >
                     返回大廳
                 </button>
             </div>
        </div>
      );
  }

  // --- RENDER: Playing Phase ---
  return (
      <div className="fixed inset-0 z-[60] bg-gray-900 flex flex-col overflow-hidden font-sans">
          
          {/* Top Bar: Opponent */}
          <div className="bg-gray-800/90 p-4 pt-safe flex items-center gap-4 border-b border-gray-700 shadow-lg z-20 relative">
              <button onClick={handleSurrender} className="absolute top-safe right-4 z-30 text-gray-500 hover:text-red-500">
                  <Flag size={18} />
              </button>

              <div className={`relative w-12 h-12 rounded-full ${opponent?.avatarColor} flex-shrink-0 overflow-hidden border-2 border-rose-500/50`}>
                  {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : (opponent?.name[0] || '?')}
                  {opDefenseResult === 'fail' && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center font-black text-white text-xs animate-ping">HIT</div>}
              </div>
              <div className="flex-1 min-w-0 pr-8">
                  <div className="flex justify-between items-end mb-1.5">
                      <span className="font-bold text-gray-200 text-sm truncate">{opponent?.name}</span>
                      <span className="text-xs font-mono text-rose-400">{opHp} HP</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${(opHp / MAX_HP) * 100}%` }}></div>
                  </div>
              </div>
          </div>

          {/* Battle Arena */}
          <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-gray-900 opacity-90"></div>
              
              {/* Center Info */}
              <div className="absolute top-6 w-full text-center z-10">
                  <div className="inline-block bg-black/60 backdrop-blur px-4 py-1 rounded-full border border-white/10 text-xs font-mono text-gray-400 tracking-widest">
                      ROUND {round} / {TOTAL_ROUNDS}
                  </div>
                  
                  {/* Turn Timer */}
                  {(phase === 'selecting_attack' || phase === 'defending') && (
                      <div className="mt-2 flex justify-center">
                          <div className={`flex items-center gap-1 px-3 py-1 rounded text-xs font-bold ${turnTimeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-400'}`}>
                              <Timer size={12} /> {turnTimeLeft}s
                          </div>
                      </div>
                  )}

                  <div className="mt-2 h-8">
                      <p className="text-yellow-400 font-bold text-sm animate-pulse drop-shadow-md">{battleLog}</p>
                  </div>
              </div>

              {/* Game Content Area */}
              <div className="flex-1 flex flex-col items-center justify-center p-6 z-10">
                  
                  {phase === 'ready' && <h1 className="text-7xl font-black text-white italic tracking-tighter animate-bounce">FIGHT</h1>}

                  {/* Attack Phase: Cards */}
                  {phase === 'selecting_attack' && (
                      <div className="w-full max-w-sm grid grid-cols-2 gap-3 animate-in slide-in-from-bottom duration-300">
                          {battleCards.map((card) => (
                              <button 
                                key={card.id}
                                onClick={() => handleSelectCard(card)}
                                className={`
                                    relative h-36 rounded-2xl p-3 flex flex-col justify-center items-center text-center border-b-4 active:border-b-0 active:translate-y-1 transition-all
                                    ${card.type === 'SKILL' 
                                        ? 'bg-gradient-to-br from-violet-600 to-indigo-700 border-indigo-900 shadow-indigo-500/20' 
                                        : 'bg-gray-800 border-gray-950 hover:bg-gray-700 shadow-black/40'
                                    }
                                    shadow-lg
                                `}
                              >
                                  {card.type === 'SKILL' ? (
                                      <>
                                        <div className="bg-white/10 p-2 rounded-full mb-2">
                                            <Zap size={24} className="text-yellow-300" />
                                        </div>
                                        <span className="font-black text-white text-lg tracking-wide">{card.skill}</span>
                                        <span className="text-[10px] text-indigo-200 mt-1 font-medium">SKILL CARD</span>
                                      </>
                                  ) : (
                                      <>
                                        <span className="font-black text-white text-xl mb-2 leading-tight">{card.word?.en}</span>
                                        <span className="text-xs text-gray-400 bg-black/30 px-2 py-1 rounded">{card.word?.zh}</span>
                                        <div className="absolute top-2 right-2 text-[10px] font-bold text-gray-600">Lv.{card.word?.level}</div>
                                      </>
                                  )}
                              </button>
                          ))}
                      </div>
                  )}

                  {/* Defend Phase */}
                  {phase === 'defending' && (incomingWord || incomingSkill !== 'NONE') && (
                      <div className="w-full max-w-sm animate-in zoom-in duration-200 relative">
                          {blindEffect && (
                              <div className="absolute -inset-10 bg-white/95 z-20 flex items-center justify-center flex-col">
                                  <EyeOff size={64} className="text-gray-900 mb-4" />
                                  <span className="text-gray-900 font-black text-2xl">BLINDED</span>
                              </div>
                          )}

                          {incomingSkill !== 'NONE' ? (
                              <div className="text-center py-10">
                                  <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-ping">
                                      <Zap size={40} className="text-yellow-400" />
                                  </div>
                                  <h2 className="text-xl font-bold text-white">對手使用了技能！</h2>
                              </div>
                          ) : (
                              <>
                                <div className="bg-rose-600 text-white p-6 rounded-2xl text-center mb-6 shadow-[0_0_30px_rgba(225,29,72,0.4)] border border-rose-400/50">
                                    <div className="text-[10px] font-bold opacity-80 mb-2 tracking-widest uppercase">Incoming Attack</div>
                                    <h2 className="text-4xl font-black tracking-tight">{incomingWord?.en}</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-3">
                                    {defenseOptions.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleDefend(opt)}
                                            className="bg-white text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-100 active:scale-95 transition-all shadow-lg text-lg"
                                        >
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                              </>
                          )}
                      </div>
                  )}

                  {phase === 'waiting_opponent' && (
                      <div className="text-center">
                          <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4"></div>
                          <h2 className="text-lg font-bold text-gray-300">等待對手行動...</h2>
                      </div>
                  )}

                  {phase === 'round_summary' && (
                      <div className="bg-gray-800/95 backdrop-blur border border-gray-600 p-8 rounded-3xl text-center animate-in zoom-in shadow-2xl w-full max-w-xs">
                          <h2 className="text-xl font-bold mb-6 text-white flex items-center justify-center gap-2">
                              <Swords size={20} /> 回合結算
                          </h2>
                          <div className="space-y-4">
                              <div className="bg-gray-900/50 p-3 rounded-xl flex justify-between items-center">
                                  <span className="text-gray-400 text-sm">進攻結果</span>
                                  <span className={`font-black text-lg ${opDefenseResult === 'fail' ? 'text-green-400' : 'text-gray-500'}`}>
                                      {opDefenseResult === 'fail' ? 'HIT' : 'BLOCKED'}
                                  </span>
                              </div>
                              <div className="bg-gray-900/50 p-3 rounded-xl flex justify-between items-center">
                                  <span className="text-gray-400 text-sm">防禦結果</span>
                                  <span className={`font-black text-lg ${myDefenseResult === 'success' ? 'text-blue-400' : 'text-red-500'}`}>
                                      {myDefenseResult === 'success' ? 'PERFECT' : myDefenseResult === 'skill_hit' ? 'SKILL' : 'FAIL'}
                                  </span>
                              </div>
                          </div>
                      </div>
                  )}
              </div>
          </div>

          {/* Bottom Bar: Me */}
          <div className="bg-gray-800/90 p-4 pb-8 flex items-center gap-4 border-t border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20">
              <div className="flex-1 min-w-0 text-right">
                  <div className="flex justify-end items-end mb-1.5 gap-2">
                      <span className="text-xs font-mono text-blue-400">{myHp}/{MAX_HP}</span>
                      <span className="font-bold text-blue-400 text-sm">YOU</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: `${(myHp / MAX_HP) * 100}%` }}></div>
                  </div>
              </div>
              <div className={`relative w-14 h-14 rounded-full ${user.avatarColor} flex-shrink-0 overflow-hidden border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.4)]`}>
                  {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                  {myDefenseResult === 'fail' && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center font-black text-white text-xs animate-ping">HIT</div>}
              </div>
          </div>
      </div>
  );
};
