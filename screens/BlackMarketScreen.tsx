
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowLeft, ShoppingBag, Shield, Skull, Zap, Crown, UserMinus, Volume2, Gem, TrendingUp, TrendingDown, Users, ArrowRightLeft, Database, Eye, Activity, Target, AlertTriangle, Siren, Crosshair, Loader2, RefreshCw, Plus, Minus, Info, Box, HelpCircle, FileText } from 'lucide-react';
import { User, Product } from '../types';
import { updateUserInDb } from '../services/authService';
import { transferBlackCoins, fetchBlackMarketStats, fetchUserListLite } from '../services/dataService';
import { createNotification } from '../services/notificationService';

interface BlackMarketScreenProps {
  user: User;
  onBack: () => void;
  onBuy: (product: Product) => void;
  setUser: (user: User) => void;
}

// Define Icon first to avoid reference errors
const TerminalIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
);

const getDynamicPrice = (base: number, multiplier: number) => {
    return Math.ceil(base * multiplier);
};

const BLACK_MARKET_ITEMS: Product[] = [
    { id: 'chip_basic', name: '基礎破解晶片', price: 200, currency: 'BMC', color: 'bg-blue-900 text-blue-300', icon: <TerminalIcon />, description: '嘗試駭入他人帳戶 (30% 成功率)', category: 'black_market', tag: '消耗品' },
    { id: 'chip_adv', name: '高階滲透軟體', price: 800, currency: 'BMC', color: 'bg-red-900 text-red-300', icon: <Skull size={20}/>, description: '高機率駭入他人帳戶 (60% 成功率)', category: 'black_market', tag: '消耗品' },
    { id: 'item_firewall', name: '主動式防火牆', price: 500, currency: 'BMC', color: 'bg-green-900 text-green-300', icon: <Shield size={20}/>, description: '被動抵擋駭客攻擊 (機率性)', category: 'black_market', tag: '被動' },
    { id: 'item_spy', name: '間諜衛星', price: 1500, currency: 'BMC', color: 'bg-purple-900 text-purple-300', icon: <Eye size={20}/>, description: '查看任意玩家的詳細資產與狀態', category: 'black_market', tag: '情報' },
    { id: 'item_stealth', name: '光學迷彩', price: 3000, currency: 'BMC', color: 'bg-slate-700 text-slate-300', icon: <UserMinus size={20}/>, description: '從排行榜與駭客名單中消失 24 小時', category: 'black_market', tag: 'BUFF' },
    { id: 'item_megaphone', name: '暗網廣播', price: 1000, currency: 'BMC', color: 'bg-yellow-900 text-yellow-300', icon: <Volume2 size={20}/>, description: '發送一條匿名全服公告', category: 'black_market', tag: '消耗品' },
    { id: 'frame_glitch', name: '故障藝術框', price: 8000, currency: 'BMC', color: 'bg-indigo-900 text-cyan-400', icon: <Zap size={20}/>, description: '稀有動態故障風格頭像框', category: 'frame', isRare: true },
    { id: 'title_dark_lord', name: '稱號：暗夜領主', price: 15000, currency: 'BMC', color: 'bg-black text-red-600', icon: <Crown size={20}/>, description: '個人頁面專屬黑色稱號', category: 'cosmetic', isRare: true },
];

