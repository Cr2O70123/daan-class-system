
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, ShoppingBag, Shield, Skull, Zap, Crown, UserMinus, Volume2, Gem, TrendingUp, TrendingDown, Users, Send, Search, Loader2, X } from 'lucide-react';
import { User, Product, LeaderboardEntry } from '../types';
import { updateUserInDb } from '../services/authService';
import { fetchClassLeaderboard, transferBlackCoins } from '../services/dataService';

interface BlackMarketScreenProps {
  user: User;
  onBack: () => void;
  onBuy: (product: Product) => void;
  setUser: (user: User) => void;
}

const BLACK_MARKET_ITEMS: Product[] = [
    { id: 'item_stealth', name: '隱身斗篷', price: 50, currency: 'BMC', color: 'bg-slate-800 text-slate-300', icon: <UserMinus size={20}/>, description: '在排行榜隱藏自己 24 小時', category: 'black_market' },
    { id: 'item_rename_pro', name: '非法改名卡', price: 100, currency: 'BMC', color: 'bg-purple-900 text-purple-300', icon: <RefreshCw size={20}/>, description: '無視冷卻時間，立即更改暱稱', category: 'black_market' },
    { id: 'item_megaphone', name: '全服廣播', price: 200, currency: 'BMC', color: 'bg-red-900 text-red-300', icon: <Volume2 size={20}/>, description: '發送一條所有人都能看到的系統公告', category: 'black_market' },
    { id: 'frame_glitch', name: '故障藝術框', price: 500, currency: 'BMC', color: 'bg-green-900 text-green-400', icon: <Zap size={20}/>, description: '稀有動態故障風格頭像框', category: 'frame', isRare: true },
    { id: 'title_dark_lord', name: '稱號：暗夜領主', price: 1000, currency: 'BMC', color: 'bg-black text-yellow-500', icon: <Crown size={20}/>, description: '個人頁面專屬黑色稱號', category: 'cosmetic', isRare: true },
];

const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      default: return 'ring-2 ring-white/20';
    }
};

