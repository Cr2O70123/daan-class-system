
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Timer, Zap, Play, CheckCircle, AlertCircle, RefreshCw, HelpCircle, X, ChevronRight, Lock } from 'lucide-react';
import { User, GameResult, ResistorTask, ResistorColor } from '../types';
import { RESISTOR_COLORS, generateResistorTask } from '../services/resistorService';
import { submitGameScore } from '../services/dataService';

interface ResistorGameScreenProps {
  user: User;
  onBack: () => void;
  onFinish: (result: GameResult) => void;
  onUpdateHearts: (newPlays: number) => void;
}

const MAX_PLAYS = 15;

// Reuse sound logic
const playSound = (type: 'correct' | 'wrong' | 'tick' | 'gameover' | 'start' | 'click') => {
    try {
        const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioContext) return;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        const now = ctx.currentTime;

        if (type === 'click') {
            osc.frequency.setValueAtTime(800, now);
            gain.gain.setValueAtTime(0.05, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
            osc.start(now);
            osc.stop(now + 0.05);
            return;
        }

        // Reuse others from WordChallenge logic (simplified here)
        if (type === 'correct') {
            osc.frequency.setValueAtTime(600, now);
            osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0, now + 0.2);
        } else if (type === 'wrong') {
             osc.type = 'sawtooth';
             osc.frequency.setValueAtTime(200, now);
             osc.frequency.linearRampToValueAtTime(100, now + 0.2);
             gain.gain.setValueAtTime(0.1, now);
             gain.gain.linearRampToValueAtTime(0, now + 0.2);
        } else if (type === 'gameover') {
             osc.frequency.setValueAtTime(300, now);
             osc.frequency.linearRampToValueAtTime(50, now + 1);
             gain.gain.setValueAtTime(0.2, now);
             gain.gain.linearRampToValueAtTime(0, now + 1);
        }
        osc.start(now);
        osc.stop(now + (type === 'gameover' ? 1 : 0.2));
    } catch (e) {}
};

