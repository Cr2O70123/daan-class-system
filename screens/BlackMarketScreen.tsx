
import React, { useState, useEffect, useRef } from 'react';
import { 
    ArrowLeft, ShoppingCart, Shield, Skull, Zap, Crown, UserMinus, Volume2, 
    Gem, Activity, Target, Siren, Crosshair, Loader2, RefreshCw, 
    Terminal, Cpu, HardDrive, Wifi, Lock, Unlock, Eye, Database, Server
} from 'lucide-react';
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

// --- CONFIG & DATA ---

// Helper for dynamic pricing
const getDynamicPrice = (base: number, multiplier: number) => Math.ceil(base * multiplier);

const BLACK_MARKET_ITEMS: Product[] = [
    { id: 'chip_basic', name: 'Script Kiddie Kit', price: 15000, currency: 'BMC', color: 'text-blue-400', icon: <Terminal size={20}/>, description: '基礎駭客工具包 (30% 成功率)', category: 'black_market', tag: 'Tool' },
    { id: 'chip_adv', name: 'Zero-Day Exploit', price: 60000, currency: 'BMC', color: 'text-red-500', icon: <Skull size={20}/>, description: '高階滲透漏洞 (60% 成功率)', category: 'black_market', tag: 'Exploit' },
    { id: 'item_firewall', name: 'ICE Firewall', price: 45000, currency: 'BMC', color: 'text-green-400', icon: <Shield size={20}/>, description: '入侵對抗電子系統 (被動防禦)', category: 'black_market', tag: 'Defense' },
    { id: 'item_spy', name: 'Spyware Daemon', price: 120000, currency: 'BMC', color: 'text-purple-400', icon: <Eye size={20}/>, description: '竊取目標詳細資產數據', category: 'black_market', tag: 'Intel' },
    { id: 'item_stealth', name: 'VPN Ghost', price: 350000, currency: 'BMC', color: 'text-slate-400', icon: <UserMinus size={20}/>, description: '從網路雷達中消失 24 小時', category: 'black_market', tag: 'Stealth' },
    { id: 'frame_glitch', name: 'Frame: GLITCH', price: 950000, currency: 'BMC', color: 'text-cyan-400', icon: <Zap size={20}/>, description: '故障藝術動態頭像框', category: 'frame', isRare: true },
    { id: 'title_dark_lord', name: 'Title: OVERLORD', price: 2000000, currency: 'BMC', color: 'text-red-600', icon: <Crown size={20}/>, description: '暗網領主專屬稱號', category: 'cosmetic', isRare: true },
];

// --- STYLES ---
const GLITCH_ANIMATION = `
@keyframes glitch {
  0% { transform: translate(0) }
  20% { transform: translate(-2px, 2px) }
  40% { transform: translate(-2px, -2px) }
  60% { transform: translate(2px, 2px) }
  80% { transform: translate(2px, -2px) }
  100% { transform: translate(0) }
}
@keyframes scanline {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
.glitch-text:hover { animation: glitch 0.3s cubic-bezier(.25, .46, .45, .94) both infinite; }
.scanline {
  position: absolute; top: 0; left: 0; width: 100%; height: 100%;
  background: linear-gradient(to bottom, transparent 50%, rgba(0, 0, 0, 0.5) 51%);
  background-size: 100% 4px; pointer-events: none; z-index: 10;
}
.crt-flicker { animation: opacity 0.1s infinite; }
`;

// --- SUB-COMPONENTS ---

const NavButton = ({ active, icon: Icon, label, onClick }: any) => (
    <button 
        onClick={onClick}
        className={`flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-300 border ${
            active 
            ? 'bg-purple-900/40 border-purple-500 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.4)]' 
            : 'bg-black/40 border-transparent text-gray-600 hover:text-gray-300 hover:border-gray-700'
        }`}
    >
        <Icon size={20} className={active ? 'animate-pulse' : ''} />
        <span className="text-[9px] font-mono mt-1 uppercase tracking-widest">{label}</span>
    </button>
);

// --- MAIN SCREEN ---

