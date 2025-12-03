
import React, { useState, useEffect, Suspense, useRef } from 'react';
import { BottomNav } from './components/BottomNav';
import { LoginScreen } from './screens/LoginScreen';
import { HomeScreen } from './screens/HomeScreen';
import { AskScreen } from './screens/AskScreen';
import { LeaderboardScreen } from './screens/LeaderboardScreen';
import { ProfileScreen } from './screens/ProfileScreen';
import { ModerationScreen } from './screens/ModerationScreen';
import { ShopScreen } from './screens/ShopScreen';
import { QuestionDetailScreen } from './screens/QuestionDetailScreen';
import { ResourceScreen } from './screens/ResourceScreen';
import { ResourceDetailScreen } from './screens/ResourceDetailScreen';
import { ExamScreen } from './screens/ExamScreen';
import { PlaygroundScreen } from './screens/PlaygroundScreen';
import { NotificationScreen } from './screens/NotificationScreen';
import { CheckInModal } from './components/CheckInModal';
import { UpdateAnnouncementModal } from './components/UpdateAnnouncementModal';
import { AiTutorScreen } from './screens/AiTutorScreen';

import { Tab, User, Question, Report, Product, Resource, Exam, GameResult, Notification, PkResult, PkGameMode } from './types';
import { RefreshCw, X, Bell, Cone, AlertTriangle, Loader2, Users, Clock, Server, CheckCircle2 } from 'lucide-react';

// Services
import { calculateLevel } from './services/levelService';
import { login, updateUserInDb, checkSession, logout } from './services/authService';
import { 
    fetchQuestions, createQuestion, deleteQuestion, createReply, deleteReply, markBestAnswer, 
    fetchResources, createResource, deleteResource, updateResourceLikes,
    fetchExams, createExam, deleteExam, banUser, unbanUser
} from './services/dataService';
import { fetchNotifications } from './services/notificationService';
import { supabase } from './services/supabaseClient';
import { WORD_DATABASE } from './services/mockData';

// --- Lazy Load Features (Code Splitting) ---
const WordChallengeScreen = React.lazy(() => import('./screens/WordChallengeScreen').then(module => ({ default: module.WordChallengeScreen })));
const ResistorGameScreen = React.lazy(() => import('./screens/ResistorGameScreen').then(module => ({ default: module.ResistorGameScreen })));
const BlockBlastScreen = React.lazy(() => import('./screens/BlockBlastScreen').then(module => ({ default: module.BlockBlastScreen })));
const LuckyWheelScreen = React.lazy(() => import('./screens/LuckyWheelScreen').then(module => ({ default: module.LuckyWheelScreen })));
const PkGameScreen = React.lazy(() => import('./screens/PkGameScreen').then(module => ({ default: module.PkGameScreen })));
const VocabPracticeScreen = React.lazy(() => import('./screens/VocabPracticeScreen').then(module => ({ default: module.VocabPracticeScreen })));
const DrawGuessScreen = React.lazy(() => import('./screens/DrawGuessScreen').then(module => ({ default: module.DrawGuessScreen })));
const HighLowGameScreen = React.lazy(() => import('./screens/HighLowGameScreen').then(module => ({ default: module.HighLowGameScreen })));
const BaseConverterScreen = React.lazy(() => import('./screens/BaseConverterScreen').then(module => ({ default: module.BaseConverterScreen })));
const BlackMarketScreen = React.lazy(() => import('./screens/BlackMarketScreen').then(module => ({ default: module.BlackMarketScreen })));
const SlotMachineScreen = React.lazy(() => import('./screens/SlotMachineScreen').then(module => ({ default: module.SlotMachineScreen })));
const RussianRouletteScreen = React.lazy(() => import('./screens/RussianRouletteScreen').then(module => ({ default: module.RussianRouletteScreen })));
const XiangqiScreen = React.lazy(() => import('./screens/XiangqiScreen').then(module => ({ default: module.XiangqiScreen })));
const GomokuScreen = React.lazy(() => import('./screens/GomokuScreen').then(module => ({ default: module.GomokuScreen })));
const OthelloScreen = React.lazy(() => import('./screens/OthelloScreen').then(module => ({ default: module.OthelloScreen })));
const CrashGameScreen = React.lazy(() => import('./screens/CrashGameScreen').then(module => ({ default: module.CrashGameScreen })));
const ConnectFourScreen = React.lazy(() => import('./screens/ConnectFourScreen').then(module => ({ default: module.ConnectFourScreen })));
const MemoryGameScreen = React.lazy(() => import('./screens/MemoryGameScreen').then(module => ({ default: module.MemoryGameScreen })));

