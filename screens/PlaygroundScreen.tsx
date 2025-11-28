
import React, { useState } from 'react';
import { Trophy, Zap, Gamepad2, Sparkles, BookOpen, Coins, Grid3X3, Swords, BrainCircuit, Calculator, Wrench, Shapes, GraduationCap, Binary, Cpu, ArrowRight, LayoutGrid, Puzzle, Bot, PenTool, Dices, Hammer, Palette, Flame } from 'lucide-react';
import { User } from '../types';

interface PlaygroundScreenProps {
  user: User;
  onOpenWordChallenge: () => void;
  onOpenResistorGame: () => void;
  onOpenLuckyWheel?: () => void;
  onOpenBlockBlast?: () => void;
  onOpenPkGame?: (mode?: 'CLASSIC' | 'OVERLOAD') => void;
  onOpenOhmsLaw?: () => void; // Mapped to BaseConverter
  onOpenVocabPractice?: () => void; // New
  onOpenDrawGuess?: () => void; // New
  onOpenHighLow?: () => void; // New Gambling Game
}

type ViewState = 'HOME' | 'LEARN' | 'PUZZLE' | 'TOOLS' | 'GAMBLE';

const CategoryCard = ({ title, icon, color, count, onClick }: { title: string, icon: React.ReactNode, color: string, count: string, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group active:scale-95 transition-all"
    >
        <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl ${color} text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform`}>
                {icon}
            </div>
            <div className="text-left">
                <h3 className="font-bold text-gray-800 dark:text-white text-lg">{title}</h3>
                <p className="text-xs text-gray-400 font-medium">{count}</p>
            </div>
        </div>
        <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full text-gray-400 group-hover:bg-gray-200 dark:group-hover:bg-gray-600 group-hover:text-gray-600 dark:group-hover:text-gray-200 transition-colors">
            <ArrowRight size={16} />
        </div>
    </button>
);

const SubPageHeader = ({ title, onBack }: { title: string, onBack: () => void }) => (
    <div className="flex items-center gap-2 mb-6">
        <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
            <ArrowRight size={20} className="rotate-180 text-gray-600 dark:text-gray-300" />
        </button>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">{title}</h2>
    </div>
);

const GameItem = ({ title, desc, icon, colorClass, onClick, tags=[], limit }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-all flex gap-4 items-center ${onClick ? 'cursor-pointer active:scale-[0.98]' : 'opacity-60 cursor-not-allowed grayscale-[0.5]'}`}
    >
        <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${colorClass} text-white shadow-md`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-1 truncate">{title}</h4>
                {tags.length > 0 && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        tags[0] === 'Coming Soon' ? 'bg-gray-200 text-gray-500' : 
                        tags[0] === '維護中' ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 shadow-sm' :
                        'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    }`}>
                        {tags[0]}
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight line-clamp-2">
                {desc}
            </p>
            {limit && (
                <div className="mt-2 inline-flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-md border border-yellow-200 dark:border-yellow-800">
                    <Zap size={10} className="text-yellow-600 dark:text-yellow-400 fill-current"/>
                    <span className="text-[9px] font-bold text-yellow-700 dark:text-yellow-300">{limit}</span>
                </div>
            )}
        </div>
    </div>
);

