import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Timer, Zap, Trophy, Crown, Play, Lock, BarChart, HelpCircle, X, Check, AlertCircle, BookOpen } from 'lucide-react';
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
  
  // Interaction State
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mistake Tracking
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [hasReviewed, setHasReviewed] = useState(false);

  const timerRef = useRef<number | null>(null);

  // Fetch Leaderboard on mount
  useEffect(() => {
      const loadLeaderboard = async () => {
          const data = await fetchGameLeaderboard();
          setLeaderboard(data);
      };
      loadLeaderboard();
  }, []);

  // Filter words by strict level logic to ensure all levels are played
  const getPool = (currentLvl: number) => {
      // Strictly return words for the current level to force progression
      return words.filter(w => w.level === currentLvl);
  };

  const generateQuestion = () => {
    // Difficulty Progression Logic
    let nextLevel = 3;
    if (correctCount >= 15) nextLevel = 6;
    else if (correctCount >= 10) nextLevel = 5;
    else if (correctCount >= 5) nextLevel = 4;
    
    setLevel(nextLevel);

    const pool = getPool(nextLevel);
    // Fallback to all words if pool is empty (safety)
    const safePool = pool.length > 0 ? pool : words;
    
    const target = safePool[Math.floor(Math.random() * safePool.length)];
    if (!target) return;

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
          alert("今日遊玩次數已達上限，請明天再來挑戰！");
          return;
      }
      
      // Update Play Count (Hearts)
      onUpdateHearts(user.hearts - 1);

      setGameState('playing');
      setTimeLeft(INITIAL_TIME);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setCorrectCount(0);
      setWrongWords([]);
      setHasReviewed(false);
      setLevel(3);
      setFeedback(null);
      setSelectedOption(null);
      setIsProcessing(false);
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
      if (isProcessing || !currentWord) return;
      setIsProcessing(true);
      setSelectedOption(answer);

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

      } else {
          // Wrong
          setTimeLeft(prev => Math.max(prev - 5, 0));
          setCombo(0);
          setFeedback('wrong');
          
          // Track Mistake (Prevent duplicates)
          if (!wrongWords.find(w => w.id === currentWord.id)) {
              setWrongWords(prev => [...prev, currentWord]);
          }
      }

      // Add delay to show feedback
      setTimeout(() => {
          setFeedback(null);
          setSelectedOption(null);
          setIsProcessing(false);
          // Only generate next question if time is remaining
          generateQuestion();
      }, 1000);
  };

  const handleReviewDone = () => {
      if (!hasReviewed) {
          setScore(prev => prev + 500); // Bonus score for review (equivalent to 10PT)
          setHasReviewed(true);
          // Just subtle visual feedback instead of alert
      }
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
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
  };

  const bgClass = feedback === 'correct' ? 'bg-green-100 dark:bg-green-900/40' : feedback === 'wrong' ? 'bg-red-100 dark:bg-red-900/40' : 'bg-gray-100 dark:bg-gray-900';

  // --- MENU ---
  if (gameState === 'menu') {
      const remainingPlays = Math.max(0, user.hearts);

      return (
          <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden transition-colors">
              {/* Header */}
              <div className="p-4 bg-white dark:bg-gray-800 shadow-sm flex justify-between items-center z-10">
                  <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                  </button>
                  <div className="flex gap-3 items-center">
                        <button onClick={() => setShowHelp(true)} className="text-gray-400 hover:text-blue-500 transition-colors">
                            <HelpCircle size={22} />
                        </button>
                        <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                今日剩餘次數：{remainingPlays} / 3
                            </span>
                        </div>
                  </div>
              </div>

              <div className="p-4 flex-1 flex flex-col overflow-y-auto">
                {/* Tabs */}
                <div className="flex bg-gray-200 dark:bg-gray-700 p-1 rounded-xl mb-6">
                    <button 
                        onClick={() => setActiveTab('play')}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'play' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <Zap size={16} /> 挑戰
                    </button>
                    <button 
                        onClick={() => setActiveTab('rank')}
                        className={`flex-1 py-2.5 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-all ${activeTab === 'rank' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <BarChart size={16} /> 排行榜
                    </button>
                </div>

                {activeTab === 'play' ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center pb-20">
                        <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-700 mb-8 w-full max-w-xs relative overflow-hidden">
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 to-indigo-500"></div>
                            <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-blue-600 dark:text-blue-400">
                                <Trophy size={40} />
                            </div>
                            <h1 className="text-2xl font-black mb-2 text-gray-800 dark:text-white">英文單字挑戰</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">挑戰英文單字力，累積高分！</p>
                            
                            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-100 dark:border-yellow-900/30">
                                <h4 className="text-xs font-bold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center justify-center gap-1">
                                    <Crown size={12} /> 排行榜前三名獎勵
                                </h4>
                                <div className="flex flex-col gap-1 text-sm font-bold text-gray-700 dark:text-gray-200">
                                    <div className="flex justify-between items-center px-4">
                                        <span>🥇 第一名</span>
                                        <span className="text-blue-600 dark:text-blue-400">300 PT</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4">
                                        <span>🥈 第二名</span>
                                        <span className="text-blue-600 dark:text-blue-400">200 PT</span>
                                    </div>
                                    <div className="flex justify-between items-center px-4">
                                        <span>🥉 第三名</span>
                                        <span className="text-blue-600 dark:text-blue-400">100 PT</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <button 
                            onClick={handleStartGame}
                            disabled={remainingPlays <= 0}
                            className={`w-full max-w-xs py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                remainingPlays > 0 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {remainingPlays > 0 ? <><Play size={20} fill="currentColor"/> 開始挑戰</> : <><Lock size={20}/> 明日再來</>}
                        </button>
                        {remainingPlays <= 0 && <p className="text-xs text-gray-400 mt-4">每日挑戰次數將於午夜重置</p>}
                    </div>
                ) : (
                    <div className="flex-1 w-full max-w-md mx-auto overflow-hidden flex flex-col">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto p-4">
                            <h3 className="text-center font-bold mb-4 text-gray-800 dark:text-white flex items-center justify-center gap-2">
                                <Crown size={18} className="text-yellow-500 fill-current" /> 本週風雲榜
                            </h3>
                            <div className="space-y-3">
                                {leaderboard.length === 0 ? (
                                    <div className="text-center text-gray-400 py-8 text-sm">
                                        暫無紀錄，來當第一名吧！
                                    </div>
                                ) : (
                                    leaderboard.map((entry, idx) => (
                                        <div key={idx} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-xl flex items-center">
                                            <div className={`w-8 text-center font-black text-lg italic ${idx === 0 ? 'text-yellow-500' : idx === 1 ? 'text-gray-400' : idx === 2 ? 'text-orange-500' : 'text-blue-300'}`}>
                                                {entry.rank}
                                            </div>
                                            {/* Avatar with Frame */}
                                            <div className={`w-10 h-10 rounded-full mx-3 ${entry.avatarColor} flex items-center justify-center font-bold text-white text-xs ${getFrameStyle(entry.avatarFrame)} overflow-hidden`}>
                                                {entry.name[0]}
                                            </div>
                                            <div className="flex-1">
                                                <span className="font-bold text-sm text-gray-800 dark:text-white block">{entry.name}</span>
                                                <span className="text-[10px] text-gray-400">Score</span>
                                            </div>
                                            <div className="font-mono font-bold text-blue-600 dark:text-blue-400">
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
                  <div className="absolute inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
                      <div className="bg-white dark:bg-gray-800 w-full max-w-xs rounded-2xl p-6 shadow-2xl">
                          <div className="flex justify-between items-center mb-4">
                              <h3 className="font-bold text-lg text-gray-800 dark:text-white">遊戲說明</h3>
                              <button onClick={() => setShowHelp(false)} className="bg-gray-100 dark:bg-gray-700 p-1 rounded-full"><X size={18}/></button>
                          </div>
                          <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
                              <li>🎯 <b>目標：</b> 限時內答對越多單字越好。</li>
                              <li>🔥 <b>連擊：</b> 連續答對可獲得分數加成。</li>
                              <li>📈 <b>難度：</b> 單字等級隨答題數提升 (Lv 3-6)。</li>
                              <li>💰 <b>獎勵：</b> 結束後可獲得 PT 積分。</li>
                          </ul>
                          <button onClick={() => setShowHelp(false)} className="w-full bg-blue-600 text-white font-bold py-3 rounded-xl mt-6">我知道了</button>
                      </div>
                  </div>
              )}
          </div>
      );
  }

  // --- PLAYING ---
  if (gameState === 'playing') {
      return (
          <div className={`fixed inset-0 z-50 flex flex-col overflow-hidden transition-colors duration-300 ${bgClass}`}>
              {/* CSS for Shake Animation */}
              <style>{`
                  @keyframes shake {
                      0%, 100% { transform: translateX(0); }
                      10%, 30%, 50%, 70%, 90% { transform: translateX(-4px); }
                      20%, 40%, 60%, 80% { transform: translateX(4px); }
                  }
                  .animate-shake {
                      animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                  }
              `}</style>

              {/* Top Bar */}
              <div className="flex justify-between items-center p-6">
                  <div className="text-center">
                      <div className="text-xs text-gray-400 uppercase font-bold">Score</div>
                      <div className="text-2xl font-black text-gray-800 dark:text-white">{score}</div>
                  </div>
                  <div className="text-center">
                      <div className="bg-white dark:bg-gray-800 px-4 py-1 rounded-full shadow-sm border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                        <Timer size={16} className={`${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-blue-500'}`} />
                        <span className="text-xl font-bold font-mono text-gray-800 dark:text-white">{timeLeft}</span>
                      </div>
                  </div>
                  <div className="text-center">
                      <div className="text-xs text-gray-400 uppercase font-bold">Combo</div>
                      <div className={`text-2xl font-black ${combo > 0 ? 'text-yellow-500' : 'text-gray-300'}`}>x{combo}</div>
                  </div>
              </div>

              {/* Question */}
              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-bold px-3 py-1 rounded-full mb-6">
                      LEVEL {level}
                  </span>
                  <h2 className="text-4xl font-black text-center mb-10 text-gray-800 dark:text-white drop-shadow-sm">{currentWord?.en}</h2>
                  
                  <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                    {options.map((opt, idx) => {
                        // Logic for button appearance
                        // Base style: maintain size with py-4, fixed width etc
                        let buttonClass = "w-full py-4 rounded-xl text-lg font-bold border-2 shadow-sm transition-all duration-200 transform ";
                        
                        if (feedback) {
                            if (opt === currentWord?.zh) {
                                // Correct Answer: Green
                                buttonClass += "bg-green-500 border-green-600 text-white scale-100";
                            } else if (opt === selectedOption && feedback === 'wrong') {
                                // Selected Wrong Answer: Red + Shake
                                buttonClass += "bg-red-500 border-red-600 text-white animate-shake scale-100";
                            } else {
                                // Other Answers: Faded
                                buttonClass += "bg-gray-100 dark:bg-gray-800 text-gray-400 border-gray-200 dark:border-gray-700 opacity-50 cursor-not-allowed scale-100";
                            }
                        } else {
                            // Normal State: White/DarkBG
                            buttonClass += "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:text-blue-600 active:scale-[0.98]";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(opt)}
                                disabled={isProcessing}
                                className={buttonClass}
                            >
                                {opt}
                            </button>
                        );
                    })}
                  </div>
              </div>
          </div>
      );
  }

  // --- GAME OVER ---
  return (
      <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden transition-colors">
           <div className="flex-1 flex items-center justify-center p-6">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 w-full max-w-sm text-center shadow-xl">
                    <h2 className="text-2xl font-black mb-1 text-gray-800 dark:text-white">挑戰結束</h2>
                    <p className="text-gray-400 text-sm mb-6">Good Job!</p>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 mb-6">
                        <div className="text-5xl font-mono font-black text-blue-600 dark:text-blue-400 mb-4">{score}</div>
                        <div className="flex justify-between text-xs font-bold text-gray-500 dark:text-gray-400 px-4">
                            <div className="flex flex-col items-center">
                                <span className="uppercase tracking-wider mb-1">Max Combo</span>
                                <span className="text-lg text-gray-800 dark:text-white">{maxCombo}</span>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="uppercase tracking-wider mb-1">Correct</span>
                                <span className="text-lg text-gray-800 dark:text-white">{correctCount}</span>
                            </div>
                        </div>
                    </div>

                    {/* Mistake Review Section */}
                    {wrongWords.length > 0 && (
                        <div className="mb-6 text-left">
                            <h3 className="text-sm font-bold text-red-500 mb-2 flex items-center gap-1">
                                <AlertCircle size={14} /> 本次易錯單字 (必須複習)
                            </h3>
                            <div className="bg-red-50 dark:bg-red-900/10 rounded-xl p-3 max-h-32 overflow-y-auto border border-red-100 dark:border-red-900/30 space-y-2 mb-2">
                                {wrongWords.map((w, i) => (
                                    <div key={i} className="flex justify-between text-sm border-b border-red-100 dark:border-red-900/30 last:border-0 pb-1 last:pb-0">
                                        <span className="font-bold text-gray-800 dark:text-gray-200">{w.en}</span>
                                        <span className="text-gray-500 dark:text-gray-400">{w.zh}</span>
                                    </div>
                                ))}
                            </div>
                            <button 
                                onClick={handleReviewDone}
                                disabled={hasReviewed}
                                className={`w-full py-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1 transition-colors ${hasReviewed ? 'bg-green-100 text-green-600 cursor-default' : 'bg-red-100 text-red-600 hover:bg-red-200 animate-pulse'}`}
                            >
                                {hasReviewed ? <><Check size={12}/> 複習完成</> : <><BookOpen size={12}/> 我已閱讀並記住 (+500 Bonus)</>}
                            </button>
                        </div>
                    )}

                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-6 flex justify-center items-center gap-1">
                        遊戲積分: <span className="font-bold text-blue-600 dark:text-blue-400">+{Math.floor(score / 50)} PT</span>
                    </div>

                    <button 
                        onClick={handleClaim}
                        disabled={wrongWords.length > 0 && !hasReviewed}
                        className={`w-full font-bold py-4 rounded-2xl shadow-lg transition-transform active:scale-95 ${
                            wrongWords.length > 0 && !hasReviewed 
                            ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed' 
                            : 'bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:scale-[1.02]'
                        }`}
                    >
                        {wrongWords.length > 0 && !hasReviewed ? "請先點擊上方按鈕完成複習" : "領取獎勵並返回"}
                    </button>
                </div>
           </div>
      </div>
  );
};