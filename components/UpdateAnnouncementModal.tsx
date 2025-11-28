
import React from 'react';
import { Rocket, CheckCircle2, ShoppingBag, Image as ImageIcon, Zap, X, AlertTriangle } from 'lucide-react';

interface UpdateAnnouncementModalProps {
  onClose: () => void;
}

export const UpdateAnnouncementModal: React.FC<UpdateAnnouncementModalProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-500">
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 dark:border-slate-800 flex flex-col max-h-[85vh] relative">
        
        {/* Top Right Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 bg-black/20 hover:bg-black/40 text-white p-2 rounded-full transition-colors backdrop-blur-sm"
        >
            <X size={20} />
        </button>

        {/* Header - Premium Solid Dark Style */}
        <div className="bg-slate-800 p-6 text-white text-center relative overflow-hidden shrink-0">
            {/* Subtle Texture Overlay */}
            <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            
            <div className="relative z-10">
                <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4 backdrop-blur-sm border border-white/20 shadow-xl animate-bounce">
                    <Rocket size={32} className="text-blue-400" />
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white">內測 2.0 版本</h2>
                <div className="flex justify-center gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-blue-500 text-white px-2 py-0.5 rounded tracking-wider uppercase">Major Update</span>
                    <span className="text-[10px] font-bold bg-slate-600 text-slate-300 px-2 py-0.5 rounded tracking-wider uppercase">Build 2025</span>
                </div>
            </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6 bg-slate-50 dark:bg-gray-950">
            
            {/* WARNING ALERT - Placed at the very top as requested */}
            <div className="bg-red-500 text-white p-4 rounded-xl shadow-lg animate-pulse border-2 border-red-400">
                <h3 className="font-black text-lg flex items-center gap-2 mb-1">
                    <AlertTriangle size={24} className="fill-white text-red-600" /> 嚴正聲明：關於刷榜行為
                </h3>
                <p className="text-xs font-bold leading-relaxed opacity-95">
                    近期發現有部分同學利用漏洞或腳本惡意刷分（刷榜）。系統後台已進行數據回溯與修復，並全面加強防作弊機制。
                    <br/><br/>
                    <span className="bg-white/20 px-1 rounded">請大家維持公平競爭，切勿以身試法，違者帳號將直接永久停權。</span>
                </p>
            </div>

            <div className="space-y-2">
                <p className="text-slate-600 dark:text-slate-300 font-bold text-sm leading-relaxed">
                    親愛的用戶您好，我們推出了內測 2.0 版本更新，以下是更新細節：
                </p>
            </div>

            <div className="space-y-4">
                {/* Feature 1: PK & Games */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-black text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                        <Zap size={18} /> 競技與遊戲大升級
                    </h3>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                        <li><span className="font-bold text-slate-800 dark:text-white">PK 超載模式</span>：賭上 HP 的心理博弈，新增蓄力攻擊與完美格擋機制。</li>
                        <li><span className="font-bold text-slate-800 dark:text-white">畫畫接龍 2.0</span>：支援房間大廳、即時顯示題目，<span className="text-pink-500 font-bold">題目投稿獎勵提升至 2 PT</span>。</li>
                        <li><span className="font-bold text-slate-800 dark:text-white">單字練習模式</span>：新增「純練習」功能，不扣分、不限時，含發音與例句。</li>
                    </ul>
                </div>

                {/* Feature 2: Shop & Economy */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-black text-blue-600 dark:text-blue-400 mb-2 flex items-center gap-2">
                        <ShoppingBag size={18} /> 商店與經濟系統
                    </h3>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                        <li><span className="font-bold text-slate-800 dark:text-white">商品更新</span>：上架多款全新「頭像框」與「特殊道具」（如匿名卡）。</li>
                        <li><span className="font-bold text-slate-800 dark:text-white">價格調整</span>：全面平衡商品價格與積分獲取率。</li>
                        <li><span className="font-bold text-slate-800 dark:text-white">幸運轉盤</span>：每日限轉 3 次，有機會獲得高額積分。</li>
                    </ul>
                </div>

                {/* Feature 3: Personalization */}
                <div className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <h3 className="font-black text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
                        <ImageIcon size={18} /> 個人化與其他
                    </h3>
                    <ul className="text-xs text-slate-600 dark:text-slate-400 space-y-2 list-disc list-inside">
                        <li><span className="font-bold text-slate-800 dark:text-white">自訂背景</span>：個人主頁現在可以上傳喜歡的封面圖片了！</li>
                        <li><span className="font-bold text-slate-800 dark:text-white">High-Low 博弈</span>：修復顯示問題，新增風險警示。</li>
                    </ul>
                </div>
            </div>

            <div className="bg-slate-200 dark:bg-slate-800 p-4 rounded-xl text-center">
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                    感謝大家的陪伴，希望未來可以讓學習變得更有趣，打造最強的班級社群！
                </p>
            </div>
        </div>

        {/* Footer Action */}
        <div className="p-4 bg-white dark:bg-gray-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button 
                onClick={onClose}
                className="w-full py-4 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-2 bg-slate-800 text-white shadow-lg hover:bg-slate-700 active:scale-95"
            >
                <span className="flex items-center gap-2">
                    <CheckCircle2 size={20} />
                    進入系統
                </span>
            </button>
        </div>

      </div>
    </div>
  );
};