export const BlackMarketScreen: React.FC<BlackMarketScreenProps> = ({ user, onBack, onBuy, setUser }) => {
    const [tab, setTab] = useState<'DASHBOARD' | 'NETWORK' | 'SHOP' | 'MINING'>('DASHBOARD');
    
    // Economy State
    const [currentRate, setCurrentRate] = useState(100.0);
    const [rateTrend, setRateTrend] = useState<'UP' | 'DOWN' | 'STABLE'>('STABLE');
    const [inflationMultiplier, setInflationMultiplier] = useState(1.0);
    const [marketLoading, setMarketLoading] = useState(false);
    
    // Dashboard State
    const [exchangeAmount, setExchangeAmount] = useState('');
    const [exchangeMode, setExchangeMode] = useState<'BUY' | 'SELL'>('BUY');

    // Network (Hacking) State
    const [userList, setUserList] = useState<any[]>([]);
    const [userListLoading, setUserListLoading] = useState(false);
    const [hackLog, setHackLog] = useState<string[]>([]);
    const [isHacking, setIsHacking] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    // Mining State
    const [hashRate, setHashRate] = useState(0);
    const [minedCoins, setMinedCoins] = useState(0);
    
    // Gacha State
    const [isDecryping, setIsDecrypting] = useState(false);

    // Initial Load
    useEffect(() => {
        updateEconomy();
    }, []);

    // 1. Economy Logic (Manual Refresh Optimized)
    const updateEconomy = async () => {
        setMarketLoading(true);
        try {
            const stats = await fetchBlackMarketStats().catch(() => ({ totalSupply: 500000 }));
            const total = stats.totalSupply;
            
            // Rate Calculation
            const BASE_RATE = 100;
            const scarcity = 500000 / Math.max(10000, total);
            let rate = BASE_RATE * Math.pow(scarcity, 0.5);
            rate += (Math.random() * 20 - 10); // Noise
            rate = Math.max(10, Math.min(500, rate));

            setCurrentRate(prev => {
                setRateTrend(rate > prev ? 'UP' : rate < prev ? 'DOWN' : 'STABLE');
                return parseFloat(rate.toFixed(1));
            });

            // Inflation for Shop
            setInflationMultiplier(rate < 50 ? (1 + ((50 - rate) / 50)) : 1.0);

        } catch (e) { console.error("Market Offline"); }
        finally { setMarketLoading(false); }
    };

    // 2. User List Logic
    const loadNetwork = async () => {
        setUserListLoading(true);
        try {
            const users = await fetchUserListLite();
            setUserList(users.filter((u: any) => u.studentId !== user.studentId));
        } catch (e) {
            setHackLog(prev => ["> ERROR: Network Unreachable...", ...prev]);
        } finally {
            setUserListLoading(false);
        }
    };

    useEffect(() => {
        if (tab === 'NETWORK') loadNetwork();
    }, [tab]);

    // 3. Exchange Logic
    const handleExchange = async () => {
        if (marketLoading) return;
        const amount = parseInt(exchangeAmount);
        if (isNaN(amount) || amount <= 0) return;

        if (exchangeMode === 'BUY') {
            const cost = Math.ceil(amount * currentRate);
            if (user.points < cost) { alert(`積分不足！需要 ${cost} PT`); return; }
            
            if (confirm(`匯率 ${currentRate.toFixed(1)} | 花費 ${cost} PT 購買 ${amount} BMC?`)) {
                try {
                    const u = { ...user, points: user.points - cost, blackMarketCoins: (user.blackMarketCoins || 0) + amount };
                    await updateUserInDb(u);
                    setUser(u);
                    setExchangeAmount('');
                    alert("交易完成");
                } catch(e) { alert("交易失敗"); }
            }
        } else {
            if ((user.blackMarketCoins || 0) < amount) { alert("BMC 不足"); return; }
            const gain = Math.floor(amount * currentRate * 0.85); // 15% Fee
            
            if (confirm(`匯率 ${currentRate.toFixed(1)} | 出售 ${amount} BMC | 獲得 ${gain} PT (含手續費)?`)) {
                try {
                    const u = { ...user, points: user.points + gain, blackMarketCoins: (user.blackMarketCoins || 0) - amount };
                    await updateUserInDb(u);
                    setUser(u);
                    setExchangeAmount('');
                    alert("交易完成");
                } catch(e) { alert("交易失敗"); }
            }
        }
    };

    // 4. Mining Logic (Clicker)
    const handleMineClick = () => {
        const gain = Math.floor(Math.random() * 3) + 1;
        setMinedCoins(prev => prev + gain);
        setHashRate(Math.floor(Math.random() * 50) + 50);
        setTimeout(() => setHashRate(0), 500);
    };

    const claimMined = async () => {
        if (minedCoins <= 0) return;
        try {
            const u = { ...user, blackMarketCoins: (user.blackMarketCoins || 0) + minedCoins };
            await updateUserInDb(u);
            setUser(u);
            setMinedCoins(0);
            alert(`成功提取 ${minedCoins} BMC`);
        } catch(e) { alert("提取失敗"); }
    };

    // 5. Hacking Logic
    const handleHack = async (target: any) => {
        if (isHacking) return;
        
        // Tool Check
        const hasTool = user.inventory.includes('chip_basic') || user.inventory.includes('chip_adv');
        if (!hasTool) {
            setHackLog(prev => ["> ERROR: No exploit kit found.", ...prev]);
            return;
        }

        if (!confirm(`對 ${target.name} 發動攻擊？(可能消耗晶片)`)) return;

        setIsHacking(true);
        setHackLog(prev => [`> Initializing attack on ${target.name}...`, ...prev]);

        // Simulated Delay
        setTimeout(async () => {
            const toolType = user.inventory.includes('chip_adv') ? 'ADV' : 'BASIC';
            const successRate = toolType === 'ADV' ? 0.6 : 0.3;
            const roll = Math.random();
            const consume = Math.random() < 0.5;

            // Consume Tool Logic
            let newInv = [...user.inventory];
            if (consume) {
                const idx = newInv.indexOf(toolType === 'ADV' ? 'chip_adv' : 'chip_basic');
                if (idx > -1) newInv.splice(idx, 1);
                setHackLog(prev => ["> ALERT: Exploit kit burned.", ...prev]);
            }

            // Firewall Logic
            if (target.inventory && target.inventory.includes('item_firewall')) {
                setHackLog(prev => ["> WARNING: ICE Firewall detected!", ...prev]);
                if (Math.random() < 0.8) { // 80% chance firewall blocks
                    setHackLog(prev => ["> FAILURE: Connection terminated by ICE.", ...prev]);
                    await finishHack(newInv);
                    return;
                }
            }

            if (roll < successRate) {
                const steal = Math.floor((target.blackMarketCoins || 0) * 0.05); // 5%
                if (steal > 0) {
                    try {
                        await transferBlackCoins(target.studentId, user.studentId, steal);
                        const u = { ...user, inventory: newInv, blackMarketCoins: (user.blackMarketCoins || 0) + steal };
                        await updateUserInDb(u);
                        setUser(u);
                        setHackLog(prev => [`> SUCCESS: ${steal} BMC transferred.`, ...prev]);
                        createNotification(target.studentId, 'system', 'SECURITY ALERT', `你的帳戶遭 ${user.name} 入侵，損失 ${steal} BMC`);
                    } catch(e) {
                        setHackLog(prev => ["> ERROR: Transaction failed.", ...prev]);
                    }
                } else {
                    setHackLog(prev => ["> INFO: Target wallet empty.", ...prev]);
                    await finishHack(newInv);
                }
            } else {
                setHackLog(prev => ["> FAILURE: Access denied.", ...prev]);
                await finishHack(newInv);
            }
            
            setIsHacking(false);
        }, 2000);
    };

    const finishHack = async (inv: string[]) => {
        const u = { ...user, inventory: inv };
        await updateUserInDb(u);
        setUser(u);
        setIsHacking(false);
    };

    // 6. Gacha Logic (Decryption)
    const handleDecrypt = async () => {
        const COST = 5000;
        if ((user.blackMarketCoins || 0) < COST) { alert("BMC 不足"); return; }
        
        setIsDecrypting(true);
        setTimeout(async () => {
            const u = { ...user, blackMarketCoins: (user.blackMarketCoins || 0) - COST };
            
            // Drop Logic
            const rand = Math.random();
            let msg = "";
            if (rand < 0.05) { // 5% Rare
                u.blackMarketCoins += 20000;
                msg = "CRITICAL SUCCESS: Encrypted Wallet Found (+20,000 BMC)";
            } else if (rand < 0.2) { // 15% Tool
                u.inventory = [...u.inventory, 'chip_basic'];
                msg = "SUCCESS: Exploit Kit Found";
            } else if (rand < 0.5) { // 30% Small
                u.blackMarketCoins += 6000;
                msg = "SUCCESS: Small Cache (+6,000 BMC)";
            } else {
                msg = "FAILURE: Data Corrupted";
            }

            try {
                await updateUserInDb(u);
                setUser(u);
                alert(msg);
            } catch(e) {}
            setIsDecrypting(false);
        }, 2000);
    };

    // --- RENDER ---
    return (
        <div className="fixed inset-0 z-50 bg-black text-green-500 font-mono flex flex-col overflow-hidden">
            <style>{GLITCH_ANIMATION}</style>
            
            {/* CRT Effects */}
            <div className="scanline"></div>
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle,rgba(32,32,32,0)_60%,rgba(0,0,0,0.8)_100%)] z-20"></div>

            {/* Header */}
            <div className="p-4 pt-safe flex justify-between items-center bg-black/80 border-b border-green-900/50 z-30 backdrop-blur-sm">
                <button onClick={onBack} className="p-2 hover:bg-green-900/30 rounded border border-transparent hover:border-green-800 transition-colors">
                    <ArrowLeft size={20} />
                </button>
                <div className="flex flex-col items-center">
                    <h1 className="text-xl font-black tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-600 glitch-text">
                        BLACK_MARKET v2.0
                    </h1>
                    <div className="flex items-center gap-2 text-[10px] text-green-700">
                        <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                        SECURE CONNECTION // {user.blackMarketCoins || 0} BMC
                    </div>
                </div>
                <button 
                    onClick={updateEconomy} 
                    className="p-2 hover:bg-green-900/30 rounded border border-transparent hover:border-green-800 transition-colors"
                    disabled={marketLoading}
                >
                    <RefreshCw size={18} className={marketLoading ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                
                {/* Background Grid */}
                <div className="absolute inset-0 opacity-10 pointer-events-none" 
                     style={{backgroundImage: 'linear-gradient(0deg, transparent 24%, rgba(0, 255, 0, .3) 25%, rgba(0, 255, 0, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .3) 75%, rgba(0, 255, 0, .3) 76%, transparent 77%, transparent), linear-gradient(90deg, transparent 24%, rgba(0, 255, 0, .3) 25%, rgba(0, 255, 0, .3) 26%, transparent 27%, transparent 74%, rgba(0, 255, 0, .3) 75%, rgba(0, 255, 0, .3) 76%, transparent 77%, transparent)', backgroundSize: '50px 50px'}}>
                </div>

                <div className="flex-1 overflow-y-auto p-4 z-10 space-y-6">
                    
                    {/* DASHBOARD TAB */}
                    {tab === 'DASHBOARD' && (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                            {/* Exchange Card */}
                            <div className="bg-black/60 border border-green-800/50 p-6 rounded-lg relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                                    <Activity size={64} />
                                </div>
                                <h2 className="text-sm font-bold text-green-600 mb-1 uppercase tracking-widest">Exchange Rate</h2>
                                <div className="text-4xl font-black text-white mb-4 font-mono flex items-end gap-2">
                                    {currentRate.toFixed(1)} <span className="text-xs text-gray-500 mb-1">PT/BMC</span>
                                    <span className={`text-xs px-2 py-0.5 rounded ${rateTrend === 'UP' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'}`}>
                                        {rateTrend}
                                    </span>
                                </div>
                                
                                <div className="flex gap-2 mb-4 bg-gray-900/50 p-1 rounded">
                                    <button onClick={() => setExchangeMode('BUY')} className={`flex-1 py-2 text-xs font-bold rounded ${exchangeMode==='BUY' ? 'bg-green-700 text-white' : 'text-gray-500'}`}>BUY</button>
                                    <button onClick={() => setExchangeMode('SELL')} className={`flex-1 py-2 text-xs font-bold rounded ${exchangeMode==='SELL' ? 'bg-red-700 text-white' : 'text-gray-500'}`}>SELL</button>
                                </div>
                                
                                <div className="flex gap-2">
                                    <input 
                                        type="number" 
                                        value={exchangeAmount}
                                        onChange={e => setExchangeAmount(e.target.value)}
                                        placeholder="AMOUNT"
                                        className="flex-1 bg-black border border-green-900 text-green-400 px-4 py-2 rounded outline-none focus:border-green-500 font-mono"
                                    />
                                    <button 
                                        onClick={handleExchange}
                                        className="px-6 py-2 bg-green-900/50 border border-green-600 text-green-400 rounded hover:bg-green-800 transition-colors font-bold"
                                    >
                                        EXECUTE
                                    </button>
                                </div>
                            </div>

                            {/* Gacha / Decrypt */}
                            <div className="bg-black/60 border border-purple-900/50 p-6 rounded-lg relative overflow-hidden">
                                <div className="flex justify-between items-center mb-4">
                                    <div>
                                        <h2 className="text-sm font-bold text-purple-500 uppercase tracking-widest">Data Decryption</h2>
                                        <p className="text-xs text-gray-500">Crack encrypted files for loot.</p>
                                    </div>
                                    <Database size={24} className="text-purple-600" />
                                </div>
                                <button 
                                    onClick={handleDecrypt}
                                    disabled={isDecryping}
                                    className="w-full py-4 bg-purple-900/20 border border-purple-600 text-purple-400 rounded font-mono hover:bg-purple-900/40 transition-all flex items-center justify-center gap-2"
                                >
                                    {isDecryping ? <Loader2 className="animate-spin"/> : <Lock size={16}/>}
                                    {isDecryping ? 'DECRYPTING...' : 'DECRYPT PACKET (5000 BMC)'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* NETWORK TAB (Hacking) */}
                    {tab === 'NETWORK' && (
                        <div className="h-full flex flex-col">
                            <div className="bg-black border border-green-800 p-2 mb-4 flex gap-2">
                                <span className="text-green-600 font-bold">{'>'}</span>
                                <input 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="bg-transparent outline-none text-green-400 flex-1 font-mono text-sm"
                                    placeholder="SEARCH_TARGET_ID..."
                                />
                            </div>

                            {/* Log Console */}
                            <div className="h-32 bg-black/80 border border-green-900/50 p-2 font-mono text-[10px] text-green-600 overflow-y-auto mb-4 font-bold rounded">
                                {hackLog.length === 0 && <div className="opacity-50">System Ready. Waiting for input...</div>}
                                {hackLog.map((log, i) => (
                                    <div key={i} className="mb-1">{log}</div>
                                ))}
                            </div>

                            {/* Target List */}
                            <div className="flex-1 overflow-y-auto space-y-2">
                                {userListLoading ? (
                                    <div className="text-center py-10 text-green-800 animate-pulse">SCANNING NETWORK...</div>
                                ) : (
                                    userList
                                    .filter(u => u.name.toLowerCase().includes(searchTerm.toLowerCase()) || u.studentId.includes(searchTerm))
                                    .map(u => (
                                        <div key={u.studentId} className="flex justify-between items-center p-3 border border-green-900/30 bg-black/40 hover:bg-green-900/10 transition-colors rounded">
                                            <div>
                                                <div className="font-bold text-green-400 text-sm flex items-center gap-2">
                                                    {u.isStealth ? 'UNKNOWN_USER' : u.name}
                                                    {u.inventory && u.inventory.includes('item_firewall') && <Shield size={10} className="text-yellow-500"/>}
                                                </div>
                                                <div className="text-[10px] text-gray-600 font-mono">ID: {u.studentId.substring(0,4)}** | LVL: {u.level}</div>
                                            </div>
                                            <div className="flex items-center gap-2 text-right">
                                                <div className="text-xs font-mono text-green-700">{u.blackMarketCoins} BMC</div>
                                                <button 
                                                    onClick={() => handleHack(u)}
                                                    disabled={isHacking}
                                                    className="p-2 bg-red-900/20 text-red-500 border border-red-900/50 hover:bg-red-900/40 rounded transition-colors"
                                                >
                                                    <Crosshair size={16}/>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    )}

                    {/* SHOP TAB */}
                    {tab === 'SHOP' && (
                        <div className="grid grid-cols-1 gap-4">
                            {BLACK_MARKET_ITEMS.map(item => {
                                const price = getDynamicPrice(item.price, inflationMultiplier);
                                return (
                                    <div key={item.id} className="flex gap-4 p-4 border border-green-900/30 bg-black/40 rounded hover:border-green-500/50 transition-all group">
                                        <div className={`w-12 h-12 flex items-center justify-center border border-gray-800 rounded bg-gray-900 ${item.color}`}>
                                            {item.icon}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-bold text-gray-200 text-sm">{item.name}</h3>
                                                <span className="text-[10px] bg-gray-800 text-gray-400 px-1 rounded border border-gray-700">{item.tag}</span>
                                            </div>
                                            <p className="text-[10px] text-gray-500 my-1">{item.description}</p>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-green-500 font-mono text-xs font-bold">{price.toLocaleString()} BMC</span>
                                                <button 
                                                    onClick={() => {
                                                        if ((user.blackMarketCoins || 0) >= price) {
                                                            if (confirm(`Buy ${item.name}?`)) onBuy({...item, price});
                                                        } else { alert("Insufficient Funds"); }
                                                    }}
                                                    className="px-3 py-1 bg-green-900/30 text-green-400 text-xs border border-green-800 hover:bg-green-800 hover:text-white transition-colors"
                                                >
                                                    PURCHASE
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* MINING TAB (Clicker) */}
                    {tab === 'MINING' && (
                        <div className="flex flex-col items-center justify-center h-full space-y-8 animate-in zoom-in">
                            <div className="text-center">
                                <h2 className="text-2xl font-black text-white tracking-widest mb-1">HASH CRACKER</h2>
                                <p className="text-xs text-gray-500 font-mono">Tap to generate hashes</p>
                            </div>

                            <div 
                                className="w-48 h-48 rounded-full border-4 border-green-900 bg-black flex items-center justify-center relative cursor-pointer active:scale-95 transition-transform shadow-[0_0_50px_rgba(34,197,94,0.1)] hover:shadow-[0_0_80px_rgba(34,197,94,0.3)] group"
                                onClick={handleMineClick}
                            >
                                <Cpu size={64} className="text-green-700 group-hover:text-green-400 transition-colors" />
                                {hashRate > 0 && (
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className="text-green-400 font-bold animate-ping text-xl">+{Math.floor(hashRate/10)}</span>
                                    </div>
                                )}
                            </div>

                            <div className="w-full max-w-xs bg-gray-900/50 p-4 rounded border border-gray-800 text-center">
                                <div className="flex justify-between text-xs text-gray-500 font-mono mb-2">
                                    <span>HASH RATE</span>
                                    <span>{hashRate} H/s</span>
                                </div>
                                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                    <div className="h-full bg-green-600 transition-all duration-300" style={{width: `${Math.min(100, hashRate)}%`}}></div>
                                </div>
                                <div className="mt-4 pt-4 border-t border-gray-800">
                                    <div className="text-3xl font-black text-white font-mono mb-2">{minedCoins} <span className="text-sm text-green-600">BMC</span></div>
                                    <button 
                                        onClick={claimMined}
                                        disabled={minedCoins === 0}
                                        className="w-full py-3 bg-green-700 hover:bg-green-600 text-white font-bold rounded disabled:opacity-50 disabled:bg-gray-800 transition-colors"
                                    >
                                        TRANSFER TO WALLET
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* Bottom Nav */}
            <div className="bg-black border-t border-green-900/30 p-2 flex justify-around items-center z-30 pb-safe">
                <NavButton active={tab === 'DASHBOARD'} icon={Activity} label="Dash" onClick={() => setTab('DASHBOARD')} />
                <NavButton active={tab === 'NETWORK'} icon={Wifi} label="Net" onClick={() => setTab('NETWORK')} />
                <NavButton active={tab === 'SHOP'} icon={ShoppingCart} label="Shop" onClick={() => setTab('SHOP')} />
                <NavButton active={tab === 'MINING'} icon={HardDrive} label="Mine" onClick={() => setTab('MINING')} />
            </div>
        </div>
    );
};
