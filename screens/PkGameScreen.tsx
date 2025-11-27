
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Zap, Shield, Swords, Skull, Crown, User as UserIcon, Loader2, Send, Heart, EyeOff, BookOpen, BarChart, Trophy, X, Info, HelpCircle, Flag, Timer, AlertTriangle, CheckCircle, Users, Copy, Play, Sparkles, Check, HeartCrack, Ban, Target, Bot, Repeat, Shuffle, Split, Flame, Lock, Medal, Star, Hourglass, Activity } from 'lucide-react';
import { User, PkResult, Word, PkPlayerState, PkGamePayload, BattleCard, SkillType, LeaderboardEntry, PkMistake, PkGameMode, OverloadLevel } from '../types';
import { WORD_DATABASE } from '../services/mockData';
import { joinMatchmaking, leaveMatchmaking, joinGameRoom, leaveGameRoom, sendGameEvent } from '../services/pkService';
import { fetchPkLeaderboard } from '../services/dataService';

interface PkGameScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: PkResult) => void;
  initialMode?: PkGameMode; // Allow entering directly into a mode
}

// --- Constants & Config ---
const AI_NAMES = ['拼字大師兄', '手滑的約翰', '路過的字典精', '只會 A 到 Z', '單字終結者', '阿發 Doge', '全自動滿分機器'];
const AI_AVATAR_COLORS = ['bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-green-500', 'bg-gray-600'];

const SKILL_NAMES: Record<SkillType, string> = {
    HEAL: '治癒',
    SHIELD: '護盾',
    CRIT: '爆擊',
    BLIND: '致盲',
    MIRROR: '鏡像',
    CHAOS: '混亂',
    FIFTY_FIFTY: '孤注',
    NONE: ''
};

const SKILL_DESCRIPTIONS: Record<SkillType, string> = {
    HEAL: '回復 150 HP',
    SHIELD: '抵擋下一次傷害',
    CRIT: '下一次攻擊傷害 x1.5',
    BLIND: '遮蔽對手螢幕 3 秒',
    MIRROR: '反彈本回合傷害 (消耗回合)',
    CHAOS: '打亂對手選項並隱藏 2 秒',
    FIFTY_FIFTY: '防禦時刪除兩個錯誤選項',
    NONE: ''
};

const RANKS = [
    { name: '青銅', color: 'text-orange-700', icon: Medal, min: 0, bg: 'bg-orange-50 dark:bg-orange-900/20', border: 'border-orange-300' },
    { name: '白銀', color: 'text-slate-400', icon: Shield, min: 1000, bg: 'bg-slate-50 dark:bg-slate-800/50', border: 'border-slate-300' },
    { name: '黃金', color: 'text-yellow-500', icon: Crown, min: 2000, bg: 'bg-yellow-50 dark:bg-yellow-900/20', border: 'border-yellow-400' },
    { name: '白金', color: 'text-cyan-500', icon: Zap, min: 3000, bg: 'bg-cyan-50 dark:bg-cyan-900/20', border: 'border-cyan-400' },
    { name: '鑽石', color: 'text-blue-500', icon: Sparkles, min: 4000, bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-400' },
    { name: '大師', color: 'text-purple-500', icon: Swords, min: 5000, bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-400' },
    { name: '傳說', color: 'text-rose-500', icon: Flame, min: 6000, bg: 'bg-rose-50 dark:bg-rose-900/20', border: 'border-rose-400' },
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

const playSound = (type: 'match' | 'attack' | 'damage' | 'win' | 'lose' | 'skill' | 'block' | 'card_flip' | 'tick' | 'charge' | 'warning' | 'shatter') => {
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
    } else if (type === 'charge') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.5);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
    } else if (type === 'warning') {
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.setValueAtTime(0, now + 0.1);
        gain.gain.setValueAtTime(0.1, now + 0.2);
        gain.gain.setValueAtTime(0, now + 0.3);
    } else if (type === 'shatter') {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.5);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
    }
    osc.start(now);
    osc.stop(now + 0.5);
  } catch(e) {}
};

const MAX_HP = 1000;
const DAMAGE_PER_HIT = 150; 
const TOTAL_ROUNDS = 10;
const TURN_TIME_LIMIT = 15; // Seconds

// Overload Scaling
const CHARGE_LEVELS: Record<OverloadLevel, { cost: number, multiplier: number, name: string, color: string }> = {
    1: { cost: 0, multiplier: 1, name: '安全 Lv1', color: 'bg-green-500' },
    2: { cost: 100, multiplier: 1.5, name: '施壓 Lv2', color: 'bg-orange-500' },
    3: { cost: 200, multiplier: 2.5, name: '梭哈 Lv3', color: 'bg-red-600' }
};

type BattlePhase = 'mode_select' | 'menu' | 'matching' | 'connecting' | 'ready' | 'selecting_attack' | 'waiting_opponent' | 'defending' | 'round_summary' | 'waiting_next_round' | 'result';

