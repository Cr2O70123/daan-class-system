
import React, { useState } from 'react';
import { Trophy, Zap, Gamepad2, Sparkles, BookOpen, Coins, Grid3X3, Swords, BrainCircuit, Calculator, Wrench, Shapes, GraduationCap, Binary, Cpu, ArrowRight, LayoutGrid, Puzzle } from 'lucide-react';
import { User } from '../types';

interface PlaygroundScreenProps {
  user: User;
  onOpenWordChallenge: () => void;
  onOpenResistorGame: () => void;
  onOpenLuckyWheel?: () => void;
  onOpenBlockBlast?: () => void;
  onOpenPkGame?: () => void;
  onOpenOhmsLaw?: () => void; // Mapped to BaseConverter
  onOpenLogicGate?: () => void; // New prop for Logic Gate
}

type ViewState = 'HOME' | 'LEARN' | 'PUZZLE' | 'TOOLS';

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

const GameItem = ({ title, desc, icon, colorClass, onClick, tags=[] }: any) => (
    <div 
        onClick={onClick}
        className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all flex gap-4 items-center"
    >
        <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${colorClass} text-white shadow-md`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-1 truncate">{title}</h4>
                {tags.length > 0 && (
                    <span className="text-[9px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                        {tags[0]}
                    </span>
                )}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 leading-tight line-clamp-2">
                {desc}
            </p>
        </div>
    </div>
);

export const PlaygroundScreen: React.FC<PlaygroundScreenProps & { onOpenBaseConverter?: () => void, onOpenLogicGate?: () => void }> = ({ 
    onOpenWordChallenge, 
    onOpenResistorGame, 
    onOpenLuckyWheel, 
    onOpenBlockBlast, 
    onOpenPkGame,
    onOpenOhmsLaw,
    user,
    // @ts-ignore
    onOpenLogicGate 
}) => {
  const [view, setView] = useState<ViewState>('HOME');

  const renderHome = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Featured Hero Card - PK Battle */}
          <div 
              onClick={onOpenPkGame}
              className="relative w-full aspect-[16/9] bg-gray-900 rounded-[2rem] overflow-hidden shadow-xl cursor-pointer group active:scale-[0.98] transition-all border border-gray-800"
          >
              {/* Background with Gradient & Pattern */}
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black"></div>
              <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              
              {/* Content */}
              <div className="absolute inset-0 p-6 flex flex-col justify-between z-10">
                  <div className="flex justify-between items-start">
                      <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-1 rounded shadow-lg shadow-rose-500/50 flex items-center gap-1">
                          <Sparkles size={10} /> 熱門推薦
                      </span>
                      <div className="bg-white/10 p-2 rounded-full backdrop-blur-md">
                          <Swords className="text-white" size={20} />
                      </div>
                  </div>
                  
                  <div>
                      <h2 className="text-3xl font-black text-white mb-1 italic tracking-tight drop-shadow-md">知識對決 PK</h2>
                      <p className="text-indigo-200 text-xs font-medium max-w-[80%]">
                          全新段位賽季！攻守交換機制，使用技能卡牌擊敗對手。
                      </p>
                  </div>
              </div>

              {/* Decorative 3D Element */}
              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-tl from-rose-500 to-orange-500 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
              <Trophy size={120} className="absolute -right-4 -bottom-8 text-white/10 rotate-12 group-hover:rotate-6 transition-transform duration-500" />
          </div>

          {/* Categories Grid */}
          <div className="grid gap-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">遊戲分類</h3>
              
              <CategoryCard 
                  title="益智與運氣" 
                  count="3 款遊戲"
                  icon={<Puzzle size={24} />} 
                  color="bg-gradient-to-br from-orange-400 to-pink-500"
                  onClick={() => setView('PUZZLE')}
              />
              
              <CategoryCard 
                  title="學習挑戰" 
                  count="2 款遊戲"
                  icon={<GraduationCap size={24} />} 
                  color="bg-gradient-to-br from-blue-400 to-indigo-600"
                  onClick={() => setView('LEARN')}
              />
              
              <CategoryCard 
                  title="實用工具箱" 
                  count="2 款工具"
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
                <h1 className="text-2xl font-black text-gray-800 dark:text-white">娛樂大廳</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Arcade & Tools</p>
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
                  <SubPageHeader title="益智與運氣" onBack={() => setView('HOME')} />
                  <GameItem 
                      title="方塊爆破" 
                      desc="經典消除遊戲，無限模式挑戰最高分。" 
                      icon={<Grid3X3 size={24} />} 
                      colorClass="bg-cyan-500"
                      onClick={onOpenBlockBlast}
                      tags={['殺時間']}
                  />
                  <GameItem 
                      title="幸運轉盤" 
                      desc="每日限轉 3 次！消耗積分贏取 500 PT 大獎。" 
                      icon={<Coins size={24} />} 
                      colorClass="bg-yellow-500"
                      onClick={onOpenLuckyWheel}
                      tags={['博弈']}
                  />
                  {/* Re-list PK here too for discoverability */}
                  <GameItem 
                      title="知識對決 PK" 
                      desc="真人實時對戰，累積積分提升段位。" 
                      icon={<Swords size={24} />} 
                      colorClass="bg-rose-600"
                      onClick={onOpenPkGame}
                      tags={['對戰']}
                  />
              </div>
          )}

          {view === 'LEARN' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <SubPageHeader title="學習挑戰" onBack={() => setView('HOME')} />
                  <GameItem 
                      title="單字挑戰" 
                      desc="快速回答單字，累積 Combo 衝擊排行榜！" 
                      icon={<BookOpen size={24} />} 
                      colorClass="bg-blue-500"
                      onClick={onOpenWordChallenge}
                      tags={['英文']}
                  />
                  <GameItem 
                      title="電阻色碼" 
                      desc="訓練直覺反應，快速辨識 4 環與 5 環電阻。" 
                      icon={<Zap size={24} />} 
                      colorClass="bg-orange-500"
                      onClick={onOpenResistorGame}
                      tags={['電子學']}
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
                  <GameItem 
                      title="邏輯閘實驗室" 
                      desc="視覺化邏輯閘模擬 (AND, OR, NOT...)。" 
                      icon={<Cpu size={24} />} 
                      colorClass="bg-indigo-600"
                      onClick={onOpenLogicGate} // LogicGate
                      tags={['模擬']}
                  />
              </div>
          )}
      </div>
    </div>
  );
};
