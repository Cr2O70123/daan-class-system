
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Timer, Zap, Trophy, Crown, Play, Lock, BarChart, BookOpen, Coins, ChevronRight, Clock, AlertCircle, CheckCircle, Check, X, Sparkles, BrainCircuit, RefreshCw } from 'lucide-react';
import { User, Word, GameResult, GameLeaderboardEntry } from '../types';
import { fetchGameLeaderboard, submitGameScore } from '../services/dataService';
import { WORD_DATABASE } from '../services/mockData';

interface WordChallengeScreenProps {
  user: User;
  words: Word[]; // Kept for prop compatibility
  onBack: () => void;
  onFinish: (result: GameResult) => void;
  onUpdateHearts: (newPlays: number) => void;
}

const INITIAL_TIME = 30; // Seconds

// Sound Effect Helper using Web Audio API
const playSound = (type: 'correct' | 'wrong' | 'tick' | 'gameover' | 'start' | 'levelup' | 'timeout') => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    const now = ctx.currentTime;
    
    switch (type) {
      case 'correct':
        osc.type = 'sine';
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(1046.5, now + 0.1); // C6
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'wrong':
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.linearRampToValueAtTime(100, now + 0.2);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      case 'tick':
        osc.type = 'square';
        osc.frequency.setValueAtTime(800, now);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
        osc.start(now);
        osc.stop(now + 0.05);
        break;
      case 'gameover':
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 1);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 1);
        osc.start(now);
        osc.stop(now + 1);
        break;
      case 'start':
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.setValueAtTime(880, now + 0.1);
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.3);
          osc.start(now);
          osc.stop(now + 0.3);
          break;
      case 'levelup':
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(440, now); // A4
          osc.frequency.setValueAtTime(554.37, now + 0.1); // C#5
          osc.frequency.setValueAtTime(659.25, now + 0.2); // E5
          osc.frequency.setValueAtTime(880, now + 0.3); // A5
          gain.gain.setValueAtTime(0.1, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.6);
          osc.start(now);
          osc.stop(now + 0.6);
          break;
      case 'timeout':
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(400, now);
          osc.frequency.linearRampToValueAtTime(100, now + 0.5);
          gain.gain.setValueAtTime(0.2, now);
          gain.gain.linearRampToValueAtTime(0, now + 0.5);
          osc.start(now);
          osc.stop(now + 0.5);
          break;
    }
  } catch (e) {
    // Ignore audio errors
  }
};

const getLevel = (count: number) => {
    if (count >= 15) return 6;
    if (count >= 10) return 5;
    if (count >= 5) return 4;
    return 3;
};

