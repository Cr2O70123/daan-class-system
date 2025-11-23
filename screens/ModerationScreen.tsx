import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, AlertOctagon, Users, Award } from 'lucide-react';
import { Report, User } from '../types';

interface ModerationScreenProps {
  user: User;
  reports: Report[];
  onBack: () => void;
}

const MOCK_USERS_LIST = [
    { name: '陳大華', id: '110002', points: 320, role: 'User' },
    { name: '王小明', id: '110001', points: 150, role: 'User' },
    { name: '張美麗', id: '110003', points: 80, role: 'User' },
    { name: '李大同', id: '110004', points: 1050, role: 'User' },
    { name: 'Admin', id: '000000', points: 999999, role: 'Admin' },
];

export const ModerationScreen: React.FC<ModerationScreenProps> = ({ user, reports, onBack }) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'users'>('reports');
  
  // Security Check
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-100 p-4 rounded-full text-red-500 mb-4">
            <AlertOctagon size={40} />
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">權限不足</h2>
        <p className="text-gray-500 text-sm mb-6">此區域僅限管理員進入，請返回首頁。</p>
        <button onClick={onBack} className="bg-gray-800 text-white px-6 py-2 rounded-lg font-bold text-sm">
            返回
        </button>
      </div>
    );
  }

  return (
    <div className="pb-24">
      {/* Header */}
      <div className="bg-red-600 text-white p-4 sticky top-0 z-20 flex items-center gap-3 shadow-md">
        <button onClick={onBack} className="hover:bg-red-700 p-1 rounded transition-colors">
            <ShieldCheck size={24} />
        </button>
        <div>
            <h1 className="font-bold text-lg">檢舉管理後台</h1>
            <p className="text-red-200 text-xs">Admin Dashboard</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-0 z-10">
        <button 
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'reports' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <AlertOctagon size={16} /> 待處理 ({reports.length})
        </button>
        <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'users' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} /> 使用者列表
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        
        {/* Reports Tab */}
        {activeTab === 'reports' && (
            reports.length === 0 ? (
                <div className="bg-white rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center border border-gray-100 shadow-sm">
                    <div className="w-20 h-20 rounded-full border-4 border-green-400 flex items-center justify-center mb-6 text-green-500">
                    <CheckCircle size={40} />
                    </div>
                    <p className="text-gray-800 font-bold mb-1">目前沒有待處理的檢舉</p>
                    <p className="text-gray-400 text-sm">班級風氣維持良好，太棒了！</p>
                </div>
            ) : (
                reports.map(report => (
                    <div key={report.id} className="bg-white p-4 rounded-xl border-l-4 border-red-500 shadow-sm">
                        <div className="flex justify-between items-start mb-2">
                            <span className="text-xs font-bold bg-red-100 text-red-600 px-2 py-1 rounded">
                                {report.targetType === 'question' ? '問題' : '回答'}
                            </span>
                            <span className="text-xs text-gray-400">ID: {report.targetId}</span>
                        </div>
                        <div className="text-sm font-bold text-gray-800 mb-1">檢舉原因：{report.reason}</div>
                        <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 italic border border-gray-100 mb-3">
                            "{report.contentSnippet}"
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>檢舉人: {report.reporter}</span>
                            <div className="flex gap-2">
                                <button className="text-gray-500 hover:bg-gray-100 px-3 py-1 rounded">略過</button>
                                <button className="bg-red-600 text-white px-3 py-1 rounded font-bold hover:bg-red-700">刪除內容</button>
                            </div>
                        </div>
                    </div>
                ))
            )
        )}

        {/* Users Tab */}
        {activeTab === 'users' && (
            <div className="space-y-3">
                {MOCK_USERS_LIST.map(u => (
                    <div key={u.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${u.role === 'Admin' ? 'bg-red-500' : 'bg-blue-500'}`}>
                                {u.name.charAt(0)}
                            </div>
                            <div>
                                <div className="font-bold text-gray-800 flex items-center gap-2">
                                    {u.name}
                                    {u.role === 'Admin' && <span className="bg-red-100 text-red-600 text-[10px] px-2 py-0.5 rounded-full">Admin</span>}
                                </div>
                                <div className="text-xs text-gray-400">{u.id}</div>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="font-bold text-blue-600 flex items-center justify-end gap-1">
                                <Award size={14} /> {u.points}
                            </div>
                            <button className="text-xs text-gray-400 underline hover:text-red-500">管理</button>
                        </div>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};