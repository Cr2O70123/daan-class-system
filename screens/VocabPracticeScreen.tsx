
import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, Volume2, BookOpen, ChevronRight, ChevronLeft, RotateCcw, List, BrainCircuit, CheckCircle, XCircle, Trophy, GraduationCap, Play } from 'lucide-react';
import { Word } from '../types';
import { WORD_DATABASE } from '../services/mockData';

interface VocabPracticeScreenProps {
  onBack: () => void;
}

const LESSON_SIZE = 10;

export const VocabPracticeScreen: React.FC<VocabPracticeScreenProps> = ({ onBack }) => {
  const [currentLesson, setCurrentLesson] = useState(0);
  const [mode, setMode] = useState<'LEARN' | 'QUIZ'>('LEARN');
  
  // Learn Mode State
  const [viewMode, setViewMode] = useState<'LIST' | 'CARD'>('LIST');
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [expandedWordId, setExpandedWordId] = useState<number | null>(null);

  // Quiz Mode State
  const [quizIndex, setQuizIndex] = useState(0);
  const [quizScore, setQuizScore] = useState(0);
  const [quizFinished, setQuizFinished] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);

  const totalLessons = Math.ceil(WORD_DATABASE.length / LESSON_SIZE);
  
  const currentWords = useMemo(() => {
      return WORD_DATABASE.slice(currentLesson * LESSON_SIZE, (currentLesson + 1) * LESSON_SIZE);
  }, [currentLesson]);

  // Quiz Options Generation
  const currentQuizOptions = useMemo(() => {
      if (mode !== 'QUIZ' || quizFinished) return [];
      const target = currentWords[quizIndex];
      const otherWords = WORD_DATABASE.filter(w => w.id !== target.id);
      const wrongs = otherWords.sort(() => 0.5 - Math.random()).slice(0, 3).map(w => w.zh);
      return [target.zh, ...wrongs].sort(() => 0.5 - Math.random());
  }, [mode, quizIndex, currentWords, quizFinished]);

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    window.speechSynthesis.speak(utterance);
  };

  // --- Learn Mode Handlers ---
  const handleNextCard = () => {
      if (currentCardIndex < currentWords.length - 1) {
          setCurrentCardIndex(prev => prev + 1);
          setIsCardFlipped(false);
      }
  };

  const handlePrevCard = () => {
      if (currentCardIndex > 0) {
          setCurrentCardIndex(prev => prev - 1);
          setIsCardFlipped(false);
      }
  };

  // --- Quiz Mode Handlers ---
  const handleOptionClick = (option: string) => {
      if (selectedOption) return; // Prevent double click
      setSelectedOption(option);
      
      const correct = option === currentWords[quizIndex].zh;
      setIsCorrect(correct);
      
      if (correct) {
          setQuizScore(prev => prev + 1);
          speak("Correct");
      } else {
          speak("Try again");
      }

      // Auto advance
      setTimeout(() => {
          if (quizIndex < currentWords.length - 1) {
              setQuizIndex(prev => prev + 1);
              setSelectedOption(null);
              setIsCorrect(null);
          } else {
              setQuizFinished(true);
          }
      }, 1500);
  };

  const restartQuiz = () => {
      setQuizIndex(0);
      setQuizScore(0);
      setQuizFinished(false);
      setSelectedOption(null);
      setIsCorrect(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-4 pt-safe shadow-sm flex items-center justify-between border-b border-gray-100 dark:border-gray-700 z-10">
        <div className="flex items-center gap-2">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
                <ArrowLeft size={24} className="text-gray-600 dark:text-gray-300" />
            </button>
            <div>
                <h1 className="font-bold text-lg text-gray-800 dark:text-white">自製題庫</h1>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">Lesson {currentLesson + 1} • {currentWords.length} words</p>
            </div>
        </div>
        
        {mode === 'LEARN' && (
            <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                <button 
                    onClick={() => setViewMode('LIST')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'LIST' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-400'}`}
                >
                    <List size={18} />
                </button>
                <button 
                    onClick={() => setViewMode('CARD')}
                    className={`p-2 rounded-md transition-all ${viewMode === 'CARD' ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600' : 'text-gray-400'}`}
                >
                    <BookOpen size={18} />
                </button>
            </div>
        )}
      </div>

      {/* Lesson Selector (Only in Learn Mode) */}
      {mode === 'LEARN' && (
          <div className="bg-white dark:bg-gray-800 p-2 overflow-x-auto flex gap-2 border-b border-gray-100 dark:border-gray-700 no-scrollbar">
              {Array.from({ length: totalLessons }).map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => { setCurrentLesson(idx); setCurrentCardIndex(0); setIsCardFlipped(false); }}
                    className={`flex-shrink-0 px-4 py-2 rounded-lg text-xs font-bold transition-all ${currentLesson === idx ? 'bg-blue-600 text-white shadow-md' : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'}`}
                  >
                      Lesson {idx + 1}
                  </button>
              ))}
          </div>
      )}

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col">
          
          {/* Mode Switcher Banner */}
          <div className="mb-4 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-4 text-white shadow-lg flex justify-between items-center">
              <div>
                  <h3 className="font-bold text-lg flex items-center gap-2">
                      {mode === 'LEARN' ? <GraduationCap size={20}/> : <BrainCircuit size={20}/>}
                      {mode === 'LEARN' ? '學習模式' : '測驗模式'}
                  </h3>
                  <p className="text-xs text-indigo-100 opacity-90">
                      {mode === 'LEARN' ? '瀏覽單字卡，熟悉例句與發音' : '測試記憶力，四選一挑戰'}
                  </p>
              </div>
              <button 
                onClick={() => {
                    setMode(mode === 'LEARN' ? 'QUIZ' : 'LEARN');
                    restartQuiz();
                }}
                className="bg-white text-indigo-600 px-4 py-2 rounded-lg font-bold text-xs shadow-md hover:bg-indigo-50 transition-colors"
              >
                  {mode === 'LEARN' ? '開始測驗' : '回到學習'}
              </button>
          </div>

          {mode === 'LEARN' ? (
              // --- LEARN VIEW ---
              viewMode === 'LIST' ? (
                  <div className="space-y-3 pb-10">
                      {currentWords.map((word, idx) => {
                          const displayIndex = (currentLesson * LESSON_SIZE) + idx + 1;
                          return (
                            <div key={word.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                                <div 
                                    className="p-4 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-gray-700/50"
                                    onClick={() => setExpandedWordId(expandedWordId === word.id ? null : word.id)}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className="text-xs font-mono text-gray-300 font-bold w-6">{displayIndex}</span>
                                        <div>
                                            <h3 className="font-bold text-gray-800 dark:text-white text-lg">{word.en}</h3>
                                            <p className="text-xs text-gray-400">{word.partOfSpeech}</p>
                                        </div>
                                    </div>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); speak(word.en); }}
                                        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-blue-500"
                                    >
                                        <Volume2 size={20} />
                                    </button>
                                </div>
                                
                                {expandedWordId === word.id && (
                                    <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 animate-in slide-in-from-top-2">
                                        <div className="mt-3 pl-10">
                                            <span className="text-xl font-bold text-gray-800 dark:text-white block mb-1">{word.zh}</span>
                                            {word.definition && <p className="text-xs text-gray-500 mb-2">{word.definition}</p>}
                                            {word.example && (
                                                <div className="bg-blue-100/50 dark:bg-blue-900/20 p-3 rounded-lg mt-2 border-l-4 border-blue-400">
                                                    <p className="text-sm text-gray-700 dark:text-gray-300 italic mb-1">"{word.example}"</p>
                                                    <button onClick={() => speak(word.example!)} className="text-blue-500 text-[10px] flex items-center gap-1 font-bold hover:underline">
                                                        <Volume2 size={10}/> 朗讀例句
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                          );
                      })}
                  </div>
              ) : (
                  <div className="flex flex-col items-center justify-center flex-1 pb-10">
                      <div className="w-full max-w-sm aspect-[3/4] relative perspective-1000 group">
                          <div 
                            className={`w-full h-full relative transition-all duration-500 transform-style-3d cursor-pointer ${isCardFlipped ? 'rotate-y-180' : ''}`}
                            onClick={() => setIsCardFlipped(!isCardFlipped)}
                          >
                              {/* Front */}
                              <div className="absolute inset-0 bg-white dark:bg-gray-800 rounded-3xl shadow-xl border-2 border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center backface-hidden p-6 text-center">
                                  <div className="absolute top-4 right-4 text-xs font-mono text-gray-300">
                                      {(currentLesson * LESSON_SIZE) + currentCardIndex + 1}
                                  </div>
                                  <span className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Term</span>
                                  <h2 className="text-5xl font-black text-gray-800 dark:text-white mb-4">{currentWords[currentCardIndex].en}</h2>
                                  <span className="bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-300 px-3 py-1 rounded-full text-sm font-bold">
                                      {currentWords[currentCardIndex].partOfSpeech || 'word'}
                                  </span>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); speak(currentWords[currentCardIndex].en); }}
                                    className="mt-8 p-3 rounded-full bg-gray-50 dark:bg-gray-700 text-blue-500 hover:bg-blue-50 transition-colors"
                                  >
                                      <Volume2 size={24} />
                                  </button>
                                  <p className="text-gray-400 text-xs mt-auto">點擊翻面查看定義</p>
                              </div>

                              {/* Back */}
                              <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl shadow-xl flex flex-col items-center justify-center backface-hidden rotate-y-180 p-6 text-center text-white">
                                  <span className="text-xs font-bold text-blue-200 uppercase tracking-widest mb-4">Definition</span>
                                  <h2 className="text-4xl font-bold mb-4">{currentWords[currentCardIndex].zh}</h2>
                                  {currentWords[currentCardIndex].example && (
                                      <div className="bg-white/10 p-4 rounded-xl backdrop-blur-sm">
                                          <p className="text-lg italic opacity-90 mb-2">"{currentWords[currentCardIndex].example}"</p>
                                      </div>
                                  )}
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); speak(currentWords[currentCardIndex].example || currentWords[currentCardIndex].en); }}
                                    className="mt-6 bg-white/20 p-3 rounded-full hover:bg-white/30 transition-colors"
                                  >
                                      <Volume2 size={24} />
                                  </button>
                              </div>
                          </div>
                      </div>

                      <div className="flex items-center gap-6 mt-8">
                          <button onClick={handlePrevCard} disabled={currentCardIndex === 0} className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg disabled:opacity-50 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                              <ChevronLeft size={24} />
                          </button>
                          <span className="font-mono font-bold text-gray-500">{currentCardIndex + 1} / {currentWords.length}</span>
                          <button onClick={handleNextCard} disabled={currentCardIndex === currentWords.length - 1} className="p-4 bg-white dark:bg-gray-800 rounded-full shadow-lg disabled:opacity-50 text-gray-600 dark:text-gray-300 border border-gray-100 dark:border-gray-700">
                              <ChevronRight size={24} />
                          </button>
                      </div>
                  </div>
              )
          ) : (
              // --- QUIZ VIEW ---
              <div className="flex-1 flex flex-col items-center max-w-md mx-auto w-full">
                  {!quizFinished ? (
                      <>
                          {/* Progress Bar */}
                          <div className="w-full bg-gray-200 dark:bg-gray-700 h-2 rounded-full mb-6 overflow-hidden">
                              <div 
                                className="bg-indigo-500 h-full transition-all duration-300"
                                style={{ width: `${((quizIndex) / currentWords.length) * 100}%` }}
                              ></div>
                          </div>

                          {/* Question Card */}
                          <div className="bg-white dark:bg-gray-800 w-full p-8 rounded-3xl shadow-md border border-gray-200 dark:border-gray-700 text-center mb-6">
                              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Question {quizIndex + 1}</span>
                              <h2 className="text-4xl font-black text-gray-800 dark:text-white mt-2 mb-4">{currentWords[quizIndex].en}</h2>
                              <button onClick={() => speak(currentWords[quizIndex].en)} className="text-indigo-500 p-2 bg-indigo-50 dark:bg-indigo-900/30 rounded-full">
                                  <Volume2 size={20} />
                              </button>
                          </div>

                          {/* Options */}
                          <div className="grid grid-cols-1 gap-3 w-full">
                              {currentQuizOptions.map((opt, idx) => {
                                  let btnClass = "py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-sm border-2 ";
                                  if (selectedOption) {
                                      if (opt === currentWords[quizIndex].zh) {
                                          btnClass += "bg-green-500 border-green-600 text-white";
                                      } else if (opt === selectedOption) {
                                          btnClass += "bg-red-500 border-red-600 text-white";
                                      } else {
                                          btnClass += "bg-gray-100 dark:bg-gray-700 border-transparent text-gray-400 opacity-50";
                                      }
                                  } else {
                                      btnClass += "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:border-indigo-400 hover:text-indigo-600 active:scale-95";
                                  }

                                  return (
                                      <button 
                                        key={idx}
                                        onClick={() => handleOptionClick(opt)}
                                        disabled={selectedOption !== null}
                                        className={btnClass}
                                      >
                                          {opt}
                                      </button>
                                  );
                              })}
                          </div>
                          
                          {/* Feedback Area */}
                          <div className="h-12 mt-4 flex items-center justify-center">
                              {selectedOption && (
                                  <div className={`flex items-center gap-2 font-bold ${isCorrect ? 'text-green-500' : 'text-red-500'} animate-in fade-in zoom-in`}>
                                      {isCorrect ? <CheckCircle size={24}/> : <XCircle size={24}/>}
                                      <span>{isCorrect ? 'Correct!' : 'Incorrect'}</span>
                                  </div>
                              )}
                          </div>
                      </>
                  ) : (
                      // --- QUIZ FINISHED ---
                      <div className="bg-white dark:bg-gray-800 p-8 rounded-3xl shadow-xl text-center w-full animate-in zoom-in">
                          <div className="w-20 h-20 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
                              <Trophy size={40} className="fill-current" />
                          </div>
                          <h2 className="text-2xl font-black text-gray-800 dark:text-white mb-2">測驗完成!</h2>
                          <div className="text-5xl font-black text-indigo-600 dark:text-indigo-400 mb-2">{Math.round((quizScore / currentWords.length) * 100)}%</div>
                          <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">
                              答對 {quizScore} / {currentWords.length} 題
                          </p>
                          
                          <div className="flex gap-3">
                              <button 
                                onClick={restartQuiz} 
                                className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300 flex items-center justify-center gap-2 hover:bg-gray-200 dark:hover:bg-gray-600"
                              >
                                  <RotateCcw size={18} /> 再試一次
                              </button>
                              <button 
                                onClick={() => {
                                    if (currentLesson < totalLessons - 1) {
                                        setCurrentLesson(prev => prev + 1);
                                        restartQuiz();
                                    } else {
                                        setMode('LEARN'); // Back to learn if last lesson
                                    }
                                }} 
                                className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-indigo-700"
                              >
                                  <Play size={18} /> {currentLesson < totalLessons - 1 ? '下一課' : '完成'}
                              </button>
                          </div>
                      </div>
                  )}
              </div>
          )}
      </div>
    </div>
  );
};
