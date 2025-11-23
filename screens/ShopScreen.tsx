import React, { useState, useMemo } from 'react';
import { ShoppingBag, Star, Zap, Crown, Palette, Ghost, MessageCircle, LayoutGrid, Brush, ArrowDownNarrowWide, ArrowUpNarrowWide, Pin } from 'lucide-react';
import { User, Product } from '../types';

interface ShopScreenProps {
  user: User;
  onBuy: (product: Product) => void;
}

// Extended Product List - App Internal Items Only
const PRODUCTS: Product[] = [
  // --- Avatar Frames (New) ---
  { id: 'frame_gold', name: '黃金光環', price: 2000, color: 'bg-yellow-100 text-yellow-600', icon: <Crown size={20} />, description: '尊爵不凡的金色光環 (頭像框)', category: 'frame' },
  { id: 'frame_neon', name: '霓虹科技', price: 1500, color: 'bg-cyan-100 text-cyan-600', icon: <Zap size={20} />, description: '充滿未來感的藍色霓虹 (頭像框)', category: 'frame' },
  { id: 'frame_fire', name: '烈焰燃燒', price: 1200, color: 'bg-orange-100 text-orange-600', icon: <Zap size={20} />, description: '像火焰一樣的熱情 (頭像框)', category: 'frame' },
  { id: 'frame_pixel', name: '復古像素', price: 1000, color: 'bg-purple-100 text-purple-600', icon: <LayoutGrid size={20} />, description: '8-bit 風格像素邊框 (頭像框)', category: 'frame' },

  // --- Cosmetics (外觀) ---
  { id: 'name_rainbow', name: '彩虹暱稱', price: 800, color: 'bg-pink-100 text-pink-600', icon: <Palette size={20} />, description: '七彩霓虹燈，全場焦點', category: 'cosmetic' },
  { id: 'bubble_matrix', name: '駭客氣泡', price: 600, color: 'bg-green-100 text-green-600', icon: <MessageCircle size={20} />, description: '留言背景變成黑客任務風格', category: 'cosmetic' },
  { id: 'name_blue', name: '海洋藍暱稱', price: 300, color: 'bg-blue-100 text-blue-600', icon: <Palette size={20} />, description: '將你的名字變成清爽的藍色', category: 'cosmetic' },

  // --- Tools (功能) ---
  { id: 'card_pin', name: '問題置頂卡', price: 250, color: 'bg-orange-100 text-orange-600', icon: <Pin size={20} />, description: '讓你的問題在首頁置頂 24 小時', category: 'tool' },
  { id: 'card_anon', name: '匿名發問卡', price: 100, color: 'bg-gray-100 text-gray-600', icon: <Ghost size={20} />, description: '這一次發問不會顯示你的名字', category: 'tool' },
  { id: 'badge_star', name: '學霸徽章', price: 500, color: 'bg-amber-100 text-amber-600', icon: <Star size={20} />, description: '個人頁面顯示榮譽徽章', category: 'tool' },
];

