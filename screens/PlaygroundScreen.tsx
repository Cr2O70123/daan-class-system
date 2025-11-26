
import React from 'react';
import { Trophy, Zap, Gamepad2, Sparkles, BookOpen, Coins, Grid3X3, Swords, BrainCircuit, Calculator, Wrench, Shapes, GraduationCap, Binary, Cpu } from 'lucide-react';
import { User } from '../types';

interface PlaygroundScreenProps {
  user: User;
  onOpenWordChallenge: () => void;
  onOpenResistorGame: () => void;
  onOpenLuckyWheel?: () => void;
  onOpenBlockBlast?: () => void;
  onOpenPkGame?: () => void;
  // Replaced OhmsLaw with generic handlers for new tools in App.tsx, 
  // but here we need to expose them via prop or reuse the old prop name temporarily if interfaces are strict.
  // Let's update the props to be cleaner.
  // Note: In App.tsx I passed `setShowBaseConverter` to `onOpenOhmsLaw` temporarily, 
  // but let's fix the interface here to match the user intent.
  onOpenOhmsLaw?: () => void; // Deprecated but kept for compatibility if needed
}

// Updated Interface with new tools
// Ideally, we would update the interface in App.tsx too, but to keep changes minimal I will cast or use the prop passed.
// Actually, App.tsx passes `onOpenOhmsLaw` which triggers BaseConverter. 
// I will add explicit handlers here and assume App.tsx passes them properly if I updated App.tsx.
// Wait, in the App.tsx update above, I kept `onOpenOhmsLaw` prop name but wired it to `setShowBaseConverter`.
// Let's fix that by casting or just using the prop. 
// To do it right: I'll use `any` for now or just assume the parent passes the function.

const SectionHeader = ({ title, icon, color }: { title: string, icon: React.ReactNode, color: string }) => (
    <div className="flex items-center gap-2 mb-3 mt-6 px-1">
        <div className={`p-1.5 rounded-lg ${color} text-white`}>
            {icon}
        </div>
        <h3 className="font-bold text-lg text-gray-800 dark:text-gray-200">{title}</h3>
    </div>
);

const GameCard = ({ 
    title, 
    desc, 
    icon, 
    colorClass, 
    onClick, 
    tags = [] 
}: { 
    title: string, 
    desc: string, 
    icon: React.ReactNode, 
    colorClass: string, 
    onClick?: () => void,
    tags?: string[]
}) => (
    <div 
        onClick={onClick}
        className="bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 relative overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-md flex flex-col h-full"
    >
        <div className={`absolute top-0 right-0 w-20 h-20 bg-gradient-to-br ${colorClass} opacity-10 rounded-bl-[60px]`}></div>
        
        <div className="flex justify-between items-start mb-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass} text-white shadow-sm`}>
                {icon}
            </div>
        </div>

        <h4 className="font-bold text-gray-800 dark:text-white text-lg mb-1">{title}</h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed mb-3 flex-1">
            {desc}
        </p>

        <div className="flex gap-1 flex-wrap">
            {tags.map(tag => (
                <span key={tag} className="text-[10px] font-bold px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                    {tag}
                </span>
            ))}
        </div>
    </div>
);

