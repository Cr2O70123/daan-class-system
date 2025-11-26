
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, Shield, Swords, Skull, Crown, User as UserIcon, Loader2, Send, Heart, EyeOff, BookOpen, BarChart, Trophy } from 'lucide-react';
import { User, PkResult, Word, PkPlayerState, PkGamePayload, BattleCard, SkillType, LeaderboardEntry } from '../types';
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
    { name: '青銅', color: 'text-orange-700 border-orange-700', min: 0 },
    { name: '白銀', color: 'text-gray-400 border-gray-400', min: 1000 },
    { name: '黃金', color: 'text-yellow-500 border-yellow-500', min: 2000 },
    { name: '白金', color: 'text-cyan-400 border-cyan-400', min: 3000 },
    { name: '鑽石', color: 'text-blue-500 border-blue-500', min: 4000 },
    { name: '星耀', color: 'text-purple-500 border-purple-500', min: 5000 },
    { name: '傳說', color: 'text-rose-500 border-rose-500', min: 6000 },
];

const getRank = (points: number) => {
    return [...RANKS].reverse().find(r => points >= r.min) || RANKS[0];
};

// Helper for frame styles
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

// --- Sound Logic ---
const playSound = (type: 'match' | 'attack' | 'damage' | 'win' | 'lose' | 'skill' | 'block' | 'card_flip') => {
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
      case 'card_flip':
        osc.frequency.setValueAtTime(1000, now);
        gain.gain.setValueAtTime(0.02, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'skill':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.4);
        osc.start(now);
        osc.stop(now + 0.4);
        break;
      case 'attack':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.1);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      case 'block': 
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

// --- Constants ---
const MAX_HP = 1000;
const DAMAGE_PER_HIT = 150; 
const TOTAL_ROUNDS = 10;

type BattlePhase = 'menu' | 'matching' | 'ready' | 'selecting_attack' | 'waiting_opponent' | 'defending' | 'round_summary' | 'result';

