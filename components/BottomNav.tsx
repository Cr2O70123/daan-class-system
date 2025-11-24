import React from 'react';
import { Home, BookOpen, ShoppingBag, User, Gamepad2, Calendar } from 'lucide-react';
import { Tab } from '../types';

interface BottomNavProps {
  currentTab: Tab;
  setTab: (tab: Tab) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, setTab }) => {
  const navItems = [
    { tab: Tab.HOME, label: '首頁', icon: <Home size={24} /> },
    { tab: Tab.RESOURCE, label: '資源', icon: <BookOpen size={24} /> },
    { tab: Tab.PLAYGROUND, label: '遊樂場', icon: <Gamepad2 size={24} /> },
    { tab: Tab.EXAM, label: '考試', icon: <Calendar size={24} /> },
    { tab: Tab.STORE, label: '商店', icon: <ShoppingBag size={24} /> },
    { tab: Tab.PROFILE, label: '我的', icon: <User size={24} /> },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700 pb-safe px-4 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50 transition-colors">
      <div className="flex justify-between items-center max-w-md mx-auto">
        {navItems.map((item) => (
          <button
            key={item.tab}
            onClick={() => setTab(item.tab)}
            className={`flex flex-col items-center justify-center py-3 px-2 transition-all duration-300 w-14 ${
              currentTab === item.tab 
                ? 'text-blue-600 dark:text-blue-400 -translate-y-1' 
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
            }`}
          >
            {item.icon}
            <span className={`text-[10px] mt-1 font-bold ${currentTab === item.tab ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
};