export const WordChallengeScreen: React.FC<WordChallengeScreenProps> = ({ 
    user, words: ignoredProp, onBack, onFinish, onUpdateHearts 
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
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | 'timeout' | null>(null);
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // Mistake Tracking
  const [wrongWords, setWrongWords] = useState<Word[]>([]);
  const [reviewedIds, setReviewedIds] = useState<number[]>([]);
  
  // Local Word Pool (using extended mock data)
  const wordPool = WORD_DATABASE;

  const timerRef = useRef<number | null>(null);

  const MAX_PLAYS = 15;

  // Initialize Data (Leaderboard)
  useEffect(() => {
      const initData = async () => {
          if (gameState === 'menu' && activeTab === 'rank') {
              // Updated to fetch word_challenge specifically
              const data = await fetchGameLeaderboard('word_challenge');
              setLeaderboard(data);
          }
      };
      initData();
  }, [gameState, activeTab]);

  // Filter words by strict level logic to ensure all levels are played
  const getPool = (currentLvl: number) => {
      const pool = wordPool.filter(w => w.level === currentLvl);
      return pool.length > 0 ? pool : wordPool; // Fallback to whole pool if level empty
  };

  const generateQuestion = (currentCorrectCount = correctCount) => {
    const nextLevel = getLevel(currentCorrectCount);
    setLevel(nextLevel);

    const pool = getPool(nextLevel);
    if (pool.length === 0) return; 

    const target = pool[Math.floor(Math.random() * pool.length)];
    if (!target) return;

    setCurrentWord(target);

    // Generate 3 wrong answers
    // Try to pick wrong answers from same level if possible, else random
    let otherWords = wordPool.filter(w => w.id !== target.id);
    const sameLevelOthers = otherWords.filter(w => w.level === nextLevel);
    if (sameLevelOthers.length >= 3) {
        otherWords = sameLevelOthers;
    }

    const wrongs = otherWords
        .sort(() => 0.5 - Math.random())
        .slice(0, 3)
        .map(w => w.zh);
    
    // Combine and shuffle
    const allOptions = [target.zh, ...wrongs].sort(() => 0.5 - Math.random());
    setOptions(allOptions);
  };

  const handleStartGame = () => {
      if (user.dailyPlays >= MAX_PLAYS) {
          alert("今日遊玩次數已達 15 次上限，請明天再來挑戰！");
          return;
      }
      
      playSound('start');

      // Update Play Count (Increment)
      onUpdateHearts(user.dailyPlays + 1);

      setGameState('playing');
      setTimeLeft(INITIAL_TIME);
      setScore(0);
      setCombo(0);
      setMaxCombo(0);
      setCorrectCount(0);
      setWrongWords([]);
      setReviewedIds([]);
      setLevel(3);
      setFeedback(null);
      setShowCorrectAnswer(false);
      setSelectedOption(null);
      setIsProcessing(false);
      generateQuestion(0);

      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = window.setInterval(() => {
          setTimeLeft(prev => {
              // Sound Effect for Tick when time is running out (<= 5 seconds)
              if (prev <= 6 && prev > 1) {
                  playSound('tick');
              }
              if (prev <= 1) {
                  // TIMEOUT LOGIC: End game, but show answer first
                  handleTimeoutEnd();
                  return 0;
              }
              return prev - 1;
          });
      }, 1000);
  };

  const handleTimeoutEnd = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      playSound('timeout');
      
      // Reveal the correct answer for the current pending word
      setFeedback('timeout');
      setShowCorrectAnswer(true);
      
      // Note: We do NOT add to 'wrongWords' because the user didn't select wrong, just ran out of time.
      // Or we can add it but mark it differently. For now, strict "not an error" logic as requested.
      
      setTimeout(() => {
          setGameState('gameover');
      }, 2000); // 2 second delay to see answer
  };

  const handleAnswer = (answer: string) => {
      if (isProcessing || !currentWord) return;
      setIsProcessing(true);
      setSelectedOption(answer);

      const isCorrect = answer === currentWord.zh;
      const targetWord = currentWord;

      if (isCorrect) {
          // Correct Logic
          playSound('correct');
          const timeBonus = 2;
          const comboBonus = Math.min(combo * 10, 50); 
          const points = 100 + comboBonus;
          
          setScore(prev => prev + points);
          setCombo(prev => prev + 1);
          if (combo + 1 > maxCombo) setMaxCombo(combo + 1);
          setTimeLeft(prev => Math.min(prev + timeBonus, 60)); 
          
          const newCorrectCount = correctCount + 1;
          setCorrectCount(newCorrectCount);

          // Check for Level Up
          if (getLevel(newCorrectCount) > getLevel(correctCount)) {
              setTimeout(() => playSound('levelup'), 400);
          }
          
          setFeedback('correct');
          setShowCorrectAnswer(true);

          setTimeout(() => {
              setFeedback(null);
              setShowCorrectAnswer(false);
              setSelectedOption(null);
              setIsProcessing(false);
              if (timeLeft > 0) generateQuestion(newCorrectCount);
          }, 800);

      } else {
          // Wrong Logic
          playSound('wrong');
          setTimeLeft(prev => Math.max(prev - 5, 0));
          setCombo(0);
          
          setWrongWords(prev => {
              // Ensure we don't add duplicates
              if (prev.find(w => w.id === targetWord.id)) return prev;
              return [...prev, targetWord];
          });
          
          setFeedback('wrong');
          // Initially do NOT show correct answer to focus on mistake
          setShowCorrectAnswer(false);

          // After short delay, reveal correct answer
          setTimeout(() => {
              setShowCorrectAnswer(true);
          }, 500);

          // Move to next question after longer delay
          setTimeout(() => {
              setFeedback(null);
              setShowCorrectAnswer(false);
              setSelectedOption(null);
              setIsProcessing(false);
              if (timeLeft > 0) generateQuestion(correctCount);
          }, 1500);
      }
  };

  const handleReviewClick = (id: number) => {
      if (!reviewedIds.includes(id)) {
          setReviewedIds(prev => [...prev, id]);
      }
  };

  const handleClaim = async () => {
      try {
          // Updated to submit with word_challenge ID
          await submitGameScore(user, score, 'word_challenge');
          await onFinish({ score, maxCombo, correctCount });
          onBack();
      } catch(e) {
          console.error("Error submitting score", e);
          alert("分數上傳失敗，請檢查網路");
      }
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
      case 'frame_beta': return 'ring-2 ring-amber-500 border-2 border-dashed border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
  };

  const bgClass = feedback === 'correct' 
    ? 'bg-green-100 dark:bg-green-900' 
    : feedback === 'wrong' 
        ? 'bg-red-100 dark:bg-red-900' 
        : feedback === 'timeout'
            ? 'bg-gray-200 dark:bg-gray-800'
            : 'bg-gray-100 dark:bg-gray-900';
        
  const allReviewed = wrongWords.length === 0 || wrongWords.every(w => reviewedIds.includes(w.id));

  // --- MENU ---
  if (gameState === 'menu') {
      const canPlay = user.dailyPlays < MAX_PLAYS;

      return (
          <div className="fixed inset-0 z-50 flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white overflow-hidden transition-colors">
              {/* Header - Added pt-safe */}
              <div className="p-4 pt-safe bg-white dark:bg-gray-800 shadow-sm flex justify-between items-center z-10">
                  <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                      <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
                  </button>
                  <div className="flex gap-3 items-center">
                        <button 
                            onClick={() => setShowHelp(true)} 
                            className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-xs font-bold text-gray-600 dark:text-gray-300"
                        >
                            <BookOpen size={16} />
                            遊戲說明
                        </button>
                        <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-full border border-blue-100 dark:border-blue-800 flex items-center gap-1">
                            <Zap size={12} className="text-blue-500 fill-current" />
                            <span className="text-xs font-bold text-blue-600 dark:text-blue-400">
                                {Math.max(0, MAX_PLAYS - user.dailyPlays)}/{MAX_PLAYS}
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
                                <BookOpen size={40} />
                            </div>
                            <h1 className="text-2xl font-black mb-1 text-gray-800 dark:text-white">單字挑戰賽</h1>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">
                                內建 {wordPool.length} 個精選單字<br/>
                                挑戰極限，累積連擊！
                            </p>
                        </div>

                        <button 
                            onClick={handleStartGame}
                            disabled={!canPlay}
                            className={`w-full max-w-xs py-4 rounded-2xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
                                canPlay
                                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
                                : 'bg-gray-300 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            {canPlay ? (
                                <><Play size={20} fill="currentColor"/> 開始挑戰</> 
                            ) : (
                                <><Lock size={20}/> 明日再來</>
                            )}
                        </button>
                        {!canPlay && <p className="text-xs text-gray-400 mt-4">每日遊玩次數已達上限 (15次)</p>}
                    </div>
                ) : (
                    <div className="flex-1 w-full max-w-md mx-auto overflow-hidden flex flex-col">
                        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 flex-1 overflow-y-auto p-4">
                            <h3 className="text-center font-bold mb-1 text-gray-800 dark:text-white flex items-center justify-center gap-2">
                                <Crown size={18} className="text-yellow-500 fill-current" /> 本週風雲榜
                            </h3>
                            <p className="text-center text-[10px] text-gray-400 mb-4 flex items-center justify-center gap-1">
                                <Clock size={10} /> 每週一 00:00 重置
                            </p>
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

              {showHelp && (
                  <div className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
                      <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-6 shadow-2xl flex flex-col max-h-[85vh]">
                          <div className="flex justify-between items-center mb-6">
                              <h3 className="font-black text-xl text-gray-800 dark:text-white flex items-center gap-2">
                                  <BookOpen size={24} className="text-blue-600 dark:text-blue-400" />
                                  遊戲說明
                              </h3>
                              <button onClick={() => setShowHelp(false)} className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors">
                                  <X size={20} className="text-gray-500 dark:text-gray-300" />
                              </button>
                          </div>
                          <div className="space-y-6 overflow-y-auto pr-2" style={{ scrollbarWidth: 'thin' }}>
                              <div>
                                  <h4 className="text-sm font-bold text-gray-500 dark:text-gray-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                      <Timer size={16} /> 核心規則
                                  </h4>
                                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 space-y-3">
                                      <p className="text-sm text-gray-700 dark:text-gray-300">
                                          遊戲開始時擁有 30 秒。每答對一題 +2 秒 (上限 60 秒)，答錯 -5 秒。
                                      </p>
                                  </div>
                              </div>
                          </div>
                          <div className="mt-6 pt-2">
                              <button 
                                onClick={() => setShowHelp(false)} 
                                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 font-bold py-3.5 rounded-xl shadow-lg hover:opacity-90 transition-opacity active:scale-[0.98]"
                              >
                                  開始挑戰
                              </button>
                          </div>
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
              <style>{`
                  @keyframes shake {
                      0%, 100% { transform: translateX(0); }
                      10%, 30%, 50%, 70%, 90% { transform: translateX(-6px); }
                      20%, 40%, 60%, 80% { transform: translateX(6px); }
                  }
                  .animate-shake {
                      animation: shake 0.4s cubic-bezier(.36,.07,.19,.97) both;
                  }
              `}</style>

              {/* Top Bar - Added pt-safe */}
              <div className="flex justify-between items-center p-6 pt-safe z-10">
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
              <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12 z-10">
                  <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[10px] font-bold px-3 py-1 rounded-full mb-6">
                      LEVEL {level}
                  </span>
                  
                  {feedback === 'timeout' && (
                      <div className="absolute top-1/3 text-center animate-in zoom-in">
                          <div className="text-4xl font-black text-gray-500 dark:text-gray-400 mb-2">TIME'S UP</div>
                          <div className="text-lg font-bold text-gray-600 dark:text-gray-300">Answer: <span className="text-green-500">{currentWord?.zh}</span></div>
                      </div>
                  )}

                  <h2 className="text-4xl font-black text-center mb-10 text-gray-800 dark:text-white drop-shadow-sm">{currentWord?.en}</h2>
                  
                  <div className="grid grid-cols-1 gap-3 w-full max-w-sm">
                    {options.map((opt, idx) => {
                        const isThisCorrect = opt === currentWord?.zh;
                        const isThisSelected = opt === selectedOption;
                        
                        let buttonClass = "w-full h-16 rounded-xl text-lg font-bold border-2 shadow-sm transition-all duration-200 flex items-center justify-center ";
                        
                        if (feedback) {
                            if (showCorrectAnswer && isThisCorrect) {
                                buttonClass += "bg-green-500 border-green-600 text-white shadow-green-500/50";
                            } else if (isThisSelected && feedback === 'wrong') {
                                buttonClass += "bg-red-500 border-red-600 text-white animate-shake shadow-red-500/50";
                            } else if (feedback === 'correct' && isThisCorrect) {
                                buttonClass += "bg-green-500 border-green-600 text-white shadow-green-500/50";
                            } else {
                                buttonClass += "bg-white/50 dark:bg-gray-800/50 text-gray-400 border-transparent";
                            }
                        } else {
                            buttonClass += "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-blue-400 hover:text-blue-600 active:scale-[0.98]";
                        }

                        return (
                            <button
                                key={idx}
                                onClick={() => handleAnswer(opt)}
                                disabled={isProcessing || feedback !== null}
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
                <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl border border-gray-200 dark:border-gray-700 w-full max-w-sm text-center shadow-xl flex flex-col max-h-full">
                    <h2 className="text-2xl font-black mb-1 text-gray-800 dark:text-white flex-shrink-0">挑戰結束</h2>
                    <p className="text-gray-400 text-sm mb-6 flex-shrink-0">Good Job!</p>

                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 mb-4 flex-shrink-0">
                        <div className="text-5xl font-mono font-black text-blue-600 dark:text-blue-400 mb-4">{score}</div>
                        <div className="flex justify-between text-xs font-bold text-gray-50 dark:text-gray-400 px-4">
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

                    <div className="flex-1 overflow-y-auto mb-4 min-h-0 border-t border-b border-gray-100 dark:border-gray-700 py-2">
                    {wrongWords.length > 0 ? (
                        <div className="text-left">
                            <h3 className="text-sm font-bold text-red-500 mb-2 flex items-center gap-1 sticky top-0 bg-white dark:bg-gray-800 py-1">
                                <AlertCircle size={14} /> 點擊錯誤單字以複習
                            </h3>
                            <div className="space-y-2 pb-2">
                                {wrongWords.map((w, idx) => {
                                    const isReviewed = reviewedIds.includes(w.id);
                                    return (
                                        <button 
                                            key={`${w.id}-${idx}`} 
                                            onClick={() => handleReviewClick(w.id)}
                                            className={`w-full flex justify-between items-center text-sm p-3 rounded-xl border transition-all text-left ${
                                                isReviewed 
                                                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 opacity-75'
                                                : 'bg-white dark:bg-gray-700 border-red-200 dark:border-red-800 shadow-sm animate-pulse'
                                            }`}
                                        >
                                            <div className="flex gap-2 items-center">
                                                {isReviewed ? <CheckCircle size={16} className="text-green-500" /> : <div className="w-4 h-4 rounded-full border-2 border-red-400"></div>}
                                                <span className={`font-bold text-gray-800 dark:text-gray-200 ${isReviewed ? 'line-through text-gray-400' : ''}`}>{w.en}</span>
                                            </div>
                                            <span className={`text-gray-500 dark:text-gray-400 ${isReviewed ? 'line-through' : ''}`}>{w.zh}</span>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-green-500 space-y-2 py-6">
                            <Check size={32} />
                            <span className="font-bold">全對！太厲害了！</span>
                        </div>
                    )}
                    </div>

                    <div className="text-sm text-gray-500 dark:text-gray-400 mb-4 flex-shrink-0 flex justify-center items-center gap-1">
                        遊戲積分: <span className="font-bold text-blue-600 dark:text-blue-400">+{Math.floor(score / 50)} PT</span>
                    </div>

                    <button 
                        onClick={handleClaim}
                        disabled={!allReviewed}
                        className={`w-full font-bold py-4 rounded-xl shadow-lg transition-transform hover:scale-[1.02] active:scale-95 flex items-center justify-center gap-2 ${
                            allReviewed 
                            ? 'bg-blue-600 text-white shadow-blue-500/30' 
                            : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        }`}
                    >
                        {allReviewed ? '領取獎勵並結束' : '請先複習所有錯誤單字'}
                        {allReviewed && <ChevronRight size={20} />}
                    </button>
                </div>
           </div>
      </div>
  );
};
