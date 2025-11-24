import React, { useEffect, useState } from 'react';
import { Trophy, Medal, Loader2, RefreshCw, Crown, TrendingUp } from 'lucide-react';
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

  const getRankDisplay = (rank: number) => {
    switch(rank) {
      case 1: return <Crown size={24} className="text-yellow-500 fill-yellow-500 drop-shadow-sm" />;
      case 2: return <Medal size={24} className="text-gray-400 fill-gray-200 drop-shadow-sm" />;
      case 3: return <Medal size={24} className="text-orange-500 fill-orange-200 drop-shadow-sm" />;
      default: return <span className="text-gray-500 dark:text-gray-500 font-bold w-6 text-center font-mono text-lg">{rank}</span>;
    }
  };

  const getRowStyle = (rank: number, isMe: boolean) => {
      if (isMe) return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      if (rank === 1) return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      if (rank === 2) return 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700';
      if (rank === 3) return 'bg-orange-50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800';
      return 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800';
  };

  // Find current user's rank in the fetched list
  const currentUserEntry = leaderboard.find(e => e.studentId === currentUser.studentId);
  const currentUserRank = currentUserEntry ? currentUserEntry.rank : '-';

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-900 transition-colors">
      {/* Quick Refresh Header */}
      <div className="px-4 py-2 flex justify-end border-b border-gray-100 dark:border-gray-800">
          <button 
            onClick={loadData} 
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
          >
              <RefreshCw size={12} className={isLoading ? "animate-spin" : ""} />
              <span>刷新數據</span>
          </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                <Loader2 size={32} className="animate-spin mb-2" />
                <p className="text-xs">數據同步中...</p>
            </div>
        ) : leaderboard.length === 0 ? (
            <div className="text-center py-20 text-gray-400 text-sm">暫無排名資料</div>
        ) : (
            leaderboard.map((entry) => {
                const isMe = entry.studentId === currentUser.studentId;
                return (
                    <div 
                        key={entry.rank} 
                        className={`flex items-center p-3 rounded-2xl border shadow-sm transition-all ${getRowStyle(entry.rank, isMe)}`}
                    >
                        {/* Rank */}
                        <div className="flex-shrink-0 w-12 flex justify-center">
                            {getRankDisplay(entry.rank)}
                        </div>
                        
                        {/* Avatar */}
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full ${entry.avatarColor} text-white flex items-center justify-center font-bold mx-2 shadow-sm overflow-hidden ${getFrameStyle(entry.avatarFrame)}`}>
                            {entry.avatarImage ? (
                                <img src={entry.avatarImage} alt="avatar" className="w-full h-full object-cover" />
                            ) : (
                                entry.name.charAt(0)
                            )}
                        </div>
                        
                        {/* Info */}
                        <div className="flex-grow min-w-0">
                            <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2 truncate">
                                {entry.name}
                                {isMe && <span className="flex-shrink-0 text-[9px] bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-1.5 py-0.5 rounded font-bold">ME</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[10px] bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 rounded-full font-bold">
                                    Lv.{entry.level}
                                </span>
                                <span className="text-xs text-gray-400 truncate">{entry.studentId}</span>
                            </div>
                        </div>
                        
                        {/* Score */}
                        <div className="text-right pl-2">
                            <div className="font-black font-mono text-lg text-blue-600 dark:text-blue-400 leading-none">{entry.points}</div>
                            <div className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">PT</div>
                        </div>
                    </div>
                );
            })
        )}
      </div>

      {/* Sticky Bottom Current User Stat if loaded */}
      {!isLoading && leaderboard.length > 0 && (
          <div className="flex items-center p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] sticky bottom-0 z-10">
            <div className="flex-shrink-0 w-10 flex justify-center">
                <span className="text-gray-500 dark:text-gray-400 font-bold font-mono text-lg">{currentUserRank}</span>
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
                    <span className="text-[10px] bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 px-1.5 rounded font-bold">Lv.{currentUser.level}</span>
                </div>
                <div className="text-xs text-gray-400">我的目前排名</div>
            </div>
            <div className="text-right">
                <div className="font-black font-mono text-blue-600 dark:text-blue-400 text-lg">{currentUser.points}</div>
                <div className="text-[10px] text-gray-400 uppercase">PT</div>
            </div>
          </div>
      )}
    </div>
  );
};