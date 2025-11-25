
import React, { useState, useRef } from 'react';
import { Tag, Heart, Plus, Image as ImageIcon, X, Search, XCircle, Layers, RefreshCw, Loader2 } from 'lucide-react';
import { Resource, User } from '../types';

interface ResourceScreenProps {
  resources: Resource[];
  currentUser: User;
  onAddResource: (title: string, description: string, tags: string[], images: string[]) => void;
  onLikeResource: (id: number) => void;
  onResourceClick: (resource: Resource) => void;
  onRefresh?: () => Promise<void>;
  onImageClick?: (url: string) => void;
}

const RESOURCE_TAGS = ['全部', '筆記', '考古題', '教學影片', '好用工具', '其他'];

// Helper to get frame styles
const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      case 'frame_beta': return 'ring-2 ring-amber-500 border-2 border-dashed border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
  };

export const ResourceScreen: React.FC<ResourceScreenProps> = ({ resources, currentUser, onAddResource, onLikeResource, onResourceClick, onRefresh, onImageClick }) => {
  const [activeTag, setActiveTag] = useState('全部');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [images, setImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Pull to Refresh State
  const [pullY, setPullY] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const startX = useRef(0);
  const isHorizontalSwipe = useRef(false);
  const PULL_THRESHOLD = 80;

  const filteredResources = resources.filter(r => {
      const matchesTag = activeTag === '全部' || r.tags.includes(activeTag);
      const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            r.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesTag && matchesSearch;
  });

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
        setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
        if (selectedTags.length < 3) {
            setSelectedTags([...selectedTags, tag]);
        }
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      const promises = newFiles.map(file => {
          return new Promise<string>((resolve) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(file as Blob);
          });
      });

      Promise.all(promises).then(newImages => {
          setImages(prev => [...prev, ...newImages]);
      });
    }
  };

  const removeImage = (index: number) => {
      setImages(images.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!title.trim() || !description.trim() || selectedTags.length === 0) return;
    onAddResource(title, description, selectedTags, images);
    setTitle('');
    setDescription('');
    setSelectedTags([]);
    setImages([]);
    setIsModalOpen(false);
  };

   // Pull to Refresh Handlers
   const handleTouchStart = (e: React.TouchEvent) => {
    if (window.scrollY === 0 && !isRefreshing) {
        startY.current = e.touches[0].clientY;
        startX.current = e.touches[0].clientX;
        isHorizontalSwipe.current = false;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentY = e.touches[0].clientY;
    const currentX = e.touches[0].clientX;
    const deltaY = currentY - startY.current;
    const deltaX = currentX - startX.current;
    
    // Determine if swipe is mostly horizontal
    if (!isHorizontalSwipe.current) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
            isHorizontalSwipe.current = true;
        }
    }
    
    // Only pull if at top, scrolling down, and NOT horizontal swipe
    if (window.scrollY === 0 && deltaY > 0 && !isRefreshing && !isHorizontalSwipe.current) {
        setPullY(Math.min(deltaY * 0.4, 120)); 
    }
  };

  const handleTouchEnd = async () => {
    if (pullY > PULL_THRESHOLD && onRefresh && !isRefreshing) {
        setIsRefreshing(true);
        setPullY(50); 
        try {
            await onRefresh();
        } finally {
            setTimeout(() => {
                setIsRefreshing(false);
                setPullY(0);
            }, 300);
        }
    } else {
        setPullY(0);
    }
    isHorizontalSwipe.current = false;
  };


  return (
    <div 
        className="pb-24 min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
    >
        {/* Pull to Refresh Indicator */}
        <div 
            className="fixed left-0 right-0 z-[60] flex justify-center pointer-events-none transition-all duration-200"
            style={{ 
                top: '110px', 
                transform: `translateY(${pullY > 0 ? pullY - 40 : -100}px)`,
                opacity: pullY > 0 ? 1 : 0
            }}
        >
            <div className="bg-white dark:bg-gray-800 rounded-full px-4 py-2 shadow-lg border border-gray-100 dark:border-gray-700 flex items-center gap-2">
                {isRefreshing ? (
                    <>
                        <Loader2 className="animate-spin text-green-600" size={18} />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">重新整理中...</span>
                    </>
                ) : (
                    <>
                        <RefreshCw 
                            size={18} 
                            className={`text-green-600 transition-transform ${pullY > PULL_THRESHOLD ? 'rotate-180' : ''}`} 
                            style={{ transform: `rotate(${pullY * 2}deg)` }}
                        />
                        <span className="text-xs font-bold text-gray-600 dark:text-gray-300">
                             {pullY > PULL_THRESHOLD ? "放開以重整" : "下拉以重整"}
                        </span>
                        {isRefreshing && <span className="text-xs font-bold text-gray-600 dark:text-gray-300">重新整理中...</span>}
                    </>
                )}
            </div>
        </div>

        {/* Header - Aligned with Home Screen Style */}
        <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 sticky top-0 pt-safe z-10 shadow-sm transition-colors">
             {/* Search Bar */}
            <div className="px-4 pt-1 pb-1 flex gap-2 items-center">
                <div className="relative flex-1">
                    <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="搜尋資源..." 
                        className="w-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm rounded-xl pl-9 pr-8 py-2.5 outline-none focus:ring-2 focus:ring-green-500 transition-all"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <XCircle size={16} className="fill-gray-200 dark:fill-gray-600" />
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Chips */}
            <div className="px-4 pb-3 pt-2 flex gap-2 overflow-x-auto no-scrollbar">
                {RESOURCE_TAGS.map(tag => (
                    <button
                        key={tag}
                        onClick={() => setActiveTag(tag)}
                        className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
                            activeTag === tag
                                ? 'bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-none'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                        }`}
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </div>

        {/* List */}
        <div 
            className="p-4 space-y-4 relative z-1 bg-gray-50 dark:bg-gray-900 transition-transform duration-300 ease-out"
            style={{ transform: `translateY(${isRefreshing ? 50 : 0}px)` }}
        >
            {filteredResources.length === 0 ? (
                <div className="text-center py-10 opacity-50">
                    <p className="text-gray-400 dark:text-gray-500 font-bold">沒有找到資源</p>
                </div>
            ) : (
                filteredResources.map(res => {
                    const isLiked = res.likedBy.includes(currentUser.name);
                    const hasImages = res.images && res.images.length > 0;
                    
                    return (
                        <div 
                            key={res.id} 
                            onClick={() => onResourceClick(res)}
                            className="bg-white dark:bg-gray-800 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 hover:shadow-md transition-all cursor-pointer active:scale-[0.99]"
                        >
                            <div className="flex justify-between items-start mb-3">
                                <div className="flex gap-2">
                                    {res.tags.map(tag => (
                                        <span key={tag} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 px-2 py-1 rounded-full font-bold">{tag}</span>
                                    ))}
                                </div>
                                <span className="text-xs text-gray-400">{res.date}</span>
                            </div>
                            <h3 className="font-bold text-gray-800 dark:text-white text-lg mb-2">{res.title}</h3>
                            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed mb-4 line-clamp-2">
                                {res.description}
                            </p>
                            
                            {hasImages && res.images && (
                                <div 
                                    className="mb-4 rounded-xl overflow-hidden border border-gray-100 dark:border-gray-700 relative h-32 group cursor-zoom-in"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onImageClick && res.images && res.images.length > 0) onImageClick(res.images[0]);
                                    }}
                                >
                                    <img src={res.images[0]} alt="Resource" className="w-full h-full object-cover" />
                                    {res.images.length > 1 && (
                                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center pointer-events-none">
                                            <div className="text-white font-bold flex items-center gap-2">
                                                <Layers size={20} />
                                                <span>+{res.images.length - 1}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex justify-between items-center border-t border-gray-50 dark:border-gray-700 pt-3">
                                <div className="flex items-center gap-2">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] text-white font-bold ${res.authorAvatarColor} ${getFrameStyle(res.authorAvatarFrame)} overflow-hidden`}>
                                        {res.authorAvatarImage ? <img src={res.authorAvatarImage} className="w-full h-full object-cover" /> : res.author.charAt(0)}
                                    </div>
                                    <span className={`text-xs font-medium ${res.authorNameColor || 'text-gray-500 dark:text-gray-400'}`}>{res.author}</span>
                                </div>
                                
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onLikeResource(res.id);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200 active:scale-95 ${isLiked ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-500' : 'bg-gray-50 dark:bg-gray-700 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600'}`}
                                >
                                    <Heart 
                                        size={16} 
                                        className={`transition-transform duration-300 ${isLiked ? 'fill-current scale-110' : 'scale-100'}`} 
                                    />
                                    <span className="text-xs font-bold">{res.likes}</span>
                                </button>
                            </div>
                        </div>
                    );
                })
            )}
        </div>

        {/* Add Button */}
        <button 
            onClick={() => setIsModalOpen(true)}
            className="fixed bottom-24 right-6 bg-green-500 hover:bg-green-600 text-white w-14 h-14 rounded-full shadow-lg shadow-green-500/30 flex items-center justify-center transition-transform active:scale-90 z-40"
        >
            <Plus size={32} />
        </button>

        {/* Modal */}
        {isModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
                <div className="bg-white dark:bg-gray-800 w-full max-w-md rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-4">分享新資源 (+20 PT)</h3>
                    <div className="space-y-4">
                        <input 
                            type="text" 
                            placeholder="標題 (例如：Ch1 重點整理)"
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
                        />
                        <textarea 
                            rows={4}
                            placeholder="描述或連結 (支援 LaTeX 公式 $$...$$)"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-3 outline-none resize-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
                        />
                        
                        {/* Multi Image Upload */}
                        <div>
                             <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">上傳圖片 (支援多張)</label>
                             
                             <div className="grid grid-cols-3 gap-2 mb-2">
                                {images.map((img, idx) => (
                                    <div key={idx} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 aspect-square">
                                        <img src={img} alt="Preview" className="w-full h-full object-cover" />
                                        <button 
                                            onClick={() => removeImage(idx)}
                                            className="absolute top-1 right-1 bg-black/60 text-white p-0.5 rounded-full hover:bg-red-500 transition-colors"
                                        >
                                            <X size={12} />
                                        </button>
                                    </div>
                                ))}
                                <div 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:bg-green-50 hover:border-green-300 hover:text-green-500 dark:hover:bg-green-900/20 transition-colors cursor-pointer bg-gray-50 dark:bg-gray-700 aspect-square"
                                >
                                    <ImageIcon size={20} className="mb-1" />
                                    <span className="text-[10px] font-medium text-center">新增</span>
                                </div>
                             </div>

                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept="image/*"
                                multiple
                                onChange={handleImageUpload}
                            />
                        </div>

                        <div>
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-2 block">選擇標籤 (最多 3 個)</label>
                            <div className="flex flex-wrap gap-2">
                                {RESOURCE_TAGS.filter(t => t!=='全部').map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold transition-colors border ${selectedTags.includes(tag) ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400'}`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button onClick={() => setIsModalOpen(false)} className="flex-1 py-3 bg-gray-100 dark:bg-gray-700 rounded-xl font-bold text-gray-600 dark:text-gray-300">取消</button>
                            <button onClick={handleSubmit} disabled={!title || !description || selectedTags.length === 0} className="flex-1 py-3 bg-green-500 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-green-600 transition-colors">發佈</button>
                        </div>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
