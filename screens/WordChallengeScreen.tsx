import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Timer, Zap, Trophy, Crown, Play, Heart, Lock, BarChart } from 'lucide-react';
import { User, Word, GameResult, GameLeaderboardEntry } from '../types';

interface WordChallengeScreenProps {
  user: User;
  words: Word[];
  leaderboard: GameLeaderboardEntry[];
  onBack: () => void;
  onFinish: (result: GameResult) => void;
  onUpdateHearts: (hearts: number) => void;
}

const INITIAL_TIME = 30; // Seconds

export const WordChallengeScreen: React.FC<WordChallengeScreenProps> = ({ 
    user, words, leaderboard, onBack, onFinish, onUpdateHearts 
}) => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [activeTab, setActiveTab] = useState<'play' | 'rank'>('play');
  
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

  const handleClaim = () => {
      onFinish({ score, maxCombo, correctCount });
      onBack();
  };

  useEffect(() => {
      return () => {
          if (timerRef.current) clearInterval(timerRef.current);
      };
  }, []);

  // --- MENU ---
  if (gameState === 'menu') {
      return (
          <div className="flex flex-col h-full bg-gradient-to-br from-indigo-600 to-purple-700 text-white p-6 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full opacity-10 pointer-events-none">
                  <div className="absolute top-10 left-10 w-32 h-32 bg-white rounded-full blur-3xl"></div>
                  <div className="absolute bottom-10 right-10 w-48 h-48 bg-pink-400 rounded-full blur-3xl"></div>
              </div>

              {/* Navbar */}
              <div className="flex justify-between items-center mb-6 relative z-10">
                  <button onClick={onBack} className="bg-white/20 p-2 rounded-full hover:bg-white/30 transition-colors">
                      <ArrowLeft size={24} />
                  </button>
                  <div className="flex gap-1">
                       {[1, 2, 3].map(i => (
                           <Heart 
                             key={i} 
                             size={20} 
                             className={`${i <= user.hearts ? 'fill-red-500 text-red-500' : 'text-white/30'} transition-all`} 
                           />
                       ))}
                  </div>
              </div>

              {/* Tabs */}
              <div className="flex bg-white/10 p-1 rounded-xl mb-6 relative z-10">
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
                <div className="flex-1 flex flex-col items-center justify-center text-center relative z-10 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white/10 p-6 rounded-full mb-6 border-4 border-white/20 shadow-2xl shadow-indigo-500/50">
                        <Trophy size={64} className="text-yellow-300" />
                    </div>
                    <h1 className="text-4xl font-black mb-2 tracking-tight">單字挑戰賽</h1>
                    <p className="text-indigo-200 mb-8 font-medium">挑戰 7000 單 (Level 3-6)</p>

                    <div className="grid grid-cols-3 gap-4 w-full max-w-xs mb-8">
                        <div className="bg-black/20 p-3 rounded-2xl flex flex-col items-center">
                            <span className="text-2xl font-bold">30s</span>
                            <span className="text-[10px] uppercase opacity-70">限時</span>
                        </div>
                        <div className="bg-black/20 p-3 rounded-2xl flex flex-col items-center">
                            <span className="text-2xl font-bold">+2s</span>
                            <span className="text-[10px] uppercase opacity-70">答對獎勵</span>
                        </div>
                        <div className="bg-black/20 p-3 rounded-2xl flex flex-col items-center">
                            <span className="text-2xl font-bold">PT</span>
                            <span className="text-[10px] uppercase opacity-70">Score/50</span>
                        </div>
                    </div>

                    <button 
                        onClick={handleStartGame}
                        disabled={user.hearts <= 0}
                        className={`w-full max-w-xs font-black text-xl py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                            user.hearts > 0 
                            ? 'bg-yellow-400 text-yellow-900 shadow-yellow-500/30 hover:bg-yellow-300 hover:scale-105'
                            : 'bg-gray-500 text-gray-300 cursor-not-allowed'
                        }`}
                    >
                        {user.hearts > 0 ? (
                            <><Play size={24} fill="currentColor" /> 開始挑戰</>
                        ) : (
                            <><Lock size={24} /> 明日再來</>
                        )}
                    </button>
                    {user.hearts <= 0 && <p className="text-xs text-indigo-300 mt-2">愛心將於午夜重置</p>}
                </div>
              ) : (
                <div className="flex-1 w-full max-w-sm mx-auto relative z-10 animate-in fade-in slide-in-from-right-4">
                     <div className="bg-white/10 rounded-2xl p-4 h-[400px] overflow-y-auto">
                         <h3 className="text-center font-bold mb-4 text-indigo-100 flex items-center justify-center gap-2">
                             <Crown size={16} className="text-yellow-400" /> 本週風雲榜
                         </h3>
                         <div className="space-y-3">
                             {leaderboard.map((entry, idx) => (
                                 <div key={idx} className="bg-white/10 p-3 rounded-xl flex items-center items-stretch">
                                     <div className="w-8 flex items-center justify-center font-black text-lg text-indigo-300 italic">
                                         #{entry.rank}
                                     </div>
                                     <div className={`w-10 h-10 rounded-full mx-3 ${entry.avatarColor} flex items-center justify-center font-bold border-2 border-white/20`}>
                                         {entry.name[0]}
                                     </div>
                                     <div className="flex-1 flex flex-col justify-center">
                                         <span className="font-bold">{entry.name}</span>
                                     </div>
                                     <div className="flex items-center font-mono font-bold text-yellow-300">
                                         {entry.score}
                                     </div>
                                 </div>
                             ))}
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
          <div className={`flex flex-col h-full bg-slate-900 text-white p-6 transition-colors duration-200 ${feedback === 'correct' ? 'bg-green-900' : feedback === 'wrong' ? 'bg-red-900' : ''}`}>
              {/* HUD */}
              <div className="flex justify-between items-center mb-8">
                  <div className="flex flex-col">
                      <span className="text-xs text-slate-400 font-bold uppercase">Score</span>
                      <span className="text-2xl font-mono font-bold">{score}</span>
                  </div>
                  <div className={`flex flex-col items-center ${timeLeft <= 5 ? 'text-red-500 animate-pulse' : 'text-white'}`}>
                      <Timer size={24} />
                      <span className="text-lg font-bold font-mono">{timeLeft}s</span>
                  </div>
                  <div className="flex flex-col items-end">
                      <span className="text-xs text-slate-400 font-bold uppercase">Combo</span>
                      <span className="text-2xl font-mono font-bold text-yellow-400">x{combo}</span>
                  </div>
              </div>

              {/* Question */}
              <div className="flex-1 flex flex-col items-center justify-center mb-8">
                  <div className="mb-2">
                      <span className="bg-white/10 text-xs font-bold px-2 py-1 rounded">LEVEL {level}</span>
                  </div>
                  <h2 className="text-4xl font-black text-center mb-2 tracking-wide">{currentWord?.en}</h2>
                  <div className="h-1 w-24 bg-white/20 rounded-full"></div>
              </div>

              {/* Options */}
              <div className="grid grid-cols-1 gap-3 mb-8">
                  {options.map((opt, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleAnswer(opt)}
                        className="bg-white/10 hover:bg-white/20 py-4 rounded-xl text-lg font-bold border border-white/10 active:scale-[0.98] transition-all"
                      >
                          {opt}
                      </button>
                  ))}
              </div>
          </div>
      );
  }

  // --- GAME OVER ---
  return (
      <div className="flex flex-col h-full bg-slate-900 text-white p-6 items-center justify-center relative">
           <div className="absolute inset-0 overflow-hidden">
                <div className="absolute top-[-20%] left-[-20%] w-[140%] h-[140%] bg-[conic-gradient(at_center,_var(--tw-gradient-stops))] from-yellow-500 via-purple-500 to-indigo-500 opacity-20 animate-spin-slow"></div>
           </div>

           <div className="bg-white/10 backdrop-blur-md p-8 rounded-3xl border border-white/10 w-full max-w-sm text-center relative z-10">
               <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-yellow-500/50">
                   <Crown size={40} className="text-yellow-900" fill="currentColor" />
               </div>
               
               <h2 className="text-3xl font-black mb-1">CHALLENGE OVER</h2>
               <p className="text-slate-300 text-sm mb-6">本次挑戰成績</p>

               <div className="bg-black/30 rounded-xl p-4 mb-6">
                   <div className="text-5xl font-mono font-bold text-yellow-400 mb-2">{score}</div>
                   <div className="flex justify-between text-xs text-slate-400 px-4">
                       <span>Max Combo: {maxCombo}</span>
                       <span>Correct: {correctCount}</span>
                   </div>
               </div>

               <div className="bg-green-500/20 text-green-400 border border-green-500/30 p-3 rounded-lg mb-6 text-sm font-bold flex items-center justify-center gap-2">
                   <Zap size={16} fill="currentColor" />
                   預計獲得: +{Math.floor(score / 50)} PT
               </div>

               <button 
                onClick={handleClaim}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-all"
               >
                   領取獎勵並返回
               </button>
           </div>
      </div>
  );
};