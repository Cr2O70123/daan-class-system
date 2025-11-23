import React from 'react';
import { ArrowLeft, Heart, Clock } from 'lucide-react';
import { Resource, User } from '../types';

interface ResourceDetailScreenProps {
  resource: Resource;
  currentUser: User;
  onBack: () => void;
  onLike: (id: number) => void;
}

// Reuse the rich text renderer logic (simplified or extracted)
const renderContent = (content: string) => {
    // Basic KaTeX and Code Block rendering
    const parts = content.split(/(```[a-z]*\n[\s\S]*?```|\$\$[\s\S]*?\$\$)/g);
    
    return parts.map((part, index) => {
        if (part.startsWith('```')) {
            const code = part.replace(/```[a-z]*\n/, '').replace(/```$/, '');
            return (
                <div key={index} className="bg-gray-800 text-green-400 font-mono text-xs p-3 rounded-lg my-2 overflow-x-auto border border-gray-700">
                    <pre>{code}</pre>
                </div>
            );
        }
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
                console.error(e);
            }
            return (
                <span key={index} className="inline-block bg-yellow-50 dark:bg-yellow-900/30 text-blue-700 dark:text-blue-300 px-1 rounded italic font-serif mx-1 border border-yellow-100 dark:border-yellow-800">
                    {math}
                </span>
            );
        }
        return <span key={index}>{part}</span>;
    });
};

const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
};

export const ResourceDetailScreen: React.FC<ResourceDetailScreenProps> = ({ resource, currentUser, onBack, onLike }) => {
  const isLiked = resource.likedBy.includes(currentUser.name);

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen flex flex-col pb-safe relative transition-colors">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 sticky top-0 z-30 px-4 py-3 flex items-center shadow-sm transition-colors">
        <button onClick={onBack} className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <ArrowLeft size={20} className="text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-bold text-gray-800 dark:text-white ml-2">資源詳情</h1>
      </div>

      <div className="flex-1 overflow-y-auto pb-24 p-4 space-y-4">
        <div className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700">
            {/* Tags & Date */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-2 flex-wrap">
                    {resource.tags.map(tag => (
                        <span key={tag} className="bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs px-2 py-1 rounded-md font-bold">
                            {tag}
                        </span>
                    ))}
                </div>
                <span className="text-xs text-gray-400 flex items-center gap-1">
                    <Clock size={12} /> {resource.date}
                </span>
            </div>

            {/* Title */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 leading-tight">{resource.title}</h2>

            {/* Author */}
            <div className="flex items-center space-x-2 mb-6 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                <div className={`w-8 h-8 rounded-full ${resource.authorAvatarColor || 'bg-gray-400'} flex items-center justify-center text-white font-bold text-xs overflow-hidden ${getFrameStyle(resource.authorAvatarFrame)}`}>
                    {resource.authorAvatarImage ? (
                        <img src={resource.authorAvatarImage} alt="avatar" className="w-full h-full object-cover" />
                    ) : (
                        resource.author.charAt(0)
                    )}
                </div>
                <div>
                    <p className={`text-xs font-bold ${resource.authorNameColor || 'text-gray-800 dark:text-gray-200'}`}>{resource.author}</p>
                    <p className="text-[10px] text-gray-400">分享者</p>
                </div>
            </div>

            {/* Images Stack */}
            {resource.images && resource.images.length > 0 && (
                <div className="space-y-3 mb-6">
                    {resource.images.map((img, idx) => (
                        <div key={idx} className="rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 shadow-sm">
                            <img src={img} alt={`Attachment ${idx + 1}`} className="w-full object-contain bg-black/5 dark:bg-black/20" />
                        </div>
                    ))}
                </div>
            )}

            {/* Description */}
            <div className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap text-base">
                {renderContent(resource.description)}
            </div>

            {/* Like Button */}
            <div className="mt-8 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-center">
                <button 
                    onClick={() => onLike(resource.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-full font-bold transition-all transform active:scale-95 ${
                        isLiked 
                        ? 'bg-pink-100 dark:bg-pink-900/30 text-pink-500 shadow-lg shadow-pink-200 dark:shadow-none' 
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                >
                    <Heart 
                        size={20} 
                        className={`transition-transform duration-300 ${isLiked ? 'fill-current scale-110' : 'scale-100'}`} 
                    />
                    <span>{isLiked ? '已按讚' : '覺得實用'}</span>
                    <span className="ml-1 opacity-80">({resource.likes})</span>
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};