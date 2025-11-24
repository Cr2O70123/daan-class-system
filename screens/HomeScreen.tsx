import React, { useState, useEffect, useRef } from 'react';
import { MessageCircle, CheckCircle2, Search, XCircle, Plus, Trophy, Sparkles, Crown, TrendingUp, RefreshCw, Loader2, Calendar, Gift } from 'lucide-react';
import { Question } from '../types';

interface HomeScreenProps {
  questions: Question[];
  onQuestionClick: (question: Question) => void;
  onAskClick: () => void;
  onStartChallenge?: () => void;
  onOpenLeaderboard?: () => void;
  onOpenCheckIn?: () => void;
  onRefresh?: () => Promise<void>;
}

const SUBJECTS = ['全部', '電子學', '基本電學', '數位邏輯', '微處理機', '程式設計', '國文', '英文', '數學', '其他'];

// Helper to get frame styles
const getFrameStyle = (frameId?: string) => {
  switch(frameId) {
    case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
    case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
    case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
    case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
    default: return 'ring-2 ring-white dark:ring-gray-700';
  }
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ questions, onQuestionClick, onAskClick, onStartChallenge, onOpenLeaderboard, onOpenCheckIn, onRefresh }) => {
  const [activeSubject, setActiveSubject] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentBannerIndex, setCurrentBannerIndex] = useState(0);

  // Pull to Refresh State
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
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

  // Carousel Auto Logic
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentBannerIndex((prev) => (prev === 2 ? 0 : prev + 1));
    }, 6000); 
    return () => clearInterval(timer);
  }, []);

  // Pull to Refresh Handlers
  const handleTouchStart = (e: React.TouchEvent) => {
      // Only trigger pull refresh if at top
      if (window.scrollY === 0 && !isRefreshing) {
          startY.current = e.touches[0].clientY;
      }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const delta = currentY - startY.current;
      
      // Only pull if at top and scrolling down
      if (window.scrollY === 0 && delta > 0 && !isRefreshing) {
          setPullY(Math.min(delta * 0.4, 120)); // Resistance
      }
  };

  const handleTouchEnd = async () => {
      if (pullY > PULL_THRESHOLD && onRefresh && !isRefreshing) {
          setIsRefreshing(true);
          setPullY(50); // Snap to loading position
          try {
              await onRefresh();
          } finally {
              setTimeout(() => {
                  setIsRefreshing(false);
                  setPullY(0);
              }, 500);
          }
      } else {
          setPullY(0);
      }
  };

  // Carousel Manual Swipe Handlers
  const handleCarouselTouchStart = (e: React.TouchEvent) => {
      e.stopPropagation(); // Prevent interfering with pull-to-refresh if possible
      carouselStartX.current = e.touches[0].clientX;
  };

  const handleCarouselTouchEnd = (e: React.TouchEvent) => {
      e.stopPropagation();
      const endX = e.changedTouches[0].clientX;
      const deltaX = endX - carouselStartX.current;
      
      if (Math.abs(deltaX) > 50) {
          if (deltaX > 0) {
              // Swipe Right -> Prev
              setCurrentBannerIndex(prev => prev === 0 ? 2 : prev - 1);
          } else {
              // Swipe Left -> Next
              setCurrentBannerIndex(prev => prev === 2 ? 0 : prev + 1);
          }
      }
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
        className="fixed left-0 right-0 z-0 flex justify-center pointer-events-none transition-all duration-200"
        style={{ 
            top: '100px', // Below header
            transform: `translateY(${pullY > 0 ? pullY - 40 : -100}px)`,
            opacity: pullY > 0 ? 1 : 0
        }}
      >
        <div className="bg-white dark:bg-gray-800 rounded-full p-2 shadow-md border border-gray-100 dark:border-gray-700">
            {isRefreshing ? (
                <Loader2 className="animate-spin text-blue-600" size={24} />
            ) : (
                <RefreshCw 
                    size={24} 
                    className={`text-blue-600 transition-transform ${pullY > PULL_THRESHOLD ? 'rotate-180' : ''}`} 
                    style={{ transform: `rotate(${pullY * 2}deg)` }}
                />
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 pt-safe z-10 shadow-sm transition-colors transform translate-z-0">
         {/* Search Bar */}
         <div className="px-4 pt-3 pb-1">
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
            className="relative w-full overflow-hidden rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none h-32"
            ref={carouselRef}
            onTouchStart={handleCarouselTouchStart}
            onTouchEnd={handleCarouselTouchEnd}
        >
            <div 
                className="flex transition-transform duration-500 ease-in-out h-full"
                style={{ transform: `translateX(-${currentBannerIndex * 100}%)` }}
            >
                {/* Slide 1: Word Challenge */}
                <div 
                    className="w-full h-full flex-shrink-0 bg-gradient-to-r from-violet-600 to-indigo-600 text-white flex items-center justify-between p-4 cursor-pointer relative"
                    onClick={onStartChallenge}
                >
                    <div className="z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm">每周更新</span>
                            <div className="flex text-yellow-300">
                                <Sparkles size={12} className="animate-pulse" />
                            </div>
                        </div>
                        <h3 className="font-bold text-xl leading-tight">單字挑戰賽</h3>
                        <p className="text-xs text-indigo-100 opacity-90 mt-1">累積連擊，衝擊排行榜拿獎金！</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/20 z-10">
                        <Trophy size={28} className="text-yellow-300" />
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                        <Trophy size={100} />
                    </div>
                </div>

                {/* Slide 2: Leaderboard */}
                <div 
                    className="w-full h-full flex-shrink-0 bg-gradient-to-r from-amber-500 to-orange-600 text-white flex items-center justify-between p-4 cursor-pointer relative"
                    onClick={onOpenLeaderboard}
                >
                    <div className="z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-black/10 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm">風雲人物</span>
                            <div className="flex text-white">
                                <TrendingUp size={12} />
                            </div>
                        </div>
                        <h3 className="font-bold text-xl leading-tight">班級積分榜</h3>
                        <p className="text-xs text-orange-100 opacity-90 mt-1">積極解題，挑戰學霸稱號！</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/20 z-10">
                        <Crown size={28} className="text-white" />
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                        <Crown size={100} />
                    </div>
                </div>

                {/* Slide 3: Check-in */}
                <div 
                    className="w-full h-full flex-shrink-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white flex items-center justify-between p-4 cursor-pointer relative"
                    onClick={onOpenCheckIn}
                >
                    <div className="z-10">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-bold backdrop-blur-sm">每日好禮</span>
                        </div>
                        <h3 className="font-bold text-xl leading-tight">每日簽到</h3>
                        <p className="text-xs text-blue-100 opacity-90 mt-1">連續 7 天領取大寶箱！</p>
                    </div>
                    <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm border border-white/20 z-10">
                        <Calendar size={28} className="text-white" />
                    </div>
                    <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
                        <Gift size={100} />
                    </div>
                </div>
            </div>

            {/* Dots Indicator */}
            <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5 z-20">
                {[0, 1, 2].map(idx => (
                    <button 
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); setCurrentBannerIndex(idx); }}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${currentBannerIndex === idx ? 'bg-white w-3' : 'bg-white/50 hover:bg-white/80'}`} 
                    />
                ))}
            </div>
        </div>

        {/* Questions List */}
        {filteredQuestions.length === 0 ? (
            <div className="text-center py-10 opacity-50">
                <p className="text-gray-400 dark:text-gray-500 font-bold">沒有找到符合的問題</p>
                <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">試著換個關鍵字，或去「發問」吧！</p>
            </div>
        ) : (
            filteredQuestions.map((q) => (
            <div 
                key={q.id} 
                onClick={() => onQuestionClick(q)}
                className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] dark:shadow-none border border-gray-100 dark:border-gray-700 hover:shadow-[0_8px_20px_rgba(0,0,0,0.05)] transition-all cursor-pointer active:scale-[0.98] ${q.status === 'solved' ? 'opacity-80' : ''}`}
            >
                
                {/* Header */}
                <div className="flex justify-between items-start mb-3">
                <div className="flex gap-2 flex-wrap">
                    {q.tags.map(tag => (
                    <span key={tag} className={`text-[10px] px-2.5 py-1 rounded-full font-bold tracking-wide ${
                        tag === '已解決' 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' 
                            : 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
                    }`}>
                        {tag}
                    </span>
                    ))}
                </div>
                <span className="text-xs text-gray-300 dark:text-gray-600 font-medium tracking-wide">{q.date}</span>
                </div>

                {/* Content */}
                <div className="flex justify-between gap-4">
                    <div className="flex-1">
                        <h3 className={`font-bold text-gray-800 dark:text-gray-100 text-lg mb-2 leading-tight line-clamp-2 ${q.authorNameColor ? q.authorNameColor.replace('text-', 'text-opacity-90 ') : ''}`}>{q.title}</h3>
                        <p className="text-gray-500 dark:text-gray-400 text-sm mb-2 line-clamp-2 leading-relaxed">
                            {q.content.substring(0, 100).replace(/```[\s\S]*?```/g, '[程式碼]').replace(/\$\$[\s\S]*?\$\$/g, '[數學公式]')}
                        </p>
                    </div>
                    {q.image && (
                        <div className="w-16 h-16 flex-shrink-0 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600">
                            <img src={q.image} alt="thumbnail" className="w-full h-full object-cover" />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700 pt-4 mt-2">
                <div className="flex items-center space-x-2">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[10px] text-white font-bold ${
                    q.authorAvatarColor || 'bg-blue-500'
                    } ${getFrameStyle(q.authorAvatarFrame)} overflow-hidden`}>
                      {q.authorAvatarImage ? (
                          <img src={q.authorAvatarImage} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                          q.author.charAt(0)
                      )}
                    </div>
                    <span className={`text-xs font-medium ${q.authorNameColor || 'text-gray-600 dark:text-gray-400'}`}>{q.author}</span>
                </div>

                <div className="flex items-center text-gray-400 dark:text-gray-500 text-xs space-x-4">
                    <div className={`flex items-center space-x-1.5 ${q.replies.length > 0 ? 'text-blue-500 dark:text-blue-400' : ''}`}>
                    <MessageCircle size={16} />
                    <span className="font-medium">{q.replies.length}</span>
                    </div>
                    {q.status === 'solved' && (
                    <div className="flex items-center space-x-1 text-green-500 dark:text-green-400 font-bold bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                        <CheckCircle2 size={12} />
                        <span className="text-[10px]">已解決</span>
                    </div>
                    )}
                </div>
                </div>
            </div>
            ))
        )}
      </div>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={onAskClick}
        className="fixed bottom-24 right-6 bg-blue-600 hover:bg-blue-700 text-white w-14 h-14 rounded-full shadow-[0_4px_20px_rgba(37,99,235,0.4)] flex items-center justify-center transition-transform active:scale-90 z-40"
      >
        <Plus size={32} />
      </button>
    </div>
  );
};