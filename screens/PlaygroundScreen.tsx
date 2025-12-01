
import React, { useState, useEffect } from 'react';
import { Trophy, Zap, Gamepad2, Sparkles, BookOpen, Coins, Grid3X3, Swords, BrainCircuit, Calculator, Wrench, Shapes, GraduationCap, Binary, Cpu, ArrowRight, LayoutGrid, Puzzle, Bot, PenTool, Dices, Hammer, Palette, Flame, Skull, Gem, Crosshair, Bomb, Scroll, Circle, RefreshCw, Rocket } from 'lucide-react';
import { User } from '../types';

interface PlaygroundScreenProps {
  user: User;
  onNavigate: (featureId: string, params?: any) => void;
  setUser?: (user: User) => void;
}

type ViewState = 'HOME' | 'LEARN' | 'PUZZLE' | 'TOOLS' | 'GAMBLE';

const CategoryCard = ({ title, icon, color, count, onClick }: { title: string, icon: React.ReactNode, color: string, count: string, onClick: () => void }) => (
    <button 
        onClick={onClick}
        className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between group active:scale-95 transition-all w-full"
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
        <button onClick={onBack} className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors shadow-sm">
            <ArrowRight size={20} className="rotate-180 text-gray-600 dark:text-gray-300" />
        </button>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">{title}</h2>
    </div>
);

