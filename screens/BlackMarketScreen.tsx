
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, RefreshCw, ShoppingBag, Shield, Skull, Zap, Crown, UserMinus, Volume2, Gem, TrendingUp, TrendingDown, Users, Send, Search, Loader2, X, ArrowRightLeft, DollarSign, Database, Eye, Lock, Terminal, Radio, Activity } from 'lucide-react';
import { User, Product, LeaderboardEntry } from '../types';
import { updateUserInDb } from '../services/authService';
import { fetchClassLeaderboard, transferBlackCoins } from '../services/dataService';
import { createNotification } from '../services/notificationService';

interface BlackMarketScreenProps {
  user: User;
  onBack: () => void;
  onBuy: (product: Product) => void;
  setUser: (user: User) => void;
}

// Updated Item List
const BLACK_MARKET_ITEMS: Product[] = [
    { id: 'chip_basic', name: '基礎破解晶片', price: 200, currency: 'BMC', color: 'bg-blue-900 text-blue-300', icon: <Terminal size={20}/>, description: '嘗試駭入他人帳戶 (30% 成功率)', category: 'black_market', tag: '消耗品' },
    { id: 'chip_adv', name: '高階滲透軟體', price: 800, currency: 'BMC', color: 'bg-red-900 text-red-300', icon: <Skull size={20}/>, description: '高機率駭入他人帳戶 (60% 成功率)', category: 'black_market', tag: '消耗品' },
    { id: 'item_firewall', name: '主動式防火牆', price: 500, currency: 'BMC', color: 'bg-green-900 text-green-300', icon: <Shield size={20}/>, description: '抵擋一次駭客攻擊 (自動消耗)', category: 'black_market', tag: '被動' },
    { id: 'item_spy', name: '間諜衛星', price: 1500, currency: 'BMC', color: 'bg-purple-900 text-purple-300', icon: <Eye size={20}/>, description: '查看任意玩家的詳細資產與狀態', category: 'black_market', tag: '情報' },
    { id: 'item_stealth', name: '光學迷彩', price: 3000, currency: 'BMC', color: 'bg-slate-700 text-slate-300', icon: <UserMinus size={20}/>, description: '從排行榜與駭客名單中消失 24 小時', category: 'black_market', tag: 'BUFF' },
    { id: 'item_megaphone', name: '暗網廣播', price: 1000, currency: 'BMC', color: 'bg-yellow-900 text-yellow-300', icon: <Volume2 size={20}/>, description: '發送一條匿名全服公告', category: 'black_market', tag: '消耗品' },
    { id: 'frame_glitch', name: '故障藝術框', price: 8000, currency: 'BMC', color: 'bg-indigo-900 text-cyan-400', icon: <Zap size={20}/>, description: '稀有動態故障風格頭像框', category: 'frame', isRare: true },
    { id: 'title_dark_lord', name: '稱號：暗夜領主', price: 15000, currency: 'BMC', color: 'bg-black text-red-600', icon: <Crown size={20}/>, description: '個人頁面專屬黑色稱號', category: 'cosmetic', isRare: true },
];

