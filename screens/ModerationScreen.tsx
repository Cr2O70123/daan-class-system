import React, { useState } from 'react';
import { ShieldCheck, CheckCircle, AlertOctagon, Users, Award, Trash2, Ban, Unlock, BookOpen, MessageCircle, HelpCircle } from 'lucide-react';
import { Report, User, Question, Resource, Exam } from '../types';

interface ModerationScreenProps {
  user: User;
  reports: Report[];
  // Pass all data to admin for management
  allQuestions?: Question[];
  allResources?: Resource[];
  allExams?: Exam[];
  
  onBack: () => void;
  onBanUser: (studentId: string) => void;
  onUnbanUser: (studentId: string) => void;
  onDeleteContent: (type: 'question' | 'reply' | 'resource' | 'exam', id: number) => void;
}

const MOCK_USERS_LIST = [
    { name: '陳大華', id: '110002', points: 320, role: 'User' },
    { name: '王小明', id: '110001', points: 150, role: 'User' },
    { name: '張美麗', id: '110003', points: 80, role: 'User' },
    { name: '李大同', id: '110004', points: 1050, role: 'User' },
];

export const ModerationScreen: React.FC<ModerationScreenProps> = ({ 
    user, reports, allQuestions=[], allResources=[], allExams=[], 
    onBack, onBanUser, onUnbanUser, onDeleteContent 
}) => {
  const [activeTab, setActiveTab] = useState<'reports' | 'users' | 'content'>('content');
  const [targetBanId, setTargetBanId] = useState('');
  
  if (!user.isAdmin) return null;

  return (
    <div className="pb-24">
      {/* Header - Added pt-safe */}
      <div className="bg-red-600 text-white p-4 pt-safe sticky top-0 z-20 flex items-center gap-3 shadow-md">
        <button onClick={onBack} className="hover:bg-red-700 p-1 rounded transition-colors">
            <ShieldCheck size={24} />
        </button>
        <div>
            <h1 className="font-bold text-lg">檢舉管理後台</h1>
            <p className="text-red-200 text-xs">Admin Dashboard</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 bg-white sticky top-[calc(60px+env(safe-area-inset-top,20px))] z-10">
        <button 
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'content' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Trash2 size={16} /> 內容管理
        </button>
        <button 
            onClick={() => setActiveTab('reports')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'reports' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <AlertOctagon size={16} /> 檢舉 ({reports.length})
        </button>
        <button 
            onClick={() => setActiveTab('users')}
            className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 ${activeTab === 'users' ? 'text-red-600 border-b-2 border-red-600' : 'text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={16} /> 用戶
        </button>
      </div>

      {/* Content */}
      <div className="p-4 space-y-4">
        
        {/* Content Management Tab */}
        {activeTab === 'content' && (
            <div className="space-y-6">
                {/* Questions */}
                <div>
                    <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><HelpCircle size={16}/> 所有問題 ({allQuestions.length})</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-h-60 overflow-y-auto">
                        {allQuestions.map(q => (
                            <div key={q.id} className="p-3 border-b border-gray-100 flex justify-between items-center text-sm">
                                <span className="truncate flex-1 text-gray-600">{q.title}</span>
                                <span className="text-xs text-gray-400 mx-2">{q.author}</span>
                                <button onClick={() => { if(confirm('刪除此問題?')) onDeleteContent('question', q.id); }} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Resources */}
                <div>
                    <h3 className="font-bold text-gray-700 mb-2 flex items-center gap-2"><BookOpen size={16}/> 所有資源 ({allResources.length})</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 max-h-60 overflow-y-auto">
                        {allResources.map(r => (
                            <div key={r.id} className="p-3 border-b border-gray-100 flex justify-between items-center text-sm">
                                <span className="truncate flex-1 text-gray-600">{r.title}</span>
                                <span className="text-xs text-gray-400 mx-2">{r.author}</span>
                                <button onClick={() => { if(confirm('刪除此資源?')) onDeleteContent('resource', r.id); }} className="text-red-500 p-1 hover:bg-red-50 rounded"><Trash2 size={14}/></button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Reports Tab */}
        {activeTab === 'reports' && (
            reports.length === 0 ? (
                <div className="bg-white rounded-xl p-8 flex flex-col items-center justify-center min-h-[300px] text-center border border-gray-100 shadow-sm">
                    <div className="w-20 h-20 rounded-full border-4 border-green-400 flex items-center justify-center mb-6 text-green-500">
                    <CheckCircle size={40} />
                    </div>
                    <p className="text-gray-800 font-bold mb-1">目前沒有待處理的檢舉</p>
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
                        <div className="text-sm font-bold text-gray-800 mb-1">原因：{report.reason}</div>
                        <div className="bg-gray-50 p-3 rounded-lg text-xs text-gray-600 italic border border-gray-100 mb-3">
                            "{report.contentSnippet}"
                        </div>
                        <div className="flex justify-between items-center text-xs text-gray-400">
                            <span>檢舉人: {report.reporter}</span>
                            <button 
                                onClick={() => onDeleteContent(report.targetType === 'question' ? 'question' : 'reply', report.targetId)}
                                className="bg-red-600 text-white px-3 py-1 rounded font-bold hover:bg-red-700"
                            >
                                刪除內容
                            </button>
                        </div>
                    </div>
                ))
            )
        )}

        {/* Users Tab (Ban Tools) */}
        {activeTab === 'users' && (
            <div className="space-y-4">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <h3 className="font-bold mb-3 flex items-center gap-2 text-gray-800">
                        <Ban size={18} className="text-red-500" /> 帳號停權管理
                    </h3>
                    <div className="flex gap-2 mb-2">
                        <input 
                            type="text" 
                            placeholder="輸入學號 (Student ID)" 
                            value={targetBanId}
                            onChange={e => setTargetBanId(e.target.value)}
                            className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-red-500"
                        />
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => {
                                if(confirm(`確定停權 ${targetBanId}?`)) {
                                    onBanUser(targetBanId);
                                    setTargetBanId('');
                                }
                            }}
                            className="flex-1 bg-red-100 text-red-600 px-4 py-2 rounded font-bold text-sm hover:bg-red-200 flex items-center justify-center gap-1"
                        >
                            <Ban size={14} /> 停權
                        </button>
                        <button 
                            onClick={() => {
                                if(confirm(`確定解除停權 ${targetBanId}?`)) {
                                    onUnbanUser(targetBanId);
                                    setTargetBanId('');
                                }
                            }}
                            className="flex-1 bg-green-100 text-green-600 px-4 py-2 rounded font-bold text-sm hover:bg-green-200 flex items-center justify-center gap-1"
                        >
                            <Unlock size={14} /> 解除
                        </button>
                    </div>
                </div>
                
                <div className="text-xs text-gray-500 mt-4 text-center">
                    提示：停權後使用者將無法登入系統。
                </div>
            </div>
        )}
      </div>
    </div>
  );
};