// Helper to get frame styles
const getFrameStyle = (frameId?: string) => {
    switch(frameId) {
      case 'frame_gold': return 'ring-2 ring-yellow-400 shadow-[0_0_8px_rgba(250,204,21,0.6)]';
      case 'frame_neon': return 'ring-2 ring-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.6)]';
      case 'frame_fire': return 'ring-2 ring-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.6)]';
      case 'frame_pixel': return 'ring-2 ring-purple-500 border-2 border-dashed border-white';
      case 'frame_beta': return 'ring-2 ring-amber-500 border-2 border-dashed border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      case 'frame_cyber': return 'ring-2 ring-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] border border-blue-300';
      case 'frame_angel': return 'ring-2 ring-white shadow-[0_0_15px_rgba(255,255,255,0.8)] border-2 border-yellow-100';
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
};

const MAX_POINT_GAIN_PER_ACTION = 500;

// Maintenance Screen
const MaintenanceScreen = () => (
    <div className="fixed inset-0 z-[999] bg-gray-900 flex flex-col items-center justify-center text-white p-6 text-center">
        <div className="w-32 h-32 bg-yellow-500/20 rounded-full flex items-center justify-center mb-8 animate-pulse">
            <Cone size={64} className="text-yellow-500" />
        </div>
        <h1 className="text-4xl font-black mb-4 tracking-wider">系統維護中</h1>
        <div className="bg-gray-800 p-4 rounded-xl border border-gray-700 max-w-sm w-full">
            <div className="flex items-center gap-2 text-yellow-400 font-bold mb-2 justify-center">
                <AlertTriangle size={20} />
                <span>工程進行中</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed">
                系統正在進行安全性升級與資料庫優化。<br/>
                請稍後再嘗試登入。
            </p>
        </div>
        <div className="mt-8 text-xs text-gray-600 font-mono">
            Error Code: 503 Service Unavailable
        </div>
    </div>
);

// Enhanced Login Queue Overlay
const LoginQueueOverlay = ({ position, onCancel }: { position: number, onCancel: () => void }) => {
    const peopleAhead = Math.max(0, position - 1);
    
    // Simulate estimated wait time based on position
    // Add randomness to make it feel real (sometimes stalls)
    const estMinutes = Math.floor((position * 2) / 60);
    const estSeconds = (position * 2) % 60;
    
    const formattedTime = estMinutes > 0 ? `${estMinutes}分 ${estSeconds}秒` : `${estSeconds} 秒`;

    return (
        <div className="fixed inset-0 z-[999] bg-[#0f172a] flex flex-col items-center justify-center text-white p-6 text-center animate-in fade-in duration-500">
            {/* Server Status Header */}
            <div className="absolute top-8 left-0 right-0 flex justify-center">
                <div className="bg-slate-800/80 backdrop-blur px-4 py-1.5 rounded-full flex items-center gap-2 text-xs font-mono border border-slate-700">
                    <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse"></div>
                    <span className="text-slate-400">SERVER LOAD: <span className="text-yellow-400 font-bold">HIGH (98%)</span></span>
                </div>
            </div>

            <div className="relative mb-10">
                <div className="w-32 h-32 bg-blue-500/10 rounded-full flex items-center justify-center border border-blue-500/30 shadow-[0_0_50px_rgba(59,130,246,0.2)] relative overflow-hidden">
                    <div className="absolute inset-0 bg-blue-500/10 animate-ping rounded-full" style={{animationDuration: '3s'}}></div>
                    <Server size={48} className="text-blue-400 relative z-10" />
                </div>
                {/* Connecting lines decoration */}
                <div className="absolute -left-12 top-1/2 w-12 h-[1px] bg-gradient-to-r from-transparent to-blue-500/50"></div>
                <div className="absolute -right-12 top-1/2 w-12 h-[1px] bg-gradient-to-l from-transparent to-blue-500/50"></div>
            </div>
            
            <h1 className="text-3xl font-black mb-2 tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                正在排隊進入
            </h1>
            <p className="text-slate-400 text-sm mb-8 font-medium">目前伺服器滿載，請勿關閉視窗...</p>
            
            <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-3xl border border-slate-700 w-full max-w-xs shadow-2xl relative overflow-hidden">
                {/* Progress Bar Background */}
                <div className="absolute top-0 left-0 h-1 bg-blue-500 animate-[loading_2s_ease-in-out_infinite]" style={{width: '30%'}}></div>
                <style>{`@keyframes loading { 0% { left: -30%; } 100% { left: 130%; } }`}</style>
                
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="text-left p-3 bg-slate-900/50 rounded-xl">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">Queue Position</div>
                        <div className="text-3xl font-mono font-black text-white">#{position}</div>
                    </div>
                    <div className="text-right p-3 bg-slate-900/50 rounded-xl">
                        <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mb-1">People Ahead</div>
                        <div className="text-3xl font-mono font-black text-blue-500">{peopleAhead}</div>
                    </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-xs text-slate-400 bg-slate-900/80 py-2 rounded-lg border border-slate-700/50">
                    <Clock size={14} className="text-blue-400 animate-pulse" /> 
                    <span>預估等待: <span className="text-white font-bold font-mono">{formattedTime}</span></span>
                </div>
            </div>

            <button 
                onClick={onCancel}
                className="mt-12 text-slate-500 hover:text-white text-sm font-bold flex items-center gap-2 transition-colors px-6 py-3 rounded-full hover:bg-white/5 border border-transparent hover:border-slate-700"
            >
                <X size={18} /> 取消排隊
            </button>
        </div>
    );
};