const GameItem = ({ title, desc, icon, colorClass, onClick, tags=[], limit }: any) => (
    <div 
        onClick={onClick}
        className={`bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden transition-all flex gap-4 items-center ${onClick ? 'cursor-pointer active:scale-[0.98] hover:shadow-md' : 'opacity-60 cursor-not-allowed grayscale-[0.5]'}`}
    >
        <div className={`w-14 h-14 rounded-2xl flex-shrink-0 flex items-center justify-center ${colorClass} text-white shadow-lg`}>
            {icon}
        </div>
        <div className="flex-1 min-w-0">
            <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-1 truncate">{title}</h4>
                {tags.length > 0 && (
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                        tags[0] === 'Coming Soon' ? 'bg-gray-200 text-gray-500' : 
                        tags[0] === '維護中' ? 'bg-red-500 text-white animate-pulse shadow-red-500/50 shadow-sm' :
                        tags[0] === '黑市限定' ? 'bg-purple-900 text-purple-200 border border-purple-700' :
                        tags[0] === 'NEW' ? 'bg-green-600 text-white' :
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
    user,
    onNavigate,
    setUser
}) => {
  const [view, setView] = useState<ViewState>('HOME');

  useEffect(() => {
      window.scrollTo(0, 0);
  }, [view]);

  const renderHome = () => (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Featured Hero Card - PK Battle */}
          <div 
              onClick={() => onNavigate('pk_game')}
              className="relative w-full aspect-[16/9] bg-gray-900 rounded-[2rem] overflow-hidden shadow-xl cursor-pointer group active:scale-[0.98] transition-all border border-gray-800"
          >
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-purple-900 to-black"></div>
              <div className="absolute inset-0 opacity-30 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
              
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
                      <h2 className="text-3xl font-black text-white mb-1 italic tracking-tight drop-shadow-md">英語單字 PK</h2>
                      <p className="text-indigo-200 text-xs font-medium max-w-[80%]">
                          即時連線對戰，展現你的單字實力！
                      </p>
                  </div>
              </div>

              <div className="absolute -right-6 -bottom-6 w-32 h-32 bg-gradient-to-tl from-rose-500 to-orange-500 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity"></div>
              <Trophy size={120} className="absolute -right-4 -bottom-8 text-white/10 rotate-12 group-hover:rotate-6 transition-transform duration-500" />
          </div>

          <div className="grid gap-3">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider ml-1">功能分類</h3>
              
              <CategoryCard 
                  title="休閒益智" 
                  count="5 款遊戲"
                  icon={<Puzzle size={24} />} 
                  color="bg-gradient-to-br from-orange-400 to-pink-500"
                  onClick={() => setView('PUZZLE')}
              />

              <CategoryCard 
                  title="博弈娛樂" 
                  count="5 款遊戲"
                  icon={<Dices size={24} />} 
                  color="bg-gradient-to-br from-purple-600 to-indigo-600"
                  onClick={() => setView('GAMBLE')}
              />
              
              <CategoryCard 
                  title="學習挑戰" 
                  count="5 款應用"
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
                      onClick={() => onNavigate('draw_guess')}
                      tags={['多人同樂']}
                  />

                  <GameItem 
                      title="方塊爆破" 
                      desc="放置方塊填滿行或列，消除得分！" 
                      icon={<Grid3X3 size={24} />} 
                      colorClass="bg-blue-500"
                      onClick={() => onNavigate('block_blast')}
                      tags={['舒壓']}
                  />
                  <GameItem 
                      title="中國象棋" 
                      desc="楚河漢界大盤、暗棋小盤。" 
                      icon={<Scroll size={24} />} 
                      colorClass="bg-amber-600"
                      onClick={() => onNavigate('xiangqi')}
                      tags={['雙人']}
                  />
                  <GameItem 
                      title="五子棋" 
                      desc="經典五子連珠，簡單卻深奧。" 
                      icon={<Circle size={24} />} 
                      colorClass="bg-stone-500"
                      onClick={() => onNavigate('gomoku')}
                      tags={['雙人']}
                  />
                  <GameItem 
                      title="黑白棋 (Othello)" 
                      desc="翻轉對手棋子，佔領最多棋盤。" 
                      icon={<RefreshCw size={24} />} 
                      colorClass="bg-green-600"
                      onClick={() => onNavigate('othello')}
                      tags={['雙人']}
                  />
              </div>
          )}

          {view === 'GAMBLE' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <SubPageHeader title="博弈娛樂" onBack={() => setView('HOME')} />
                  
                  {/* Black Market Entry */}
                  <div 
                      onClick={() => onNavigate('black_market')}
                      className="bg-gray-900 p-4 rounded-2xl shadow-lg border-2 border-purple-500/50 relative overflow-hidden group cursor-pointer"
                  >
                      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                      <div className="absolute top-0 right-0 p-2 opacity-50 group-hover:opacity-100 transition-opacity">
                          <Skull size={48} className="text-purple-700"/>
                      </div>
                      <div className="relative z-10 flex gap-4 items-center">
                          <div className="w-14 h-14 rounded-2xl bg-purple-900 flex items-center justify-center text-purple-300 border border-purple-700">
                              <Gem size={24} />
                          </div>
                          <div>
                              <h4 className="font-black text-white text-lg flex items-center gap-2">
                                  暗巷交易所 <span className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded">PvP</span>
                              </h4>
                              <p className="text-xs text-gray-400">駭客行動與非法道具</p>
                          </div>
                      </div>
                  </div>

                  <GameItem 
                      title="Cyber Crash" 
                      desc="火箭升空倍率飆升，爆炸前快跳車！" 
                      icon={<Rocket size={24} />} 
                      colorClass="bg-rose-600"
                      onClick={() => onNavigate('crash_game')}
                      tags={['NEW', '黑市限定']}
                  />

                  <GameItem 
                      title="幸運轉盤" 
                      desc="每日 3 次機會，拚搏高額積分！" 
                      icon={<Coins size={24} />} 
                      colorClass="bg-yellow-500"
                      onClick={() => onNavigate('lucky_wheel')}
                      tags={['每日限定', 'PT']}
                  />
                  <GameItem 
                      title="高低博弈 (High Low)" 
                      desc="預測點數大小，黑幣翻倍的機會。" 
                      icon={<Dices size={24} />} 
                      colorClass="bg-emerald-600"
                      onClick={() => onNavigate('high_low')}
                      tags={['黑市限定']}
                  />
                  
                  <GameItem 
                      title="俄羅斯輪盤" 
                      desc="一發入魂，贏家通吃。" 
                      icon={<Crosshair size={24} />} 
                      colorClass="bg-red-700"
                      onClick={() => onNavigate('russian_roulette')}
                      tags={['黑市限定']}
                  />

                  <GameItem 
                      title="Cyber Slots" 
                      desc="賽博風格拉霸機，挑戰超級大獎。" 
                      icon={<Gem size={24} />} 
                      colorClass="bg-purple-600"
                      onClick={() => onNavigate('slot_machine')}
                      tags={['黑市限定']}
                  />
              </div>
          )}

          {view === 'LEARN' && (
              <div className="space-y-4 animate-in slide-in-from-right duration-300">
                  <SubPageHeader title="學習挑戰" onBack={() => setView('HOME')} />
                  
                  <GameItem 
                      title="英語單字 PK" 
                      desc="與同學即時對戰，搶答拼手速。" 
                      icon={<Swords size={24} />} 
                      colorClass="bg-red-500"
                      onClick={() => onNavigate('pk_game')}
                      tags={['競技']}
                  />

                  <GameItem 
                      title="單字練習 (純練習)" 
                      desc="無壓力學習模式，含發音與例句。" 
                      icon={<BookOpen size={24} />} 
                      colorClass="bg-teal-500"
                      onClick={() => onNavigate('vocab_practice')}
                      tags={['推薦']}
                  />

                  <GameItem 
                      title="單字挑戰賽" 
                      desc="30秒極限挑戰，累積連擊加分。" 
                      icon={<Trophy size={24} />} 
                      colorClass="bg-indigo-500"
                      onClick={() => onNavigate('word_challenge')}
                      tags={['經典']}
                  />
                  <GameItem 
                      title="電阻色碼" 
                      desc="看到顏色就要知道數值！" 
                      icon={<Zap size={24} />} 
                      colorClass="bg-orange-500"
                      onClick={() => onNavigate('resistor_game')}
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
                      onClick={() => onNavigate('base_converter')}
                      tags={['必備']}
                  />
              </div>
          )}
      </div>
    </div>
  );
};