export const ResistorGameScreen: React.FC<ResistorGameScreenProps> = ({ user, onBack, onFinish, onUpdateHearts }) => {
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  
  // Game State
  const [timeLeft, setTimeLeft] = useState(60);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [currentTask, setCurrentTask] = useState<ResistorTask | null>(null);
  const [userBands, setUserBands] = useState<string[]>([]);
  const [activeBandIndex, setActiveBandIndex] = useState(0);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);

  const timerRef = useRef<number | null>(null);

  const startGame = () => {
    if (user.dailyPlays >= MAX_PLAYS) {
        alert("今日遊玩次數已達 15 次上限！");
        return;
    }
    // Increment plays
    onUpdateHearts(user.dailyPlays + 1);
    
    playSound('start');
    
    setGameState('playing');
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setTimeLeft(60);
    setFeedback(null);
    nextTask();

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

  const nextTask = () => {
      const task = generateResistorTask(difficulty);
      setCurrentTask(task);
      setUserBands(new Array(task.bands).fill(null));
      setActiveBandIndex(0);
      setFeedback(null);
  };

  const endGame = () => {
      if (timerRef.current) clearInterval(timerRef.current);
      playSound('gameover');
      setGameState('gameover');
  };

  const handleColorClick = (color: ResistorColor) => {
      if (feedback || !currentTask) return;
      playSound('click');

      const newBands = [...userBands];
      newBands[activeBandIndex] = color.name;
      setUserBands(newBands);

      // Auto advance or check
      if (activeBandIndex < currentTask.bands - 1) {
          setActiveBandIndex(prev => prev + 1);
      } else {
          // Check Answer
          checkAnswer(newBands);
      }
  };

  const checkAnswer = (finalBands: string[]) => {
      if (!currentTask) return;
      
      const isCorrect = finalBands.every((color, idx) => color === currentTask.correctColors[idx]);

      if (isCorrect) {
          playSound('correct');
          setFeedback('correct');
          
          const comboBonus = combo * 10;
          const diffBonus = difficulty === 'hard' ? 50 : difficulty === 'medium' ? 20 : 0;
          setScore(prev => prev + 100 + comboBonus + diffBonus);
          setCombo(prev => prev + 1);
          if (combo + 1 > maxCombo) setMaxCombo(combo + 1);
          setTimeLeft(prev => Math.min(prev + 3, 90)); // +3 sec
          
          setTimeout(nextTask, 500);
      } else {
          playSound('wrong');
          setFeedback('wrong');
          setCombo(0);
          setTimeLeft(prev => Math.max(prev - 5, 0)); // -5 sec
          
          // Clear bands after delay to retry? Or just next task?
          // Let's go to next task to keep "Rush" feel, but show correct briefly
          setTimeout(nextTask, 2500);
      }
  };

  const handleSubmitScore = async () => {
      try {
          // Submit just like Word Challenge
          await submitGameScore(user, score);
          await onFinish({ score, maxCombo, correctCount: Math.floor(score/100) }); // Approximation
          onBack();
      } catch(e) {
          alert("上傳失敗");
      }
  };

  // Render Resistor SVG
  const renderResistor = () => {
      if (!currentTask) return null;
      
      // Calculate band positions
      // Resistor body width approx 300px.
      // 4 Bands: 30%, 45%, 60%, 80%
      // 5 Bands: 25%, 38%, 51%, 64%, 80%
      
      const positions = currentTask.bands === 4 
        ? ['30%', '45%', '60%', '80%'] 
        : ['25%', '38%', '51%', '64%', '80%'];

      return (
          <div className="relative w-full h-32 flex items-center justify-center my-6 animate-in zoom-in duration-300">
              {/* Wire Left */}
              <div className="absolute left-0 w-full h-2 bg-gray-400"></div>
              
              {/* Body */}
              <div className="relative w-3/4 h-24 bg-[#E0C097] rounded-full shadow-lg border-4 border-[#C5A070] flex items-center overflow-hidden z-10">
                  {/* Bands */}
                  {Array.from({ length: currentTask.bands }).map((_, idx) => {
                      const colorName = userBands[idx] || (feedback === 'wrong' && currentTask.correctColors[idx]) || null;
                      const colorObj = RESISTOR_COLORS.find(c => c.name === colorName);
                      const bg = colorObj ? colorObj.hex : 'transparent';
                      
                      const isActive = idx === activeBandIndex && !feedback;
                      
                      return (
                        <div 
                            key={idx}
                            className={`absolute h-full w-4 transform -skew-x-6 transition-all duration-200 ${isActive ? 'ring-4 ring-blue-400 z-20 scale-110' : ''}`}
                            style={{ 
                                left: positions[idx], 
                                backgroundColor: bg,
                                boxShadow: colorObj ? 'inset -2px 0 5px rgba(0,0,0,0.3)' : 'none',
                                border: !colorObj ? '2px dashed #999' : 'none'
                            }}
                            onClick={() => !feedback && setActiveBandIndex(idx)}
                        ></div>
                      );
                  })}
              </div>

              {/* Feedback Overlay */}
              {feedback && (
                  <div className={`absolute inset-0 flex flex-col items-center justify-center z-30 rounded-xl backdrop-blur-sm bg-white/60 dark:bg-black/60 transition-all animate-in fade-in`}>
                      <div className={`font-black text-4xl tracking-widest uppercase drop-shadow-md mb-2 ${feedback === 'correct' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {feedback === 'correct' ? 'Nice!' : 'Miss!'}
                      </div>
                      {feedback === 'wrong' && currentTask && (
                          <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700">
                              <div className="text-[10px] text-gray-500 text-center mb-1 font-bold">正確答案</div>
                              <div className="flex gap-1">
                                  {currentTask.correctColors.map((c, i) => (
                                      <div key={i} className="w-4 h-10 rounded-sm border border-gray-300" style={{ backgroundColor: RESISTOR_COLORS.find(rc => rc.name === c)?.hex }} title={c}></div>
                                  ))}
                              </div>
                          </div>
                      )}
                  </div>
              )}
          </div>
      );
  };

  if (gameState === 'menu') {
      return (
          <div className="fixed inset-0 z-50 bg-gray-100 dark:bg-gray-900 flex flex-col">
              <div className="p-4 pt-safe flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm">
                  <button onClick={onBack}><ArrowLeft className="text-gray-600 dark:text-gray-300" /></button>
                  <h1 className="font-bold text-gray-800 dark:text-white">電阻色碼大師</h1>
                  <div className="w-6"></div>
              </div>

              <div className="flex-1 flex flex-col items-center justify-center p-6 space-y-6">
                  <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-lg border border-gray-200 dark:border-gray-700 w-full max-w-sm text-center">
                      <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-orange-200 dark:shadow-none">
                          <Zap size={40} className="text-white" />
                      </div>
                      <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">Resistor Rush</h2>
                      <p className="text-gray-500 dark:text-gray-400 mb-6">看阻值，選色碼！<br/>考驗你的電子學直覺反應。</p>
                      
                      <div className="space-y-3">
                          <button 
                            onClick={() => { setDifficulty('easy'); startGame(); }}
                            className="w-full py-4 bg-green-500 hover:bg-green-600 text-white rounded-xl font-bold shadow-lg shadow-green-200 dark:shadow-none transition-transform active:scale-95 flex items-center justify-between px-6"
                          >
                              <span>初級 (4環)</span>
                              <ChevronRight size={20} />
                          </button>
                          <button 
                            onClick={() => { setDifficulty('medium'); startGame(); }}
                            className="w-full py-4 bg-blue-500 hover:bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 dark:shadow-none transition-transform active:scale-95 flex items-center justify-between px-6"
                          >
                              <span>中級 (隨機誤差)</span>
                              <ChevronRight size={20} />
                          </button>
                          <button 
                            onClick={() => { setDifficulty('hard'); startGame(); }}
                            className="w-full py-4 bg-purple-500 hover:bg-purple-600 text-white rounded-xl font-bold shadow-lg shadow-purple-200 dark:shadow-none transition-transform active:scale-95 flex items-center justify-between px-6"
                          >
                              <span>高級 (5環精密)</span>
                              <ChevronRight size={20} />
                          </button>
                      </div>
                  </div>
                  
                  <div className="bg-blue-50 dark:bg-blue-900/20 px-4 py-2 rounded-full text-blue-600 dark:text-blue-400 font-bold text-xs flex items-center gap-2">
                       <Zap size={14} /> 剩餘遊玩次數: {Math.max(0, MAX_PLAYS - user.dailyPlays)}/{MAX_PLAYS}
                  </div>
              </div>
          </div>
      );
  }

  if (gameState === 'playing') {
      return (
          <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
              {/* Header */}
              <div className="p-4 pt-safe flex justify-between items-center bg-white dark:bg-gray-800 shadow-sm z-10">
                  <div className="text-center">
                      <div className="text-[10px] font-bold text-gray-400">SCORE</div>
                      <div className="text-xl font-black text-blue-600 dark:text-blue-400">{score}</div>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 px-3 py-1 rounded-full">
                      <Timer size={16} className={timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-gray-500'} />
                      <span className="font-mono font-bold text-lg dark:text-white">{timeLeft}</span>
                  </div>
                  <div className="text-center">
                      <div className="text-[10px] font-bold text-gray-400">COMBO</div>
                      <div className={`text-xl font-black ${combo>1 ? 'text-yellow-500' : 'text-gray-300'}`}>x{combo}</div>
                  </div>
              </div>

              {/* Game Area */}
              <div className="flex-1 flex flex-col items-center p-6">
                  {currentTask && (
                      <div className="w-full max-w-md flex flex-col items-center">
                          <div className="mb-8 text-center animate-in slide-in-from-top duration-500">
                              <span className="text-xs font-bold text-gray-400 mb-2 block">TARGET</span>
                              <h2 className="text-5xl font-black text-gray-800 dark:text-white mb-2">{currentTask.displayValue}</h2>
                              <div className="inline-block bg-gray-200 dark:bg-gray-700 px-3 py-1 rounded-lg font-mono text-sm font-bold text-gray-600 dark:text-gray-300">
                                  ± {currentTask.toleranceValue}%
                              </div>
                          </div>

                          {renderResistor()}
                          
                          <div className="text-xs text-gray-400 mt-2 mb-6">
                              填入第 {activeBandIndex + 1} 環顏色 ({
                                  activeBandIndex === currentTask.bands - 1 ? '誤差' : 
                                  activeBandIndex === currentTask.bands - 2 ? '倍率' : '數字'
                              })
                          </div>

                          {/* Color Palette Grid */}
                          <div className="grid grid-cols-4 gap-3 w-full">
                              {RESISTOR_COLORS.map(color => (
                                  <button
                                      key={color.name}
                                      onClick={() => handleColorClick(color)}
                                      className={`
                                        h-14 rounded-xl shadow-sm border-b-4 active:border-b-0 active:translate-y-1 transition-all flex items-center justify-center font-bold text-xs
                                        ${color.textColor}
                                      `}
                                      style={{ 
                                          backgroundColor: color.hex, 
                                          borderColor: 'rgba(0,0,0,0.2)' 
                                      }}
                                  >
                                      {color.name}
                                  </button>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  }

  // Game Over
  return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/90 backdrop-blur-sm p-4">
          <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl animate-in zoom-in">
              <h2 className="text-3xl font-black text-gray-800 dark:text-white mb-2">Time's Up!</h2>
              <div className="text-6xl font-black text-blue-600 dark:text-blue-400 mb-6">{score}</div>
              
              <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl">
                      <div className="text-xs text-gray-400 font-bold uppercase">Max Combo</div>
                      <div className="text-xl font-black dark:text-white">{maxCombo}</div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-2xl">
                      <div className="text-xs text-gray-400 font-bold uppercase">Difficulty</div>
                      <div className="text-xl font-black capitalize dark:text-white">{difficulty}</div>
                  </div>
              </div>

              <button 
                onClick={handleSubmitScore}
                className="w-full py-4 bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-xl font-bold hover:scale-105 transition-transform"
              >
                  領取獎勵 ({Math.floor(score/100)} PT)
              </button>
          </div>
      </div>
  );
};
