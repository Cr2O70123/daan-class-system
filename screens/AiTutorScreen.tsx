
import React from 'react';
import { Bot, BookOpen, BrainCircuit, Clock } from 'lucide-react';

export const AiTutorScreen: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col pb-24 relative overflow-hidden">
        {/* Cyberpunk Background Effects */}
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/circuit-board.png')] opacity-[0.03]"></div>
        <div className="absolute top-[-20%] right-[-20%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-blue-600/20 rounded-full blur-[100px]"></div>

        {/* Header Content */}
        <div className="p-6 pt-safe z-10 flex flex-col items-center justify-center min-h-[45vh] text-center relative">
            
            {/* Glowing Icon */}
            <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-purple-500 blur-2xl opacity-40 animate-pulse rounded-full"></div>
                <div className="w-32 h-32 bg-gray-900 rounded-full flex items-center justify-center relative border border-gray-700 shadow-2xl z-10">
                    <Bot size={64} className="text-blue-400 drop-shadow-[0_0_15px_rgba(96,165,250,0.8)]" />
                </div>
                
                {/* Coming Soon Badge */}
                <div className="absolute -top-4 -right-4 bg-yellow-400 text-black text-xs font-black px-3 py-1.5 rounded-lg shadow-[0_0_20px_rgba(250,204,21,0.6)] animate-[bounce_2s_infinite] transform rotate-6 border-2 border-yellow-200">
                    COMING SOON
                </div>
            </div>
            
            <h1 className="text-5xl font-black mb-3 tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 drop-shadow-sm">
                AI 萬能家教
            </h1>
            <div className="flex items-center gap-2 mb-4">
                <div className="h-[1px] w-8 bg-gray-600"></div>
                <span className="text-xs font-bold text-gray-400 uppercase tracking-[0.3em]">Powered by Gemini 3.0</span>
                <div className="h-[1px] w-8 bg-gray-600"></div>
            </div>
            <p className="text-gray-400 text-sm max-w-xs mx-auto leading-relaxed font-medium">
                全天候待命的智慧學習助手。<br/>
                不懂就問，隨時為您解惑。
            </p>
        </div>

        {/* Features Preview */}
        <div className="flex-1 px-6 space-y-4 z-10 pb-10">
            
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                        <BrainCircuit size={20} className="text-blue-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-blue-200">智能解題</h3>
                        <p className="text-[10px] text-gray-400 mt-1">拍照秒解，邏輯拆解</p>
                    </div>
                </div>

                <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex flex-col items-center text-center gap-2">
                    <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center">
                        <BookOpen size={20} className="text-purple-300" />
                    </div>
                    <div>
                        <h3 className="font-bold text-sm text-purple-200">客製化複習</h3>
                        <p className="text-[10px] text-gray-400 mt-1">針對弱點生成考卷</p>
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="p-6 pt-0 text-center z-10">
            <button className="w-full px-8 py-4 rounded-2xl bg-white/5 border border-white/10 text-gray-400 text-sm font-bold cursor-not-allowed hover:bg-white/10 transition-colors flex items-center justify-center gap-2">
                <Clock size={16} />
                功能開發中 • 敬請期待
            </button>
        </div>
    </div>
  );
};