// --- Rank Info Modal ---
const RankInfoModal = ({ onClose }: { onClose: () => void }) => {
    return (
        <div className="fixed inset-0 z-[80] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl border border-gray-700 max-h-[80vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-bold text-white flex items-center gap-2">
                        <Trophy size={20} className="text-yellow-500" /> 段位說明
                    </h3>
                    <button onClick={onClose} className="p-1 hover:bg-gray-700 rounded-full"><X size={20} className="text-gray-400"/></button>
                </div>
                <div className="space-y-3">
                    {RANKS.map((rank, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 bg-gray-700/50 rounded-xl border border-gray-600">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${rank.bg} border ${rank.border}`}>
                                <rank.icon size={20} className={rank.color} />
                            </div>
                            <div className="flex-1">
                                <div className={`font-bold ${rank.color}`}>{rank.name}</div>
                                <div className="text-xs text-gray-400">積分 {rank.min}+</div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const CustomRoomModal = ({ onClose, onJoin }: { onClose: () => void, onJoin: (code: string) => void }) => {
    const [code, setCode] = useState('');
    return (
        <div className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-gray-800 w-full max-w-xs rounded-2xl p-6 shadow-2xl border border-gray-700">
                <h3 className="text-lg font-bold text-white mb-4 text-center">加入私人房間</h3>
                {/* Changed type to text to allow leading zeros and prevent auto-formatting issues */}
                <input 
                    type="text" 
                    inputMode="numeric"
                    value={code}
                    onChange={(e) => setCode(e.target.value.slice(0, 6).replace(/[^0-9]/g, ''))}
                    placeholder="輸入 6 位數房號"
                    className="w-full bg-gray-900 text-white text-center text-2xl font-mono tracking-widest py-3 rounded-xl border border-gray-600 mb-4 focus:border-blue-500 outline-none"
                />
                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-bold">取消</button>
                    <button 
                        onClick={() => code.length >= 4 && onJoin(code)} 
                        disabled={code.length < 4}
                        className="flex-1 py-3 bg-blue-600 disabled:bg-gray-600 text-white rounded-xl font-bold"
                    >
                        加入
                    </button>
                </div>
            </div>
        </div>
    );
};

export const PkGameScreen: React.FC<PkGameScreenProps> = ({ user, onBack, onFinish, initialMode }) => {
  const [phase, setPhase] = useState<BattlePhase>(initialMode ? 'menu' : 'mode_select');
  const [gameMode, setGameMode] = useState<PkGameMode>(initialMode || 'CLASSIC');
  
  const [menuTab, setMenuTab] = useState<'lobby' | 'rank' | 'rules'>('lobby');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoadingRank, setIsLoadingRank] = useState(false);
  const [showRankInfo, setShowRankInfo] = useState(false);
  
  const [matchStatus, setMatchStatus] = useState("正在掃描對手訊號...");
  const [showRoomInput, setShowRoomInput] = useState(false);
  const [showAiPrompt, setShowAiPrompt] = useState(false);
  
  const [roomId, setRoomId] = useState<string | null>(null);
  const [opponent, setOpponent] = useState<PkPlayerState | null>(null);
  
  const [myHp, setMyHp] = useState(MAX_HP);
  const [opHp, setOpHp] = useState(MAX_HP);
  const [round, setRound] = useState(1);
  
  // Calculate Rank based on current mode
  const currentModeRating = gameMode === 'OVERLOAD' ? (user.pkRatingOverload || 0) : (user.pkRating || 0);
  const myRank = getRank(currentModeRating);
  
  const [battleCards, setBattleCards] = useState<BattleCard[]>([]); 
  const [incomingWord, setIncomingWord] = useState<Word | null>(null); 
  const [incomingSkill, setIncomingSkill] = useState<SkillType>('NONE'); 
  const [defenseOptions, setDefenseOptions] = useState<string[]>([]); 
  const [blindEffect, setBlindEffect] = useState(false); 
  const [chaosEffect, setChaosEffect] = useState(false); // For Overload Mode
  
  // Overload Specific State
  const [selectedAttackCard, setSelectedAttackCard] = useState<BattleCard | null>(null);
  const [chargeLevel, setChargeLevel] = useState<OverloadLevel>(1);
  const [incomingCharge, setIncomingCharge] = useState<OverloadLevel>(1);
  const [showChargePanel, setShowChargePanel] = useState(false);
  const [isAdrenaline, setIsAdrenaline] = useState(false);
  const [perfectParryTriggered, setPerfectParryTriggered] = useState(false);
  
  // Game Sync & Action States
  const [myActionSent, setMyActionSent] = useState(false);
  const [opActionReceived, setOpActionReceived] = useState(false);
  const [opReadyForNextRound, setOpReadyForNextRound] = useState(false); // Sync Barrier
  
  const [myLastAction, setMyLastAction] = useState<{type: 'WORD' | 'SKILL', id: string, charge?: number} | null>(null);
  const [myDefenseResult, setMyDefenseResult] = useState<'success' | 'fail' | 'skill_hit' | null>(null);
  const [opDefenseResult, setOpDefenseResult] = useState<'success' | 'fail' | 'skill_hit' | 'backlash' | null>(null);
  const [opLastDamageTaken, setOpLastDamageTaken] = useState(0); // Store for summary
  const [myLastDamageTaken, setMyLastDamageTaken] = useState(0); // Store for summary
  
  const [battleLog, setBattleLog] = useState<string>("");
  const [turnTimeLeft, setTurnTimeLeft] = useState(TURN_TIME_LIMIT);
  const [mistakes, setMistakes] = useState<PkMistake[]>([]);
  const [endReason, setEndReason] = useState<'normal' | 'surrender' | 'opponent_left' | 'timeout'>('normal');

  const timeoutFallbackRef = useRef<number | null>(null);
  const turnTimerRef = useRef<number | null>(null);
  const aiAttackTimerRef = useRef<number | null>(null);
  const aiDefendTimerRef = useRef<number | null>(null);
  const roundSummaryTimerRef = useRef<number | null>(null); 
  const answerStartTimeRef = useRef<number>(0);

  // --- 0. Data Loading ---
  useEffect(() => {
      if (phase === 'menu' && menuTab === 'rank') {
          const loadLeaderboard = async () => {
              setIsLoadingRank(true);
              const data = await fetchPkLeaderboard(gameMode);
              setLeaderboard(data);
              setIsLoadingRank(false);
          };
          loadLeaderboard();
      }
  }, [phase, menuTab, gameMode]);

  // Check Adrenaline
  useEffect(() => {
      if (gameMode === 'OVERLOAD' && myHp < MAX_HP * 0.3) {
          setIsAdrenaline(true);
      } else {
          setIsAdrenaline(false);
      }
  }, [myHp, gameMode]);

  // --- 1. Matchmaking Logic ---
  useEffect(() => {
      if (phase === 'matching') {
          setMatchStatus("正在掃描對手訊號...");
          setShowAiPrompt(false);

          joinMatchmaking(
              user,
              (op, foundRoomId, host) => {
                  if (timeoutFallbackRef.current) clearTimeout(timeoutFallbackRef.current);
                  setOpponent(op);
                  setMatchStatus("配對成功！連線中...");
                  playSound('match');
                  setRoomId(foundRoomId);
                  setPhase('connecting');
              },
              (status) => setMatchStatus(status)
          );
          
          // AI Fallback Timer (15s)
          timeoutFallbackRef.current = window.setTimeout(() => {
              if (phase === 'matching') {
                  setMatchStatus("似乎沒有真人玩家...");
                  setShowAiPrompt(true);
              }
          }, 15000);
      }

      return () => {
          if (phase === 'matching') {
              leaveMatchmaking();
              if (timeoutFallbackRef.current) clearTimeout(timeoutFallbackRef.current);
          }
      };
  }, [phase]);

  // --- Auto-Advance Round Logic (Sync Barrier) ---
  useEffect(() => {
      if (phase === 'round_summary') {
          if (roundSummaryTimerRef.current) clearTimeout(roundSummaryTimerRef.current);
          
          // Give users 4 seconds to view the summary
          roundSummaryTimerRef.current = window.setTimeout(() => {
              setPhase('waiting_next_round');
              // Immediately signal readiness when entering this state
              triggerGameEvent({ type: 'ROUND_READY' });
          }, 4000); 
      }
      return () => { if (roundSummaryTimerRef.current) clearTimeout(roundSummaryTimerRef.current); };
  }, [phase]);

  // --- SYNC BARRIER CHECK ---
  useEffect(() => {
      // Logic: I am ready (because I am in 'waiting_next_round') AND Opponent is ready (or is AI)
      if (phase === 'waiting_next_round' && (opReadyForNextRound || opponent?.isAi)) {
          if (round < TOTAL_ROUNDS && myHp > 0 && opHp > 0) {
              // Add small delay to ensure UI updates are smooth
              setTimeout(() => {
                  setRound(prev => prev + 1);
                  startRound();
              }, 500);
          } else {
              setPhase('result');
          }
      }
  }, [phase, opReadyForNextRound, opponent, round, myHp, opHp]);


  const startAiMatch = () => {
      const randomName = AI_NAMES[Math.floor(Math.random() * AI_NAMES.length)];
      const randomColor = AI_AVATAR_COLORS[Math.floor(Math.random() * AI_AVATAR_COLORS.length)];
      
      const aiOpponent: PkPlayerState = {
          studentId: 'ai_bot',
          name: randomName,
          avatarColor: randomColor,
          level: Math.floor(Math.random() * 5) + 3,
          status: 'playing',
          joinedAt: Date.now(),
          isAi: true
      };

      setOpponent(aiOpponent);
      setMatchStatus("已連接至訓練機器人");
      playSound('match');
      setPhase('ready');
      setTimeout(startRound, 2000);
  };

  // --- 2. Game Connection Logic (Realtime) ---
  useEffect(() => {
      if (roomId && user.studentId && opponent && !opponent.isAi) {
          leaveMatchmaking();
          if (timeoutFallbackRef.current) clearTimeout(timeoutFallbackRef.current);
          
          joinGameRoom(
              roomId, 
              user.studentId, 
              handleGameEvent,
              () => handleOpponentLeft(),
              () => {
                  setPhase('ready');
                  setTimeout(startRound, 2000);
              }
          );
      }
      return () => {
          if (roomId) leaveGameRoom();
      };
  }, [roomId, opponent]);

  // --- AI Logic Engine ---
  useEffect(() => {
      if (!opponent?.isAi || phase === 'menu' || phase === 'result') return;
      
      if (!opActionReceived && (phase === 'selecting_attack' || phase === 'waiting_opponent')) {
          if (aiAttackTimerRef.current) clearTimeout(aiAttackTimerRef.current);
          const thinkTime = 2000 + Math.random() * 3000;
          
          aiAttackTimerRef.current = window.setTimeout(() => {
              const random = Math.random();
              const skills: SkillType[] = gameMode === 'OVERLOAD' 
                ? ['HEAL', 'SHIELD', 'CRIT', 'BLIND', 'MIRROR', 'CHAOS', 'FIFTY_FIFTY'] 
                : ['HEAL', 'SHIELD', 'CRIT', 'BLIND'];
              
              if (random > 0.8) {
                  handleGameEvent({ type: 'SEND_ACTION', attackerId: 'ai_bot', skill: skills[Math.floor(Math.random()*skills.length)] });
              } else {
                  const word = WORD_DATABASE[Math.floor(Math.random() * WORD_DATABASE.length)];
                  // AI Charge Logic
                  let charge: OverloadLevel = 1;
                  if (gameMode === 'OVERLOAD') {
                      if (Math.random() > 0.7) charge = 2;
                      if (Math.random() > 0.9) charge = 3;
                  }
                  handleGameEvent({ type: 'SEND_ACTION', attackerId: 'ai_bot', wordId: word.id, chargeLevel: charge });
              }
          }, thinkTime);
      }
      return () => { if (aiAttackTimerRef.current) clearTimeout(aiAttackTimerRef.current); };
  }, [phase, opActionReceived, opponent, round]);

  useEffect(() => {
      if (!opponent?.isAi || phase === 'menu' || phase === 'result') return;

      if (myActionSent && opDefenseResult === null && myLastAction?.type === 'WORD') {
           if (aiDefendTimerRef.current) clearTimeout(aiDefendTimerRef.current);
           const reactTime = 1500 + Math.random() * 2000;
           
           aiDefendTimerRef.current = window.setTimeout(() => {
               // AI Defense Success Rate
               let successRate = 0.4;
               if (myLastAction?.charge === 3) successRate = 0.2; // High charge scares AI sometimes
               if (isAdrenaline) successRate = 0.3;

               const aiCorrect = Math.random() > (1 - successRate); 
               
               // Backlash logic for AI
               let backlash = 0;
               if (aiCorrect && gameMode === 'OVERLOAD' && myLastAction.charge) {
                   backlash = CHARGE_LEVELS[myLastAction.charge as OverloadLevel].cost;
               }

               handleGameEvent({ 
                   type: 'REPORT_RESULT', 
                   defenderId: 'ai_bot', 
                   damageTaken: aiCorrect ? 0 : 150, // Simplified damage for AI logic
                   isCorrect: aiCorrect,
                   backlashDamage: backlash
               });
           }, reactTime);
      }
      return () => { if (aiDefendTimerRef.current) clearTimeout(aiDefendTimerRef.current); };
  }, [myActionSent, opDefenseResult, opponent, round, myLastAction]);


  // --- Helper to Send Events ---
  const triggerGameEvent = async (payload: PkGamePayload) => {
      if (opponent?.isAi) { /* Local */ } else { await sendGameEvent(payload); }
  };

  const handleStartMatch = () => {
      setPhase('matching');
  };

  const handleCreateRoom = () => {
      const newRoomId = Math.floor(100000 + Math.random() * 900000).toString();
      const fullRoomId = `room_${newRoomId}`;
      setRoomId(fullRoomId);
      setOpponent(null); 
      setMatchStatus(`等待玩家加入... 房號: ${newRoomId}`);
      setPhase('connecting'); 
      
      joinGameRoom(
          fullRoomId, 
          user.studentId, 
          handleGameEvent,
          () => handleOpponentLeft(),
          () => {
              setOpponent({ name: "Player 2", studentId: "p2", avatarColor: "bg-gray-500", level: 1, status: 'playing', joinedAt: 0 }); 
              sendGameEvent({ type: 'START_GAME', attackerId: JSON.stringify(user), gameMode }); 
          }
      );
  };

  const handleJoinRoom = (code: string) => {
      // Clean up previous matchmaking attempts
      leaveMatchmaking();
      
      setShowRoomInput(false);
      const fullRoomId = `room_${code}`;
      setRoomId(fullRoomId);
      setMatchStatus("正在加入房間...");
      setPhase('connecting');
      
      joinGameRoom(
          fullRoomId, 
          user.studentId, 
          (payload) => {
              handleGameEvent(payload);
              if (payload.type === 'START_GAME' && payload.attackerId) {
                  try {
                      const hostProfile = JSON.parse(payload.attackerId);
                      setOpponent({ ...hostProfile, status: 'playing', joinedAt: 0 });
                      if (payload.gameMode) setGameMode(payload.gameMode);
                      setPhase('ready');
                      setTimeout(startRound, 2000);
                  } catch(e) {}
              }
          },
          () => handleOpponentLeft(),
          () => {
              // Joiner also sends START_GAME to identify themselves to the host
              sendGameEvent({ type: 'START_GAME', attackerId: JSON.stringify(user), gameMode });
          }
      );
  };

  const handleOpponentLeft = () => {
      if (phase === 'result') return; 
      setEndReason('opponent_left');
      setOpHp(0);
      setPhase('result');
  };

  const handleSurrender = async () => {
      if (confirm("確定要投降嗎？將會扣除積分。")) {
          await triggerGameEvent({ type: 'SURRENDER', winnerId: opponent?.studentId });
          setEndReason('surrender');
          setMyHp(0);
          setPhase('result');
      }
  };

  const handleExit = () => {
      setRoomId(null); 
      setOpponent(null);
      onBack();
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
          // Auto select first card (safe default)
          if (!myActionSent && battleCards.length > 0) {
              // If overload mode and waiting for charge, force default Lv1
              if (showChargePanel && selectedAttackCard) {
                  confirmAttack(selectedAttackCard, 1);
              } else {
                  handleCardClick(battleCards[0]);
                  // If it was a word card, immediate confirm lvl 1 in handleCardClick flow if needed
                  // but handleCardClick opens panel. We need direct confirm.
                  if (battleCards[0].type === 'WORD' && gameMode === 'OVERLOAD') {
                      confirmAttack(battleCards[0], 1);
                  }
              }
          }
      } else if (phase === 'defending') {
          if (incomingWord) {
              const damageTaken = DAMAGE_PER_HIT * (gameMode === 'OVERLOAD' ? CHARGE_LEVELS[incomingCharge].multiplier : 1);
              setMyHp(prev => Math.max(0, prev - damageTaken));
              setMyDefenseResult('fail');
              setMyLastDamageTaken(damageTaken);
              
              triggerGameEvent({
                  type: 'REPORT_RESULT',
                  defenderId: user.studentId,
                  damageTaken: damageTaken,
                  isCorrect: false
              });
              
              setTimeout(() => setPhase('round_summary'), 1000);
          }
      }
  };

  // --- 3. Game Logic ---

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

      const skills: SkillType[] = gameMode === 'OVERLOAD' 
        ? ['HEAL', 'SHIELD', 'CRIT', 'BLIND', 'MIRROR', 'CHAOS', 'FIFTY_FIFTY']
        : ['HEAL', 'SHIELD', 'CRIT', 'BLIND'];
        
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
      setChaosEffect(false);
      setPerfectParryTriggered(false);
      setOpReadyForNextRound(false); // Reset remote ready flag
      
      setOpLastDamageTaken(0);
      setMyLastDamageTaken(0);
      
      setMyLastAction(null);
      setBattleLog(`Round ${round} / ${TOTAL_ROUNDS}`);
      
      setBattleCards(generateCards(round));
      setSelectedAttackCard(null);
      setShowChargePanel(false);
      setChargeLevel(1);
      
      setPhase('selecting_attack');
  };

  // 1. Click Card
  const handleCardClick = (card: BattleCard) => {
      if (myActionSent) return;
      playSound('card_flip');
      
      if (card.type === 'SKILL') {
          // Skills execute immediately (no charge needed usually, simplifying)
          confirmAttack(card, 1);
      } else if (gameMode === 'OVERLOAD') {
          // Overload Mode: Open Charge Panel
          setSelectedAttackCard(card);
          setShowChargePanel(true);
          // Auto set level 2 if Adrenaline
          if (isAdrenaline) setChargeLevel(2);
          else setChargeLevel(1);
      } else {
          // Classic Mode: Send immediately
          confirmAttack(card, 1);
      }
  };

  // 2. Confirm Attack
  const confirmAttack = (card: BattleCard, charge: OverloadLevel) => {
      setMyActionSent(true);
      setShowChargePanel(false);
      
      // Pay HP cost (Overload)
      if (gameMode === 'OVERLOAD' && !isAdrenaline) {
          const cost = CHARGE_LEVELS[charge].cost;
          if (cost > 0) {
              setMyHp(prev => Math.max(1, prev - cost)); // Don't die from betting
          }
      }

      setMyLastAction({ 
          type: card.type, 
          id: card.type === 'SKILL' ? (card.skill || 'NONE') : (card.word?.en || ''),
          charge: charge
      });

      if (card.type === 'SKILL') {
          if (card.skill === 'HEAL') {
              setMyHp(prev => Math.min(MAX_HP, prev + 150));
              setBattleLog("使用回復！HP +150");
              playSound('skill');
          } else {
              setBattleLog(`發動技能: ${SKILL_NAMES[card.skill || 'NONE']}`);
              playSound('skill');
          }
          
          triggerGameEvent({
              type: 'SEND_ACTION',
              attackerId: user.studentId,
              skill: card.skill
          });
      } else {
          setBattleLog(`發送攻擊：${card.word?.en} (Lv${charge})`);
          playSound(charge === 3 ? 'charge' : 'attack');
          
          if (card.word && card.word.id) {
              triggerGameEvent({
                  type: 'SEND_ACTION',
                  attackerId: user.studentId,
                  wordId: card.word.id,
                  chargeLevel: charge
              });
          }
      }

      // State Transition
      if (opActionReceived) {
          if (incomingWord) setPhase('defending');
          else if (incomingSkill !== 'NONE') setTimeout(() => setPhase('round_summary'), 1500);
          else setPhase('waiting_opponent');
      } else {
          setPhase('waiting_opponent');
      }
  };

  const handleDefend = (selectedZh: string) => {
      if (!incomingWord) return;
      
      const answerTime = (Date.now() - answerStartTimeRef.current) / 1000;
      const isCorrect = selectedZh === incomingWord.zh;
      
      // Overload Mechanics
      let damageTaken = 0;
      let backlash = 0;
      let isPerfect = false;

      if (isCorrect) {
          playSound('block');
          setBattleLog("防禦成功！");
          setMyDefenseResult('success');
          setMyLastDamageTaken(0);
          
          if (gameMode === 'OVERLOAD') {
              // Calculate Backlash
              const baseBet = CHARGE_LEVELS[incomingCharge].cost;
              // Check Perfect Parry
              if (answerTime <= 3) {
                  isPerfect = true;
                  setPerfectParryTriggered(true);
                  playSound('shatter'); // Special sound
                  backlash = baseBet * 2;
              } else {
                  backlash = baseBet;
              }
          }
      } else {
          // Fail
          let baseDmg = DAMAGE_PER_HIT;
          if (gameMode === 'OVERLOAD') {
              baseDmg *= CHARGE_LEVELS[incomingCharge].multiplier;
          }
          if (incomingSkill === 'CRIT') baseDmg *= 1.5;
          
          damageTaken = Math.floor(baseDmg);
          setMyHp(prev => Math.max(0, prev - damageTaken));
          setMyLastDamageTaken(damageTaken);
          playSound('damage');
          setBattleLog("防禦失敗！");
          setMyDefenseResult('fail');
          
          setMistakes(prev => [...prev, {
              word: incomingWord!,
              correctAnswer: incomingWord!.zh,
              timestamp: Date.now()
          }]);
      }

      triggerGameEvent({
          type: 'REPORT_RESULT',
          defenderId: user.studentId,
          damageTaken: damageTaken,
          isCorrect: isCorrect,
          backlashDamage: backlash,
          isPerfectParry: isPerfect
      });

      setTimeout(() => setPhase('round_summary'), 1000);
  };

  // --- 4. Event Handling ---
  const handleGameEvent = (payload: PkGamePayload) => {
      if (payload.type === 'START_GAME' && payload.attackerId) {
          try {
              const profile = JSON.parse(payload.attackerId);
              if (profile.studentId !== user.studentId) {
                  setOpponent({ ...profile, status: 'playing', joinedAt: 0 });
                  if (payload.gameMode) setGameMode(payload.gameMode);
                  setPhase('ready');
                  setTimeout(startRound, 2000);
              }
          } catch(e) {}
          return;
      }

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

      if (payload.type === 'ROUND_READY') {
          setOpReadyForNextRound(true);
          return;
      }

      if (payload.type === 'SEND_ACTION') {
          if (payload.attackerId !== user.studentId) {
              setOpActionReceived(true);
              
              if (payload.skill) {
                  setIncomingSkill(payload.skill);
                  if (payload.skill === 'BLIND') {
                      setBlindEffect(true);
                      setBattleLog("對手使用了致盲！");
                  }
                  if (payload.skill === 'CHAOS') {
                      setChaosEffect(true); // Triggers UI effect in defending phase
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
                      setIncomingWord(word);
                      if (payload.chargeLevel) setIncomingCharge(payload.chargeLevel);
                      
                      // Generate options
                      const wrongs = WORD_DATABASE
                        .filter(w => w.id !== word.id)
                        .sort(() => 0.5 - Math.random())
                        .slice(0, 3)
                        .map(w => w.zh);
                      const opts = [word.zh, ...wrongs].sort(() => 0.5 - Math.random());
                      setDefenseOptions(opts);

                      setPhase(prev => {
                          if (prev === 'waiting_opponent') {
                              answerStartTimeRef.current = Date.now();
                              return 'defending';
                          }
                          return prev;
                      });
                  }
              }
          }
      } 
      else if (payload.type === 'REPORT_RESULT') {
          if (payload.defenderId !== user.studentId) {
              const damage = payload.damageTaken || 0;
              const backlash = payload.backlashDamage || 0;
              
              setOpHp(prev => Math.max(0, prev - damage));
              setMyHp(prev => Math.max(0, prev - backlash)); // Apply Backlash Self Damage
              
              setOpDefenseResult(damage === 0 ? (backlash > 0 ? 'backlash' : 'success') : 'fail');
              setOpLastDamageTaken(damage);
              
              if (backlash > 0) setMyLastDamageTaken(prev => prev + backlash);

              setPhase(prev => {
                  if (prev === 'waiting_opponent') return 'round_summary';
                  return prev;
              });
          }
      }
  };

  // --- Helpers for Summary Text ---
  const getSummaryDescription = () => {
      // Case 1: Both used skills (Rare but possible with instant skills like Heal)
      // However, usually one attacks with word.
      // If Incoming Skill exists, opponent used a skill.
      // If My Last Action was Skill, I used a skill.
      
      const myMove = myLastAction?.type === 'SKILL' ? `發動${SKILL_NAMES[myLastAction.id as SkillType]}` : '發起攻擊';
      const opMove = incomingSkill !== 'NONE' ? `發動${SKILL_NAMES[incomingSkill]}` : '發起攻擊';

      // 1. Both used skills (e.g. Heal vs Heal, or Heal vs Blind)
      if (myLastAction?.type === 'SKILL' && incomingSkill !== 'NONE') {
          return `雙方都在調整狀態... 你${myMove}，對手${opMove}。`;
      }

      // 2. I attacked, Opponent defended (or used defensive skill)
      if (myLastAction?.type === 'WORD') {
          // Check opponent result
          if (opDefenseResult === 'fail') return '你攻擊成功！對手防禦失敗，受到傷害。';
          if (opDefenseResult === 'backlash') return '你的攻擊被完美格擋！受到反噬傷害。';
          return '你的攻擊被化解了。對手防禦成功。';
      }

      // 3. Opponent attacked, I defended
      if (incomingWord) {
          if (myDefenseResult === 'fail') return '防禦失敗！你受到了傷害。';
          if (perfectParryTriggered) return '完美格擋！將傷害加倍反彈給對手。';
          return '防禦成功！成功抵擋了對手的攻擊。';
      }
      
      // 4. Skill vs Attack scenarios
      if (myLastAction?.type === 'SKILL') {
          // I used skill, opponent likely attacked or defended nothing?
          // Actually if I used skill, I don't attack. Opponent might have attacked me.
          if (incomingWord) {
             return `你${myMove}，但需面對對手的攻擊！`;
          }
          return `你${myMove}。`;
      }

      return '回合結束';
  };

  // --- RENDER: Mode Select Phase ---
  if (phase === 'mode_select') {
      return (
          <div className="fixed inset-0 z-[60] bg-gray-900 flex flex-col items-center justify-center p-6 space-y-6">
              <h1 className="text-3xl font-black text-white mb-4">選擇對戰模式</h1>
              
              <button 
                onClick={() => { setGameMode('CLASSIC'); setPhase('menu'); setMenuTab('lobby'); }}
                className="w-full max-w-sm bg-gray-800 hover:bg-gray-700 border border-gray-600 p-6 rounded-3xl flex items-center gap-4 transition-all hover:scale-105 group"
              >
                  <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center group-hover:bg-blue-500 transition-colors">
                      <Swords size={32} className="text-blue-400 group-hover:text-white"/>
                  </div>
                  <div className="text-left">
                      <h3 className="text-xl font-bold text-white">經典對決</h3>
                      <p className="text-gray-400 text-sm">標準單字 PK，考驗詞彙量</p>
                  </div>
              </button>

              <button 
                onClick={() => { setGameMode('OVERLOAD'); setPhase('menu'); setMenuTab('lobby'); }}
                className="w-full max-w-sm bg-gradient-to-r from-red-900 to-rose-800 hover:from-red-800 hover:to-rose-700 border border-red-500/50 p-6 rounded-3xl flex items-center gap-4 transition-all hover:scale-105 group relative overflow-hidden"
              >
                  <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                  <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center group-hover:bg-red-500 transition-colors z-10">
                      <Zap size={32} className="text-red-300 group-hover:text-white animate-pulse"/>
                  </div>
                  <div className="text-left z-10">
                      <h3 className="text-xl font-bold text-white flex items-center gap-2">
                          超載競技場 <span className="bg-yellow-500 text-black text-[10px] px-2 py-0.5 rounded font-black">NEW</span>
                      </h3>
                      <p className="text-red-200 text-sm">賭上 HP 的心理博弈，高風險高回報</p>
                  </div>
              </button>

              <button onClick={onBack} className="text-gray-500 mt-8 hover:text-white">返回</button>
          </div>
      )
  }

  // --- RENDER: Menu Phase (Specific Mode Lobby) ---
  if (phase === 'menu') {
      const isOverload = gameMode === 'OVERLOAD';
      return (
          <div className="fixed inset-0 z-[60] flex flex-col bg-gray-900 text-white overflow-hidden">
              {showRoomInput && <CustomRoomModal onClose={() => setShowRoomInput(false)} onJoin={handleJoinRoom} />}
              {showRankInfo && <RankInfoModal onClose={() => setShowRankInfo(false)} />}
              
              {/* Header */}
              <div className="p-4 pt-safe flex justify-between items-center bg-gray-900 border-b border-gray-800 z-10">
                  <button onClick={() => setPhase('mode_select')} className="p-2 -ml-2 hover:bg-gray-800 rounded-full transition-colors">
                      <ArrowLeft size={24} className="text-gray-400" />
                  </button>
                  <div className="flex gap-2 items-center">
                        <div className={`px-3 py-1.5 rounded-full border flex items-center gap-2 ${isOverload ? 'bg-red-900/30 border-red-800 text-red-400' : 'bg-blue-900/30 border-blue-800 text-blue-400'}`}>
                            {isOverload ? <Zap size={16} /> : <Swords size={16} />}
                            <span className="text-sm font-bold">{isOverload ? '超載競技場' : '經典對決'}</span>
                        </div>
                  </div>
                  <div className="w-8"></div>
              </div>

              {/* Lobby Tabs */}
              <div className="flex border-b border-gray-800 bg-gray-900/90 backdrop-blur z-10">
                  <button 
                    onClick={() => setMenuTab('lobby')} 
                    className={`flex-1 py-3 font-bold text-sm transition-colors ${menuTab === 'lobby' ? (isOverload ? 'text-red-500 border-b-2 border-red-500' : 'text-blue-500 border-b-2 border-blue-500') : 'text-gray-500'}`}
                  >
                      出擊
                  </button>
                  <button 
                    onClick={() => setMenuTab('rank')} 
                    className={`flex-1 py-3 font-bold text-sm transition-colors ${menuTab === 'rank' ? (isOverload ? 'text-red-500 border-b-2 border-red-500' : 'text-blue-500 border-b-2 border-blue-500') : 'text-gray-500'}`}
                  >
                      排行榜
                  </button>
                  <button 
                    onClick={() => setMenuTab('rules')} 
                    className={`flex-1 py-3 font-bold text-sm transition-colors ${menuTab === 'rules' ? (isOverload ? 'text-red-500 border-b-2 border-red-500' : 'text-blue-500 border-b-2 border-blue-500') : 'text-gray-500'}`}
                  >
                      規則
                  </button>
              </div>

              {/* Menu Content */}
              <div className="flex-1 overflow-y-auto p-6 relative">
                  
                  {/* Background Decor */}
                  <div className="absolute inset-0 overflow-hidden pointer-events-none">
                      <div className={`absolute top-1/4 left-1/4 w-64 h-64 rounded-full blur-3xl opacity-20 ${isOverload ? 'bg-red-600' : 'bg-blue-600'}`}></div>
                  </div>

                  {menuTab === 'lobby' && (
                      <div className="flex flex-col items-center animate-in fade-in zoom-in duration-300 relative z-10 h-full justify-center">
                          <div className="relative w-28 h-28 mb-6" onClick={() => setShowRankInfo(true)}>
                              <div className={`absolute inset-0 rounded-full blur-xl opacity-30 animate-pulse ${isOverload ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                              <div className={`relative w-full h-full rounded-full ${user.avatarColor} ring-4 ring-gray-800 flex items-center justify-center overflow-hidden shadow-2xl ${getFrameStyle(user.avatarFrame)}`}>
                                  {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : <UserIcon size={50}/>}
                              </div>
                              <div className={`absolute -bottom-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full border bg-gray-900 text-[10px] font-bold whitespace-nowrap flex items-center gap-1 shadow-lg cursor-pointer ${myRank.color} ${myRank.border}`}>
                                  <myRank.icon size={10} /> {myRank.name}
                              </div>
                          </div>
                          
                          <div className="text-center mb-8">
                              <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
                                  {isOverload ? '準備好了嗎？' : '知識就是力量'}
                              </h2>
                              <p className="text-gray-400 text-xs font-medium px-4 leading-relaxed">
                                  {isOverload ? '賭上你的 HP，給予對手致命一擊' : '累積勝場，提升段位'}
                              </p>
                              <div className="mt-2 text-xs font-mono text-gray-500">
                                  Rating: {currentModeRating}
                              </div>
                          </div>

                          <div className="w-full max-w-sm space-y-3">
                              <button 
                                  onClick={handleStartMatch}
                                  className={`w-full py-4 bg-gradient-to-r text-white rounded-2xl font-black text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/10 ${isOverload ? 'from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500' : 'from-blue-600 to-indigo-600'}`}
                              >
                                  <Swords size={20} /> 快速配對
                              </button>
                              
                              <div className="flex gap-3">
                                  <button 
                                      onClick={handleCreateRoom}
                                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-sm shadow-md border border-gray-700 flex items-center justify-center gap-2"
                                  >
                                      <Users size={16} /> 創建房間
                                  </button>
                                  <button 
                                      onClick={() => setShowRoomInput(true)}
                                      className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-bold text-sm shadow-md border border-gray-700 flex items-center justify-center gap-2"
                                  >
                                      <Play size={16} /> 加入房間
                                  </button>
                              </div>
                          </div>
                      </div>
                  )}

                  {menuTab === 'rank' && (
                      <div className="max-w-md mx-auto space-y-3 animate-in slide-in-from-right relative z-10">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className={`font-bold flex items-center gap-2 ${isOverload ? 'text-red-400' : 'text-blue-400'}`}>
                                  <Trophy size={18} /> {isOverload ? '超載' : '經典'} 排行榜
                              </h3>
                              <button onClick={() => setShowRankInfo(true)} className="text-xs text-gray-400 hover:text-white flex items-center gap-1">
                                  <Info size={14}/> 段位說明
                              </button>
                          </div>
                          
                          {isLoadingRank ? (
                              <div className="text-center py-10"><Loader2 className="animate-spin mx-auto text-gray-500" /></div>
                          ) : leaderboard.length === 0 ? (
                              <div className="text-center py-10 text-gray-500">暫無數據</div>
                          ) : (
                              leaderboard.map((entry, idx) => {
                                  const entryRank = getRank(entry.points);
                                  return (
                                      <div key={idx} className="bg-gray-800/80 p-3 rounded-xl flex items-center border border-gray-700">
                                          <div className={`w-8 text-center font-black text-lg italic ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-500' : 'text-gray-600'}`}>
                                              {entry.rank}
                                          </div>
                                          <div className={`w-10 h-10 rounded-full mx-3 ${entry.avatarColor} flex items-center justify-center font-bold text-white text-xs ${getFrameStyle(entry.avatarFrame)} overflow-hidden`}>
                                              {entry.avatarImage ? <img src={entry.avatarImage} className="w-full h-full object-cover"/> : entry.name[0]}
                                          </div>
                                          <div className="flex-1">
                                              <span className="font-bold text-sm text-white block">{entry.name}</span>
                                              <span className={`text-[10px] font-bold ${entryRank.color} flex items-center gap-1`}>
                                                  <entryRank.icon size={10} /> {entryRank.name}
                                              </span>
                                          </div>
                                          <div className={`font-mono font-bold ${isOverload ? 'text-red-400' : 'text-blue-400'}`}>
                                              {entry.points}
                                          </div>
                                      </div>
                                  );
                              })
                          )}
                      </div>
                  )}

                  {menuTab === 'rules' && (
                      <div className="max-w-md mx-auto space-y-6 animate-in slide-in-from-right relative z-10 pb-10">
                          {isOverload ? (
                              <>
                                  <div className="bg-red-900/20 border border-red-800/50 p-4 rounded-xl">
                                      <h3 className="font-bold text-red-400 mb-2 flex items-center gap-2"><Zap size={18}/> 核心機制：賭注</h3>
                                      <p className="text-sm text-gray-300 leading-relaxed">
                                          攻擊方可選擇 <span className="text-green-400">Lv1</span>、<span className="text-orange-400">Lv2</span> 或 <span className="text-red-500 font-bold">Lv3</span> 超載等級。等級越高，傷害越高，但需要「質押」自己的 HP。若對手防禦成功，你會受到反噬傷害！
                                      </p>
                                  </div>
                                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                      <h3 className="font-bold text-yellow-400 mb-2 flex items-center gap-2"><Shield size={18}/> 完美格擋</h3>
                                      <p className="text-sm text-gray-300 leading-relaxed">
                                          防守方若在 <span className="text-white font-bold">3 秒內</span> 正確答題，觸發完美格擋，將對手的反噬傷害 <span className="text-yellow-400 font-bold">加倍</span>。
                                      </p>
                                  </div>
                                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                      <h3 className="font-bold text-purple-400 mb-2 flex items-center gap-2"><Flame size={18}/> 腎上腺素</h3>
                                      <p className="text-sm text-gray-300 leading-relaxed">
                                          當 HP 低於 30% 時，進入絕地反擊狀態。所有攻擊免費升級為 <span className="text-orange-400">Lv2</span> 且不消耗 HP。
                                      </p>
                                  </div>
                              </>
                          ) : (
                              <>
                                  <div className="bg-blue-900/20 border border-blue-800/50 p-4 rounded-xl">
                                      <h3 className="font-bold text-blue-400 mb-2 flex items-center gap-2"><Swords size={18}/> 基礎規則</h3>
                                      <p className="text-sm text-gray-300 leading-relaxed">
                                          雙方輪流攻擊與防守。攻擊方選擇單字卡，防守方需選出正確中文解釋。防守失敗扣除 HP，直到一方歸零。
                                      </p>
                                  </div>
                                  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                                      <h3 className="font-bold text-indigo-400 mb-2 flex items-center gap-2"><Sparkles size={18}/> 技能卡</h3>
                                      <p className="text-sm text-gray-300 leading-relaxed">
                                          隨機出現技能卡：<br/>
                                          - <span className="text-green-400">治癒</span>: 回復 HP<br/>
                                          - <span className="text-blue-400">護盾</span>: 抵擋一次傷害<br/>
                                          - <span className="text-yellow-400">爆擊</span>: 傷害 1.5 倍<br/>
                                          - <span className="text-purple-400">致盲</span>: 遮蔽對手畫面
                                      </p>
                                  </div>
                              </>
                          )}
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
            
            {showAiPrompt && (
                <div className="absolute inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-gray-800 w-full max-w-xs rounded-2xl p-6 shadow-2xl border border-gray-700 text-center animate-in zoom-in">
                        <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={32} className="text-gray-400" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">似乎沒有對手...</h3>
                        <p className="text-gray-400 text-sm mb-6">要挑戰 AI 機器人嗎？(不影響積分)</p>
                        <div className="flex gap-3">
                            <button onClick={handleExit} className="flex-1 py-3 bg-gray-700 text-white rounded-xl font-bold">離開</button>
                            <button onClick={startAiMatch} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold">挑戰 AI</button>
                        </div>
                    </div>
                </div>
            )}

            <div className="relative w-64 h-64 flex items-center justify-center">
                <div className={`absolute inset-0 border rounded-full animate-ping ${gameMode==='OVERLOAD'?'border-red-500/20':'border-blue-500/20'}`} style={{ animationDuration: '2s' }}></div>
                <div className="relative z-10 w-24 h-24 rounded-full bg-gray-800 border-2 border-gray-600 flex items-center justify-center overflow-hidden">
                    {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : <UserIcon size={40} className="text-gray-500"/>}
                </div>
            </div>
            
            <div className="mt-8 text-center px-6">
                 <h2 className="text-xl font-bold text-white animate-pulse tracking-widest mb-2 break-all">
                     {roomId && roomId.startsWith('room_') && !matchStatus.includes("配對成功") ? matchStatus : (phase === 'connecting' ? '建立戰場連線中...' : matchStatus)}
                 </h2>
                 {phase === 'matching' && <p className="text-gray-400 text-xs mt-2">正在搜尋對手... (15秒後自動切換 AI)</p>}
            </div>
            
            {phase === 'matching' && (
                <button onClick={handleExit} className="absolute top-safe left-4 p-3 bg-gray-800 rounded-full text-gray-400 hover:text-white mt-4">
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
                             <div className="w-14 h-14 rounded-full bg-gray-700 mx-auto mb-2 overflow-hidden border-2 border-gray-600 flex items-center justify-center">
                                 {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                             </div>
                             <div className="text-lg font-bold text-white">{myHp}</div>
                         </div>
                         <div className="text-2xl font-black text-gray-600">VS</div>
                         <div className="text-center">
                             <div className={`w-14 h-14 rounded-full bg-gray-700 mx-auto mb-2 overflow-hidden border-2 border-gray-600 opacity-80 flex items-center justify-center ${opponent?.isAi ? opponent.avatarColor : ''}`}>
                                 {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : (opponent?.name[0] || '?')}
                             </div>
                             <div className="text-lg font-bold text-gray-400">{opHp}</div>
                         </div>
                     </div>
                 </div>
                 
                 <button 
                    onClick={() => {
                        // Pass the mode played to handle correct rating update
                        onFinish({ isWin, score: 0, ratingChange: isWin ? 50 : -20, opponentName: '', mode: gameMode });
                        setRoomId(null); 
                    }}
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
      <div className={`fixed inset-0 z-[60] bg-gray-900 flex flex-col overflow-hidden font-sans transition-colors duration-500 ${isAdrenaline ? 'border-4 border-red-600/50' : ''}`}>
          
          {/* Adrenaline FX */}
          {isAdrenaline && <div className="absolute inset-0 bg-red-900/10 pointer-events-none animate-pulse z-0"></div>}

          {/* Top Bar: Opponent */}
          <div className="bg-gray-800/90 p-4 pt-safe flex items-center gap-4 border-b border-gray-700 shadow-lg z-20 relative">
              <button onClick={handleSurrender} className="absolute top-safe right-4 z-30 text-gray-500 hover:text-red-500">
                  <Flag size={18} />
              </button>

              <div className={`relative w-12 h-12 rounded-full ${opponent?.avatarColor} flex-shrink-0 overflow-hidden border-2 border-gray-600 flex items-center justify-center`}>
                  {opponent?.avatarImage ? <img src={opponent.avatarImage} className="w-full h-full object-cover"/> : (opponent?.name[0] || '?')}
                  {opDefenseResult === 'fail' && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center font-black text-white text-xs animate-ping">HIT</div>}
                  {opDefenseResult === 'backlash' && <div className="absolute inset-0 bg-purple-500/80 flex items-center justify-center font-black text-white text-xs animate-ping">反噬</div>}
              </div>
              <div className="flex-1 min-w-0 pr-8">
                  <div className="flex justify-between items-end mb-1.5">
                      <span className="font-bold text-gray-200 text-sm truncate">{opponent?.name} {opponent?.isAi && '(AI)'}</span>
                      <span className="text-xs font-mono text-rose-400">{opHp}/{MAX_HP}</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className="h-full bg-rose-500 transition-all duration-500" style={{ width: `${(opHp / MAX_HP) * 100}%` }}></div>
                  </div>
              </div>
          </div>

          {/* Battle Arena */}
          <div className="flex-1 flex flex-col relative bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]">
              <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-transparent to-gray-900 opacity-90"></div>
              
              {/* Blind Effect */}
              {blindEffect && (
                  <div className="absolute inset-0 z-30 bg-white flex items-center justify-center flex-col animate-in fade-in duration-500">
                      <EyeOff size={80} className="text-gray-900 mb-4" />
                      <span className="text-gray-900 font-black text-3xl">BLINDED</span>
                  </div>
              )}

              {/* Center Info */}
              <div className="absolute top-6 w-full text-center z-10">
                  <div className={`inline-block px-4 py-1 rounded-full border border-white/10 text-xs font-mono tracking-widest ${isAdrenaline ? 'bg-red-900/80 text-white animate-bounce' : 'bg-black/60 text-gray-400'}`}>
                      {isAdrenaline ? 'ADRENALINE ACTIVE' : `ROUND ${round} / ${TOTAL_ROUNDS}`}
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
                  {phase === 'selecting_attack' && !showChargePanel && (
                      <div className="w-full max-w-sm grid grid-cols-2 gap-3 animate-in slide-in-from-bottom duration-300">
                          {battleCards.map((card) => (
                              <button 
                                key={card.id}
                                onClick={() => handleCardClick(card)}
                                className={`
                                    relative h-36 rounded-2xl p-3 flex flex-col justify-center items-center text-center border-2 shadow-lg active:scale-95 transition-all
                                    ${card.type === 'SKILL' 
                                        ? 'bg-gray-800 border-indigo-500 hover:bg-gray-750' 
                                        : 'bg-white border-gray-300 hover:bg-gray-50'
                                    }
                                `}
                              >
                                  {card.type === 'SKILL' ? (
                                      <>
                                        <div className="bg-indigo-900/50 p-2.5 rounded-full mb-2 border border-indigo-500/30">
                                            {card.skill === 'HEAL' && <Heart size={24} className="text-green-400" />}
                                            {card.skill === 'SHIELD' && <Shield size={24} className="text-blue-400" />}
                                            {card.skill === 'CRIT' && <Swords size={24} className="text-yellow-400" />}
                                            {card.skill === 'BLIND' && <EyeOff size={24} className="text-purple-400" />}
                                            {card.skill === 'MIRROR' && <Split size={24} className="text-cyan-400" />}
                                            {card.skill === 'CHAOS' && <Shuffle size={24} className="text-rose-400" />}
                                            {card.skill === 'FIFTY_FIFTY' && <Bot size={24} className="text-orange-400" />}
                                        </div>
                                        <span className="font-bold text-white text-lg tracking-wide">{SKILL_NAMES[card.skill || 'NONE']}</span>
                                        <span className="text-[10px] text-gray-400 mt-1">{SKILL_DESCRIPTIONS[card.skill || 'NONE']}</span>
                                        <div className="absolute top-2 right-2 text-[10px] font-bold text-indigo-400 bg-indigo-900/50 px-1.5 py-0.5 rounded">SKILL</div>
                                      </>
                                  ) : (
                                      <>
                                        <span className="font-black text-gray-800 text-xl mb-2 leading-tight">{card.word?.en}</span>
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">{card.word?.zh}</span>
                                        <div className="absolute top-2 right-2 text-[10px] font-bold text-gray-400">Lv.{card.word?.level}</div>
                                      </>
                                  )}
                              </button>
                          ))}
                      </div>
                  )}

                  {/* Charge Panel (Overload Only) */}
                  {showChargePanel && selectedAttackCard && (
                      <div className="w-full max-w-sm bg-gray-800 p-6 rounded-3xl border border-gray-600 shadow-2xl animate-in zoom-in">
                          <h3 className="text-center font-bold text-white mb-4">設定超載等級</h3>
                          <div className="space-y-3 mb-6">
                              {[1, 2, 3].map((lvl) => {
                                  const info = CHARGE_LEVELS[lvl as OverloadLevel];
                                  const cost = isAdrenaline ? 0 : info.cost; // Free upgrade in Adrenaline
                                  const isSelected = chargeLevel === lvl;
                                  
                                  return (
                                      <button 
                                        key={lvl}
                                        onClick={() => setChargeLevel(lvl as OverloadLevel)}
                                        className={`w-full p-4 rounded-xl flex justify-between items-center transition-all ${isSelected ? `${info.color} text-white ring-2 ring-white scale-105` : 'bg-gray-700 text-gray-300'}`}
                                      >
                                          <div className="flex items-center gap-3">
                                              <div className="font-black text-lg">{info.name}</div>
                                              {isAdrenaline && lvl === 2 && <span className="text-[10px] bg-white text-red-600 px-1 rounded font-bold">FREE</span>}
                                          </div>
                                          <div className="text-xs font-mono text-right">
                                              <div>Dmg x{info.multiplier}</div>
                                              <div>Bet -{cost} HP</div>
                                          </div>
                                      </button>
                                  )
                              })}
                          </div>
                          <div className="flex gap-3">
                              <button onClick={() => setShowChargePanel(false)} className="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-bold">取消</button>
                              <button onClick={() => confirmAttack(selectedAttackCard, chargeLevel)} className="flex-1 py-3 bg-white text-black rounded-xl font-bold hover:bg-gray-200">發射</button>
                          </div>
                      </div>
                  )}

                  {/* Defend Phase */}
                  {phase === 'defending' && (incomingWord || incomingSkill !== 'NONE') && (
                      <div className="w-full max-w-sm animate-in zoom-in duration-200 relative">
                          {incomingSkill !== 'NONE' ? (
                              <div className="text-center py-10">
                                  <div className="w-20 h-20 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-4 animate-ping">
                                      <Zap size={40} className="text-yellow-400" />
                                  </div>
                                  <h2 className="text-xl font-bold text-white">對手使用了技能！</h2>
                              </div>
                          ) : (
                              <>
                                {/* Danger Warning for High Charge */}
                                {gameMode === 'OVERLOAD' && incomingCharge >= 2 && (
                                    <div className={`absolute -top-12 left-0 right-0 text-center font-black tracking-[0.5em] animate-pulse ${incomingCharge === 3 ? 'text-red-500 text-2xl' : 'text-orange-400'}`}>
                                        {incomingCharge === 3 ? '⚠ DANGER ⚠' : 'WARNING'}
                                    </div>
                                )}

                                <div className={`bg-rose-600 text-white p-6 rounded-2xl text-center mb-6 shadow-[0_0_30px_rgba(225,29,72,0.4)] border ${incomingCharge === 3 ? 'border-red-500 border-4 animate-pulse' : 'border-rose-400/50'}`}>
                                    <div className="text-[10px] font-bold opacity-80 mb-2 tracking-widest uppercase">
                                        Incoming Attack {gameMode === 'OVERLOAD' && `(Lv${incomingCharge})`}
                                    </div>
                                    <h2 className="text-4xl font-black tracking-tight">{incomingWord?.en}</h2>
                                </div>
                                
                                <div className="grid grid-cols-1 gap-3">
                                    {defenseOptions.map((opt, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleDefend(opt)}
                                            style={{ opacity: chaosEffect ? 0 : 1, transition: 'opacity 2s' }} // Chaos Effect
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

                  {/* Round Summary (Enhanced UI) */}
                  {phase === 'round_summary' && (
                      <div className="w-full max-w-sm animate-in zoom-in duration-300">
                          <div className="bg-gray-800/90 backdrop-blur border-2 border-gray-600 rounded-3xl overflow-hidden shadow-2xl relative">
                              <div className="bg-gray-900/50 p-4 text-center border-b border-gray-700">
                                  <h2 className="text-xl font-black text-white tracking-widest uppercase">回合結算</h2>
                              </div>
                              
                              <div className="p-6 grid grid-cols-2 gap-4 relative">
                                  {/* VS Divider */}
                                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-gray-500 font-black italic opacity-50 text-4xl pointer-events-none">VS</div>

                                  {/* YOU Column */}
                                  <div className="flex flex-col items-center gap-2">
                                      <span className="text-blue-400 font-bold text-xs">我方</span>
                                      {myDefenseResult === 'success' ? (
                                          <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center border-2 border-blue-500 text-blue-400">
                                              <Shield size={32} />
                                          </div>
                                      ) : myDefenseResult === 'fail' ? (
                                          <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center border-2 border-red-500 text-red-500 animate-pulse">
                                              <HeartCrack size={32} />
                                          </div>
                                      ) : (
                                          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                                              <Activity size={32} className="text-gray-500"/>
                                          </div>
                                      )}
                                      <div className={`font-black text-xl ${myLastDamageTaken > 0 ? 'text-red-500' : 'text-green-500'}`}>
                                          {myLastDamageTaken > 0 ? `-${myLastDamageTaken}` : '安全'}
                                      </div>
                                      <span className="text-[10px] text-gray-400">受到傷害</span>
                                  </div>

                                  {/* ENEMY Column */}
                                  <div className="flex flex-col items-center gap-2">
                                      <span className="text-rose-400 font-bold text-xs">對手</span>
                                      {opDefenseResult === 'success' || opDefenseResult === 'backlash' ? (
                                          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center border-2 border-gray-600 opacity-50">
                                              <Shield size={32} />
                                          </div>
                                      ) : opDefenseResult === 'fail' ? (
                                          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center border-2 border-green-500 text-green-500">
                                              <Target size={32} />
                                          </div>
                                      ) : (
                                          <div className="w-16 h-16 bg-gray-700 rounded-full flex items-center justify-center">
                                              <Activity size={32} className="text-gray-500"/>
                                          </div>
                                      )}
                                      <div className={`font-black text-xl ${opLastDamageTaken > 0 ? 'text-green-500' : 'text-gray-500'}`}>
                                          {opLastDamageTaken > 0 ? `-${opLastDamageTaken}` : '未命中'}
                                      </div>
                                      <span className="text-[10px] text-gray-400">造成傷害</span>
                                  </div>
                              </div>

                              {/* Footer Status & Description */}
                              <div className="bg-black/40 p-3 text-center border-t border-gray-700">
                                  <p className="text-xs text-gray-300 font-bold mb-2 animate-pulse">{getSummaryDescription()}</p>
                                  <div className="flex items-center justify-center gap-2 text-yellow-400">
                                      <Hourglass size={16} />
                                      <span className="text-xs font-bold uppercase tracking-wider">下回合準備中...</span>
                                  </div>
                              </div>
                          </div>
                      </div>
                  )}

                  {/* Sync Barrier Wait Screen */}
                  {phase === 'waiting_next_round' && (
                      <div className="text-center animate-pulse">
                          <Hourglass size={48} className="text-blue-400 mx-auto mb-4" />
                          <h2 className="text-xl font-bold text-white mb-2">等待同步...</h2>
                          <p className="text-gray-400 text-sm">雙方確認後將自動開始下一回合</p>
                      </div>
                  )}
              </div>
          </div>

          {/* Bottom Bar: Me */}
          <div className="bg-gray-800/90 p-4 pb-8 flex items-center gap-4 border-t border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.3)] z-20">
              <div className="flex-1 min-w-0 text-right">
                  <div className="flex justify-end items-end mb-1.5 gap-2">
                      {isAdrenaline && <Flame size={16} className="text-red-500 animate-pulse" />}
                      <span className={`text-xs font-mono ${isAdrenaline ? 'text-red-500 font-bold' : 'text-blue-400'}`}>{myHp}/{MAX_HP}</span>
                      <span className="font-bold text-blue-400 text-sm">我方</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-500 ${isAdrenaline ? 'bg-red-600' : 'bg-blue-500'}`} style={{ width: `${(myHp / MAX_HP) * 100}%` }}></div>
                  </div>
              </div>
              <div className={`relative w-14 h-14 rounded-full ${user.avatarColor} flex-shrink-0 overflow-hidden border-2 border-white shadow-[0_0_15px_rgba(59,130,246,0.4)] flex items-center justify-center`}>
                  {user.avatarImage ? <img src={user.avatarImage} className="w-full h-full object-cover"/> : user.name[0]}
                  {myDefenseResult === 'fail' && <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center font-black text-white text-xs animate-ping">HIT</div>}
              </div>
          </div>
      </div>
  );
};