// Header Component
const Header = ({ user, onOpenNotifications, unreadCount }: { user: User, onOpenNotifications: () => void, unreadCount: number }) => {
    const xp = user.points;
    const progress = (xp % 500) / 5; 

    return (
        <div className="bg-white dark:bg-gray-800 px-4 pb-2 pt-safe sticky top-0 z-20 shadow-sm flex justify-between items-center transition-colors">
            <div className="flex flex-col">
                <h1 className="text-lg font-bold text-gray-800 dark:text-white tracking-wide">電子三乙功課系統</h1>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-[10px] px-1.5 py-0.5 rounded font-bold">
                        Lv.{user.level}
                    </span>
                    <div className="h-1.5 w-20 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                            className="h-full bg-blue-500 rounded-full" 
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>
            </div>
            
            <div className="flex items-center space-x-3">
                <button 
                    onClick={onOpenNotifications}
                    className="relative p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                >
                    <Bell size={20} className="text-gray-600 dark:text-gray-300" />
                    {unreadCount > 0 && (
                        <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                    )}
                </button>

                <div className="flex items-center space-x-2">
                    <span className="bg-yellow-50 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 border border-yellow-100 dark:border-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full">
                        {user.points} PT
                    </span>
                    <div className={`w-9 h-9 rounded-full ${user.avatarColor} flex items-center justify-center text-white font-bold shadow-sm overflow-hidden ${getFrameStyle(user.avatarFrame)}`}>
                        {user.avatarImage ? (
                            <img src={user.avatarImage} alt="avatar" className="w-full h-full object-cover" />
                        ) : (
                            user.name.charAt(0) || 'U'
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

// --- Loading Component for Suspense ---
const LoadingFallback = () => (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Loader2 className="animate-spin text-blue-500" size={32} />
    </div>
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.HOME);
  const [isLoading, setIsLoading] = useState(true);
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);
  
  // Queue System State
  const [queuePosition, setQueuePosition] = useState<number | null>(null);
  const queueIntervalRef = useRef<number | null>(null);
  const targetUserRef = useRef<User | null>(null); // Store user while queuing
  
  // Data States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // UI States
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showLeaderboardOverlay, setShowLeaderboardOverlay] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(true);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showNotificationScreen, setShowNotificationScreen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // --- UNIFIED FEATURE STATE (The Key Optimization) ---
  type ActiveFeature = { id: string; params?: any } | null;
  const [activeFeature, setActiveFeature] = useState<ActiveFeature>(null);

  // --- Maintenance Check ---
  useEffect(() => {
      const checkMaintenance = async () => {
          const { data } = await supabase
              .from('notifications')
              .select('*')
              .eq('type', 'system')
              .eq('title', 'MAINTENANCE_MODE')
              .eq('content', 'ON')
              .limit(1);
          
          if (data && data.length > 0) setIsMaintenanceMode(true);
          else setIsMaintenanceMode(false);
      };

      checkMaintenance();

      const channel = supabase.channel('maintenance_channel')
          .on('broadcast', { event: 'MAINTENANCE_TRIGGER' }, ({ payload }) => {
              setIsMaintenanceMode(payload.status === 'ON');
          })
          .subscribe();

      return () => { supabase.removeChannel(channel); };
  }, []);

  // --- Queue Logic ---
  const startQueue = (targetUser: User) => {
      // Simulate server load check
      // 50% chance to enter queue if not admin, to simulate traffic for demo
      const isServerBusy = Math.random() > 0.5 && !targetUser.isAdmin;
      
      if (isServerBusy) {
          // Assign random queue position (e.g. 50 to 150 to feel REAL)
          const pos = Math.floor(Math.random() * 100) + 50;
          setQueuePosition(pos);
          targetUserRef.current = targetUser;
          
          // Start variable countdown (Real queue simulation)
          // Speed depends on position: faster when far, slower when close
          if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
          
          const processQueue = () => {
              setQueuePosition(prev => {
                  if (prev === null) return null;
                  
                  // If finished
                  if (prev <= 1) {
                      if (queueIntervalRef.current) clearInterval(queueIntervalRef.current);
                      setUser(targetUserRef.current); // Login Success
                      return null;
                  }

                  // Non-linear decrement logic
                  // Sometimes stick (0 drop), sometimes fast drop (3-5), usually small drop (1-2)
                  const rand = Math.random();
                  let drop = 1;
                  
                  if (rand > 0.9) drop = 0; // Stalled
                  else if (rand > 0.7) drop = Math.floor(Math.random() * 4) + 2; // Fast batch
                  else drop = Math.floor(Math.random() * 2) + 1; // Normal

                  return Math.max(1, prev - drop);
              });
              
              // Variable interval for next tick (0.5s to 2s) to feel organic
              const nextTick = Math.random() * 1500 + 500;
              queueIntervalRef.current = window.setTimeout(processQueue, nextTick);
          };
          
          processQueue(); // Start loop

      } else {
          // No queue needed
          setUser(targetUser);
      }
  };

  const cancelQueue = () => {
      if (queueIntervalRef.current) clearTimeout(queueIntervalRef.current);
      setQueuePosition(null);
      targetUserRef.current = null;
      // Effectively cancels login process, stay on login screen
  };

  const handleTabChange = (newTab: Tab) => {
      // Reset all overlays when changing tabs
      setActiveFeature(null);
      setShowLeaderboardOverlay(false);
      setSelectedQuestion(null);
      setSelectedResource(null);
      setShowModeration(false);
      setShowCheckInModal(false);
      setShowNotificationScreen(false);
      
      setCurrentTab(newTab);
  };

  const handleCloseFeature = () => {
      setActiveFeature(null);
  };

  const alertMaintenance = () => {
      alert("系統正在進行安全性維護，相關功能暫時關閉。");
  };

  // --- Generic Navigation Handler ---
  const handleNavigateToFeature = (featureId: string, params?: any) => {
      if (isMaintenanceMode && featureId !== 'base_converter' && featureId !== 'xiangqi') {
          alertMaintenance();
          return;
      }
      pushHistory();
      setActiveFeature({ id: featureId, params });
  };

  // History Management for Back Button support
  useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
          if (lightboxImage) { setLightboxImage(null); return; }
          if (showCheckInModal) { setShowCheckInModal(false); return; }
          if (showNotificationScreen) { setShowNotificationScreen(false); return; }
          if (activeFeature) { setActiveFeature(null); return; }
          if (selectedQuestion) { setSelectedQuestion(null); return; }
          if (selectedResource) { setSelectedResource(null); return; }
          if (showLeaderboardOverlay) { setShowLeaderboardOverlay(false); return; }
          if (showModeration) { setShowModeration(false); return; }
          if (currentTab !== Tab.HOME) { setCurrentTab(Tab.HOME); return; }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [lightboxImage, showCheckInModal, showNotificationScreen, activeFeature, selectedQuestion, selectedResource, showLeaderboardOverlay, showModeration, currentTab]);

  const pushHistory = () => {
      window.history.pushState({ overlay: true }, '');
  };

  useEffect(() => {
    const initSession = async () => {
        try {
            const sessionUser = await checkSession();
            if (sessionUser) {
                // If session exists, skip queue for UX (or implement reduced queue)
                setUser(sessionUser);
                checkDailyReset(sessionUser);
                refreshNotifications(sessionUser.studentId);
            }
        } catch (e) {
            console.error("Session check failed", e);
        } finally {
            setIsLoading(false);
        }
    };
    initSession();
    loadData();
  }, []);

    useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.studentId}` },
        (payload) => { setUnreadNotifications(prev => prev + 1); }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
      if (user?.settings?.darkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [user?.settings?.darkMode]);

  const refreshNotifications = async (studentId: string) => {
      try {
          const notifs = await fetchNotifications(studentId);
          setUnreadNotifications(notifs.filter(n => !n.isRead).length);
      } catch (e) {}
  };

  const checkDailyReset = async (currentUser: User) => {
    const today = new Date().toDateString();
    if (currentUser.lastDailyReset !== today) {
        const updatedUser = { 
            ...currentUser, 
            dailyPlays: 0, 
            lastDailyReset: today, 
            dailyWheelSpins: 0, 
            lastWheelDate: today 
        };
        try { await updateUserInDb(updatedUser); setUser(updatedUser); } catch(e) {}
    }
  };

  const handleCheckIn = async () => {
    if (isMaintenanceMode) { alert("維護中"); return; }
    if (!user) return;
    const today = new Date().toDateString();
    const lastDate = user.lastCheckInDate;
    if (lastDate === today) return;

    let newStreak = user.checkInStreak || 0;
    if (lastDate) {
        const diffDays = (new Date(today).getTime() - new Date(lastDate).getTime()) / (1000 * 3600 * 24);
        if (diffDays === 1) newStreak += 1;
        else newStreak = 1;
    } else {
        newStreak = 1;
    }
    
    let reward = newStreak % 7 === 0 ? 100 : 20;
    const newPoints = user.points + reward;

    const updatedUser: User = {
        ...user, points: newPoints, level: calculateLevel(newPoints),
        lastCheckInDate: today, checkInStreak: newStreak
    };
    try { await updateUserInDb(updatedUser); setUser(updatedUser); } catch (e) { alert("簽到失敗"); }
  };

  const loadData = async () => {
    try {
        const [qData, rData, eData] = await Promise.all([
            fetchQuestions(), fetchResources(), fetchExams()
        ]);
        setQuestions(qData); setResources(rData); setExams(eData);
    } catch (e) {}
  };

  const handleLogin = async (name: string, studentId: string) => {
    try {
        const loggedUser = await login(name, studentId);
        // Trigger Queue Check
        startQueue(loggedUser);
        if (loggedUser) checkDailyReset(loggedUser);
    } catch (error: any) { alert("登入失敗: " + error.message); }
  };

  const handlePostQuestion = async (q: any, isAnonymous: boolean) => {
      if (!user) return;
      try {
        if (isAnonymous) {
            const cardIndex = user.inventory.indexOf('card_anon');
            if (cardIndex === -1) { alert("沒有匿名卡！"); return; }
            const newInventory = [...user.inventory];
            newInventory.splice(cardIndex, 1);
            const updatedUser = { ...user, inventory: newInventory };
            setUser(updatedUser);
            await updateUserInDb(updatedUser);
        }
        await createQuestion(user, q.title, q.content, q.tags, q.image, isAnonymous);
        await loadData();
        setCurrentTab(Tab.HOME);
      } catch (e) { alert("發布失敗"); }
  };
  
  const handleAddReply = async (qid: number, content: string, image?: string, isAnonymous: boolean = false) => {
      if (!user) return;
      try {
          await createReply(user, qid, content, image, isAnonymous);
          await loadData();
          if (!isMaintenanceMode) {
              const reward = 5;
              const newPoints = user.points + reward;
              const updatedUser = { ...user, points: newPoints, level: calculateLevel(newPoints) };
              await updateUserInDb(updatedUser);
              setUser(updatedUser);
          }
          const uQ = await fetchQuestions();
          const tQ = uQ.find(q => q.id === qid);
          if (tQ) setSelectedQuestion(tQ);
      } catch(e) { alert("回覆失敗: " + e.message); }
  };

  const handleBuyProduct = async (product: Product) => {
      if (!user) return;
      if (product.category !== 'consumable' && product.category !== 'tool') {
          if (user.inventory.includes(product.id) || user.avatarFrame === product.id) {
              alert("您已經擁有此商品，無法重複購買！"); return;
          }
      }
      if (user.points < product.price) { alert("積分不足！"); return; }
      
      let updatedUser: User = { 
          ...user, 
          points: user.points - product.price
      };

      if (product.category === 'consumable' && product.id === 'item_heart_refill') {
          updatedUser = { ...updatedUser, dailyPlays: Math.max(0, user.dailyPlays - 5) };
          await updateUserInDb(updatedUser); setUser(updatedUser); alert("補充成功！遊玩次數 +5"); return;
      }
      
      const newInv = [...user.inventory];
      newInv.push(product.id);
      let newFrame = user.avatarFrame;
      if (product.category === 'frame') newFrame = product.id;

      updatedUser = { ...updatedUser, inventory: newInv, avatarFrame: newFrame };
      await updateUserInDb(updatedUser); setUser(updatedUser); alert("購買成功！");
  };

  // --- GAME HANDLERS ---
  
  const handleUpdateUser = async (u: User) => {
      setUser(u);
      await updateUserInDb(u);
  };

  const handleFinishChallenge = async (result: GameResult) => {
    if (isMaintenanceMode) {
        alert("系統維護中，暫停積分結算功能。");
        setActiveFeature(null);
        return;
    }
    if (!user) return;
    
    const rawEarnedPt = Math.floor(result.score / 10);
    const earnedPt = Math.min(rawEarnedPt, MAX_POINT_GAIN_PER_ACTION); 

    const newPoints = user.points + earnedPt;
    const updatedUser: User = { 
        ...user, 
        points: newPoints,
        level: calculateLevel(newPoints)
    };
    try { await updateUserInDb(updatedUser); setUser(updatedUser); } catch(e) {}
    setActiveFeature(null);
  };

  const handleFinishPk = async (result: PkResult) => {
      if (isMaintenanceMode) {
          alert("系統維護中，暫停積分與排名結算。");
          setActiveFeature(null);
          return;
      }
      if (!user) return;
      
      const earnedPt = Math.min(result.score, MAX_POINT_GAIN_PER_ACTION);
      const ratingChange = result.ratingChange || 0;
      const modePlayed = result.mode || 'CLASSIC'; 
      let updatedUser: User = { ...user };
      
      if (modePlayed === 'OVERLOAD') {
          const newRating = Math.max(0, (user.pkRatingOverload || 0) + ratingChange);
          updatedUser = { ...updatedUser, pkRatingOverload: newRating };
      } else {
          const newRating = Math.max(0, (user.pkRating || 0) + ratingChange);
          updatedUser = { ...updatedUser, pkRating: newRating };
      }

      const newPoints = user.points + earnedPt;
      updatedUser = { 
          ...updatedUser, 
          points: newPoints,
          level: calculateLevel(newPoints)
      };
      
      try { await updateUserInDb(updatedUser); setUser(updatedUser); } catch(e) {}
      setActiveFeature(null);
  };

  const handleWheelSpin = async (prize: number, cost: number) => {
      if (isMaintenanceMode) return;
      if (!user) return;
      
      const newPoints = user.points - cost + prize;
      const updatedUser = { 
          ...user, 
          points: newPoints,
          level: calculateLevel(newPoints),
          dailyWheelSpins: (user.dailyWheelSpins || 0) + 1,
          lastWheelDate: new Date().toDateString()
      };
      try { await updateUserInDb(updatedUser); setUser(updatedUser); } catch(e) {}
  };

  const handleBmcGameFinish = async (netBmc: number) => {
      if (isMaintenanceMode) return;
      if (!user) return;
      const updatedUser = { ...user, blackMarketCoins: Math.max(0, (user.blackMarketCoins || 0) + netBmc) };
      try { 
          await updateUserInDb(updatedUser); 
          setUser(updatedUser); 
          // Do NOT close active feature, allow replay in same screen
      } catch(e) {}
  };

  const handleAddResource = async (t: string, d: string, tags: string[], i: string[]) => { 
      if(!user) return;
      await createResource(user, t, d, tags, i); 
      await loadData(); setCurrentTab(Tab.RESOURCE);
  };
  const handleAddExam = async (s: string, t: string, d: string, tm: string) => { if(user) await createExam(user, s, t, d, tm); loadData(); };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin"/></div>;
  if (isMaintenanceMode && user && user.studentId !== '1204233') return <MaintenanceScreen />;
  
  // Login or Queue Screen
  if (!user) {
      if (queuePosition !== null) {
          return <LoginQueueOverlay position={queuePosition} onCancel={cancelQueue} />;
      }
      return <LoginScreen onLogin={handleLogin} />;
  }

  // --- RENDER FULL APP ---
  const renderActiveFeature = () => {
      if (!activeFeature) return null;
      const { id, params } = activeFeature;

      return (
          <Suspense fallback={<LoadingFallback />}>
              {id === 'word_challenge' && <WordChallengeScreen user={user} words={WORD_DATABASE} onBack={handleCloseFeature} onFinish={handleFinishChallenge} onUpdateHearts={async (n) => handleUpdateUser({...user, dailyPlays: n})} />}
              {id === 'resistor_game' && <ResistorGameScreen user={user} onBack={handleCloseFeature} onFinish={handleFinishChallenge} onUpdateHearts={async (n) => handleUpdateUser({...user, dailyPlays: n})} />}
              {id === 'block_blast' && <BlockBlastScreen user={user} onBack={handleCloseFeature} onFinish={handleFinishChallenge} onUpdateHearts={async (n) => handleUpdateUser({...user, dailyPlays: n})} />}
              {id === 'lucky_wheel' && <LuckyWheelScreen user={user} onBack={handleCloseFeature} onSpinEnd={handleWheelSpin} />}
              {id === 'pk_game' && <PkGameScreen user={user} onBack={handleCloseFeature} onFinish={handleFinishPk} initialMode={params?.mode} />}
              {id === 'vocab_practice' && <VocabPracticeScreen onBack={handleCloseFeature} />}
              {id === 'draw_guess' && <DrawGuessScreen user={user} onBack={handleCloseFeature} />}
              {id === 'high_low' && <HighLowGameScreen user={user} onBack={handleCloseFeature} onFinish={handleBmcGameFinish} />}
              {id === 'base_converter' && <BaseConverterScreen onBack={handleCloseFeature} />}
              {id === 'black_market' && <BlackMarketScreen user={user} onBack={handleCloseFeature} onBuy={handleBuyProduct} setUser={handleUpdateUser} />}
              {id === 'slot_machine' && <SlotMachineScreen user={user} onBack={handleCloseFeature} onFinish={handleBmcGameFinish} />}
              {id === 'russian_roulette' && <RussianRouletteScreen user={user} onBack={handleCloseFeature} onFinish={handleBmcGameFinish} />}
              {id === 'xiangqi' && <XiangqiScreen onBack={handleCloseFeature} />}
              {id === 'gomoku' && <GomokuScreen onBack={handleCloseFeature} />}
              {id === 'othello' && <OthelloScreen onBack={handleCloseFeature} />}
              {id === 'crash_game' && <CrashGameScreen user={user} onBack={handleCloseFeature} onFinish={handleBmcGameFinish} />}
              {id === 'connect_four' && <ConnectFourScreen onBack={handleCloseFeature} />}
              {id === 'memory_game' && <MemoryGameScreen user={user} onBack={handleCloseFeature} onFinish={handleFinishChallenge} />}
          </Suspense>
      );
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      
      {showUpdateModal && <UpdateAnnouncementModal onClose={() => setShowUpdateModal(false)} />}

      {lightboxImage && (
          <div className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-sm flex items-center justify-center" onClick={() => setLightboxImage(null)}>
              <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full"><X size={24}/></button>
              <img src={lightboxImage} alt="Zoom" className="max-w-full max-h-full object-contain p-4" />
          </div>
      )}
      
      <CheckInModal 
        isOpen={showCheckInModal} 
        onClose={() => setShowCheckInModal(false)} 
        onCheckIn={handleCheckIn}
        streak={user.checkInStreak || 0}
        isCheckedInToday={user.lastCheckInDate === new Date().toDateString()}
      />

      {showNotificationScreen && (
          <NotificationScreen 
              user={user}
              onBack={() => setShowNotificationScreen(false)}
              onNotificationClick={async (n) => { 
                   if (n.link) {
                       setShowNotificationScreen(false);
                       const q = questions.find(q => q.id === parseInt(n.link!));
                       if(q) { setSelectedQuestion(q); pushHistory(); }
                   }
              }}
          />
      )}

      {/* --- RENDER FULL SCREEN FEATURES --- */}
      {renderActiveFeature()}

      {/* Overlays - Increased Z-Index to [100] to be above BottomNav [50] */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 h-full flex flex-col">
             <QuestionDetailScreen 
                question={selectedQuestion} 
                currentUser={user} 
                onBack={() => setSelectedQuestion(null)}
                onAddReply={handleAddReply}
                onReport={(t, id, c, r) => console.log(t, id, c, r)}
                onMarkBest={(q, r) => markBestAnswer(q, r).then(loadData)}
                onImageClick={(url) => { pushHistory(); setLightboxImage(url); }}
             />
        </div>
      )}

      {selectedResource && (
        <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 h-full flex flex-col">
             <ResourceDetailScreen 
                resource={selectedResource} 
                currentUser={user} 
                onBack={() => setSelectedResource(null)}
                onLike={async (id) => { 
                    const r = resources.find(res => res.id === id);
                    if(!r) return;
                    const isLiked = r.likedBy.includes(user.name);
                    const newLikes = isLiked ? r.likes - 1 : r.likes + 1;
                    const newLikedBy = isLiked ? r.likedBy.filter(n => n !== user.name) : [...r.likedBy, user.name];
                    setResources(resources.map(res => res.id === id ? { ...res, likes: newLikes, likedBy: newLikedBy } : res));
                    await updateResourceLikes(id, newLikes, newLikedBy);
                }}
                onImageClick={(url) => { pushHistory(); setLightboxImage(url); }}
             />
        </div>
      )}

      {showLeaderboardOverlay ? (
          <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 pt-safe flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 mt-2">
                   <h2 className="font-bold text-lg text-gray-800 dark:text-white">全班等級排名 (按現有積分)</h2>
                   <button onClick={() => setShowLeaderboardOverlay(false)} className="text-blue-600 font-bold px-4 py-1">返回</button>
               </div>
               <div className="flex-1 overflow-hidden no-scrollbar"><LeaderboardScreen currentUser={user} /></div>
          </div>
      ) : showModeration ? (
          <div className="fixed inset-0 z-[100] bg-white dark:bg-gray-900 overflow-y-auto">
              <ModerationScreen 
                user={user} reports={reports} allQuestions={questions} allResources={resources} allExams={exams}
                onBack={() => setShowModeration(false)}
                onBanUser={async (id) => { await banUser(id); alert("Banned"); }}
                onUnbanUser={async (id) => { await unbanUser(id); alert("Unbanned"); }}
                onDeleteContent={async (t, id) => { 
                    if(t==='question') await deleteQuestion(id); 
                    if(t==='resource') await deleteResource(id); 
                    loadData(); 
                }}
              />
          </div>
      ) : (
          <>
            <Header user={user} onOpenNotifications={() => { pushHistory(); setShowNotificationScreen(true); }} unreadCount={unreadNotifications} />
            <div className="pb-20">
                {currentTab === Tab.HOME && (
                    <HomeScreen 
                        questions={questions} 
                        onQuestionClick={(q) => { pushHistory(); setSelectedQuestion(q); }}
                        onAskClick={() => { pushHistory(); setCurrentTab(Tab.ASK); }}
                        onNavigateToPlayground={() => handleTabChange(Tab.PLAYGROUND)}
                        onOpenLeaderboard={() => { pushHistory(); setShowLeaderboardOverlay(true); }}
                        onOpenCheckIn={() => { 
                            if(isMaintenanceMode) { alertMaintenance(); return; }
                            pushHistory(); setShowCheckInModal(true); 
                        }}
                        onNavigateToAiTutor={() => handleTabChange(Tab.AI_TUTOR)} 
                        onRefresh={loadData}
                        onImageClick={(url) => { pushHistory(); setLightboxImage(url); }}
                        onOpenPkGame={(mode) => handleNavigateToFeature('pk_game', { mode })}
                    />
                )}
                {currentTab === Tab.RESOURCE && (
                    <ResourceScreen 
                        resources={resources}
                        currentUser={user}
                        onAddResource={handleAddResource}
                        onLikeResource={async (id) => { 
                            const r = resources.find(res => res.id === id);
                            if(!r) return;
                            const isLiked = r.likedBy.includes(user.name);
                            const newLikes = isLiked ? r.likes - 1 : r.likes + 1;
                            const newLikedBy = isLiked ? r.likedBy.filter(n => n !== user.name) : [...r.likedBy, user.name];
                            setResources(resources.map(res => res.id === id ? { ...res, likes: newLikes, likedBy: newLikedBy } : res));
                            await updateResourceLikes(id, newLikes, newLikedBy);
                        }}
                        onResourceClick={(r) => { pushHistory(); setSelectedResource(r); }}
                        onRefresh={loadData}
                        onImageClick={(url) => { pushHistory(); setLightboxImage(url); }}
                    />
                )}
                
                {currentTab === Tab.PLAYGROUND && (
                    <PlaygroundScreen 
                        user={user}
                        onNavigate={handleNavigateToFeature}
                        setUser={handleUpdateUser} 
                    />
                )}
                
                {currentTab === Tab.AI_TUTOR && <AiTutorScreen />}

                {currentTab === Tab.EXAM && <ExamScreen exams={exams} onAddExam={handleAddExam} onDeleteExam={()=>{}} />}
                {currentTab === Tab.STORE && <ShopScreen user={user} onBuy={handleBuyProduct} />}
                {currentTab === Tab.PROFILE && (
                    <ProfileScreen 
                        user={user} setUser={handleUpdateUser}
                        onNavigateToModeration={() => { pushHistory(); setShowModeration(true); }}
                        onNavigateToLeaderboard={() => { pushHistory(); setShowLeaderboardOverlay(true); }}
                        onOpenCheckIn={() => { 
                            if(isMaintenanceMode) { alert("簽到系統維護中"); return; }
                            pushHistory(); setShowCheckInModal(true); 
                        }}
                        onOpenExams={() => { pushHistory(); setCurrentTab(Tab.EXAM); }} 
                        onLogout={() => { logout(); setUser(null); }}
                        isDarkMode={user.settings?.darkMode || false}
                        toggleDarkMode={async () => { const s = { ...user.settings!, darkMode: !user.settings?.darkMode }; const u = { ...user, settings: s }; await handleUpdateUser(u); }}
                        userQuestions={questions.filter(q => q.author === user.name)}
                        userReplies={questions.filter(q => q.replies.some(r => r.author === user.name))}
                        userResources={resources.filter(r => r.author === user.name)}
                        onDeleteQuestion={async (id) => { await deleteQuestion(id); loadData(); }}
                        onDeleteReply={async (id) => { await deleteReply(id); loadData(); }}
                        onDeleteResource={async (id) => { await deleteResource(id); loadData(); }}
                    />
                )}
                {currentTab === Tab.ASK && <AskScreen user={user} onPostQuestion={handlePostQuestion} onImageClick={(url) => { pushHistory(); setLightboxImage(url); }} />}
            </div>
            
            <BottomNav currentTab={currentTab} setTab={handleTabChange} />
          </>
      )}
    </div>
  );
};

export default App;
