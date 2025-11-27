
import React from 'react';
import { Home, BookOpen, ShoppingBag, User, Gamepad2 } from 'lucide-react';
import { Tab } from '../types';

interface BottomNavProps {
  currentTab: Tab;
  setTab: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setTab }) => {
  const navItems = [
    { tab: Tab.HOME, label: '首頁', icon: <Home size={22} /> },
    { tab: Tab.RESOURCE, label: '資源', icon: <BookOpen size={22} /> },
    { tab: Tab.PLAYGROUND, label: '更多', icon: <Gamepad2 size={26} /> }, // Highlight middle icon slightly
    { tab: Tab.STORE, label: '商店', icon: <ShoppingBag size={22} /> },
    { tab: Tab.PROFILE, label: '我的', icon: <User size={22} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-safe z-50 transition-colors shadow-[0_-4px_20px_rgba(0,0,0,0.02)]">
      <div className="flex justify-between items-end max-w-md mx-auto px-2">
        {navItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => setTab(item.tab)}
            className={`flex flex-col items-center justify-center py-2 px-1 transition-all duration-200 w-full active:scale-95 ${
              currentTab === item.tab 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            <div className={`transition-transform duration-300 ${currentTab === item.tab ? '-translate-y-1' : ''}`}>
                {item.icon}
            </div>
            <span className={`text-[9px] font-bold transition-opacity duration-300 ${currentTab === item.tab ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};