export const BlackMarketScreen: React.FC<BlackMarketScreenProps> = ({ user, onBack, onBuy, setUser }) => {
    const [tab, setTab] = useState<'EXCHANGE' | 'INTERACT' | 'SHOP' | 'GACHA' | 'INVENTORY'>('EXCHANGE');
    
    // Exchange & Economy Logic
    const [exchangeAmount, setExchangeAmount] = useState<string>(''); 
    const [exchangeMode, setExchangeMode] = useState<'BUY' | 'SELL'>('BUY');
    const [currentRate, setCurrentRate] = useState(100.0);
    const [rateTrend, setRateTrend] = useState<'UP' | 'DOWN' | 'STABLE'>('STABLE');
    const [priceHistory, setPriceHistory] = useState<number[]>([100, 100, 100, 100, 100, 100, 100, 100, 100, 100]);
    const [totalSupply, setTotalSupply] = useState(0);
    const [inflationMultiplier, setInflationMultiplier] = useState(1.0);
    const [marketSentiment, setMarketSentiment] = useState(0); 
    const [isMarketLoading, setIsMarketLoading] = useState(true); 

    // Shop Quantity Logic
    const [buyQuantities, setBuyQuantities] = useState<Record<string, number>>({});

    // Interaction Data
    const [userList, setUserList] = useState<(any)[]>([]); 
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [wantedList, setWantedList] = useState<any[]>([]); 
    const [heistLog, setHeistLog] = useState<string[]>([]);
    const [isHacking, setIsHacking] = useState(false);

    // Gacha State
    const [isGachaRolling, setIsGachaRolling] = useState(false);
    const [gachaResult, setGachaResult] = useState<{type: string, value: string, color: string} | null>(null);

    // Inventory Data
    const [myBlackMarketItems, setMyBlackMarketItems] = useState<string[]>([]);

    const hasFirewall = user.inventory.includes('item_firewall');

    // 1. Optimized Market Polling & Fluctuation
    useEffect(() => {
        const updateEconomy = async () => {
            const stats = await fetchBlackMarketStats();
            
            const total = stats.totalSupply;
            setTotalSupply(total);
            setWantedList(stats.topHolders);
            
            // Supply-Demand Algorithm
            // Anchor Supply: The "healthy" amount of BMC in circulation (e.g., 200,000)
            // Base Rate: The standard exchange rate (e.g., 100 PT = 1 BMC)
            
            const ANCHOR_SUPPLY = 200000;
            const BASE_RATE = 100;

            // 1. Calculate Scarcity Factor (Inverse of Supply)
            // If supply is high -> Rate goes down (Inflation)
            // If supply is low -> Rate goes up (Appreciation)
            let scarcityRatio = ANCHOR_SUPPLY / Math.max(50000, total); // Clamp min supply to avoid div/0 or extreme values
            
            // Dampen the ratio to avoid extreme volatility
            // Rate = Base * (Ratio^0.5)
            let supplyBasedRate = BASE_RATE * Math.pow(scarcityRatio, 0.7);

            // 2. Add Market Noise (Random fluctuation)
            const time = Date.now();
            const noise = (Math.sin(time / 15000) * 10) + (Math.random() * 5 - 2.5);
            
            let calculatedRate = supplyBasedRate + noise;
            calculatedRate = Math.max(50, Math.min(300, calculatedRate)); // Clamp between 50 and 300

            // 3. Calculate Inflation Multiplier for Shop Prices
            // If Rate is low (BMC is cheap/abundant), Shop Prices should go UP to sink coins.
            // If Rate is high (BMC is expensive), Shop Prices can stay normal.
            let infMult = 1.0;
            if (calculatedRate < 80) {
                // High inflation scenario
                infMult = 1 + ((80 - calculatedRate) / 80) * 0.5; // Up to 1.5x prices
            }
            setInflationMultiplier(infMult);

            setCurrentRate(prev => {
                if (calculatedRate > prev) setRateTrend('UP');
                else if (calculatedRate < prev) setRateTrend('DOWN');
                else setRateTrend('STABLE');
                return parseFloat(calculatedRate.toFixed(1));
            });
            
            setPriceHistory(prev => {
                const newHistory = [...prev.slice(1), calculatedRate];
                return newHistory;
            });

            setIsMarketLoading(false);
        };

        updateEconomy();
        const interval = setInterval(updateEconomy, 5000); // Poll every 5s
        return () => clearInterval(interval);
    }, [user.blackMarketCoins]);

    // 2. User List Fetching
    const loadFullUserList = async () => {
        setIsLoadingUsers(true);
        try {
            const users = await fetchUserListLite();
            // Filter out self and banned
            const otherUsers = users.filter((u: any) => u.studentId !== user.studentId);
            setUserList(otherUsers);
        } catch (e) {
            console.error(e);
        }
        setIsLoadingUsers(false);
    };

    // Auto-load list when switching to INTERACT tab
    useEffect(() => {
        if (tab === 'INTERACT') {
            loadFullUserList();
        }
    }, [tab]);

    useEffect(() => {
        const items = user.inventory.filter(id => BLACK_MARKET_ITEMS.some(p => p.id === id));
        setMyBlackMarketItems(items);
    }, [user.inventory]);

    // --- Quantity Handlers ---
    const updateQuantity = (itemId: string, delta: number) => {
        setBuyQuantities(prev => {
            const current = prev[itemId] || 1;
            const next = Math.max(1, Math.min(99, current + delta));
            return { ...prev, [itemId]: next };
        });
    };

    const getQuantity = (itemId: string) => buyQuantities[itemId] || 1;

    // --- Exchange Handlers ---
    const handleExchange = async () => {
        if (isMarketLoading) return;
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
            const fee = Math.ceil(rawGain * 0.15); // 15% Fee
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

    // --- Shop Handlers (With Dynamic Price) ---
    const handleBuyItem = async (product: Product) => {
        if (isMarketLoading) { alert("市場數據同步中，請稍候..."); return; }
        
        const qty = getQuantity(product.id);
        const unitPrice = getDynamicPrice(product.price, inflationMultiplier);
        const totalPrice = unitPrice * qty;
        
        if ((user.blackMarketCoins || 0) < totalPrice) { alert(`黑幣不足，需要 ${totalPrice} BMC`); return; }
        
        if (confirm(`確定購買 ${qty} 個 ${product.name}？\n單價: ${unitPrice} BMC\n總價: ${totalPrice} BMC`)) {
            try {
                // Add items (allows duplicates for consumables)
                const newItems = Array(qty).fill(product.id);
                const newInventory = [...user.inventory, ...newItems];
                
                const updatedUser = {
                    ...user,
                    blackMarketCoins: (user.blackMarketCoins || 0) - totalPrice,
                    inventory: newInventory
                };
                
                await updateUserInDb(updatedUser);
                setUser(updatedUser);
                alert("購買成功！請至背包查看");
                setBuyQuantities(prev => ({...prev, [product.id]: 1})); // Reset qty
            } catch (e) { alert("交易失敗"); }
        }
    };

    // --- Gacha Handlers ---
    const handleGacha = async () => {
        const PRICE = 200; // 200 BMC
        if ((user.blackMarketCoins || 0) < PRICE) { alert("BMC 不足"); return; }
        if (isGachaRolling) return;

        setIsGachaRolling(true);
        setGachaResult(null);

        // Deduct Cost First
        const deductedCoins = (user.blackMarketCoins || 0) - PRICE;
        
        // Simulate Roll Animation
        await new Promise(r => setTimeout(r, 2000));

        const rand = Math.random();
        let reward: {type: string, value: string, color: string};
        
        // Prepare base user update
        let updatedUser = { ...user, blackMarketCoins: deductedCoins };

        if (rand < 0.05) {
            // 5% Jackpot
            reward = { type: '大獎 (JACKPOT)', value: '+500 BMC', color: 'text-yellow-400' };
            updatedUser.blackMarketCoins += 500;
        } else if (rand < 0.20) {
            // 15% Small Profit
            reward = { type: '中獎 (WIN)', value: '+300 BMC', color: 'text-green-400' };
            updatedUser.blackMarketCoins += 300;
        } else if (rand < 0.50) {
            // 30% Break Even
            reward = { type: '保本 (SAFE)', value: '+200 BMC', color: 'text-blue-400' };
            updatedUser.blackMarketCoins += 200;
        } else if (rand < 0.70) {
            // 20% Item (Chip)
            reward = { type: '道具 (ITEM)', value: '基礎破解晶片 x1', color: 'text-purple-400' };
            updatedUser.inventory = [...updatedUser.inventory, 'chip_basic'];
        } else {
            // 30% Loss (Trash)
            reward = { type: '銘謝惠顧', value: '0 BMC', color: 'text-gray-500' };
        }

        try {
            await updateUserInDb(updatedUser);
            setUser(updatedUser);
            setGachaResult(reward);
        } catch(e) {
            alert("Error processing transaction");
        }
        setIsGachaRolling(false);
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
                const updatedUser = { ...user, blackMarketCoins: (user.blackMarketCoins || 0) - amount };
                await updateUserInDb(updatedUser); 
                setUser(updatedUser);
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

        const isWanted = wantedList.some(w => w.student_id === targetId); 
        
        // Correct Item IDs
        const toolId = tool === 'basic' ? 'chip_basic' : 'chip_adv';
        const toolIdx = user.inventory.indexOf(toolId);
        if (toolIdx === -1) { alert("你沒有此駭客晶片！請先購買。"); return; }

        // Firewall Check Logic (Simulated)
        // Check if target inventory contains firewall
        const targetHasFirewall = target.inventory && target.inventory.includes('item_firewall');

        let msg = `確定要對 ${target.name} 使用 ${tool === 'basic' ? '基礎' : '高階'} 晶片嗎？`;
        if (isWanted) {
            msg += `\n\n🎯 目標是通緝犯！\n- 攻擊成功率 +20%\n- 50% 機率不消耗晶片\n- 成功額外獲得 500 BMC 賞金`;
        } else {
            msg += `\n(消耗 1 個晶片)`;
        }

        if (!confirm(msg)) return;

        setIsHacking(true);
        setHeistLog(prev => [`正在連接 ${target.name} 的防火牆...`, ...prev]);

        // Consume Logic (50% save chance for wanted)
        const consumeChance = isWanted ? 0.5 : 1.0;
        const shouldConsume = Math.random() < consumeChance;
        
        const newInv = [...user.inventory];
        if (shouldConsume) {
            newInv.splice(toolIdx, 1);
        } else {
            setHeistLog(prev => [`[SYSTEM] 政府資助：晶片未消耗！`, ...prev]);
        }
        
        setTimeout(async () => {
            let successRate = tool === 'basic' ? 0.3 : 0.6;
            if (isWanted) successRate += 0.2; 

            // Firewall Interaction
            if (targetHasFirewall) {
                setHeistLog(prev => [`[ALERT] 偵測到目標開啟了主動式防火牆！成功率大幅下降...`, ...prev]);
                successRate *= 0.1; // 90% reduction in success rate
            }

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
                    
                    const bounty = isWanted ? 500 : 0;
                    const totalGain = stealAmount + bounty;

                    setHeistLog(prev => [`[SUCCESS] 駭入成功！竊取 ${stealAmount} BMC ${isWanted ? `+ 賞金 ${bounty}` : ''}`, ...prev]);
                    
                    const updatedUser = { ...user, inventory: newInv, blackMarketCoins: (user.blackMarketCoins || 0) + totalGain };
                    await updateUserInDb(updatedUser);
                    setUser(updatedUser);
                    createNotification(targetId, 'system', '警報：帳戶入侵', `${user.name} 駭入了你的帳戶並竊取了 ${stealAmount} BMC！`);
                } catch(e) {
                    setHeistLog(prev => [`[ERROR] 轉帳失敗 (對方可能已轉移資產)`, ...prev]);
                    finishHack(newInv);
                }
            } else {
                if (targetHasFirewall) {
                    setHeistLog(prev => [`[FAIL] 入侵被防火牆強制攔截！IP 已暴露。`, ...prev]);
                } else {
                    setHeistLog(prev => [`[FAIL] 駭入失敗！被系統偵測。`, ...prev]);
                }
                createNotification(targetId, 'system', '警報：攔截入侵', `防火牆/系統成功攔截了 ${user.name} 的駭客攻擊。`);
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
                const hasFW = target.inventory && target.inventory.includes('item_firewall');
                alert(`[偵查報告]\n目標: ${target.name}\nPT: ${target.points}\nBMC: ${target.blackMarketCoins || 0}\n等級: ${target.level}\n防火牆: ${hasFW ? '開啟 (危險)' : '無'}`);
                consumeItem(itemId);
            } else {
                alert("找不到目標 (請先進入玩家互動分頁載入列表)");
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
                alert("廣播已發送至暗網頻道");
                consumeItem(itemId);
            }
        } else if (itemId === 'item_firewall') {
            alert("防火牆為被動道具，只要在背包中即自動生效。");
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
                        {hasFirewall ? (
                            <span className="text-green-500 flex items-center gap-1 font-bold animate-pulse"><Shield size={10}/> 防火牆運作中</span>
                        ) : (
                            <span className="text-red-500 font-bold">警告：無防護</span>
                        )}
                        <span className="w-1 h-4 bg-gray-700 mx-1"></span>
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        LIVE
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
                    {id: 'GACHA', icon: <Box size={14}/>, label: '轉蛋'},
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

            <div 
                className="flex-1 overflow-y-auto p-4 z-10 pb-24 min-h-0" 
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                
                {/* --- EXCHANGE TAB --- */}
                {tab === 'EXCHANGE' && (
                    <div className="space-y-6">
                        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-800 shadow-2xl relative overflow-hidden">
                            {/* ... (Exchange Chart UI same as before) ... */}
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                        <Shield size={20} className="text-green-500"/> 匯率看板
                                    </h2>
                                    <div className="flex gap-4 mt-2">
                                        <div className="text-xs text-gray-500">
                                            <div className="uppercase text-[9px] mb-0.5 opacity-70">市場總量 (Supply)</div>
                                            <div className={isMarketLoading ? "animate-pulse bg-gray-700 h-4 w-12 rounded" : ""}>
                                                {isMarketLoading ? "" : totalSupply.toLocaleString()}
                                            </div>
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            <div className="uppercase text-[9px] mb-0.5 opacity-70">市場情緒 (Sentiment)</div>
                                            {isMarketLoading ? (
                                                <div className="animate-pulse bg-gray-700 h-4 w-16 rounded"></div>
                                            ) : (
                                                <div className={marketSentiment > 0 ? "text-green-400" : "text-red-400"}>
                                                    {marketSentiment > 0 ? "看漲 Bullish" : "看跌 Bearish"}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    {!isMarketLoading && inflationMultiplier > 1.1 && (
                                        <div className="text-xs text-red-400 mt-2 font-bold flex items-center gap-1">
                                            <AlertTriangle size={12}/> 通貨膨脹警告: 商品價格 x{inflationMultiplier.toFixed(1)}
                                        </div>
                                    )}
                                </div>
                                <div className="text-right">
                                    <div className={`text-2xl font-mono font-black flex items-center gap-1 justify-end ${rateTrend === 'UP' ? 'text-red-500' : rateTrend === 'DOWN' ? 'text-green-500' : 'text-white'}`}>
                                        {rateTrend === 'UP' ? <TrendingUp size={20}/> : rateTrend === 'DOWN' ? <TrendingDown size={20}/> : null}
                                        {currentRate.toFixed(1)}
                                    </div>
                                    <span className="text-xs text-gray-500">PT / 1 BMC</span>
                                </div>
                            </div>
                            
                            {isMarketLoading ? (
                                <div className="relative h-32 w-full mt-4 bg-gray-900/50 rounded-xl border border-gray-800 flex items-center justify-center">
                                    <div className="flex flex-col items-center gap-2">
                                        <Loader2 className="animate-spin text-purple-500" size={24} />
                                        <span className="text-[10px] text-gray-500 uppercase tracking-widest">Analyzing Market...</span>
                                    </div>
                                </div>
                            ) : (
                                renderChart()
                            )}
                        </div>

                        <div className={`bg-black/40 rounded-xl p-4 border border-gray-800 space-y-4 ${isMarketLoading ? 'opacity-50 pointer-events-none' : ''}`}>
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
                                disabled={isMarketLoading}
                                className={`w-full py-3 rounded-xl font-black transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed ${exchangeMode === 'BUY' ? 'bg-green-700 hover:bg-green-600' : 'bg-red-700 hover:bg-red-600'}`}
                            >
                                {isMarketLoading ? '市場同步中...' : '確認交易'}
                            </button>
                        </div>
                    </div>
                )}

                {/* --- INTERACT TAB --- */}
                {tab === 'INTERACT' && (
                    <div className="space-y-4">
                        {/* Wanted List */}
                        <div className="bg-gradient-to-r from-red-900/40 to-black border border-red-800 rounded-xl p-4 relative overflow-hidden">
                            <div className="absolute right-0 top-0 opacity-20"><Siren size={80} className="text-red-500"/></div>
                            <h3 className="font-black text-red-500 text-lg mb-3 flex items-center gap-2 relative z-10">
                                <Target size={20}/> 懸賞名單 (Top 3)
                            </h3>
                            <div className="grid grid-cols-3 gap-2 relative z-10">
                                {isMarketLoading ? (
                                    [1, 2, 3].map(i => (
                                        <div key={i} className="bg-black/60 p-2 rounded-lg border border-red-900/30 text-center relative overflow-hidden animate-pulse">
                                            <div className="h-3 w-8 bg-red-900/50 rounded mx-auto mb-2"></div>
                                            <div className="w-10 h-10 rounded-full mx-auto mb-2 bg-gray-800"></div>
                                            <div className="h-3 w-16 bg-gray-800 rounded mx-auto"></div>
                                        </div>
                                    ))
                                ) : (
                                    wantedList.map((target, idx) => (
                                        <div key={idx} className="bg-black/60 p-2 rounded-lg border border-red-900/50 text-center relative overflow-hidden">
                                            <div className="text-xs text-red-400 font-bold mb-1">NO.{idx+1}</div>
                                            <div className={`w-10 h-10 rounded-full mx-auto mb-1 ${target.avatar_color} flex items-center justify-center font-bold overflow-hidden`}>
                                                {target.avatar_image ? <img src={target.avatar_image} className="w-full h-full object-cover"/> : target.name[0]}
                                            </div>
                                            <div className="text-xs text-gray-300 truncate">{target.name}</div>
                                            <div className="text-[10px] text-yellow-500 font-mono mt-1">{target.black_market_coins}</div>
                                            <div className="absolute inset-0 border-2 border-red-600/30 animate-pulse pointer-events-none"></div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="bg-gray-900 border border-gray-700 p-4 rounded-xl mb-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-bold text-white mb-2 flex items-center gap-2"><Activity size={18}/> 玩家列表</h3>
                                <p className="text-xs text-gray-400 leading-relaxed">
                                    載入列表以互動 (不顯示圖片)
                                </p>
                            </div>
                            <button 
                                onClick={loadFullUserList} 
                                disabled={isLoadingUsers}
                                className="bg-blue-900 hover:bg-blue-800 text-blue-100 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors disabled:opacity-50"
                            >
                                <RefreshCw size={12} className={isLoadingUsers ? "animate-spin" : ""}/> {isLoadingUsers ? '載入中' : '刷新列表'}
                            </button>
                        </div>

                        {heistLog.length > 0 && (
                            <div className="bg-black border border-green-900/50 p-3 rounded-lg font-mono text-xs h-32 overflow-y-auto mb-4 text-green-400 space-y-1">
                                {heistLog.map((log, i) => <div key={i}>{'>'} {log}</div>)}
                            </div>
                        )}

                        <div className="space-y-2">
                            {isLoadingUsers ? (
                                [1, 2, 3, 4, 5].map(i => (
                                    <div key={i} className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex justify-between items-center animate-pulse">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-gray-800"></div>
                                            <div>
                                                <div className="h-3 w-20 bg-gray-800 rounded mb-1"></div>
                                                <div className="h-2 w-10 bg-gray-800 rounded"></div>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            ) : userList.length === 0 ? (
                                <div className="text-center py-8 text-gray-500 text-xs">點擊「刷新列表」查看玩家</div>
                            ) : (
                                userList.map(u => {
                                    const isWanted = wantedList.some(w => w.student_id === u.studentId);
                                    return (
                                        <div key={u.studentId} className={`bg-gray-900 p-3 rounded-xl border flex justify-between items-center group transition-colors ${isWanted ? 'border-red-800 bg-red-900/10' : 'border-gray-800 hover:border-blue-900'}`}>
                                            <div className="flex items-center gap-3">
                                                {/* Optimized: Using color only, no image for lists */}
                                                <div className={`w-8 h-8 rounded-full ${u.avatarColor} flex items-center justify-center text-xs font-bold`}>{u.name[0]}</div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-200 flex items-center gap-2">
                                                        {u.isStealth ? 'UNKOWN' : u.name}
                                                        {isWanted && <span className="text-[9px] bg-red-600 text-white px-1.5 rounded animate-pulse">WANTED</span>}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500">Lv.{u.level} • {u.blackMarketCoins} BMC</div>
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
                                                    className={`px-3 py-1 text-xs rounded border transition-colors flex items-center gap-1 ${isWanted ? 'bg-red-900 hover:bg-red-800 text-white border-red-500 shadow-sm shadow-red-900' : 'bg-gray-800 hover:bg-red-900 text-red-400 border-red-900'}`}
                                                >
                                                    {isWanted && <Crosshair size={10}/>} 駭入
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                )}

                {/* --- SHOP TAB --- */}
                {tab === 'SHOP' && (
                    <div className="grid grid-cols-1 gap-3">
                        {isMarketLoading ? (
                            <div className="text-center py-4 text-gray-500 text-xs flex items-center justify-center gap-2">
                                <Loader2 size={14} className="animate-spin"/> 正在同步市場價格...
                            </div>
                        ) : (
                            <>
                                {inflationMultiplier > 1.1 && (
                                    <div className="bg-red-900/30 text-red-400 text-xs p-2 rounded text-center border border-red-900/50">
                                        🔥 通膨警告：物價上漲 {((inflationMultiplier-1)*100).toFixed(0)}%
                                    </div>
                                )}
                                {BLACK_MARKET_ITEMS.map(item => {
                                    const dynamicPrice = getDynamicPrice(item.price, inflationMultiplier);
                                    const canAfford = (user.blackMarketCoins || 0) >= dynamicPrice;
                                    const isOwned = item.category !== 'consumable' && item.tag !== '消耗品' && (user.inventory.includes(item.id) || user.avatarFrame === item.id);
                                    const qty = getQuantity(item.id);
                                    const totalItemPrice = dynamicPrice * qty;
                                    const canAffordTotal = (user.blackMarketCoins || 0) >= totalItemPrice;
                                    const isStackable = item.tag === '消耗品' || item.category === 'consumable';

                                    return (
                                        <div key={item.id} className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex flex-col gap-3 relative overflow-hidden group">
                                            {/* Item Info */}
                                            <div className="flex gap-3 items-center relative z-10">
                                                <div className={`w-12 h-12 rounded-lg ${item.color} flex items-center justify-center shrink-0 shadow-lg`}>
                                                    {item.icon}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <h3 className="font-bold text-gray-200 text-sm">{item.name}</h3>
                                                        {item.tag && <span className="text-[9px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded">{item.tag}</span>}
                                                    </div>
                                                    <p className="text-[10px] text-gray-500 line-clamp-1">{item.description}</p>
                                                    <div className="text-purple-400 font-mono text-xs font-bold mt-1">
                                                        {dynamicPrice} BMC 
                                                        {inflationMultiplier > 1.05 && <span className="text-[9px] text-red-500 ml-1">↑</span>}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Row */}
                                            <div className="flex justify-between items-center gap-4 border-t border-gray-800 pt-3 relative z-10">
                                                {/* Quantity Selector */}
                                                {isStackable ? (
                                                    <div className="flex items-center gap-2 bg-black rounded-lg px-2 py-1 border border-gray-700">
                                                        <button onClick={() => updateQuantity(item.id, -1)} className="text-gray-400 hover:text-white p-1"><Minus size={12}/></button>
                                                        <span className="text-white text-xs font-mono w-4 text-center">{qty}</span>
                                                        <button onClick={() => updateQuantity(item.id, 1)} className="text-gray-400 hover:text-white p-1"><Plus size={12}/></button>
                                                    </div>
                                                ) : (
                                                    <div className="text-xs text-gray-500 font-italic">不可堆疊</div>
                                                )}

                                                <button 
                                                    disabled={!canAffordTotal || (isOwned)}
                                                    onClick={() => handleBuyItem(item)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold flex-1 transition-all ${
                                                        isOwned
                                                            ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                                            : canAffordTotal
                                                                ? 'bg-purple-700 text-white hover:bg-purple-600 shadow-lg shadow-purple-900/50'
                                                                : 'bg-gray-800 text-gray-500 border border-red-900/50 cursor-not-allowed'
                                                    }`}
                                                >
                                                    {isOwned ? '已擁有' : `購買 (${totalItemPrice})`}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </>
                        )}
                    </div>
                )}

                {/* --- GACHA TAB --- */}
                {tab === 'GACHA' && (
                    <div className="flex flex-col items-center justify-center p-4 animate-in fade-in">
                        <div className="w-full max-w-sm bg-gray-900 border-2 border-purple-500/50 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_50px_rgba(168,85,247,0.2)] text-center">
                            
                            {/* Lights */}
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-1 bg-purple-500 blur-sm animate-pulse"></div>

                            <div className="mb-6">
                                <Box size={64} className={`mx-auto text-purple-400 mb-4 ${isGachaRolling ? 'animate-bounce' : ''}`} />
                                <h2 className="text-2xl font-black text-white tracking-widest">加密補給箱</h2>
                                <p className="text-xs text-purple-300 font-bold mt-1">每次抽取消耗 200 BMC</p>
                            </div>

                            {/* Result Display */}
                            <div className="h-24 flex items-center justify-center mb-6">
                                {isGachaRolling ? (
                                    <div className="text-purple-500 animate-spin"><RefreshCw size={32}/></div>
                                ) : gachaResult ? (
                                    <div className="animate-in zoom-in">
                                        <div className={`text-2xl font-black ${gachaResult.color} mb-1`}>{gachaResult.value}</div>
                                        <div className="text-xs text-gray-400">{gachaResult.type}</div>
                                    </div>
                                ) : (
                                    <div className="text-gray-600 text-xs">點擊下方按鈕解密資料</div>
                                )}
                            </div>

                            <button 
                                onClick={handleGacha}
                                disabled={isGachaRolling || (user.blackMarketCoins || 0) < 200}
                                className={`w-full py-4 rounded-xl font-black text-lg transition-all ${
                                    isGachaRolling || (user.blackMarketCoins || 0) < 200
                                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                                    : 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg hover:scale-105 active:scale-95'
                                }`}
                            >
                                {isGachaRolling ? '解密中...' : '開啟補給箱 (200)'}
                            </button>

                            {/* Rules Section */}
                            <div className="mt-6 text-left bg-black/40 p-4 rounded-xl border border-gray-800">
                                <h4 className="text-xs font-bold text-gray-400 mb-2 flex items-center gap-1">
                                    <HelpCircle size={12}/> 機率說明
                                </h4>
                                <ul className="text-[10px] text-gray-500 space-y-1">
                                    <li className="flex justify-between"><span className="text-yellow-500">大獎 (500 BMC)</span> <span>5%</span></li>
                                    <li className="flex justify-between"><span className="text-green-500">中獎 (300 BMC)</span> <span>15%</span></li>
                                    <li className="flex justify-between"><span className="text-blue-500">保本 (200 BMC)</span> <span>30%</span></li>
                                    <li className="flex justify-between"><span className="text-purple-500">道具 (破解晶片)</span> <span>20%</span></li>
                                    <li className="flex justify-between"><span>銘謝惠顧</span> <span>30%</span></li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}

                {/* --- INVENTORY TAB --- */}
                {tab === 'INVENTORY' && (
                    <div className="grid grid-cols-2 gap-3">
                        {myBlackMarketItems.length === 0 ? (
                            <div className="col-span-2 text-center text-gray-500 py-10 text-xs">背包空空如也</div>
                        ) : (
                            // De-duplicate for display, show count
                            Array.from(new Set(myBlackMarketItems)).map((itemId: string, idx) => {
                                const itemDef = BLACK_MARKET_ITEMS.find(i => i.id === itemId);
                                const count = myBlackMarketItems.filter(id => id === itemId).length;
                                
                                if (!itemDef) return null;
                                const isPassive = itemDef.category === 'black_market' && itemDef.tag === '被動';

                                return (
                                    <div key={`${itemId}-${idx}`} className="bg-gray-900 p-3 rounded-xl border border-gray-800 flex flex-col items-center text-center relative group">
                                        {/* Count Badge */}
                                        <div className="absolute top-2 right-2 bg-gray-800 text-gray-300 text-[10px] px-1.5 rounded font-bold border border-gray-700">x{count}</div>
                                        
                                        <div className={`w-10 h-10 rounded-full ${itemDef.color} flex items-center justify-center mb-2`}>
                                            {itemDef.icon}
                                        </div>
                                        <h4 className="font-bold text-gray-300 text-xs mb-1">{itemDef.name}</h4>
                                        
                                        {isPassive ? (
                                            <div className="text-[9px] text-green-500 mt-2 font-bold flex items-center gap-1 bg-green-900/20 px-2 py-1 rounded">
                                                <Shield size={10}/> 自動生效中
                                            </div>
                                        ) : (
                                            <button 
                                                onClick={() => handleUseItem(itemId)}
                                                className="w-full mt-2 bg-gray-800 hover:bg-gray-700 text-gray-300 text-[10px] py-1.5 rounded border border-gray-700 transition-colors"
                                            >
                                                使用
                                            </button>
                                        )}
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