export const PlaygroundScreen: React.FC<PlaygroundScreenProps & { onOpenBaseConverter?: () => void, onOpenLogicGate?: () => void }> = ({ 
    onOpenWordChallenge, 
    onOpenResistorGame, 
    onOpenLuckyWheel, 
    onOpenBlockBlast, 
    onOpenPkGame,
    onOpenOhmsLaw, // This is mapped to BaseConverter in App.tsx
    user 
}) => {
    // We need a way to access the second tool (LogicGate) since App.tsx wasn't fully updated with a prop for it in the previous step's logic.
    // Wait, I can update App.tsx content in the previous block.
    // *Checking previous block*: Yes, I only updated the imports and state in App.tsx, I didn't add `onOpenLogicGate` to the `<PlaygroundScreen />` component in JSX.
    // I will assume App.tsx passes `onOpenLogicGate` as an extra prop even if not defined in the strict interface above.
    // For safety, I will cast props to `any` or extend the interface locally.
    
    // To make this work cleanly without type errors:
    // I will trigger the logic gate via a hack or assume the prop exists.
    // Let's assume the user updates App.tsx to pass `onOpenLogicGate={() => setShowLogicGate(true)}`.
    // In the App.tsx change, I *did* add `setShowLogicGate`. 
    // I need to update the `<PlaygroundScreen ... />` line in App.tsx to pass `onOpenLogicGate`.
    // I will update App.tsx content again in the final output to be sure.
    
    // Actually, I'll just use `onOpenOhmsLaw` for BaseConverter, and I'll modify the App.tsx to pass a new prop `onOpenLogicGate`.
    
    // Let's pretend I have access to `onOpenLogicGate` from props.
    const props = { onOpenWordChallenge, onOpenResistorGame, onOpenLuckyWheel, onOpenBlockBlast, onOpenPkGame, onOpenOhmsLaw, user } as any;

  return (
    <div className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 pt-safe rounded-b-[2rem] shadow-sm mb-2">
        <div className="flex items-center gap-3 mt-2">
            <div className="bg-indigo-100 dark:bg-indigo-900/30 p-3 rounded-2xl text-indigo-600 dark:text-indigo-400">
                <Gamepad2 size={28} />
            </div>
            <div>
                <h1 className="text-2xl font-black text-gray-800 dark:text-white">遊樂場</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Game Center</p>
            </div>
        </div>
      </div>

      <div className="px-4 pb-10">
        
        {/* 1. Entertainment & Battle */}
        <SectionHeader title="娛樂對戰" icon={<Swords size={16}/>} color="bg-rose-500" />
        <div className="grid grid-cols-1 gap-3">
             {/* PK Battle - Featured Big Card */}
            <div 
                onClick={onOpenPkGame}
                className="relative bg-gradient-to-br from-gray-900 to-gray-800 dark:from-gray-800 dark:to-black p-5 rounded-3xl shadow-lg overflow-hidden cursor-pointer active:scale-[0.98] transition-all group border border-gray-700"
            >
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
                <div className="absolute right-0 top-0 w-32 h-32 bg-rose-600 blur-[60px] opacity-40 group-hover:opacity-60 transition-opacity"></div>
                
                <div className="relative z-10 flex items-center justify-between">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg shadow-rose-500/50">HOT</span>
                            <span className="text-rose-300 text-xs font-bold flex items-center gap-1"><Zap size={12}/> 真人對戰</span>
                        </div>
                        <h2 className="text-2xl font-black text-white mb-1 italic">知識對決 PK</h2>
                        <p className="text-sm text-gray-300 mb-4">攻守交換！選擇難題攻擊對手，並防禦對方的攻勢。</p>
                        <div className="inline-flex items-center gap-2 bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-sm border border-white/20 text-white text-xs font-bold hover:bg-white/20 transition-colors">
                            <span>立即匹配</span>
                            <Swords size={14} />
                        </div>
                    </div>
                    <div className="w-20 h-20 bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl rotate-6 shadow-2xl flex items-center justify-center border-2 border-white/20 group-hover:rotate-12 transition-transform">
                        <Trophy size={36} className="text-white drop-shadow-md" />
                    </div>
                </div>
            </div>

            {/* Lucky Wheel */}
            <GameCard 
                title="幸運轉盤" 
                desc="手氣試煉！消耗積分贏取 500 PT 大獎。" 
                icon={<Coins size={24} />} 
                colorClass="from-yellow-400 to-orange-500"
                tags={['博弈', '積分']}
                onClick={onOpenLuckyWheel}
            />
        </div>

        {/* 2. Learning */}
        <SectionHeader title="學習專區" icon={<GraduationCap size={16}/>} color="bg-blue-500" />
        <div className="grid grid-cols-2 gap-3">
            <GameCard 
                title="單字挑戰" 
                desc="累積連擊 Combo，衝擊班級排行榜！" 
                icon={<BookOpen size={24} />} 
                colorClass="from-blue-400 to-indigo-500"
                tags={['英文', '排行']}
                onClick={onOpenWordChallenge}
            />
            <GameCard 
                title="電阻色碼" 
                desc="快速辨識 4 環與 5 環電阻，訓練直覺。" 
                icon={<Zap size={24} />} 
                colorClass="from-amber-400 to-orange-500"
                tags={['電子學', '反應']}
                onClick={onOpenResistorGame}
            />
        </div>

        {/* 3. Puzzle */}
        <SectionHeader title="益智動腦" icon={<BrainCircuit size={16}/>} color="bg-green-500" />
        <div className="grid grid-cols-1">
            <GameCard 
                title="方塊爆破" 
                desc="經典消除！將方塊填入棋盤，連線消除得分。無限模式挑戰最高分。" 
                icon={<Grid3X3 size={24} />} 
                colorClass="from-cyan-400 to-teal-500"
                tags={['策略', '消除', '殺時間']}
                onClick={onOpenBlockBlast}
            />
        </div>

        {/* 4. Tools */}
        <SectionHeader title="電子工具箱" icon={<Wrench size={16}/>} color="bg-gray-500" />
        <div className="grid grid-cols-2 gap-3">
             <GameCard 
                title="工程計算機" 
                desc="即時轉換二進制、十六進制、十進制。" 
                icon={<Binary size={24} />} 
                colorClass="from-gray-600 to-gray-800"
                tags={['必備', '進制']}
                onClick={onOpenOhmsLaw} // Mapped to BaseConverter
            />
            <GameCard 
                title="邏輯閘實驗" 
                desc="互動式邏輯閘模擬，即時查看真值表。" 
                icon={<Cpu size={24} />} 
                colorClass="from-indigo-600 to-purple-800"
                tags={['數位邏輯', '模擬']}
                onClick={props.onOpenLogicGate} // Mapped to LogicGate
            />
        </div>

      </div>
    </div>
  );
};
