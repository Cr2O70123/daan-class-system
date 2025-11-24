import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Send, Clock, Flag, Image as ImageIcon, X, Crown, AlertTriangle } from 'lucide-react';
import { Question, User } from '../types';

interface QuestionDetailScreenProps {
  question: Question;
  currentUser: User;
  onBack: () => void;
  onAddReply: (questionId: number, content: string, image?: string) => void;
  onReport: (type: 'question' | 'reply', id: number, content: string, reason: string) => void;
  onMarkBest: (questionId: number, replyId: number) => void;
  onImageClick?: (url: string) => void;
}

const REPORT_REASONS = [
    '垃圾廣告訊息',
    '人身攻擊或霸凌',
    '不雅或色情內容',
    '作弊或違反學術倫理',
    '內容錯誤誤導',
    '其他原因'
];

export const QuestionDetailScreen: React.FC<QuestionDetailScreenProps> = ({ 
  question, 
  currentUser, 
  onBack,
  onAddReply,
  onReport,
  onMarkBest,
  onImageClick
}) => {
  const [replyText, setReplyText] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  
  // Modal States
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportTarget, setReportTarget] = useState<{type: 'question' | 'reply', id: number, content: string} | null>(null);
  const [selectedReason, setSelectedReason] = useState(REPORT_REASONS[0]);

  const [bestAnswerModalOpen, setBestAnswerModalOpen] = useState(false);
  const [selectedBestAnswerId, setSelectedBestAnswerId] = useState<number | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setReplyImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendReply = () => {
    if (!replyText.trim() && !replyImage) return;
    onAddReply(question.id, replyText, replyImage || undefined);
    setReplyText('');
    setReplyImage(null);
  };

  // --- Rich Text Renderer ---
  const renderContent = (content: string) => {
    // 1. Split by Code Blocks ```c ... ``` and Math $$ ... $$
    const parts = content.split(/(```[a-z]*\n[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);
    
    return parts.map((part, index) => {
        // C Language or Code Block
        if (part.startsWith('```')) {
            const code = part.replace(/```[a-z]*\n/, '').replace(/```$/, '');
            return (
                <div key={index} className="bg-gray-800 text-green-400 font-mono text-xs p-3 rounded-lg my-2 overflow-x-auto border border-gray-700">
                    <pre>{code}</pre>
                </div>
            );
        }
        // Math Formula $$ ... $$
        if (part.startsWith('$$')) {
            const math = part.replace(/\$\$/g, '');
            try {
                // @ts-ignore
                if (window.katex) {
                    // @ts-ignore
                    const html = window.katex.renderToString(math, { throwOnError: false });
                    return <span key={index} dangerouslySetInnerHTML={{ __html: html }} className="inline-block mx-1" />;
                }
            } catch (e) {
                console.error("Katex Error", e);
            }
            // Fallback if katex fails or not loaded
            return (
                <span key={index} className="inline-block bg-yellow-50 dark:bg-yellow-900/30 text-blue-700 dark:text-blue-300 px-1 rounded italic font-serif mx-1 border border-yellow-100 dark:border-yellow-800">
                    {math}
                </span>
            );
        }
        // Normal Text (handle newlines)
        return <span key={index}>{part}</span>;
    });
  };

  // --- Modal Handlers ---
  const openReportModal = (type: 'question' | 'reply', id: number, content: string) => {
    setReportTarget({ type, id, content });
    setReportModalOpen(true);
  };

  const submitReport = () => {
    if (reportTarget) {
        onReport(reportTarget.type, reportTarget.id, reportTarget.content, selectedReason);
        setReportModalOpen(false);
        setReportTarget(null);
        alert('檢舉已送出，謝謝你的協助！');
    }
  };

  const openBestAnswerModal = (replyId: number) => {
    setSelectedBestAnswerId(replyId);
    setBestAnswerModalOpen(true);
  };

  const confirmBestAnswer = () => {
    if (selectedBestAnswerId !== null) {
        onMarkBest(question.id, selectedBestAnswerId);
        setBestAnswerModalOpen(false);
        setSelectedBestAnswerId(null);
    }
  };
  // -----------------------

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex flex-col pb-safe relative transition-colors">
      
      {/* --- REPORT MODAL --- */}
      {reportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-5 shadow-2xl animate-in zoom-in-95">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                    <AlertTriangle className="text-red-500" /> 檢舉內容
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">請選擇檢舉原因，協助我們維護學習環境。</p>
                <div className="space-y-2 mb-6">
                    {REPORT_REASONS.map(r => (
                        <button 
                            key={r} 
                            onClick={() => setSelectedReason(r)}
                            className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all ${selectedReason === r ? 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-bold border border-red-200 dark:border-red-800' : 'bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                        >
                            {r}
                        </button>
                    ))}
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setReportModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300">取消</button>
                    <button onClick={submitReport} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold">送出檢舉</button>
                </div>
            </div>
        </div>
      )}

      {/* --- BEST ANSWER MODAL --- */}
      {bestAnswerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 w-full max-w-sm rounded-2xl p-6 shadow-2xl animate-in zoom-in-95 text-center">
                <div className="w-16 h-16 bg-yellow-100 dark:bg-yellow-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-yellow-500">
                    <Crown size={32} className="fill-current" />
                </div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">確認選為最佳解答？</h3>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mb-6 text-left space-y-2">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300">回答者獲得</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">+30 PT</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-gray-600 dark:text-gray-300">您將獲得 (結案)</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">+10 PT</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button onClick={() => setBestAnswerModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300">再想想</button>
                    <button onClick={confirmBestAnswer} className="flex-1 py-3 bg-yellow-500 text-white hover:bg-yellow-600 rounded-xl font-bold shadow-lg shadow-yellow-200">確認選擇</button>
                </div>
            </div>
        </div>
      )}

      {/* Header - Added pt-safe */}
      <div className="bg-white dark:bg-gray-800 sticky top-0 pt-safe z-30 px-4 py-3 flex items-center justify-between shadow-sm transition-colors">
        <div className="flex items-center">
            <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
            </button>
            <h1 className="text-lg font-bold text-gray-800 dark:text-white ml-2">問題詳情</h1>
        </div>
        <button 
            onClick={() => openReportModal('question', question.id, question.title)}
            className="text-gray-400 hover:text-red-500 p-2"
        >
            <Flag size={18} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-4">
        {/* Main Question Card */}
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 relative transition-colors">
          <div className="flex gap-2 mb-3">
            {question.tags.map(tag => (
              <span key={tag} className="bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs px-2 py-1 rounded-md font-bold">
                {tag}
              </span>
            ))}
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{question.title}</h2>
          
          {/* Content with Rich Text Renderer */}
          <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
            {renderContent(question.content)}
          </div>
          
          {question.image && (
            <div 
                className="mt-3 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 cursor-zoom-in"
                onClick={() => onImageClick && onImageClick(question.image!)}
            >
                <img src={question.image} alt="Question Attachment" className="w-full object-cover max-h-64" />
            </div>
          )}

          <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
            <div className="flex items-center space-x-2">
              <div className={`w-8 h-8 rounded-full ${question.authorAvatarColor || 'bg-gray-400'} flex items-center justify-center text-white font-bold text-xs overflow-hidden`}>
                {question.authorAvatarImage ? (
                    <img src={question.authorAvatarImage} alt="avatar" className="w-full h-full object-cover" />
                ) : (
                    question.author.charAt(0)
                )}
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">{question.author}</p>
                <p className="text-[10px] text-gray-400">{question.date}</p>
              </div>
            </div>
            <div className="text-xs text-gray-400">
              {question.views} 次瀏覽
            </div>
          </div>
        </div>

        {/* Replies Section */}
        <div className="space-y-4">
          <h3 className="font-bold text-gray-500 dark:text-gray-400 text-xs ml-1 uppercase tracking-wider">
            所有回答 ({question.replies.length})
          </h3>
          
          {question.replies.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              還沒有人回答，成為第一個解題的人吧！
            </div>
          ) : (
            question.replies.map(reply => (
              <div key={reply.id} className={`bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border ${reply.isBestAnswer ? 'border-amber-400 ring-1 ring-amber-100 dark:ring-amber-900/30' : 'border-gray-100 dark:border-gray-700'} relative transition-colors`}>
                
                {reply.isBestAnswer && (
                    <div className="absolute -top-3 left-4 bg-amber-400 text-white text-[10px] font-bold px-2 py-1 rounded-full flex items-center shadow-sm">
                        <Crown size={12} className="mr-1 fill-white" />
                        最佳回覆
                    </div>
                )}

                <div className="flex justify-between items-start mb-2 mt-1">
                  <div className="flex items-center space-x-2">
                    <div className={`w-8 h-8 rounded-full ${reply.avatarColor} flex items-center justify-center text-white font-bold text-xs overflow-hidden`}>
                      {reply.avatarImage ? (
                          <img src={reply.avatarImage} alt="avatar" className="w-full h-full object-cover" />
                      ) : (
                          reply.author.charAt(0)
                      )}
                    </div>
                    <div>
                        <span className="text-sm font-bold text-gray-800 dark:text-gray-200 block">{reply.author}</span>
                        <span className="text-[10px] text-gray-400 flex items-center">
                            <Clock size={10} className="mr-1" />
                            {reply.date}
                        </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center">
                    {/* Only Show Best Answer Button if current user is author and question is not solved */}
                    {!question.replies.some(r => r.isBestAnswer) && currentUser.name === question.author && (
                        <button 
                            onClick={() => openBestAnswerModal(reply.id)}
                            className="text-gray-300 hover:text-amber-500 mr-3 p-1 rounded transition-colors"
                            title="標示為最佳解答"
                        >
                            <Crown size={18} />
                        </button>
                    )}
                    <button 
                        onClick={() => openReportModal('reply', reply.id, reply.content)}
                        className="text-gray-300 hover:text-red-500 p-1"
                    >
                        <Flag size={14} />
                    </button>
                  </div>
                </div>
                
                <div className="text-gray-700 dark:text-gray-300 text-sm pl-0 pt-1 whitespace-pre-wrap">
                    {renderContent(reply.content)}
                </div>
                {reply.image && (
                    <div 
                        className="mt-3 rounded-lg overflow-hidden border border-gray-100 dark:border-gray-700 cursor-zoom-in w-fit"
                        onClick={() => onImageClick && onImageClick(reply.image!)}
                    >
                        <img src={reply.image} alt="Reply attachment" className="max-h-48 object-cover" />
                    </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Reply Input Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-3 z-40 max-w-md mx-auto transition-colors">
        
        {/* Image Preview */}
        {replyImage && (
            <div className="relative inline-block mb-2 ml-1">
                <img src={replyImage} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-gray-200" />
                <button 
                    onClick={() => setReplyImage(null)}
                    className="absolute -top-1 -right-1 bg-gray-800 text-white rounded-full p-0.5"
                >
                    <X size={12} />
                </button>
            </div>
        )}

        <div className="flex items-end gap-2">
            <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700 rounded-full transition-colors"
            >
                <ImageIcon size={20} />
            </button>
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={handleImageUpload}
            />

            <div className="bg-gray-100 dark:bg-gray-700 flex-1 rounded-2xl px-4 py-2 flex items-center transition-colors">
            <textarea
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="輸入你的回答..."
                className="bg-transparent w-full text-sm outline-none resize-none max-h-20 py-1 dark:text-white dark:placeholder-gray-400"
                rows={1}
                style={{ minHeight: '24px' }}
            />
            </div>
            <button 
            onClick={handleSendReply}
            disabled={!replyText.trim() && !replyImage}
            className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:bg-gray-300 dark:disabled:bg-gray-600 transition-colors shadow-sm"
            >
            <Send size={18} />
            </button>
        </div>
      </div>
    </div>
  );
};