export const BlackMarketScreen: React.FC<BlackMarketScreenProps> = ({ user, onBack, onBuy, setUser }) => {
    const [tab, setTab] = useState<'EXCHANGE' | 'INTERACT' | 'SHOP' | 'INVENTORY'>('EXCHANGE');
    
    // Exchange Logic
    const [exchangeAmount, setExchangeAmount] = useState<string>(''); 
    const [exchangeMode, setExchangeMode] = useState<'BUY' | 'SELL'>('BUY');
    const [currentRate, setCurrentRate] = useState(100.0);
    const [rateTrend, setRateTrend] = useState<'UP' | 'DOWN' | 'STABLE'>('STABLE');
    const [priceHistory, setPriceHistory] = useState<number[]>([100, 102, 98, 95, 105, 110, 100, 92, 95, 100]);
    const [totalSupply, setTotalSupply] = useState(0);
    const [marketSentiment, setMarketSentiment] = useState(1.0); // 0.8 (Bear) to 1.2 (Bull)

    // Interaction Data
    const [userList, setUserList] = useState<(LeaderboardEntry & { isStealth?: boolean })[]>([]);
    const [heistLog, setHeistLog] = useState<string[]>([]);
    const [isHacking, setIsHacking] = useState(false);

    // Inventory Data
    const [myBlackMarketItems, setMyBlackMarketItems] = useState<string[]>([]);

    // 1. Initial Load & Market Simulation
    useEffect(() => {
        const initMarket = async () => {
            const users = await fetchClassLeaderboard();
            // Filter out self and banned
            setUserList(users.filter(u => u.studentId !== user.studentId));
            
            // Calculate Total Supply for Rate
            const total = users.reduce((sum, u) => sum + (u.blackMarketCoins || 0), 0);
            setTotalSupply(total);
            
            // --- DYNAMIC RATE ALGORITHM ---
            // 1. Supply Factor: More BMC = Inflation (Lower Rate)
            const anchorSupply = 50000;
            const supplyFactor = anchorSupply / Math.max(1000, total); // e.g. 1.0 or 0.5
            
            // 2. Sentiment Factor (Trends): Slowly oscillates
            const time = Date.now() / 10000; // Slowly changing
            const sentiment = 1 + Math.sin(time) * 0.2; // 0.8 to 1.2
            setMarketSentiment(sentiment);

            // 3. Volatility (Noise)
            const volatility = (Math.random() - 0.5) * 5;
            
            let calculatedRate = 100 * supplyFactor * sentiment + volatility;
            calculatedRate = Math.max(10, Math.min(500, calculatedRate)); // Clamp

            setCurrentRate(prev => {
                if (calculatedRate > prev) setRateTrend('UP');
                else if (calculatedRate < prev) setRateTrend('DOWN');
                return parseFloat(calculatedRate.toFixed(1));
            });
            
            setPriceHistory(prev => {
                const newHistory = [...prev.slice(1), calculatedRate];
                return newHistory;
            });
        };

        initMarket();
        const interval = setInterval(initMarket, 5000); // Update every 5s
        return () => clearInterval(interval);
    }, [user.blackMarketCoins]);

    // Update local inventory list
    useEffect(() => {
        const items = user.inventory.filter(id => BLACK_MARKET_ITEMS.some(p => p.id === id));
        setMyBlackMarketItems(items);
    }, [user.inventory]);

    // --- Exchange Handlers ---
    const handleExchange = async () => {
        const amount = parseInt(exchangeAmount);
        if (isNaN(amount) || amount <= 0) { alert("請輸入有效金額"); return; }

        if (exchangeMode === 'BUY') {
            const cost = Math.ceil(amount * currentRate);
            if (user.points < cost) { alert(`積分不足！需要 ${cost} PT`); return; }

            if (confirm(`匯率 ${currentRate.toFixed(1)} PT/BMC\n花費 ${cost} PT 購買 ${amount} BMC？`)) {
                await executeTrade(cost, amount, 'BUY');
            }
        } else {
            if ((user.blackMarketCoins || 0) < amount) { alert("黑幣不足！"); return; }
            const rawGain = Math.floor(amount * currentRate);
            const fee = Math.ceil(rawGain * 0.15); // 15% Fee for selling back
            const finalGain = rawGain - fee;

            if (confirm(`匯率 ${currentRate.toFixed(1)} PT/BMC\n出售 ${amount} BMC\n預估價值: ${rawGain} PT\n手續費(15%): -${fee} PT\n實際獲得: ${finalGain} PT\n確定出售？`)) {
                await executeTrade(finalGain, amount, 'SELL');
            }
        }
    };

    const executeTrade = async (ptValue: number, bmcValue: number, mode: 'BUY' | 'SELL') => {
        try {
            const updatedUser = {
                ...user,
                points: mode === 'BUY' ? user.points - ptValue : user.points + ptValue,
                blackMarketCoins: mode === 'BUY' ? (user.blackMarketCoins || 0) + bmcValue : (user.blackMarketCoins || 0) - bmcValue
            };
            await updateUserInDb(updatedUser);
            setUser(updatedUser);
            setExchangeAmount('');
            alert("交易成功");
        } catch (e) { alert("交易失敗"); }
    };

    // --- Shop Handlers ---
    const handleBuyItem = async (product: Product) => {
        if ((user.blackMarketCoins || 0) < product.price) { alert("黑幣不足"); return; }
        if (confirm(`確定購買 ${product.name}？將扣除 ${product.price} BMC`)) {
            try {
                const newInventory = [...user.inventory, product.id];
                const updatedUser = {
                    ...user,
                    blackMarketCoins: (user.blackMarketCoins || 0) - product.price,
                    inventory: newInventory
                };
                await updateUserInDb(updatedUser);
                setUser(updatedUser);
                alert("購買成功！請至背包查看");
            } catch (e) { alert("交易失敗"); }
        }
    };

    // --- Transfer Handler ---
    const handleP2PTransfer = async (targetId: string, targetName: string) => {
        const amountStr = prompt(`轉帳給 ${targetName}\n請輸入 BMC 數量 (手續費 10%):`);
        if (!amountStr) return;
        const amount = parseInt(amountStr);
        if (isNaN(amount) || amount <= 0) { alert("無效金額"); return; }
        if (amount > (user.blackMarketCoins || 0)) { alert("餘額不足"); return; }

        const fee = Math.ceil(amount * 0.1);
        const actualReceive = amount - fee;

        if (confirm(`確認轉帳 ${amount} BMC 給 ${targetName}？\n\n系統手續費: -${fee} BMC\n對方實收: ${actualReceive} BMC\n此操作無法復原。`)) {
            try {
                await transferBlackCoins(user.studentId, targetId, amount);
                
                // Deduct from local user state (Supabase handles the transaction but we update UI)
                const updatedUser = { ...user, blackMarketCoins: (user.blackMarketCoins || 0) - amount };
                await updateUserInDb(updatedUser); // Sync local state just in case
                setUser(updatedUser);
                
                // Notify
                createNotification(targetId, 'system', '收到轉帳', `${user.name} 轉給了你 ${actualReceive} BMC (已扣手續費)`);
                alert("轉帳成功！");
            } catch (e: any) {
                alert("轉帳失敗: " + e.message);
            }
        }
    };

    // --- Hack Handlers ---
    const handleHack = async (targetId: string, tool: 'basic' | 'adv') => {
        if (isHacking) return;
        const target = userList.find(u => u.studentId === targetId);
        if (!target) return;

        const toolId = tool === 'basic' ? 'chip_basic' : 'chip_adv';
        const toolIdx = user.inventory.indexOf(toolId);
        if (toolIdx === -1) { alert("你沒有此駭客晶片！請先購買。"); return; }

        if (!confirm(`確定要對 ${target.name} 使用 ${tool === 'basic' ? '基礎' : '高階'} 晶片嗎？\n(消耗 1 個晶片)`)) return;

        setIsHacking(true);
        setHeistLog(prev => [`正在連接 ${target.name} 的防火牆...`, ...prev]);

        // Consume Tool
        const newInv = [...user.inventory];
        newInv.splice(toolIdx, 1);
        
        setTimeout(async () => {
            let successRate = tool === 'basic' ? 0.3 : 0.6;
            const stealAmount = Math.floor((target.blackMarketCoins || 0) * (Math.random() * 0.04 + 0.01));
            
            if (stealAmount <= 0) {
                setHeistLog(prev => [`目標太窮了，沒有油水。`, ...prev]);
                finishHack(newInv);
                return;
            }

            const roll = Math.random();
            const isSuccess = roll < successRate;

            if (isSuccess) {
                try {
                    await transferBlackCoins(targetId, user.studentId, stealAmount); 
                    setHeistLog(prev => [`[SUCCESS] 駭入成功！竊取了 ${stealAmount} BMC`, ...prev]);
                    const updatedUser = { ...user, inventory: newInv, blackMarketCoins: (user.blackMarketCoins || 0) + stealAmount };
                    await updateUserInDb(updatedUser);
                    setUser(updatedUser);
                    createNotification(targetId, 'system', '警報：帳戶入侵', `${user.name} 駭入了你的帳戶並竊取了 ${stealAmount} BMC！`);
                } catch(e) {
                    setHeistLog(prev => [`[ERROR] 轉帳失敗 (對方可能開啟了防火牆)`, ...prev]);
                    finishHack(newInv);
                }
            } else {
                setHeistLog(prev => [`[FAIL] 駭入失敗！被對手防火牆攔截。`, ...prev]);
                createNotification(targetId, 'system', '警報：攔截入侵', `防火牆成功攔截了 ${user.name} 的駭客攻擊。`);
                finishHack(newInv);
            }
            setIsHacking(false);
        }, 2000);
    };

    const finishHack = async (inventory: string[]) => {
        const updatedUser = { ...user, inventory };
        await updateUserInDb(updatedUser);
        setUser(updatedUser);
        setIsHacking(false);
    };

    // --- Inventory Item Usage ---
    const handleUseItem = async (itemId: string) => {
        if (itemId === 'item_spy') {
            const targetId = prompt("請輸入目標學號以進行偵查:");
            if (!targetId) return;
            const target = userList.find(u => u.studentId === targetId);
            if (target) {
                alert(`[偵查報告]\n目標: ${target.name}\nPT: ${target.points}\nBMC: ${target.blackMarketCoins || 0}\n等級: ${target.level}`);
                consumeItem(itemId);
            } else {
                alert("找不到目標");
            }
        } else if (itemId === 'item_stealth') {
            if (confirm("啟動光學迷彩？(24小時內隱藏身分)")) {
                const updatedUser = { ...user, isStealth: true };
                consumeItem(itemId, updatedUser);
                alert("隱身模式已啟動！");
            }
        } else if (itemId === 'item_megaphone') {
            const msg = prompt("輸入廣播內容 (全服可見):");
            if (msg) {
                alert("廣播已發送至暗網頻道 (模擬)");
                consumeItem(itemId);
            }
        }
    };

    const consumeItem = async (itemId: string, userOverride?: User) => {
        const currentUser = userOverride || user;
        const idx = currentUser.inventory.indexOf(itemId);
        if (idx > -1) {
            const newInv = [...currentUser.inventory];
            newInv.splice(idx, 1);
            const updated = { ...currentUser, inventory: newInv };
            await updateUserInDb(updated);
            setUser(updated);
        }
    };

    const renderChart = () => {
        const width = 300;
        const height = 100;
        const min = Math.min(...priceHistory, 50.0);
        const max = Math.max(...priceHistory, 200.0);
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
                    <path d={`${points} L ${width},${height} L 0,${height} Z`} fill={isUp ? "rgba(239,68,68,0.1)" : "rgba(16,185,129,0.1)"} />
                    <polyline points={points} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <div className="absolute top-2 left-2 text-[10px] text-gray-500 font-mono bg-black/50 px-1 rounded">全服大盤走勢</div>
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
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 tracking-wider">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        LIVE MARKET
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-900 px-3 py-1 rounded-full border border-gray-700">
                    <Gem size={14} className="text-purple-400"/>
                    <span className="text-sm font-bold">{user.blackMarketCoins || 0}</span>
                </div>
            </div>

            <div className="flex p-2 gap-2 z-10 bg-black border-b border-gray-800 overflow-x-auto">
                {[
                    {id: 'EXCHANGE', icon: <ArrowRightLeft size={14}/>, label: '匯率'},
                    {id: 'INTERACT', icon: <Users size={14}/>, label: '玩家互動'},
                    {id: 'SHOP', icon: <ShoppingBag size={14}/>, label: '黑市'},
                    {id: 'INVENTORY', icon: <Database size={14}/>, label: '背包'}
                ].map(t => (
                    <button 
                        key={t.id}
                        onClick={() => setTab(t.id as any)} 
                        className={`flex-1 min-w-[80px] py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-1 transition-all ${tab === t.id ? 'bg-purple-900/30 text-purple-400 border border-purple-500/50' : 'bg-gray-900 text-gray-500 border border-gray-800'}`}
                    >
                        {t.icon} {t.label}
                    </button>
                ))}
            </div>

            <div className="flex-1 overflow-y-auto p-4 z-10 pb-safe">
                
                {/* --- EXCHANGE TAB --- */}
                {tab === 'EXCHANGE' && (
                    <div className="space-y-6">
                        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl relative overflow-hidden">
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Shield size={20} className="text-green-500"/> 匯率看板
                                    </h2>
                                    <div className="flex gap-4 mt-2">
                                        <div className="text-xs text-gray-500">
                                            <div className="uppercase text-[9px] mb-0.5 opacity-70">Supply</div>
                                            <div>{totalSupply.toLocaleString()}</div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            <div className="uppercase text-[9px] mb-0.5 opacity-70">Sentiment</div>
                                            <div className={marketSentiment > 1 ? "text-green-400" : "text-red-400"}>{marketSentiment > 1 ? "Bullish" : "Bearish"}</div>
                                        </div>
                                    </div>
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
                        </div>

                        <div className="bg-black/40 rounded-xl p-4 border border-gray-800 space-y-4">
                            <div className="flex bg-gray-900 rounded-lg p-1">
                                <button onClick={() => { setExchangeMode('BUY'); setExchangeAmount(''); }} className={`flex-1 py-2 rounded font-bold text-sm ${exchangeMode === 'BUY' ? 'bg-green-600 text-white' : 'text-gray-500'}`}>買入</button>
                                <button onClick={() => { setExchangeMode('SELL'); setExchangeAmount(''); }} className={`flex-1 py-2 rounded font-bold text-sm ${exchangeMode === 'SELL' ? 'bg-red-600 text-white' : 'text-gray-500'}`}>賣出</button>
                            </div>
                            
                            <input 
                                type="number" 
                                value={exchangeAmount}
                                onChange={(e) => setExchangeAmount(e.target.value)}
                                placeholder="數量"
                                className={`w-full bg-black text-white p-3 rounded-lg border outline-none font-mono text-lg text-center ${exchangeMode === 'BUY' ? 'border-green-900 focus:border-green-500' : 'border-red-900 focus:border-red-500'}`}
                            />
                            
                            <div className="flex justify-between text-xs text-gray-400 px-1">
                                <span>預估總價:</span>
                                <span className={`font-mono font-bold ${exchangeMode === 'BUY' ? 'text-green-400' : 'text-red-400'}`}>
                                    {Math.floor((parseInt(exchangeAmount)||0) * currentRate * (exchangeMode === 'SELL' ? 0.85 : 1))} PT
                                </span>
                            </div>

                            <button 
                                onClick={handleExchange}
                                className={`w-full py-3 rounded-xl font-black transition-all shadow-lg active:scale-[0.98] ${exchangeMode === 'BUY' ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600'}`}
                            >
                                確認交易
                            </button>
                        </div>
                    </div>
                )}

                {/* --- INTERACT TAB (Renamed from HEIST, added Transfer) --- */}
                {tab === 'INTERACT' && (
                    <div className="space-y-4">
                        <div className="bg-gradient-to-r from-gray-900 to-black border border-gray-700 p-4 rounded-xl mb-4">
                            <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Activity size={18}/> 玩家列表</h3>
                            <p className="text-xs text-gray-400 leading-relaxed">
                                可以對其他玩家進行 <span className="text-blue-400 font-bold">轉帳</span> (需手續費) 或 <span className="text-red-400 font-bold">駭入</span> (有風險)。
                            </p>
                        </div>

                        {heistLog.length > 0 && (
                            <div className="bg-black border border-green-900/50 p-3 rounded-lg font-mono text-xs h-32 overflow-y-auto mb-4 text-green-400 space-y-1">
                                {heistLog.map((log, i) => <div key={i}>{'>'} {log}</div>)}
                            </div>
                        )}

                        <div className="space-y-2">
                            {userList.map(u => (
                                <div key={u.studentId} className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex justify-between items-center group hover:border-blue-900 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full ${u.avatarColor} flex items-center justify-center text-xs font-bold`}>{u.name[0]}</div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-200">{u.isStealth ? 'UNKOWN' : u.name}</div>
                                            <div className="text-[10px] text-gray-500">Lv.{u.level}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button 
                                            onClick={() => handleP2PTransfer(u.studentId, u.name)}
                                            className="px-3 py-1 bg-gray-800 hover:bg-blue-900 text-blue-400 text-xs rounded border border-blue-900 transition-colors"
                                        >
                                            轉帳
                                        </button>
                                        <button 
                                            onClick={() => handleHack(u.studentId, 'basic')}
                                            className="px-3 py-1 bg-gray-800 hover:bg-red-900 text-red-400 text-xs rounded border border-red-900 transition-colors"
                                        >
                                            駭入
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* --- SHOP TAB --- */}
                {tab === 'SHOP' && (
                    <div className="grid grid-cols-1 gap-3">
                        {BLACK_MARKET_ITEMS.map(item => {
                            const canAfford = (user.blackMarketCoins || 0) >= item.price;
                            const isOwned = item.category !== 'consumable' && (user.inventory.includes(item.id) || user.avatarFrame === item.id);
                            
                            return (
                                <div key={item.id} className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex gap-3 items-center relative overflow-hidden">
                                    <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center shrink-0 shadow-lg`}>
                                        {item.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <h3 className="font-bold text-gray-200 text-sm">{item.name}</h3>
                                            {item.tag && <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{item.tag}</span>}
                                        </div>
                                        <p className="text-[10px] text-gray-500 line-clamp-1">{item.description}</p>
                                        <div className="text-purple-400 font-mono text-xs font-bold mt-1">{item.price} BMC</div>
                                    </div>
                                    <button 
                                        disabled={!canAfford || isOwned}
                                        onClick={() => handleBuyItem(item)}
                                        className={`px-4 py-2 rounded-lg text-xs font-bold ${isOwned ? 'bg-gray-800 text-gray-500' : canAfford ? 'bg-purple-700 text-white' : 'bg-gray-800 text-gray-500 border border-red-900'}`}
                                    >
                                        {isOwned ? '已擁有' : '購買'}
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* --- INVENTORY TAB --- */}
                {tab === 'INVENTORY' && (
                    <div className="grid grid-cols-2 gap-3">
                        {myBlackMarketItems.length === 0 ? (
                            <div className="col-span-2 text-center text-gray-500 py-10 text-xs">背包空空如也</div>
                        ) : (
                            myBlackMarketItems.map((itemId, idx) => {
                                const itemDef = BLACK_MARKET_ITEMS.find(i => i.id === itemId);
                                if (!itemDef) return null;
                                return (
                                    <div key={`${itemId}-${idx}`} className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex flex-col items-center text-center">
                                        <div className={`w-10 h-10 rounded-full ${itemDef.color} flex items-center justify-center mb-2`}>
                                            {itemDef.icon}
                                        </div>
                                        <h4 className="font-bold text-gray-300 text-xs mb-1">{itemDef.name}</h4>
                                        <button 
                                            onClick={() => handleUseItem(itemId)}
                                            className="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] py-1.5 rounded border border-gray-700 transition-colors"
                                        >
                                            使用
                                        </button>
                                    </div>
                                );
                            })
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};
