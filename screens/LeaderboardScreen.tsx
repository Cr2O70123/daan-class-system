import React from 'react';
import { Trophy, Medal } from 'lucide-react';
import { User, LeaderboardEntry } from '../types';
import { calculateLevel } from '../services/levelService';

interface LeaderboardScreenProps {
  currentUser: User;
}

// Mock Data enriched with Levels
const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: '陳大華', studentId: '110002', points: 320, level: 1, avatarColor: 'bg-pink-500' },
  { rank: 2, name: '王小明', studentId: '110001', points: 150, level: 1, avatarColor: 'bg-purple-500' },
  { rank: 3, name: '張美麗', studentId: '110003', points: 80, level: 1, avatarColor: 'bg-red-500' },
];

export const LeaderboardScreen: React.FC<LeaderboardScreenProps> = ({ currentUser }) => {
  
  const getRankIcon = (rank: number) => {
    switch(rank) {
      case 1: return <Trophy size={20} className="text-yellow-500 fill-current" />;
      case 2: return <Medal size={20} className="text-gray-400 fill-current" />;
      case 3: return <Medal size={20} className="text-orange-400 fill-current" />;
      default: return <span className="text-gray-400 font-bold w-5 text-center">{rank}</span>;
    }
  };

  return (
    <div>
      <div className="bg-yellow-50 dark:bg-yellow-900/10 p-4 text-center border-b border-yellow-100 dark:border-yellow-900/20">
        <p className="text-yellow-800 dark:text-yellow-500 font-medium text-sm">積極參與解題，成為班級學霸！</p>
      </div>

      <div className="divide-y divide-gray-100 dark:divide-gray-700">
        {MOCK_LEADERBOARD.map((entry) => (
          <div key={entry.rank} className="flex items-center p-4 bg-white dark:bg-gray-800">
            <div className="flex-shrink-0 w-10 flex justify-center">
              {getRankIcon(entry.rank)}
            </div>
            <div className={`flex-shrink-0 w-10 h-10 rounded-full ${entry.avatarColor} text-white flex items-center justify-center font-bold mx-3 shadow-sm overflow-hidden`}>
               {entry.avatarImage ? (
                 <img src={entry.avatarImage} alt="avatar" className="w-full h-full object-cover" />
               ) : (
                 entry.name.charAt(0)
               )}
            </div>
            <div className="flex-grow">
              <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                  {entry.name}
                  <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded">Lv.{calculateLevel(entry.points)}</span>
              </div>
              <div className="text-xs text-gray-400">{entry.studentId}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">{entry.points}</div>
              <div className="text-[10px] text-gray-400">積分</div>
            </div>
          </div>
        ))}

        {/* Current User Placeholder */}
        <div className="flex items-center p-4 bg-blue-50 dark:bg-blue-900/10 mt-2 border-t border-blue-100 dark:border-blue-900/20">
          <div className="flex-shrink-0 w-10 flex justify-center">
            <span className="text-gray-400 font-bold w-5 text-center">4</span>
          </div>
          <div className={`flex-shrink-0 w-10 h-10 rounded-full ${currentUser.avatarColor} text-white flex items-center justify-center font-bold mx-3 shadow-sm overflow-hidden`}>
             {currentUser.avatarImage ? (
                <img src={currentUser.avatarImage} alt="avatar" className="w-full h-full object-cover" />
             ) : (
                currentUser.name.charAt(0) || 'U'
             )}
          </div>
          <div className="flex-grow">
            <div className="font-bold text-gray-800 dark:text-gray-100 flex items-center gap-2">
                {currentUser.name}
                <span className="text-[10px] bg-blue-100 text-blue-600 px-1.5 rounded">Lv.{currentUser.level}</span>
            </div>
            <div className="text-xs text-gray-400">{currentUser.studentId}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-blue-600 dark:text-blue-400 text-lg">{currentUser.points}</div>
            <div className="text-[10px] text-gray-400">積分</div>
          </div>
        </div>
      </div>
    </div>
  );
};