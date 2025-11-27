
import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, CheckCircle2, Search, XCircle, Plus, Trophy, Sparkles, Crown, TrendingUp, RefreshCw, Loader2, Calendar, Gift, Gamepad2, Bot, Zap, Skull } from 'lucide-react';
import { Question } from '../types';

interface HomeScreenProps {
  questions: Question[];
  onQuestionClick: (question: Question) => void;
  onAskClick: () => void;
  onNavigateToPlayground?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenCheckIn?: () => void;
  onNavigateToAiTutor?: () => void;
  onRefresh?: () => Promise<void>;
  onImageClick?: (url: string) => void;
  onOpenPkGame?: (mode?: 'CLASSIC' | 'OVERLOAD') => void;
}

const SUBJECTS = ['全部', '電子學', '基本電學', '數位邏輯', '微處理機', '程式設計', '國文', '英文', '數學', '其他'];

// Helper to get frame styles
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

export const HomeScreen: React.FC<HomeScreenProps> = ({ questions, onQuestionClick, onAskClick, onNavigateToPlayground, onOpenLeaderboard, onOpenCheckIn, onNavigateToAiTutor, onRefresh, onImageClick, onOpenPkGame }) => {
  const [activeSubject, setActiveSubject] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Pull to Refresh State
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const PULL_THRESHOLD = 80;

  // Carousel Touch State
  const carouselStartX = useRef(0);
  const carouselRef = useRef<HTMLDivElement>(null);

  const filteredQuestions = questions.filter(q => {
    const matchesSubject = activeSubject === '全部' || q.tags.includes(activeSubject);
    const matchesSearch = q.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          q.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  // Carousel Auto Logic (0 to 4)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev === 4 ? 0 : prev + 1));
    }, 6000); 
    return () => clearInterval(timer);
  }, []);

  // Pull to Refresh Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      if (window.scrollY === 0 && !isRefreshing) {
          startY.current = e.touches[0].clientY;
          startX.current = e.touches[0].clientX;
          isHorizontalSwipe.current = false;
      }
      const touch = e.touches[0];
      carouselStartX.current = touch.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const currentX = e.touches[0].clientX;
      const deltaY = currentY - startY.current;
      const deltaX = currentX - startX.current;
      
      if (!isHorizontalSwipe.current) {
          if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
              isHorizontalSwipe.current = true;
          }
      }

      if (window.scrollY === 0 && deltaY > 0 && !isRefreshing && !isHorizontalSwipe.current) {
          setPullY(Math.min(deltaY * 0.4, 120)); 
      }
  };

  const handleTouchEnd = async (e: React.TouchEvent) => {
      if (pullY > PULL_THRESHOLD && onRefresh && !isRefreshing) {
          setIsRefreshing(true);
          setPullY(50);
          try {
              await onRefresh();
          } finally {
              setTimeout(() => {
                  setIsRefreshing(false);
                  setPullY(0);
              }, 300);
          }
      } else {
          setPullY(0);
      }

      if (isHorizontalSwipe.current) {
          const touch = e.changedTouches[0];
          const diff = touch.clientX - carouselStartX.current;
          if (diff > 50) {
              setCurrentBannerIndex(prev => (prev === 0 ? 4 : prev - 1));
          } else if (diff < -50) {
              setCurrentBannerIndex(prev => (prev === 4 ? 0 : prev + 1));
          }
      }
      
      isHorizontalSwipe.current = false;
  };

  return (
    <div 
        className="relative min-h-full"
        ref={containerRef}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
      {/* Pull to Refresh Indicator */}
      <div 
        className="fixed left-0 right-0 z-[60] flex justify-center pointer-events-none transition-all duration-200"
        style={{ 
            top: '110px',
            transform: `translateY(${pullY > 0 ? pullY - 40 : -100}px)`,
            opacity: pullY > 0 ? 1 : 0
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg border border-gray-100 dark:border-gray-700 flex items-center gap-2">
            {isRefreshing ? (
                <>
                    <Loader2 className="animate-spin text-blue-600" size={18} />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">重新整理中...</span>
                </>
            ) : (
                <>
                    <RefreshCw 
                        size={18} 
                        className={`text-blue-600 transition-transform ${pullY > PULL_THRESHOLD ? 'rotate-180' : ''}`} 
                        style={{ transform: `rotate(${pullY * 2}deg)` }}
                    />
                    <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                        {pullY > PULL_THRESHOLD ? "放開以重整" : "下拉以重整"}
                    </span>
                </>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 pt-safe z-10 shadow-sm transition-colors transform translate-z-0">
         {/* Search Bar */}
         <div className="px-4 pt-1 pb-1">
            <div className="relative">
                <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input 
                    type="text" 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="搜尋標題或內容..." 
                    className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-xl pl-9 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                {searchQuery && (
                    <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        <XCircle size={16} className="fill-gray-200 dark:fill-gray-600" />
                    </button>
                )}
            </div>
         </div>

         {/* Subject Chips */}
         <div className="px-4 pb-3 pt-2 flex gap-2 overflow-x-auto no-scrollbar" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            {SUBJECTS.map(subject => (
                <button
                    key={subject}
                    onClick={() => setActiveSubject(subject)}
                    className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                        activeSubject === subject
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    {subject}
                </button>
            ))}
         </div>
      </div>

      <div 
        className="p-5 space-y-5 pb-24 transition-transform duration-300 ease-out bg-gray-50 dark:bg-gray-900 relative z-1"
        style={{ transform: `translateY(${isRefreshing ? 50 : 0}px)` }}
      >
        
        {/* CAROUSEL BANNER */}
        <div 
            className="relative w-full overflow-hidden rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none h-36"
            ref={carouselRef}
        >
            <div 
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
            >
                {/* Slide 0: AI Tutor */}
                <div 
                    className="w-full h-full flex-shrink-0 bg-gradient-to-r from-slate-900 to-purple-900 text-white flex items-center justify-between p-4 cursor-pointer relative"
                    onClick={onNavigateToAiTutor}
                >
                    <div className="z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-blue-500/20 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm border border-blue-500/30 text-blue-200">即將推出</span>
                            <div className="flex text-purple-300">
                                <Bot size={12} className="animate-bounce" />
                            </div>
                        </div>
                        <h3 className="font-bold text-xl leading-tight">AI 萬能家教</h3>
                        <p className="text-xs text-gray-300 opacity-90 mt-1">專屬班級知識庫，比 ChatGPT 更懂你！</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/20 z-10">
                        <Bot size={28} className="text-purple-300" />
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-20 transform translate-x-4 translate-y-4">
                        <Bot size={100} />
                    </div>
                </div>

                {/* Slide 1: Overload Arena (New Mode) */}
                <div 
                    className="w-full h-full flex-shrink-0 bg-gradient-to-br from-red-900 via-rose-800 to-orange-800 text-white flex items-center justify-between p-4 cursor-pointer relative overflow-hidden"
                    onClick={() => onOpenPkGame && onOpenPkGame('OVERLOAD')}
                >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-30"></div>
                    <div className="z-10 relative">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-red-500 text-white px-2 py-0.5 rounded text-[10px] font-black shadow-lg shadow-red-500/50 animate-pulse">全新模式</span>
                        </div>
                        <h3 className="font-black text-2xl leading-none italic tracking-tighter text-white drop-shadow-md">
                            超載競技場
                        </h3>
                        <p className="text-[10px] text-orange-200 font-bold mt-1">心理博弈 • 賭上 HP • 絕地反擊</p>
                    </div>
                    <div className="relative z-10 mr-2">
                        <Skull size={48} className="text-red-500 drop-shadow-[0_0_10px_rgba(255,0,0,0.8)] animate-pulse" />
                        <Zap size={24} className="absolute -top-2 -right-2 text-yellow-400 fill-yellow-400 animate-bounce" />
                    </div>
                </div>

                {/* Slide 2: Daily Check-in */}
                <div 
                    className="w-full h-full flex-shrink-0 bg-gradient-to-r from-green-500 to-emerald-700 text-white flex items-center justify-between p-4 cursor-pointer"
                    onClick={onOpenCheckIn}
                >
                    <div>
                        <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] w-fit mb-1 font-bold backdrop-blur-sm">每日任務</div>
                        <h3 className="font-bold text-xl">每日簽到領獎</h3>
                        <p className="text-xs text-green-100 opacity-90 mt-1">連續簽到 7 天，獎勵翻倍送！</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                        <Gift size={28} className="text-white animate-bounce" />
                    </div>
                </div>

                {/* Slide 3: Leaderboard */}
                <div 
                    className="w-full h-full flex-shrink-0 bg-gradient-to-r from-yellow-500 to-orange-600 text-white flex items-center justify-between p-4 cursor-pointer"
                    onClick={onOpenLeaderboard}
                >
                    <div>
                        <div className="bg-black/10 px-2 py-0.5 rounded text-[10px] w-fit mb-1 font-bold backdrop-blur-sm text-yellow-100">本週榜單</div>
                        <h3 className="font-bold text-xl">班級積分排行</h3>
                        <p className="text-xs text-yellow-100 opacity-90 mt-1">看看誰是本週的卷王？</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                        <Trophy size={28} className="text-white" />
                    </div>
                </div>

                {/* Slide 4: Playground (More Features) */}
                <div 
                    className="w-full h-full flex-shrink-0 bg-gradient-to-r from-indigo-500 to-blue-600 text-white flex items-center justify-between p-4 cursor-pointer"
                    onClick={onNavigateToPlayground}
                >
                    <div>
                        <div className="bg-white/20 px-2 py-0.5 rounded text-[10px] w-fit mb-1 font-bold backdrop-blur-sm">功能區</div>
                        <h3 className="font-bold text-xl">更多功能</h3>
                        <p className="text-xs text-indigo-100 opacity-90 mt-1">單字挑戰、電阻遊戲、幸運轉盤！</p>
                    </div>
                    <div className="bg-white/20 p-3 rounded-full backdrop-blur-sm">
                        <Gamepad2 size={28} className="text-white" />
                    </div>
                </div>
            </div>

            {/* Dots Indicator */}
            <div className="absolute bottom-3 left-1/2 transform -translate-x-1/2 flex gap-1.5 z-10">
                {[0, 1, 2, 3, 4].map((idx) => (
                    <div 
                        key={idx} 
                        className={`w-1.5 h-1.5 rounded-full transition-all ${currentBannerIndex === idx ? 'bg-white w-3' : 'bg-white/50'}`}
                    ></div>
                ))}
            </div>
        </div>

        {/* Section Header */}
        <div className="flex justify-between items-end px-1 mt-2">
            <h2 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-orange-500" />
                最新討論
            </h2>
            <span className="text-[10px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                {filteredQuestions.length} 則貼文
            </span>
        </div>

        {/* Question List */}
        <div className="space-y-4">
            {filteredQuestions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-gray-400 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <MessageCircle size={48} className="mb-2 opacity-20" />
                    <p className="text-sm">目前沒有相關討論</p>
                    <button onClick={onAskClick} className="mt-4 text-blue-600 font-bold text-xs hover:underline">
                        成為第一個發問的人！
                    </button>
                </div>
            ) : (
                filteredQuestions.map((question) => (
                    <div 
                        key={question.id}
                        onClick={() => onQuestionClick(question)}
                        className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 active:scale-[0.99] transition-all cursor-pointer relative overflow-hidden group"
                    >
                        {/* Solved Badge */}
                        {question.status === 'solved' && (
                            <div className="absolute top-0 right-0 bg-green-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-xl shadow-sm z-10 flex items-center gap-1">
                                <CheckCircle2 size={10} /> 已解決
                            </div>
                        )}

                        <div className="flex gap-2 mb-3">
                            {question.tags.map(tag => (
                                <span key={tag} className="text-[10px] font-bold bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-lg">
                                    {tag}
                                </span>
                            ))}
                        </div>

                        <h3 className="font-bold text-gray-800 dark:text-white mb-2 line-clamp-2 text-base leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                            {question.title}
                        </h3>
                        
                        <p className="text-gray-500 dark:text-gray-400 text-xs line-clamp-2 mb-4 leading-relaxed">
                            {question.content}
                        </p>

                        <div className="flex items-center justify-between border-t border-gray-50 dark:border-gray-700/50 pt-3 mt-2">
                            <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-bold ${question.authorAvatarColor || 'bg-gray-400'} ${getFrameStyle(question.authorAvatarFrame)} overflow-hidden`}>
                                    {question.authorAvatarImage ? (
                                        <img src={question.authorAvatarImage} alt="avatar" className="w-full h-full object-cover" />
                                    ) : (
                                        question.author.charAt(0)
                                    )}
                                </div>
                                <span className={`text-xs font-bold ${question.authorNameColor || 'text-gray-600 dark:text-gray-300'}`}>
                                    {question.isAnonymous ? '匿名同學' : question.author}
                                </span>
                            </div>
                            
                            <div className="flex items-center gap-3 text-gray-400 text-xs font-medium">
                                <span>{question.date}</span>
                                <div className="flex items-center gap-1 text-blue-500 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full">
                                    <MessageCircle size={12} />
                                    <span>{question.replyCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
        
        {/* FAB: Ask Question (Updated to match Resource style) */}
        <button 
            onClick={onAskClick}
            className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-lg shadow-blue-500/30 flex items-center justify-center transition-transform active:scale-90 z-40 border border-blue-400/20 backdrop-blur-sm"
        >
            <Plus size={32} />
        </button>

        {/* Simple Footer */}
        <div className="text-center pt-8 pb-4 text-gray-300 dark:text-gray-600 text-[10px]">
            <p>Designed for Class 3B</p>
        </div>
      </div>
    </div>
  );
};