export const PlaygroundScreen: React.FC<PlaygroundScreenProps> = ({ 
    onOpenWordChallenge, 
    onOpenResistorGame, 
    onOpenLuckyWheel, 
    onOpenBlockBlast, 
    onOpenPkGame,
    onOpenOhmsLaw,
    onOpenVocabPractice,
    onOpenDrawGuess,
    onOpenHighLow,
    user
}) => {
  const [view, setView] = useState<ViewState>('HOME');
  const MAX_PLAYS = 15;
  const remainingPlays = Math.max(0, MAX_PLAYS - user.dailyPlays);

  const renderHome = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Featured Hero Card - PK Battle */}
          <div 
              onClick={() => onOpenPkGame && onOpenPkGame()}
              className="relative w-full aspect-[16/9] bg-gray-900 rounded-[2rem] overflow-hidden shadow-xl cursor-pointer group active:scale-[0.98] transition-all border border-gray-800"
          >
              {/* Background with Gradient & Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black"></div>
              <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                      <span className="bg-red-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg shadow-red-500/50 flex items-center gap-1">
                          <Flame size={10} /> 熱門推薦
                      </span>
                      <div className="bg-white/10 p-2 rounded-full backdrop-blur-md">
                          <Swords className="text-white" size={20} />
                      </div>
                  </div>
                  
                  <div>
                      <h2 className="text-3xl font-black text-white mb-1 italic tracking-tight drop-shadow-md">PK 競技場</h2>
                      <p className="text-indigo-200 text-xs font-medium max-w-[80%]">
                          即時連線對戰，展現你的單字實力！
                      </p>
                  </div>
              </div>

              {/* Decorative 3D Element */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-tl from-rose-500 to-orange-500 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
              <Trophy size={120} className="absolute -right-4 -bottom-8 text-white/10 rotate-12 group-hover:rotate-6 transition-transform duration-500" />
          </div>

          {/* Categories Grid */}
          <div className="grid gap-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">功能分類</h3>
              
              <CategoryCard 
                  title="休閒益智" 
                  count="3 款遊戲"
                  icon={<Puzzle size={24} />} 
                  color="bg-gradient-to-br from-orange-400 to-pink-500"
                  onClick={() => setView('PUZZLE')}
              />

              <CategoryCard 
                  title="博弈娛樂" 
                  count="2 款遊戲"
                  icon={<Dices size={24} />} 
                  color="bg-gradient-to-br from-purple-600 to-indigo-600"
                  onClick={() => setView('GAMBLE')}
              />
              
              <CategoryCard 
                  title="學習挑戰" 
                  count="4 款應用"
                  icon={<GraduationCap size={24} />} 
                  color="bg-gradient-to-br from-blue-400 to-indigo-600"
                  onClick={() => setView('LEARN')}
              />
              
              <CategoryCard 
                  title="實用工具箱" 
                  count="1 款工具"
                  icon={<Wrench size={24} />} 
                  color="bg-gradient-to-br from-gray-600 to-gray-800"
                  onClick={() => setView('TOOLS')}
              />
          </div>
      </div>
  );

  return (
    <div className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      {/* Main Header */}
      <div className="bg-white dark:bg-gray-800 p-6 pt-safe rounded-b-[2rem] shadow-sm mb-6 sticky top-0 z-20">
        <div className="flex items-center justify-between mt-2">
            <div>
                <h1 className="text-2xl font-black text-gray-800 dark:text-white">更多功能</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Utilities & Games</p>
            </div>
            <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-xl">
                <Gamepad2 size={24} className="text-indigo-600 dark:text-indigo-400" />
            </div>
        </div>
      </div>

      <div className="px-4 pb-10 min-h-[60vh]">
          {view === 'HOME' && renderHome()}

          {view === 'PUZZLE' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <SubPageHeader title="休閒益智" onBack={() => setView('HOME')} />
                  
                  <GameItem 
                      title="畫畫接龍" 
                      desc="多人繪畫猜謎，發揮創意與默契。" 
                      icon={<Palette size={24} />} 
                      colorClass="bg-pink-500"
                      onClick={onOpenDrawGuess}
                      tags={['多人同樂']}
                  />

                  <GameItem 
                      title="方塊爆破" 
                      desc="放置方塊填滿行或列，消除得分！" 
                      icon={<Grid3X3 size={24} />} 
                      colorClass="bg-blue-500"
                      onClick={onOpenBlockBlast}
                      tags={['舒壓']}
                  />
                  <GameItem 
                      title="PK 競技場" 
                      desc="與同學即時對戰，搶答拼手速。" 
                      icon={<Swords size={24} />} 
                      colorClass="bg-red-500"
                      onClick={() => onOpenPkGame && onOpenPkGame()}
                      tags={['競技']}
                  />
              </div>
          )}

          {view === 'GAMBLE' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <SubPageHeader title="博弈娛樂" onBack={() => setView('HOME')} />
                  
                  <GameItem 
                      title="幸運轉盤" 
                      desc="每日 3 次機會，拚搏高額積分！" 
                      icon={<Coins size={24} />} 
                      colorClass="bg-yellow-500"
                      onClick={onOpenLuckyWheel}
                      tags={['每日限定']}
                  />
                  <GameItem 
                      title="高低博弈 (High Low)" 
                      desc="預測下一張牌的大小，以小博大。" 
                      icon={<Dices size={24} />} 
                      colorClass="bg-emerald-600"
                      onClick={onOpenHighLow}
                      tags={['高風險']}
                  />
              </div>
          )}

          {view === 'LEARN' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <SubPageHeader title="學習挑戰" onBack={() => setView('HOME')} />
                  
                  <GameItem 
                      title="單字練習 (純練習)" 
                      desc="無壓力學習模式，含發音與例句。" 
                      icon={<BookOpen size={24} />} 
                      colorClass="bg-teal-500"
                      onClick={onOpenVocabPractice}
                      tags={['推薦']}
                  />

                  <GameItem 
                      title="單字挑戰賽" 
                      desc="30秒極限挑戰，累積連擊加分。" 
                      icon={<Trophy size={24} />} 
                      colorClass="bg-indigo-500"
                      onClick={onOpenWordChallenge}
                      tags={['經典']}
                  />
                  <GameItem 
                      title="電阻色碼" 
                      desc="看到顏色就要知道數值！" 
                      icon={<Zap size={24} />} 
                      colorClass="bg-orange-500"
                      onClick={onOpenResistorGame}
                      tags={['專業']}
                  />
                  <GameItem 
                      title="AI 萬能家教" 
                      desc="全能家教，隨時解答你的疑問。" 
                      icon={<Bot size={24} />} 
                      colorClass="bg-violet-500"
                      onClick={null}
                      tags={['Coming Soon']}
                  />
              </div>
          )}

          {view === 'TOOLS' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <SubPageHeader title="實用工具箱" onBack={() => setView('HOME')} />
                  <GameItem 
                      title="工程計算機" 
                      desc="二進制、十六進制、十進制快速轉換。" 
                      icon={<Binary size={24} />} 
                      colorClass="bg-gray-700"
                      onClick={onOpenOhmsLaw} // BaseConverter
                      tags={['必備']}
                  />
              </div>
          )}
      </div>
    </div>
  );
};