export const PkGameScreen: React.FC<PkGameScreenProps> = ({ user, onBack, onFinish }) => {
  const [phase, setPhase] = useState<BattlePhase>('menu');
  const [menuTab, setMenuTab] = useState<'lobby' | 'rank' | 'help'>('lobby');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [matchStatus, setMatchStatus] = useState("正在掃描對手訊號...");
  
  // Players
  const [opponent, setOpponent] = useState<PkPlayerState | null>(null);
  
  // Stats
  const [myHp, setMyHp] = useState(MAX_HP);
  const [opHp, setOpHp] = useState(MAX_HP);
  const [round, setRound] = useState(1);
  const myRating = user.pkRating || 0;
  const myRank = getRank(myRating);
  
  // Round Data
  const [battleCards, setBattleCards] = useState<BattleCard[]>([]); 
  const [incomingWord, setIncomingWord] = useState<Word | null>(null); 
  const [incomingSkill, setIncomingSkill] = useState<SkillType>('NONE'); 
  const [defenseOptions, setDefenseOptions] = useState<string[]>([]); 
  const [blindEffect, setBlindEffect] = useState(false); 
  
  // Round State
  const [myActionSent, setMyActionSent] = useState(false);
  const [opActionReceived, setOpActionReceived] = useState(false);
  const [myDefenseResult, setMyDefenseResult] = useState<'success' | 'fail' | 'skill_hit' | null>(null);
  const [opDefenseResult, setOpDefenseResult] = useState<'success' | 'fail' | 'skill_hit' | null>(null);
  
  const [battleLog, setBattleLog] = useState<string>("");
  const timeoutFallbackRef = useRef<number | null>(null);

  // --- 0. Data Loading (Leaderboard) ---
  useEffect(() => {
      if (phase === 'menu' && menuTab === 'rank') {
          const loadLeaderboard = async () => {
              const data = await fetchPkLeaderboard();
              setLeaderboard(data);
          };
          loadLeaderboard();
      }
  }, [phase, menuTab]);

  // --- 1. Matchmaking Lifecycle ---
  useEffect(() => {
      if (phase === 'matching') {
          setMatchStatus("正在掃描對手訊號...");
          joinMatchmaking(
              user,
              (op, roomId, host) => {
                  setOpponent(op);
                  setMatchStatus("配對成功！連線建立中...");
                  playSound('match');
                  leaveMatchmaking();
                  joinGameRoom(roomId, handleGameEvent);

                  setTimeout(() => {
                      setPhase('ready');
                      setTimeout(startRound, 2500);
                  }, 1500);
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
          if (phase === 'matching') {
              leaveMatchmaking();
              leaveGameRoom();
              if (timeoutFallbackRef.current) clearTimeout(timeoutFallbackRef.current);
          }
      };
  }, [phase]);

  const handleStartMatch = () => {
      setPhase('matching');
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
          }
          
          sendGameEvent({
              type: 'SEND_ACTION',
              attackerId: user.studentId,
              skill: card.skill
          });
      } else {
          setBattleLog(`發送攻擊：${card.word?.en}`);
          playSound('attack');
          sendGameEvent({
              type: 'SEND_ACTION',
              attackerId: user.studentId,
              wordId: card.word?.id
          });
      }

      if (opActionReceived) {
          setPhase('defending');
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
      }

      sendGameEvent({
          type: 'REPORT_RESULT',
          defenderId: user.studentId,
          damageTaken: damageTaken,
          isCorrect: isCorrect
      });

      checkRoundEnd();
  };

  const checkRoundEnd = () => {
      // Handled via event listener
  };

  // --- 3. Event Handling ---
  const handleGameEvent = (payload: PkGamePayload) => {
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
                          setTimeout(() => setPhase('round_summary'), 1000); 
                          return prev; 
                      }
                      return prev;
                  });

              } else if (payload.wordId) {
                  const word = WORD_DATABASE.find(w => w.id === payload.wordId);
                  if (word) {
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
                  }
              }
          }
      } 
      else if (payload.type === 'REPORT_RESULT') {
          if (payload.defenderId !== user.studentId) {
              const damage = payload.damageTaken || 0;
              setOpHp(prev => Math.max(0, prev - damage));
              setOpDefenseResult(damage === 0 ? 'success' : 'fail');
          }
      }
  };

  useEffect(() => {
      if (phase === 'defending' && myDefenseResult) {
           setPhase('round_summary');
      }
      if (phase === 'round_summary') {
           const timer = setTimeout(nextRoundOrEnd, 3000);
           return () => clearTimeout(timer);
      }
  }, [phase, myDefenseResult]);

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
              opponentName: opponent?.name || '' 
          });
      } else {
          setRound(prev => prev + 1);
          startRound();
      }
  };

  // --- RENDER: Menu Phase ---
  if (phase === 'menu') {
      return (
          <div className="fixed inset-0 z-50 flex flex-col bg-gray-900 text-white overflow-hidden transition-colors">
              {/* Header */}
              <div className="p-4 pt-safe flex justify-between items-center bg-gray-800 shadow-md z-10">
                  <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-700 rounded-full transition-colors">
                      <ArrowLeft size={24} className="text-gray-300" />
                  </button>
                  <div className="flex gap-2 items-center">
                        <div className="bg-black/30 px-3 py-1.5 rounded-full border border-gray-700 flex items-center gap-1">
                            <Swords size={14} className="text-rose-500" />
                            <span className="text-xs font-bold text-gray-300">PK Battle</span>
                        </div>
                  </div>
              </div>

              {/* Tab Navigation */}
              <div className="p-4 pb-0">
                  <div className="flex bg-gray-800 p-1 rounded-xl">
                      <button onClick={() => setMenuTab('lobby')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${menuTab === 'lobby' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>大廳</button>
                      <button onClick={() => setMenuTab('rank')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${menuTab === 'rank' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>排行榜</button>
                      <button onClick={() => setMenuTab('help')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${menuTab === 'help' ? 'bg-rose-600 text-white shadow-lg' : 'text-gray-400 hover:text-white'}`}>說明</button>
                  </div>
              </div>

              <div className="flex-1 p-6 flex flex-col items-center justify-center">
                  {menuTab === 'lobby' && (
                      <div className="w-full max-w-sm flex flex-col items-center animate-in fade-in zoom-in duration-300">
                          <div className="relative w-32 h-32 mb-6">
                              <div className="absolute inset-0 bg-rose-500 rounded-full blur-2xl opacity-40 animate-pulse"></div>
                              <div className={`relative w-full h-full rounded-full ${user.avatarColor} border-4 border-white flex items-center justify-center overflow-hidden shadow-2xl`}>
                                  {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : <UserIcon size={60}/>}
                              </div>
                              <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border bg-gray-900 text-xs font-bold whitespace-nowrap ${myRank.color}`}>
                                  {myRank.name} ({user.pkRating || 0})
                              </div>
                          </div>
                          
                          <h2 className="text-3xl font-black text-white mb-2">知識對決</h2>
                          <p className="text-gray-400 text-sm mb-8 text-center">
                              即時配對，即時攻防。<br/>用你的英文單字量擊敗對手！
                          </p>

                          <button 
                              onClick={handleStartMatch}
                              className="w-full py-4 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl font-black text-xl shadow-[0_0_30px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2 transition-transform active:scale-95 border-b-4 border-rose-900"
                          >
                              <Swords size={24} /> 開始配對
                          </button>
                      </div>
                  )}

                  {menuTab === 'rank' && (
                      <div className="w-full h-full flex flex-col animate-in slide-in-from-right">
                          <h3 className="text-center font-bold text-gray-300 mb-4 flex items-center justify-center gap-2">
                              <Trophy size={18} className="text-yellow-500" /> 全服強者
                          </h3>
                          <div className="flex-1 overflow-y-auto space-y-3 pr-2">
                              {leaderboard.map((entry, idx) => (
                                  <div key={idx} className="bg-gray-800 p-3 rounded-xl flex items-center border border-gray-700">
                                      <div className={`w-8 text-center font-black text-lg ${idx < 3 ? 'text-yellow-500' : 'text-gray-500'}`}>{entry.rank}</div>
                                      <div className={`w-10 h-10 rounded-full mx-3 ${entry.avatarColor} flex items-center justify-center font-bold text-xs overflow-hidden ${getFrameStyle(entry.avatarFrame)}`}>
                                          {entry.name[0]}
                                      </div>
                                      <div className="flex-1">
                                          <span className="font-bold text-white block">{entry.name}</span>
                                          <span className="text-xs text-gray-500">{getRank(entry.points).name}</span>
                                      </div>
                                      <div className="font-mono font-bold text-rose-400">{entry.points}</div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}

                  {menuTab === 'help' && (
                      <div className="w-full h-full overflow-y-auto animate-in slide-in-from-right space-y-4 text-gray-300 text-sm">
                          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                              <h4 className="text-rose-400 font-bold mb-2 flex items-center gap-2"><Zap size={16}/> 遊戲規則</h4>
                              <p>1. 遊戲採回和制，共 10 回合。</p>
                              <p>2. 每回合你可以選擇「發動單字攻擊」或「使用技能」。</p>
                              <p>3. 攻擊方發送單字後，防守方需在 4 個選項中選出正確中文。</p>
                              <p>4. 防守失敗扣除 150 HP，成功則無傷。</p>
                          </div>
                          <div className="bg-gray-800 p-4 rounded-xl border border-gray-700">
                              <h4 className="text-blue-400 font-bold mb-2 flex items-center gap-2"><Shield size={16}/> 技能卡牌</h4>
                              <ul className="space-y-2">
                                  <li><span className="text-green-400 font-bold">HEAL</span>: 回復 150 HP。</li>
                                  <li><span className="text-blue-400 font-bold">SHIELD</span>: 下一次受到的傷害無效。</li>
                                  <li><span className="text-yellow-400 font-bold">CRIT</span>: 下一次攻擊造成 1.5 倍傷害。</li>
                                  <li><span className="text-purple-400 font-bold">BLIND</span>: 遮蔽對手視線。</li>
                              </ul>
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // --- RENDER: Matching Phase ---
  if (phase === 'matching') {
      return (
        <div className="flex-1 flex flex-col items-center justify-center space-y-10 bg-gray-900 text-white h-screen relative overflow-hidden">
            {/* Radar Animation */}
            <div className="relative flex items-center justify-center">
                <div className="absolute w-[500px] h-[500px] border border-blue-500/20 rounded-full animate-[ping_3s_linear_infinite]"></div>
                <div className="absolute w-[350px] h-[350px] border border-blue-500/40 rounded-full animate-[ping_3s_linear_infinite_1s]"></div>
                <div className="w-48 h-48 rounded-full border-2 border-blue-400/50 relative bg-gray-900/50 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.3)]">
                    <div className="absolute inset-0 rounded-full border-t-2 border-blue-400 animate-[spin_2s_linear_infinite]"></div>
                    <div className={`w-24 h-24 rounded-full ${user.avatarColor} flex items-center justify-center border-4 border-white overflow-hidden z-10`}>
                         {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : <UserIcon size={40} />}
                    </div>
                </div>
            </div>
            
            <div className="text-center z-10">
                 <h2 className="text-2xl font-bold animate-pulse tracking-widest mb-2">{matchStatus}</h2>
                 <div className={`inline-block px-4 py-1 rounded-full border ${myRank.color} bg-black/30 text-sm font-bold`}>
                     當前段位：{myRank.name} ({user.pkRating || 0})
                 </div>
            </div>
            
            <button onClick={onBack} className="absolute top-10 left-4 p-2 bg-white/10 rounded-full hover:bg-white/20"><ArrowLeft size={24}/></button>
        </div>
      );
  }

  // --- RENDER: Result Phase ---
  if (phase === 'result') {
      const isWin = myHp > opHp;
      return (
        <div className="flex-1 flex flex-col items-center justify-center bg-gray-900 text-white p-6 h-screen relative overflow-hidden">
             <div className={`absolute inset-0 opacity-30 ${isWin ? 'bg-gradient-to-t from-yellow-600 to-black' : 'bg-gradient-to-t from-red-900 to-black'}`}></div>
             
             <div className="relative z-10 text-center animate-in zoom-in duration-500">
                 {isWin ? (
                     <div>
                         <Crown size={100} className="text-yellow-400 mx-auto mb-6 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)] animate-bounce" />
                         <h1 className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-300 to-yellow-600 mb-2">VICTORY</h1>
                         <p className="text-yellow-200 text-lg font-bold tracking-widest">王者誕生</p>
                     </div>
                 ) : (
                     <div>
                         <Skull size={100} className="text-gray-500 mx-auto mb-6" />
                         <h1 className="text-6xl font-black text-gray-400 mb-2">DEFEAT</h1>
                         <p className="text-gray-500 text-lg font-bold tracking-widest">再接再厲</p>
                     </div>
                 )}

                 <div className="mt-12 bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 w-full max-w-md mx-auto">
                     <div className="flex justify-between items-center mb-6">
                         <div className="text-center">
                             <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto mb-2 overflow-hidden border-2 border-white">
                                 {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                             </div>
                             <div className="text-xl font-bold">{myHp}</div>
                         </div>
                         <div className="text-3xl font-black text-gray-500">VS</div>
                         <div className="text-center">
                             <div className="w-16 h-16 rounded-full bg-gray-700 mx-auto mb-2 overflow-hidden border-2 border-gray-500">
                                 {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : (opponent?.name[0] || '?')}
                             </div>
                             <div className="text-xl font-bold text-gray-400">{opHp}</div>
                         </div>
                     </div>
                     
                     <div className="border-t border-white/10 pt-4 flex justify-between text-sm font-bold">
                         <span>積分變動</span>
                         <span className={isWin ? "text-green-400" : "text-red-400"}>
                             {isWin ? "+25" : "-10"}
                         </span>
                     </div>
                 </div>
                 
                 <button onClick={() => onFinish({ isWin, score: 0, ratingChange: 0, opponentName: '' })} className="mt-8 px-10 py-3 bg-white text-black rounded-full font-bold hover:scale-105 transition-transform">
                     返回大廳
                 </button>
             </div>
        </div>
      );
  }

  // --- RENDER: Playing Phase ---
  return (
      <div className="flex-1 flex flex-col bg-gray-900 text-white h-screen relative overflow-hidden">
          
          {/* Top Bar: Opponent */}
          <div className="bg-gray-800/80 backdrop-blur p-4 pt-safe flex items-center gap-4 border-b border-gray-700 z-20 shadow-md">
              <div className={`relative w-14 h-14 rounded-full ${opponent?.avatarColor} flex-shrink-0 overflow-hidden border-2 border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.4)]`}>
                  {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : (opponent?.name[0] || '?')}
                  {/* Hit Effect */}
                  {opDefenseResult === 'fail' && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center font-black text-white animate-ping">HIT!</div>}
              </div>
              <div className="flex-1">
                  <div className="flex justify-between items-end mb-1">
                      <span className="font-bold text-red-200">{opponent?.name}</span>
                      <span className="text-xs font-mono text-red-400">{opHp} HP</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                      <div className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-500" style={{ width: `${(opHp / MAX_HP) * 100}%` }}></div>
                  </div>
              </div>
          </div>

          {/* Battle Arena */}
          <div className="flex-1 flex flex-col items-center justify-center p-4 relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
              
              {/* Round Indicator */}
              <div className="absolute top-4 bg-black/40 px-4 py-1 rounded-full border border-white/10 backdrop-blur text-xs font-bold tracking-widest text-gray-300">
                  ROUND {round} / {TOTAL_ROUNDS}
              </div>

              {/* Info Messages */}
              <div className="absolute top-16 text-center w-full px-4">
                  <p className="text-yellow-400 font-bold text-shadow-sm animate-pulse">{battleLog}</p>
              </div>

              {/* Phase: Ready */}
              {phase === 'ready' && <h1 className="text-7xl font-black text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.5)] animate-bounce">VS</h1>}

              {/* Phase: Attack Selection (Cards) */}
              {phase === 'selecting_attack' && (
                  <div className="w-full max-w-md grid grid-cols-2 gap-3 animate-in slide-in-from-bottom duration-300">
                      <div className="col-span-2 text-center mb-2 text-sm font-bold text-cyan-300">選擇卡牌發動攻勢</div>
                      {battleCards.map((card) => (
                          <button 
                            key={card.id}
                            onClick={() => handleSelectCard(card)}
                            className={`
                                relative h-32 rounded-2xl p-3 flex flex-col justify-center items-center text-center border-b-4 active:border-b-0 active:translate-y-1 transition-all hover:brightness-110
                                ${card.type === 'SKILL' 
                                    ? 'bg-gradient-to-br from-purple-600 to-indigo-700 border-purple-900' 
                                    : 'bg-gray-800 border-gray-950 hover:bg-gray-700'
                                }
                            `}
                          >
                              {card.type === 'SKILL' ? (
                                  <>
                                    <Zap size={32} className="text-yellow-300 mb-2" />
                                    <span className="font-black text-white text-lg">{card.skill}</span>
                                    <span className="text-[10px] text-indigo-200">特殊技能</span>
                                  </>
                              ) : (
                                  <>
                                    <span className="font-bold text-white text-lg mb-1">{card.word?.en}</span>
                                    <span className="text-xs text-gray-400 bg-black/20 px-2 py-0.5 rounded">{card.word?.zh}</span>
                                    <div className="absolute top-2 right-2 text-[10px] font-bold text-gray-500">Lv.{card.word?.level}</div>
                                  </>
                              )}
                          </button>
                      ))}
                  </div>
              )}

              {/* Phase: Defending */}
              {phase === 'defending' && (incomingWord || incomingSkill !== 'NONE') && (
                  <div className="w-full max-w-sm animate-in zoom-in duration-200 relative">
                      {/* Blind Effect Overlay */}
                      {blindEffect && (
                          <div className="absolute -inset-10 bg-white/90 z-20 flex items-center justify-center">
                              <div className="text-black font-black text-2xl flex flex-col items-center">
                                  <EyeOff size={48} />
                                  <span>視線受阻！</span>
                              </div>
                          </div>
                      )}

                      {incomingSkill !== 'NONE' ? (
                          <div className="text-center py-10">
                              <Zap size={64} className="mx-auto text-yellow-400 mb-4 animate-bounce" />
                              <h2 className="text-2xl font-bold">對手發動了 {incomingSkill} !</h2>
                          </div>
                      ) : (
                          <>
                            <div className="bg-red-600 text-white p-6 rounded-2xl text-center mb-6 shadow-[0_0_20px_rgba(220,38,38,0.6)] border-2 border-red-400">
                                <div className="text-xs font-bold opacity-80 mb-1">INCOMING ATTACK</div>
                                <h2 className="text-4xl font-black">{incomingWord?.en}</h2>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-3">
                                {defenseOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => handleDefend(opt)}
                                        className="bg-white text-gray-900 font-bold py-4 rounded-xl hover:bg-gray-200 active:scale-95 transition-all shadow-lg"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                          </>
                      )}
                  </div>
              )}

              {/* Phase: Waiting */}
              {phase === 'waiting_opponent' && (
                  <div className="text-center animate-pulse">
                      <Shield size={64} className="text-blue-500 mx-auto mb-4 opacity-50" />
                      <h2 className="text-xl font-bold text-gray-300">等待對手行動...</h2>
                  </div>
              )}

              {/* Phase: Summary */}
              {phase === 'round_summary' && (
                  <div className="bg-gray-800/90 backdrop-blur p-8 rounded-3xl border border-gray-600 text-center animate-in zoom-in shadow-2xl">
                      <h2 className="text-2xl font-bold mb-6 text-white">回合結算</h2>
                      <div className="space-y-4 text-lg">
                          <div className="flex justify-between items-center gap-12 border-b border-gray-700 pb-2">
                              <span className="text-gray-400">你的攻擊</span>
                              <span className={`font-black ${opDefenseResult === 'fail' ? 'text-green-400' : 'text-gray-500'}`}>
                                  {opDefenseResult === 'fail' ? '命中!' : '被防禦'}
                              </span>
                          </div>
                          <div className="flex justify-between items-center gap-12 border-b border-gray-700 pb-2">
                              <span className="text-gray-400">你的防禦</span>
                              <span className={`font-black ${myDefenseResult === 'success' ? 'text-blue-400' : 'text-red-500'}`}>
                                  {myDefenseResult === 'success' ? '完美!' : myDefenseResult === 'skill_hit' ? '技能命中' : '失敗'}
                              </span>
                          </div>
                      </div>
                  </div>
              )}
          </div>

          {/* Bottom Bar: Me */}
          <div className="bg-gray-800/80 backdrop-blur p-4 pb-8 flex items-center gap-4 border-t border-gray-700 z-20 shadow-[0_-4px_20px_rgba(0,0,0,0.2)]">
              <div className="flex-1 text-right">
                  <div className="flex justify-between items-end mb-1">
                      <span className="text-xs font-mono text-blue-300">{myHp}/{MAX_HP}</span>
                      <span className="font-bold text-blue-400">YOU</span>
                  </div>
                  <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden border border-gray-600">
                      <div className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-500" style={{ width: `${(myHp / MAX_HP) * 100}%` }}></div>
                  </div>
              </div>
              <div className={`relative w-16 h-16 rounded-full ${user.avatarColor} flex-shrink-0 overflow-hidden border-2 border-white shadow-[0_0_15px_rgba(255,255,255,0.3)]`}>
                  {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                  {myDefenseResult === 'fail' && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center font-black text-white animate-ping">HIT!</div>}
              </div>
          </div>
      </div>
  );
};
