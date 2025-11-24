import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Loader2, RefreshCw } from 'lucide-react';
import { User, LeaderboardEntry } from '../types';
import { fetchClassLeaderboard } from '../services/dataService';

interface LeaderboardScreenProps {
  currentUser: User;
}

// Helper to get frame styles (reused)
const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
};

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ currentUser }) => {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = async () => {
    setIsLoading(true);
    try {
        const data = await fetchClassLeaderboard();
        setLeaderboard(data);
    } catch (e) {
        console.error("Failed to load leaderboard", e);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, [currentUser.points]); // Reload if current user points change

  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1: return <Trophy size={20} className="text-yellow-500 fill-current" />;
      case 2: return <Medal size={20} className="text-gray-400 fill-current" />;
      case 3: return <Medal size={20} className="text-orange-400 fill-current" />;
      default: return <span className="text-gray-400 dark:text-gray-500 font-bold w-5 text-center">{rank}</span>;
    }
  };

  // Find current user's rank in the fetched list
  const currentUserEntry = leaderboard.find(e => e.studentId === currentUser.studentId);
  const currentUserRank = currentUserEntry ? currentUserEntry.rank : '-';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 text-center border-b border-yellow-100 dark:border-yellow-900/20 flex justify-between items-center">
        <div className="w-8"></div>
        <p className="text-yellow-800 dark:text-yellow-500 font-medium text-sm">積極參與解題，成為班級學霸！</p>
        <button onClick={loadData} className="w-8 flex justify-end text-yellow-600 dark:text-yellow-400 hover:text-yellow-800">
            <RefreshCw size={16} className={isLoading ? "animate-spin" : ""} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 size={32} className="animate-spin mb-2" />
                <p className="text-xs">數據載入中...</p>
            </div>
        ) : leaderboard.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">暫無排名資料</div>
        ) : (
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {leaderboard.map((entry) => {
                  const isMe = entry.studentId === currentUser.studentId;
                  return (
                    <div key={entry.rank} className={`flex items-center p-4 transition-colors ${isMe ? 'bg-blue-50 dark:bg-blue-900/20' : 'bg-white dark:bg-gray-900'}`}>
                        <div className="flex-shrink-0 w-10 flex justify-center">
                        {getRankIcon(entry.rank)}
                        </div>
                        <div className={`flex-shrink-0 w-10 h-10 rounded-full ${entry.avatarColor} text-white flex items-center justify-center font-bold mx-3 shadow-sm overflow-hidden ${getFrameStyle(entry.avatarFrame)}`}>
                        {entry.avatarImage ? (
                            <img src={entry.avatarImage} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            entry.name.charAt(0)
                        )}
                        </div>
                        <div className="flex-grow">
                        <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                            {entry.name}
                            <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-1.5 rounded">Lv.{entry.level}</span>
                            {isMe && <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-1.5 rounded">我</span>}
                        </div>
                        <div className="text-xs text-gray-400">{entry.studentId}</div>
                        </div>
                        <div className="text-right">
                        <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">{entry.points}</div>
                        <div className="text-[10px] text-gray-400">積分</div>
                        </div>
                    </div>
                )})}
            </div>
        )}
      </div>

      {/* Sticky Bottom Current User Stat if loaded */}
      {!isLoading && leaderboard.length > 0 && (
          <div className="flex items-center p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] sticky bottom-0 z-10">
            <div className="flex-shrink-0 w-10 flex justify-center">
                <span className="text-gray-500 dark:text-gray-400 font-bold text-lg">{currentUserRank}</span>
            </div>
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center font-bold mx-3 shadow-sm overflow-hidden ${getFrameStyle(currentUser.avatarFrame)}`}>
                {currentUser.avatarImage ? (
                    <img src={currentUser.avatarImage} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                    currentUser.name.charAt(0) || 'U'
                )}
            </div>
            <div className="flex-grow">
                <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                    {currentUser.name}
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-1.5 rounded">Lv.{currentUser.level}</span>
                </div>
                <div className="text-xs text-gray-400">我的排名</div>
            </div>
            <div className="text-right">
                <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">{currentUser.points}</div>
                <div className="text-[10px] text-gray-400">目前積分</div>
            </div>
          </div>
      )}
    </div>
  );
};