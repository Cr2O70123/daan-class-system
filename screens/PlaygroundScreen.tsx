import React from 'react';
import { Trophy, Zap, Gamepad2, Sparkles, BookOpen } from 'lucide-react';
import { User } from '../types';

interface PlaygroundScreenProps {
  onOpenWordChallenge: () => void;
  onOpenResistorGame: () => void;
  user: User;
}

export const PlaygroundScreen: React.FC<PlaygroundScreenProps> = ({ onOpenWordChallenge, onOpenResistorGame, user }) => {
  return (
    <div className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors">
      
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 p-6 pt-safe rounded-b-[2rem] shadow-sm mb-6">
        <div className="flex items-center gap-3 mt-2">
            <div className="bg-purple-100 dark:bg-purple-900/30 p-3 rounded-2xl text-purple-600 dark:text-purple-400">
                <Gamepad2 size={28} />
            </div>
            <div>
                <h1 className="text-2xl font-black text-gray-800 dark:text-white">遊樂場</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Game Center</p>
            </div>
        </div>
      </div>

      <div className="px-4 space-y-4">
        
        {/* Game 1: Word Challenge */}
        <div 
            onClick={onOpenWordChallenge}
            className="group relative bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-lg"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-bl-[100px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-3 rounded-2xl text-blue-600 dark:text-blue-400">
                    <BookOpen size={24} />
                </div>
                <div className="flex items-center gap-1 bg-yellow-50 dark:bg-yellow-900/20 px-3 py-1 rounded-full border border-yellow-100 dark:border-yellow-800">
                    <Trophy size={12} className="text-yellow-500" />
                    <span className="text-xs font-bold text-yellow-600 dark:text-yellow-400">熱門排行</span>
                </div>
            </div>

            <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">英文單字挑戰賽</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                挑戰你的專業英文詞彙量！累積連擊 Combo 衝擊班級排行榜，贏取大量 PT 獎勵。
            </p>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">單字記憶</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">每週更新</span>
            </div>
        </div>

        {/* Game 2: Resistor Rush */}
        <div 
            onClick={onOpenResistorGame}
            className="group relative bg-white dark:bg-gray-800 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden cursor-pointer active:scale-[0.98] transition-all hover:shadow-lg"
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-amber-400 to-orange-600 rounded-bl-[100px] opacity-10 group-hover:opacity-20 transition-opacity"></div>
            
            <div className="flex justify-between items-start mb-4">
                <div className="bg-orange-100 dark:bg-orange-900/30 p-3 rounded-2xl text-orange-600 dark:text-orange-400">
                    <Zap size={24} />
                </div>
                <div className="flex items-center gap-1 bg-purple-50 dark:bg-purple-900/20 px-3 py-1 rounded-full border border-purple-100 dark:border-purple-800">
                    <Sparkles size={12} className="text-purple-500" />
                    <span className="text-xs font-bold text-purple-600 dark:text-purple-400">新推出</span>
                </div>
            </div>

            <h2 className="text-xl font-black text-gray-800 dark:text-white mb-2">電阻色碼大師</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed mb-4">
                電子科必備技能！在時間壓力下快速辨識 4 環與 5 環電阻色碼，考驗你的直覺反應。
            </p>

            <div className="flex items-center gap-2 text-xs font-bold text-gray-400">
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">專業科目</span>
                <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">反應速度</span>
            </div>
        </div>

      </div>
    </div>
  );
};