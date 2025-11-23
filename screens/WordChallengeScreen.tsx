import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Timer, Zap, Trophy, Crown, Play, Heart, Lock, BarChart, HelpCircle, X } from 'lucide-react';
import { User, Word, GameResult, GameLeaderboardEntry } from '../types';
import { fetchGameLeaderboard, submitGameScore } from '../services/dataService';

interface WordChallengeScreenProps {
  user: User;
  words: Word[];
  onBack: () => void;
  onFinish: (result: GameResult) => void;
  onUpdateHearts: (hearts: number) => void;
}

const INITIAL_TIME = 30; // Seconds

export const WordChallengeScreen: React.FC<WordChallengeScreenProps> = ({ 
    user, words, onBack, onFinish, onUpdateHearts 
}) => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [activeTab, setActiveTab] = useState<'play' | 'rank'>('play');
  const [leaderboard, setLeaderboard] = useState<GameLeaderboardEntry[]>([]);
  const [showHelp, setShowHelp] = useState(false);
  
  // Game Logic
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [currentWord, setCurrentWord] = useState<Word | null>(null);
  const [options, setOptions] = useState<string[]>([]);
  const [correctCount, setCorrectCount] = useState(0);
  const [level, setLevel] = useState(3); // Start at Level 3
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<number | null>(null);

  // Fetch Leaderboard on mount
  useEffect(() => {
      const loadLeaderboard = async () => {
          const data = await fetchGameLeaderboard();
          setLeaderboard(data);
      };
      loadLeaderboard();
  }, []);

  // Filter words by level logic
  const getPool = (currentLvl: number) => {
      // Return words suitable for current difficulty
      // Game progress: Lv3 -> Lv4 -> Lv5 -> Lv6
      return words.filter(w => w.level <= currentLvl && w.level >= Math.max(3, currentLvl - 1));
  };

  const generateQuestion = () => {
    const pool = getPool(level);
    const target = pool[Math.floor(Math.random() * pool.length)];
    if (!target) return; // Safety

    setCurrentWord(target);

    // Generate 3 wrong answers
    const wrongs = words
        .filter(w => w.id !== target.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.zh);
    
    // Combine and shuffle
    const allOptions = [target.zh, ...wrongs].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
  };

  const handleStartGame = () => {
      if (user.hearts <= 0) {
          alert("今日愛心已用完，請明天再來挑戰！");
          return;
      }
      
      // Deduct Heart
      onUpdateHearts(user.hearts - 1);

      setGameState('playing');
      setTimeLeft(INITIAL_TIME);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setCorrectCount(0);
      setLevel(3); // Reset to base level
      generateQuestion();

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
          setTimeLeft(prev => {
              if (prev <= 1) {
                  endGame();
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const endGame = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      setGameState('gameover');
  };

  const handleAnswer = (answer: string) => {
      if (!currentWord) return;

      if (answer === currentWord.zh) {
          // Correct
          const timeBonus = 2;
          const comboBonus = Math.min(combo * 10, 50); 
          const points = 100 + comboBonus;
          
          setScore(prev => prev + points);
          setCombo(prev => prev + 1);
          if (combo + 1 > maxCombo) setMaxCombo(combo + 1);
          setTimeLeft(prev => Math.min(prev + timeBonus, 60)); 
          setCorrectCount(prev => prev + 1);
          setFeedback('correct');

          // Difficulty Progression
          if ((correctCount + 1) % 5 === 0) {
              setLevel(prev => Math.min(prev + 1, 6)); // Cap at level 6
          }

      } else {
          // Wrong
          setTimeLeft(prev => Math.max(prev - 5, 0));
          setCombo(0);
          setFeedback('wrong');
      }

      setTimeout(() => {
          setFeedback(null);
          if (timeLeft > 0) generateQuestion();
      }, 200);
  };

  const handleClaim = async () => {
      // Submit score to DB
      await submitGameScore(user, score);
      
      onFinish({ score, maxCombo, correctCount });
      onBack();
  };

  useEffect(() => {
      return () => {
          if (timerRef.current) clearInterval(timerRef.current);
      };
  }, []);

  const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      default: return 'ring-2 ring-white/30';
    }
  };

  // Using fixed inset-0 to ensure it covers entire viewport and ignores layout padding
  const containerClass = "fixed inset-0 z-50 flex flex-col bg-gradient-to-br from-indigo-600 to-purple-700 text-white overflow-hidden";

  // Fix JSX syntax error by moving conditional logic outside return
  const startButtonContent = user.hearts > 0 ? (
      <>
        <Play size={24} fill="currentColor" /> 開始挑戰
      </>
  ) : (
      <>
        <Lock size={24} /> 明日再來
      </>
  );

  // --- MENU ---
  if (gameState === 'menu') {
      return (
          <div className={containerClass}>
              {/* Background FX */}
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                  <div className="absolute bottom-10 right-10 w-48 h-48 bg-pink-400 rounded-full blur-3xl"></div>
              </div>

              {/* Header */}
              <div className="p-6 flex justify-between items-center relative z-10">
                  <button onClick={onBack} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                      <ArrowLeft size={24} />
                  </button>
                  <div className="flex gap-3">
                        <button onClick={() => setShowHelp(true)} className="bg-white/20 p-2 rounded-full hover:bg-white/30">
                            <HelpCircle size={20} />
                        </button>
                        <div className="flex gap-1 items-center bg-black/20 px-3 py-1 rounded-full">
                            {[1, 2, 3].map(i => (
                                <Heart 
                                    key={i} 
                                    size={18} 
                                    className={`${i <= user.hearts ? 'fill-red-500 text-red-500' : 'text-white/20'} transition-all`} 
                                />
                            ))}
                        </div>
                  </div>
              </div>

              <div className="px-6 flex-1 flex flex-col">
                {/* Tabs */}
                <div className="flex bg-black/20 p-1 rounded-xl mb-6 relative z-10">
                    <button 
                        onClick={() => setActiveTab('play')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'play' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200'}`}
                    >
                        <Zap size={16} /> 挑戰
                    </button>
                    <button 
                        onClick={() => setActiveTab('rank')}
                        className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'rank' ? 'bg-white text-indigo-700 shadow-sm' : 'text-indigo-200'}`}
                    >
                        <BarChart size={16} /> 排行榜
                    </button>
                </div>

                {activeTab === 'play' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 animate-in fade-in slide-in-from-bottom-4 pb-20">
                        <div className="bg-white/10 p-6 rounded-full mb-6 border-4 border-white/20 shadow-2xl shadow-indigo-500/50 relative">
                            <Trophy size={64} className="text-yellow-300" />
                            <div className="absolute -bottom-2 -right-2 bg-red-500 text-white text-xs font-bold px-2 py-1 rounded-full border-2 border-indigo-700">Lv.3-6</div>
                        </div>
                        <h1 className="text-4xl font-black mb-2 tracking-tight drop-shadow-sm">單字挑戰賽</h1>
                        <p className="text-indigo-200 mb-8 font-medium">7000 單學術/工程字彙</p>

                        <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-8">
                            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl flex flex-col items-center border border-white/10">
                                <span className="text-2xl font-bold">30s</span>
                                <span className="text-[10px] uppercase opacity-70">限時</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl flex flex-col items-center border border-white/10">
                                <span className="text-2xl font-bold">+2s</span>
                                <span className="text-[10px] uppercase opacity-70">獎勵</span>
                            </div>
                            <div className="bg-white/10 backdrop-blur-sm p-3 rounded-2xl flex flex-col items-center border border-white/10">
                                <span className="text-2xl font-bold">PT</span>
                                <span className="text-[10px] uppercase opacity-70">積分</span>
                            </div>
                        </div>

                        <button 
                            onClick={handleStartGame}
                            disabled={user.hearts <= 0}
                            className={`w-full max-w-xs font-black text-xl py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                                user.hearts > 0 
                                ? 'bg-yellow-400 text-yellow-900 shadow-yellow-500/30 hover:bg-yellow-300 hover:scale-105 active:scale-95'
                                : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {startButtonContent}
                        </button>
                        {user.hearts <= 0 && <p className="text-xs text-indigo-300 mt-2 bg-black/20 px-3 py-1 rounded-full">愛心將於午夜重置</p>}
                    </div>
                ) : (
                    <div className="flex-1 w-full max-w-sm mx-auto relative z-10 animate-in fade-in slide-in-from-right-4 pb-20 overflow-hidden flex flex-col">
                        <div className="bg-white/10 rounded-2xl p-4 flex-1 overflow-y-auto border border-white/10">
                            <h3 className="text-center font-bold mb-4 text-indigo-100 flex items-center justify-center gap-2">
                                <Crown size={16} className="text-yellow-400" /> 歷史排行榜
                            </h3>
                            <div className="space-y-3">
                                {leaderboard.length === 0 ? (
                                    <p className="text-center text-indigo-300 py-10">暫無紀錄，來當第一名吧！</p>
                                ) : (
                                    leaderboard.map((entry, idx) => (
                                        <div key={idx} className="bg-black/20 p-3 rounded-xl flex items-center">
                                            <div className={`w-8 flex items-center justify-center font-black text-lg italic ${idx === 0 ? 'text-yellow-400' : idx === 1 ? 'text-gray-300' : idx === 2 ? 'text-orange-400' : 'text-indigo-300'}`}>
                                                #{entry.rank}
                                            </div>
                                            <div className={`w-10 h-10 rounded-full mx-3 ${entry.avatarColor} flex items-center justify-center font-bold border border-white/10 ${getFrameStyle(entry.avatarFrame)}`}>
                                                {entry.name[0]}
                                            </div>
                                            <div className="flex-1 flex flex-col justify-center">
                                                <span className="font-bold text-sm">{entry.name}</span>
                                            </div>
                                            <div className="flex items-center font-mono font-bold text-yellow-300">
                                                {entry.score}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                )}
              </div>

              {/* HELP MODAL */}
              {showHelp && (
                  <div className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                      <div className="bg-white text-gray-900 rounded-3xl p-6 max-w-xs w-full shadow-2xl">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-black text-xl flex items-center gap-2"><HelpCircle className="text-indigo-600"/> 遊戲說明</h3>
                              <button onClick={() => setShowHelp(false)} className="bg-gray-100 p-1 rounded-full"><X size={20}/></button>
                          </div>
                          <div className="space-y-3 text-sm text-gray-600">
                              <p>🎯 <span className="font-bold text-gray-800">目標：</span>在限時內答對越多單字越好。</p>
                              <p>⚡ <span className="font-bold text-gray-800">連擊 (Combo)：</span>連續答對會增加得分倍率。答錯會重置連擊並扣除時間。</p>
                              <p>🆙 <span className="font-bold text-gray-800">難度：</span>每答對 5 題，單字難度會提升 (Level 3 ~ 6)。</p>
                              <p>💰 <span className="font-bold text-gray-800">獎勵：</span>遊戲結束後，獲得積分 = 分數 / 50。</p>
                          </div>
                          <button onClick={() => setShowHelp(false)} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl mt-6">我知道了</button>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // --- PLAYING ---
  if (gameState === 'playing') {
      return (
          <div className={`${containerClass} ${feedback === 'correct' ? 'bg-green-600' : feedback === 'wrong' ? 'bg-red-600' : ''} transition-colors duration-200`}>
              {/* HUD */}
              <div className="flex justify-between items-center p-6 pt-8">
                  <div className="flex flex-col">
                      <span className="text-xs text-white/60 font-bold uppercase">Score</span>
                      <span className="text-3xl font-mono font-bold">{score}</span>
                  </div>
                  <div className={`flex flex-col items-center ${timeLeft <= 5 ? 'scale-110 text-red-300' : ''} transition-transform`}>
                      <div className="bg-black/20 px-4 py-1 rounded-full flex items-center gap-2 backdrop-blur-sm border border-white/10">
                        <Timer size={20} />
                        <span className="text-xl font-bold font-mono">{timeLeft}s</span>
                      </div>
                  </div>
                  <div className="flex flex-col items-end">
                      <span className="text-xs text-white/60 font-bold uppercase">Combo</span>
                      <span className={`text-3xl font-mono font-bold ${combo > 5 ? 'text-yellow-300 scale-110' : 'text-white'} transition-all`}>x{combo}</span>
                  </div>
              </div>

              {/* Question */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-10">
                  <div className="mb-4 animate-bounce">
                      <span className="bg-white/20 text-xs font-bold px-3 py-1 rounded-full border border-white/20 shadow-sm">LEVEL {level}</span>
                  </div>
                  <h2 className="text-5xl font-black text-center mb-6 tracking-wide drop-shadow-lg">{currentWord?.en}</h2>
                  
                  {/* Progress Bar styled decoration */}
                  <div className="h-1.5 w-24 bg-white/20 rounded-full overflow-hidden mb-8">
                      <div className="h-full bg-white/80 w-full animate-pulse"></div>
                  </div>

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-3 w-full max-w-md">
                    {options.map((opt, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleAnswer(opt)}
                            className="bg-white/10 hover:bg-white/25 py-4 rounded-2xl text-xl font-bold border border-white/20 shadow-sm active:scale-[0.98] transition-all backdrop-blur-sm"
                        >
                            {opt}
                        </button>
                    ))}
                  </div>
              </div>
          </div>
      );
  }

  // --- GAME OVER ---
  return (
      <div className={containerClass}>
           <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-yellow-500 via-purple-500 to-indigo-500 opacity-20 animate-spin-slow"></div>
           </div>

           <div className="flex-1 flex items-center justify-center p-6 relative z-10">
                <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[2rem] border border-white/20 w-full max-w-sm text-center shadow-2xl">
                    <div className="w-24 h-24 bg-gradient-to-br from-yellow-300 to-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-500/40 animate-in zoom-in duration-300">
                        <Crown size={48} className="text-white" fill="currentColor" />
                    </div>
                    
                    <h2 className="text-3xl font-black mb-1 text-white">CHALLENGE OVER</h2>
                    <p className="text-indigo-200 text-sm mb-8 font-medium">結算成績</p>

                    <div className="bg-black/20 rounded-2xl p-6 mb-6 border border-white/5">
                        <div className="text-6xl font-mono font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 to-yellow-100 mb-4 drop-shadow-sm">{score}</div>
                        <div className="flex justify-between text-xs font-bold text-indigo-200 px-2">
                            <div className="flex flex-col items-center bg-white/5 p-2 rounded-lg min-w-[80px]">
                                <span className="opacity-60 mb-1">MAX COMBO</span>
                                <span className="text-lg text-white">{maxCombo}</span>
                            </div>
                            <div className="flex flex-col items-center bg-white/5 p-2 rounded-lg min-w-[80px]">
                                <span className="opacity-60 mb-1">CORRECT</span>
                                <span className="text-lg text-white">{correctCount}</span>
                            </div>
                        </div>
                    </div>

                    <div className="bg-green-500/20 text-green-300 border border-green-500/30 p-4 rounded-2xl mb-6 text-lg font-bold flex items-center justify-center gap-2 shadow-inner">
                        <Zap size={20} fill="currentColor" />
                        獲得: +{Math.floor(score / 50)} PT
                    </div>

                    <button 
                        onClick={handleClaim}
                        className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-500/40 hover:scale-105 transition-all active:scale-95"
                    >
                        領取獎勵並返回
                    </button>
                </div>
           </div>
      </div>
  );
};