export const BlackMarketScreen: React.FC<BlackMarketScreenProps> = ({ user, onBack, onBuy, setUser }) => {
    const [exchangeAmount, setExchangeAmount] = useState<number>(100); 
    const [tab, setTab] = useState<'EXCHANGE' | 'SHOP' | 'P2P'>('EXCHANGE');
    
    // Dynamic Rate Logic: 50 ~ 150 PT = 1 BMC
    const [currentRate, setCurrentRate] = useState(100.0);
    const [rateTrend, setRateTrend] = useState<'UP' | 'DOWN' | 'STABLE'>('STABLE');
    const [priceHistory, setPriceHistory] = useState<number[]>([95, 98, 92, 105, 100, 102, 99, 110, 108, 100]);
    const rateInterval = useRef<number | null>(null);

    // P2P Data
    const [userList, setUserList] = useState<(LeaderboardEntry & { blackMarketCoins?: number })[]>([]);
    const [transferAmount, setTransferAmount] = useState('');
    const [selectedReceiver, setSelectedReceiver] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [isTransferring, setIsTransferring] = useState(false);

    useEffect(() => {
        const updateRate = () => {
            setCurrentRate(prev => {
                const change = (Math.random() - 0.5) * 10; 
                const newRate = Math.max(50.0, Math.min(150.0, prev + change)); 
                
                if (newRate > prev) setRateTrend('UP'); 
                else if (newRate < prev) setRateTrend('DOWN');
                else setRateTrend('STABLE');
                
                setPriceHistory(h => {
                    const newHistory = [...h.slice(1), newRate];
                    return newHistory;
                });
                return parseFloat(newRate.toFixed(2));
            });
        };

        updateRate();
        rateInterval.current = window.setInterval(updateRate, 3000); 

        return () => {
            if (rateInterval.current) clearInterval(rateInterval.current);
        };
    }, []);

    // Load P2P User List
    useEffect(() => {
        if (tab === 'P2P') {
            fetchClassLeaderboard().then(data => {
                // Remove self from list
                setUserList(data.filter(u => u.studentId !== user.studentId));
            });
        }
    }, [tab, user.studentId]);

    const handleExchange = async () => {
        if (exchangeAmount <= 0) return;
        if (user.points < exchangeAmount) {
            alert("積分不足");
            return;
        }
        
        const bmcGained = Math.floor(exchangeAmount / currentRate);
        
        if (bmcGained <= 0) {
            alert(`匯率過高，至少需要 ${Math.ceil(currentRate)} PT 才能兌換 1 BMC`);
            return;
        }

        const cost = Math.ceil(bmcGained * currentRate);

        if (!confirm(`當前匯率 ${currentRate.toFixed(1)} PT / BMC\n確定要將 ${cost} PT 兌換為 ${bmcGained} BMC 嗎？`)) return;

        const updatedUser = {
            ...user,
            points: user.points - cost,
            blackMarketCoins: (user.blackMarketCoins || 0) + bmcGained
        };

        try {
            await updateUserInDb(updatedUser);
            setUser(updatedUser);
            alert("交易成功");
        } catch (e) {
            console.error(e);
            alert("交易失敗");
        }
    };

    const handleTransfer = async () => {
        if (!selectedReceiver || !transferAmount || isTransferring) return;
        const amount = parseInt(transferAmount);
        if (isNaN(amount) || amount <= 0) {
            alert("請輸入有效金額");
            return;
        }
        if (amount > (user.blackMarketCoins || 0)) {
            alert("黑幣不足");
            return;
        }

        const receiver = userList.find(u => u.studentId === selectedReceiver);
        if (!receiver) return;

        if (confirm(`確定要轉帳 ${amount} BMC 給 ${receiver.name}? 此操作無法復原。`)) {
            setIsTransferring(true);
            try {
                await transferBlackCoins(user.studentId, selectedReceiver, amount);
                const updatedUser = { ...user, blackMarketCoins: (user.blackMarketCoins || 0) - amount };
                setUser(updatedUser);
                setTransferAmount('');
                setSelectedReceiver(null);
                alert("轉帳成功");
                // Refresh list
                fetchClassLeaderboard().then(data => setUserList(data.filter(u => u.studentId !== user.studentId)));
            } catch (e) {
                alert("轉帳失敗，請確認對方帳號是否存在");
            } finally {
                setIsTransferring(false);
            }
        }
    };

    const handleBuyItem = async (product: Product) => {
        if ((user.blackMarketCoins || 0) < product.price) {
            alert("黑幣不足");
            return;
        }

        if (confirm(`確定購買 ${product.name}？將扣除 ${product.price} BMC`)) {
            const updatedUser = {
                ...user,
                blackMarketCoins: (user.blackMarketCoins || 0) - product.price
            };
            
            const newInventory = [...user.inventory, product.id];
            let newFrame = user.avatarFrame;
            if (product.category === 'frame') newFrame = product.id;

            const finalUser = {
                ...updatedUser,
                inventory: newInventory,
                avatarFrame: newFrame
            };

            try {
                await updateUserInDb(finalUser);
                setUser(finalUser);
                alert("交易成功，貨物已送達背包");
            } catch (e) {
                alert("交易失敗");
            }
        }
    };

    // Filter Users
    const filteredUsers = userList.filter(u => 
        u.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.studentId.includes(searchQuery)
    );

    const renderChart = () => { /* ... existing chart logic ... */
        const width = 300;
        const height = 100;
        const min = Math.min(...priceHistory, 50.0);
        const max = Math.max(...priceHistory, 150.0);
        const range = max - min || 1;

        const points = priceHistory.map((p, i) => {
            const x = (i / (priceHistory.length - 1)) * width;
            const y = height - ((p - min) / range) * height;
            return `${x},${y}`;
        }).join(' ');

        const isUp = priceHistory[priceHistory.length - 1] >= priceHistory[0];
        const strokeColor = isUp ? '#ef4444' : '#10b981'; 

        return (
            <div className="relative h-32 w-full mt-4 bg-gray-900/50 rounded-xl border border-gray-800 p-2 overflow-hidden">
                <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
                    <line x1="0" y1={height/2} x2={width} y2={height/2} stroke="#374151" strokeDasharray="4" strokeWidth="1" />
                    <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="drop-shadow-md" />
                    <circle cx={width} cy={height - ((priceHistory[priceHistory.length-1] - min) / range) * height} r="4" fill="#fff" className="animate-pulse" />
                </svg>
                <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-mono">PT/BMC Rate</div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-50 bg-black text-white flex flex-col font-mono overflow-hidden">
            <div className="absolute inset-0 pointer-events-none opacity-10 bg-[url('https://www.transparenttextures.com/patterns/diagmonds-light.png')] z-0"></div>
            <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-transparent via-purple-900/10 to-transparent animate-scan z-0"></div>

            <div className="p-4 pt-safe flex justify-between items-center border-b border-purple-900/50 bg-black/80 backdrop-blur z-10">
                <button onClick={onBack} className="p-2 hover:bg-gray-900 rounded-full text-gray-400 hover:text-white transition-colors">
                    <ArrowLeft size={24} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-red-600 tracking-widest uppercase flex items-center gap-2">
                        <Skull size={20} className="text-purple-500" /> 暗巷交易所
                    </h1>
                    <span className="text-[10px] text-gray-500 tracking-[0.5em]">SHADOW ALLEY</span>
                </div>
                <div className="w-10"></div>
            </div>

            <div className="flex justify-around p-4 bg-gray-900/50 border-b border-purple-900/30 z-10">
                <div className="flex flex-col items-center">
                    <span className="text-xs text-gray-500 font-bold mb-1">CREDITS (PT)</span>
                    <span className="text-xl font-black text-blue-400">{user.points.toLocaleString()}</span>
                </div>
                <div className="w-[1px] bg-gray-800"></div>
                <div className="flex flex-col items-center">
                    <span className="text-xs text-purple-500 font-bold mb-1 flex items-center gap-1"><Gem size={10}/> BLACK COIN</span>
                    <span className="text-xl font-black text-purple-400 shadow-purple-500/50 drop-shadow-md">{user.blackMarketCoins || 0}</span>
                </div>
            </div>

            <div className="flex p-4 gap-4 z-10">
                <button onClick={() => setTab('EXCHANGE')} className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all text-xs md:text-sm ${tab === 'EXCHANGE' ? 'border-blue-500 bg-blue-900/20 text-blue-400' : 'border-gray-800 text-gray-600 hover:border-gray-600'}`}>貨幣兌換</button>
                <button onClick={() => setTab('SHOP')} className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all text-xs md:text-sm ${tab === 'SHOP' ? 'border-purple-500 bg-purple-900/20 text-purple-400' : 'border-gray-800 text-gray-600 hover:border-gray-600'}`}>黑市商品</button>
                <button onClick={() => setTab('P2P')} className={`flex-1 py-3 border-2 rounded-xl font-bold transition-all text-xs md:text-sm ${tab === 'P2P' ? 'border-green-500 bg-green-900/20 text-green-400' : 'border-gray-800 text-gray-600 hover:border-gray-600'}`}>私下交易</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 z-10 pb-32">
                {tab === 'EXCHANGE' ? (
                    <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl relative overflow-hidden">
                        
                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    <Shield size={20} className="text-green-500"/> 洗錢中心
                                </h2>
                                <p className="text-xs text-gray-500 mt-1">PT to BMC 即時匯率</p>
                            </div>
                            <div className="text-right">
                                <div className={`text-2xl font-mono font-black flex items-center gap-1 justify-end ${rateTrend === 'UP' ? 'text-red-500' : rateTrend === 'DOWN' ? 'text-green-500' : 'text-white'}`}>
                                    {rateTrend === 'UP' ? <TrendingUp size={20}/> : rateTrend === 'DOWN' ? <TrendingDown size={20}/> : null}
                                    {currentRate.toFixed(1)}
                                </div>
                                <span className="text-xs text-gray-500">PT / 1 BMC</span>
                            </div>
                        </div>

                        {renderChart()}

                        <div className="space-y-6 mt-6">
                            <div>
                                <label className="text-xs text-gray-500 mb-2 block uppercase tracking-wider">輸入 PT 金額</label>
                                <input 
                                    type="number" 
                                    value={exchangeAmount}
                                    onChange={(e) => setExchangeAmount(parseInt(e.target.value) || 0)}
                                    className="w-full bg-gray-800 text-white p-3 rounded-lg border border-gray-700 outline-none focus:border-blue-500 mb-4 font-mono text-lg"
                                />
                                
                                <div className="flex justify-between items-center">
                                    <div className="bg-blue-900/30 px-4 py-2 rounded-lg border border-blue-800 text-blue-300 font-mono font-bold">
                                        -{exchangeAmount} PT
                                    </div>
                                    <ArrowLeft size={20} className="text-gray-600 rotate-180" />
                                    <div className="bg-purple-900/30 px-4 py-2 rounded-lg border border-purple-800 text-purple-300 font-mono font-bold">
                                        +{Math.floor(exchangeAmount / currentRate)} BMC
                                    </div>
                                </div>
                            </div>

                            <button 
                                onClick={handleExchange}
                                className="w-full py-4 bg-gradient-to-r from-purple-700 to-indigo-700 rounded-xl font-black text-lg hover:from-purple-600 hover:to-indigo-600 transition-all shadow-[0_0_20px_rgba(124,58,237,0.3)] active:scale-[0.98]"
                            >
                                確認兌換
                            </button>
                        </div>
                    </div>
                ) : tab === 'SHOP' ? (
                    <div className="grid grid-cols-1 gap-4">
                        {BLACK_MARKET_ITEMS.map(item => {
                            const canAfford = (user.blackMarketCoins || 0) >= item.price;
                            const isOwned = user.inventory.includes(item.id) || user.avatarFrame === item.id;

                            return (
                                <div key={item.id} className="bg-gray-900 p-4 rounded-xl border border-gray-800 flex gap-4 items-center group hover:border-purple-500/50 transition-colors relative overflow-hidden">
                                    {item.isRare && <div className="absolute top-0 right-0 bg-yellow-600 text-[9px] text-black font-bold px-2 py-0.5">RARE</div>}
                                    
                                    <div className={`w-16 h-16 rounded-lg ${item.color} flex items-center justify-center shrink-0 shadow-lg`}>
                                        {item.icon}
                                    </div>
                                    
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-bold text-white truncate">{item.name}</h3>
                                        <p className="text-xs text-gray-400 line-clamp-2">{item.description}</p>
                                    </div>

                                    <button 
                                        disabled={!canAfford || isOwned}
                                        onClick={() => handleBuyItem(item)}
                                        className={`shrink-0 px-4 py-2 rounded-lg font-bold text-xs flex flex-col items-center min-w-[70px] transition-all
                                            ${isOwned 
                                                ? 'bg-gray-800 text-gray-500 cursor-not-allowed' 
                                                : canAfford 
                                                    ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-[0_0_10px_rgba(147,51,234,0.4)]' 
                                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed border border-red-900/50'}
                                        `}
                                    >
                                        {isOwned ? (
                                            <span>已擁有</span>
                                        ) : (
                                            <>
                                                <span>{item.price}</span>
                                                <span className="text-[9px] opacity-70">BMC</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                ) : (
                    <div className="space-y-4">
                        <div className="bg-gray-900 p-4 rounded-xl border border-gray-800 mb-4">
                            <h3 className="font-bold text-green-400 mb-4 flex items-center gap-2">
                                <Users size={18}/> 交易名單
                            </h3>
                            
                            {/* Search */}
                            <div className="flex items-center gap-2 bg-black border border-gray-700 rounded-lg px-3 py-2 mb-4">
                                <Search size={16} className="text-gray-500"/>
                                <input 
                                    type="text" 
                                    placeholder="搜尋名字或學號..."
                                    value={searchQuery}
                                    onChange={e => setSearchQuery(e.target.value)}
                                    className="bg-transparent border-none outline-none text-sm text-white w-full"
                                />
                            </div>

                            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                                {filteredUsers.map(u => (
                                    <div 
                                        key={u.studentId}
                                        onClick={() => setSelectedReceiver(u.studentId)}
                                        className={`flex items-center justify-between p-3 rounded-lg cursor-pointer border transition-all ${selectedReceiver === u.studentId ? 'bg-green-900/30 border-green-500' : 'bg-black border-gray-800 hover:border-gray-600'}`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className={`w-8 h-8 rounded-full ${u.avatarColor} flex items-center justify-center text-xs font-bold overflow-hidden ${getFrameStyle(u.avatarFrame)}`}>
                                                {u.avatarImage ? <img src={u.avatarImage} className="w-full h-full object-cover"/> : u.name[0]}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-white">{u.name}</div>
                                                <div className="text-[10px] text-gray-500">{u.studentId}</div>
                                            </div>
                                        </div>
                                        <div className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                                            <Gem size={8}/> {u.blackMarketCoins || 0}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {selectedReceiver && (
                            <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 animate-in slide-in-from-bottom shadow-2xl">
                                <div className="flex justify-between items-center mb-3 border-b border-gray-700 pb-2">
                                    <span className="text-xs text-gray-400">轉帳對象</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-white font-bold">{userList.find(u=>u.studentId===selectedReceiver)?.name}</span>
                                        <button onClick={() => setSelectedReceiver(null)} className="text-gray-500 hover:text-white"><X size={14}/></button>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2 mb-3">
                                    <input 
                                        type="number" 
                                        value={transferAmount}
                                        onChange={e => setTransferAmount(e.target.value)}
                                        placeholder="輸入 BMC 數量"
                                        className="flex-1 bg-black border border-gray-600 rounded-lg p-3 text-white outline-none focus:border-green-500 font-mono text-lg"
                                    />
                                </div>
                                
                                {/* Quick Amounts */}
                                <div className="flex gap-2 mb-4">
                                    {[10, 50, 100].map(amt => (
                                        <button key={amt} onClick={() => setTransferAmount(amt.toString())} className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1 rounded text-gray-300">
                                            {amt}
                                        </button>
                                    ))}
                                    <button onClick={() => setTransferAmount((user.blackMarketCoins || 0).toString())} className="flex-1 bg-gray-700 hover:bg-gray-600 text-xs py-1 rounded text-purple-300 font-bold">
                                        ALL
                                    </button>
                                </div>

                                <button 
                                    onClick={handleTransfer}
                                    disabled={isTransferring}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white py-3 rounded-lg font-bold flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
                                >
                                    {isTransferring ? <Loader2 size={16} className="animate-spin"/> : <Send size={16}/>}
                                    確認轉帳
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