export const ShopScreen: React.FC<ShopScreenProps> = ({ user, onBuy }) => {
  const [activeCategory, setActiveCategory] = useState<'all' | 'tool' | 'cosmetic' | 'frame'>('all');
  const [sortOrder, setSortOrder] = useState<'default' | 'asc' | 'desc'>('default');

  // Filter and Sort Logic
  const processedProducts = useMemo(() => {
    let result = activeCategory === 'all' 
      ? [...PRODUCTS] 
      : PRODUCTS.filter(p => p.category === activeCategory);

    if (sortOrder === 'asc') {
      result.sort((a, b) => a.price - b.price);
    } else if (sortOrder === 'desc') {
      result.sort((a, b) => b.price - a.price);
    }

    return result;
  }, [activeCategory, sortOrder]);

  const toggleSort = () => {
    if (sortOrder === 'default') setSortOrder('asc');
    else if (sortOrder === 'asc') setSortOrder('desc');
    else setSortOrder('default');
  };

  return (
    <div className="pb-24 bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6 pt-8 text-white mb-4 shadow-lg rounded-b-[2rem]">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <ShoppingBag className="text-blue-200" /> 福利社
            </h2>
            <p className="text-blue-100 text-sm mt-1 opacity-90">打造你的專屬風格</p>
          </div>
          <div className="text-right bg-white/10 backdrop-blur-md p-3 rounded-xl border border-white/20">
            <div className="text-3xl font-bold font-mono tracking-tighter">{user.points}</div>
            <div className="text-[10px] text-blue-200 font-bold uppercase tracking-wider">現有積分 (PT)</div>
          </div>
        </div>
      </div>

      {/* Controls Bar */}
      <div className="px-4 mb-6 sticky top-[60px] z-20">
        <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 flex gap-2 overflow-x-auto no-scrollbar">
            {/* Sort Button */}
            <button 
                onClick={toggleSort}
                className="w-10 h-10 flex-shrink-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                title="排序"
            >
                {sortOrder === 'default' && <span className="text-xs font-bold">預設</span>}
                {sortOrder === 'asc' && <ArrowUpNarrowWide size={18} className="text-blue-500" />}
                {sortOrder === 'desc' && <ArrowDownNarrowWide size={18} className="text-orange-500" />}
            </button>

            {/* Category Tabs */}
            <div className="flex-1 flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 min-w-[250px]">
                <button 
                    onClick={() => setActiveCategory('all')}
                    className={`flex-1 rounded-md text-xs font-bold transition-all px-2 ${activeCategory === 'all' ? 'bg-white dark:bg-gray-600 shadow-sm text-gray-800 dark:text-white' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    全部
                </button>
                <button 
                    onClick={() => setActiveCategory('frame')}
                    className={`flex-1 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 px-2 ${activeCategory === 'frame' ? 'bg-white dark:bg-gray-600 shadow-sm text-purple-600 dark:text-purple-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Crown size={12} /> 頭像框
                </button>
                <button 
                    onClick={() => setActiveCategory('cosmetic')}
                    className={`flex-1 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 px-2 ${activeCategory === 'cosmetic' ? 'bg-white dark:bg-gray-600 shadow-sm text-pink-600 dark:text-pink-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Brush size={12} /> 外觀
                </button>
                <button 
                    onClick={() => setActiveCategory('tool')}
                    className={`flex-1 rounded-md text-xs font-bold transition-all flex items-center justify-center gap-1 px-2 ${activeCategory === 'tool' ? 'bg-white dark:bg-gray-600 shadow-sm text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Zap size={12} /> 道具
                </button>
            </div>
        </div>
      </div>

      {/* Grid */}
      <div className="px-4 grid grid-cols-2 gap-4">
        {processedProducts.map((product) => {
          const isOwned = user.inventory.includes(product.id) || user.avatarFrame === product.id;
          const isEquipped = user.avatarFrame === product.id;
          const canAfford = user.points >= product.price;

          return (
            <div key={product.id} className={`bg-white dark:bg-gray-800 rounded-2xl p-4 shadow-sm border ${isEquipped ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-100 dark:border-gray-700'} flex flex-col items-center text-center relative overflow-hidden group transition-all hover:shadow-md hover:-translate-y-1`}>
              {/* Equipped Badge */}
              {isEquipped && (
                  <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-bold px-2 py-1 rounded-bl-lg z-10">
                      使用中
                  </div>
              )}
              
              <div className={`w-14 h-14 rounded-2xl ${product.color} flex items-center justify-center mb-3 group-hover:scale-110 transition-transform duration-300 shadow-sm`}>
                {product.icon}
              </div>
              
              <h3 className="font-bold text-gray-800 dark:text-gray-100 mb-1">{product.name}</h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 h-8 leading-tight line-clamp-2 px-1">{product.description}</p>
              
              <div className="mt-auto w-full">
                  <button
                    disabled={isOwned && product.category !== 'frame'} // Allow frames to be clicked to equip? For simplicity, handle in logic
                    onClick={() => onBuy(product)}
                    className={`w-full py-2.5 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-1 ${
                      isEquipped 
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 cursor-default'
                        : isOwned
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-200' 
                            : canAfford 
                              ? 'bg-blue-600 text-white hover:bg-blue-700 shadow-lg shadow-blue-600/20 active:scale-95' 
                              : 'bg-gray-200 dark:bg-gray-700 text-gray-500 cursor-not-allowed'
                    }`}
                  >
                    {isEquipped ? (
                        <span>使用中</span>
                    ) : isOwned ? (
                        <span>{product.category === 'frame' ? '裝備' : '已擁有'}</span>
                    ) : (
                        <>
                            <span>{product.price}</span>
                            <span className="text-[10px] opacity-80 font-normal">PT</span>
                        </>
                    )}
                  </button>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Empty State if no products match */}
      {processedProducts.length === 0 && (
          <div className="text-center text-gray-400 py-10">
              <p>沒有符合條件的商品</p>
          </div>
      )}
    </div>
  );
};