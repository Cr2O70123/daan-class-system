
import React, { useState, useEffect } from 'react';
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
import { WordChallengeScreen } from './screens/WordChallengeScreen';
import { ResistorGameScreen } from './screens/ResistorGameScreen';
import { PlaygroundScreen } from './screens/PlaygroundScreen';
import { NotificationScreen } from './screens/NotificationScreen';
import { CheckInModal } from './components/CheckInModal';
import { UpdateAnnouncementModal } from './components/UpdateAnnouncementModal'; // New Import
import { LuckyWheelScreen } from './screens/LuckyWheelScreen';
import { BlockBlastScreen } from './screens/BlockBlastScreen'; 
import { PkGameScreen } from './screens/PkGameScreen';
import { BaseConverterScreen } from './screens/BaseConverterScreen'; 
import { AiTutorScreen } from './screens/AiTutorScreen'; 
import { VocabPracticeScreen } from './screens/VocabPracticeScreen';
import { DrawGuessScreen } from './screens/DrawGuessScreen';
import { HighLowGameScreen } from './screens/HighLowGameScreen'; 

import { Tab, User, Question, Report, Product, Resource, Exam, GameResult, Notification, PkResult } from './types';
import { RefreshCw, X, Bell } from 'lucide-react';

// Services
import { WORD_DATABASE } from './services/mockData'; 
import { calculateLevel } from './services/levelService';
import { login, updateUserInDb, checkSession, logout } from './services/authService';
import { 
    fetchQuestions, createQuestion, deleteQuestion, createReply, deleteReply, markBestAnswer, 
    fetchResources, createResource, deleteResource, updateResourceLikes,
    fetchExams, createExam, deleteExam, banUser, unbanUser
} from './services/dataService';
import { fetchNotifications } from './services/notificationService';
import { supabase } from './services/supabaseClient';

// Helper to get frame styles (Used in Header)
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

const Header = ({ user, onOpenNotifications, unreadCount }: { user: User, onOpenNotifications: () => void, unreadCount: number }) => {
    const xp = user.lifetimePoints ?? user.points;
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

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.HOME);
  const [isLoading, setIsLoading] = useState(true);
  
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
  
  // Update Announcement State (Check localStorage)
  const [showUpdateModal, setShowUpdateModal] = useState(() => {
      return !localStorage.getItem('hasSeenUpdate2.0');
  });
  
  // Game States
  const [showWordChallenge, setShowWordChallenge] = useState(false);
  const [showResistorGame, setShowResistorGame] = useState(false);
  const [showLuckyWheel, setShowLuckyWheel] = useState(false);
  const [showBlockBlast, setShowBlockBlast] = useState(false); 
  const [showPkGame, setShowPkGame] = useState(false);
  const [pkGameMode, setPkGameMode] = useState<'CLASSIC' | 'OVERLOAD' | undefined>(undefined); // Track PK mode (undefined = show select)
  const [showVocabPractice, setShowVocabPractice] = useState(false);
  const [showDrawGuess, setShowDrawGuess] = useState(false);
  const [showHighLowGame, setShowHighLowGame] = useState(false); 
  
  // Tools States
  const [showBaseConverter, setShowBaseConverter] = useState(false);
  
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showNotificationScreen, setShowNotificationScreen] = useState(false);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  const handleTabChange = (newTab: Tab) => {
      setShowWordChallenge(false);
      setShowResistorGame(false);
      setShowLuckyWheel(false);
      setShowBlockBlast(false);
      setShowPkGame(false);
      setShowVocabPractice(false);
      setShowDrawGuess(false);
      setShowHighLowGame(false);
      setShowBaseConverter(false);
      setShowLeaderboardOverlay(false);
      setSelectedQuestion(null);
      setSelectedResource(null);
      setShowModeration(false);
      setShowCheckInModal(false);
      setShowNotificationScreen(false);
      
      setCurrentTab(newTab);
  };

  useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
          if (lightboxImage) { setLightboxImage(null); return; }
          if (showCheckInModal) { setShowCheckInModal(false); return; }
          if (showNotificationScreen) { setShowNotificationScreen(false); return; }
          if (showLuckyWheel) { setShowLuckyWheel(false); return; }
          if (showBlockBlast) { setShowBlockBlast(false); return; }
          if (showPkGame) { setShowPkGame(false); return; }
          if (showVocabPractice) { setShowVocabPractice(false); return; }
          if (showDrawGuess) { setShowDrawGuess(false); return; }
          if (showHighLowGame) { setShowHighLowGame(false); return; }
          if (showWordChallenge) { setShowWordChallenge(false); return; }
          if (showResistorGame) { setShowResistorGame(false); return; }
          if (showBaseConverter) { setShowBaseConverter(false); return; }
          if (selectedQuestion) { setSelectedQuestion(null); return; }
          if (selectedResource) { setSelectedResource(null); return; }
          if (showLeaderboardOverlay) { setShowLeaderboardOverlay(false); return; }
          if (showModeration) { setShowModeration(false); return; }
          if (currentTab !== Tab.HOME) { setCurrentTab(Tab.HOME); return; }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [lightboxImage, showCheckInModal, showNotificationScreen, showLuckyWheel, showBlockBlast, showPkGame, showVocabPractice, showDrawGuess, showHighLowGame, showWordChallenge, showResistorGame, showBaseConverter, selectedQuestion, selectedResource, showLeaderboardOverlay, showModeration, currentTab]);

  const pushHistory = () => {
      window.history.pushState({ overlay: true }, '');
  };

  useEffect(() => {
    const initSession = async () => {
        try {
            const sessionUser = await checkSession();
            if (sessionUser) {
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
        // Reset daily plays to 0 on a new day
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
    const newLifetime = (user.lifetimePoints ?? user.points) + reward;

    const updatedUser: User = {
        ...user, points: newPoints, lifetimePoints: newLifetime, level: calculateLevel(newLifetime),
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
        setUser(loggedUser);
        checkDailyReset(loggedUser);
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
  
  const handleAddReply = async (qid: number, content: string, image?: string) => {
      if (!user) return;
      try {
          await createReply(user, qid, content, image);
          await loadData();
          const reward = 5;
          const newLifetime = (user.lifetimePoints ?? user.points) + reward;
          const updatedUser = { ...user, points: user.points + reward, lifetimePoints: newLifetime, level: calculateLevel(newLifetime) };
          await updateUserInDb(updatedUser);
          setUser(updatedUser);
          const uQ = await fetchQuestions();
          const tQ = uQ.find(q => q.id === qid);
          if (tQ) setSelectedQuestion(tQ);
      } catch(e) { alert("回覆失敗"); }
  };

  const handleBuyProduct = async (product: Product) => {
      if (!user) return;
      if (user.points < product.price) { alert("積分不足！"); return; }
      
      const currentLifetimePoints = user.lifetimePoints ?? user.points;
      
      let updatedUser: User = { 
          ...user, 
          points: user.points - product.price,
          lifetimePoints: currentLifetimePoints 
      };

      if (product.category === 'consumable' && product.id === 'item_heart_refill') {
          // Energy Drink restores 5 plays (reduces daily plays count)
          updatedUser = { ...updatedUser, dailyPlays: Math.max(0, user.dailyPlays - 5) };
          await updateUserInDb(updatedUser); setUser(updatedUser); alert("補充成功！遊玩次數 +5"); return;
      }
      
      const isStackable = product.category === 'tool';
      if (!isStackable && user.inventory.includes(product.id) && product.category !== 'frame') { alert("已擁有"); return; }
      
      const newInv = [...user.inventory];
      newInv.push(product.id);
      let newFrame = user.avatarFrame;
      if (product.category === 'frame') newFrame = product.id;

      updatedUser = { ...updatedUser, inventory: newInv, avatarFrame: newFrame };
      await updateUserInDb(updatedUser); setUser(updatedUser); alert("購買成功！");
  };

  const handleWheelSpin = async (prize: number, cost: number) => {
      if (!user) return;
      
      // Calculate new values
      const currentLifetimePoints = user.lifetimePoints ?? user.points;
      const newLifetime = currentLifetimePoints + (prize > 0 ? prize : 0);
      const safeLifetime = Math.max(currentLifetimePoints, newLifetime);
      const netPoints = user.points - cost + prize;
      
      // Update Spin Counts
      const today = new Date().toDateString();
      const newSpins = (user.lastWheelDate === today ? (user.dailyWheelSpins || 0) : 0) + 1;

      const updatedUser = { 
          ...user, 
          points: netPoints,
          lifetimePoints: safeLifetime,
          level: calculateLevel(safeLifetime),
          dailyWheelSpins: newSpins,
          lastWheelDate: today
      };
      
      try {
          await updateUserInDb(updatedUser);
          setUser(updatedUser);
      } catch(e) {
          console.error("Failed to update points from wheel", e);
      }
  };

  const handleFinishHighLow = async (netPoints: number) => {
      if (!user) return;
      const currentLifetimePoints = user.lifetimePoints ?? user.points;
      // Only wins contribute to lifetime points
      const newLifetime = netPoints > 0 ? currentLifetimePoints + netPoints : currentLifetimePoints;
      
      const updatedUser: User = {
          ...user,
          points: user.points + netPoints,
          lifetimePoints: newLifetime,
          level: calculateLevel(newLifetime)
      };
      
      try {
          await updateUserInDb(updatedUser);
          setUser(updatedUser);
      } catch(e) {}
  };

  const handleFinishChallenge = async (result: GameResult) => {
    if (!user) return;
    const earnedPt = Math.floor(result.score / 10); 
    const newLifetime = (user.lifetimePoints ?? user.points) + earnedPt;
    const updatedUser: User = { 
        ...user, 
        points: user.points + earnedPt,
        lifetimePoints: newLifetime,
        level: calculateLevel(newLifetime)
    };
    try { await updateUserInDb(updatedUser); setUser(updatedUser); } catch(e) {}
    
    setShowWordChallenge(false);
    setShowResistorGame(false);
    setShowBlockBlast(false);
  };
  
  // PK Result Handler - Update Rating
  const handleFinishPk = async (result: PkResult) => {
      if (!user) return;
      
      const earnedPt = result.score; // Score is PT
      const ratingChange = result.ratingChange || 0;
      
      // Determine which rating to update based on the mode played
      const modePlayed = result.mode || pkGameMode; // Use result mode if available, fallback to state
      
      let updatedUser: User = { ...user };
      
      if (modePlayed === 'OVERLOAD') {
          const newRating = Math.max(0, (user.pkRatingOverload || 0) + ratingChange);
          updatedUser = { ...updatedUser, pkRatingOverload: newRating };
      } else {
          // Default to Classic if undefined or 'CLASSIC'
          const newRating = Math.max(0, (user.pkRating || 0) + ratingChange);
          updatedUser = { ...updatedUser, pkRating: newRating };
      }

      const newLifetime = (user.lifetimePoints ?? user.points) + earnedPt;
      updatedUser = { 
          ...updatedUser, 
          points: user.points + earnedPt,
          lifetimePoints: newLifetime,
          level: calculateLevel(newLifetime)
      };
      
      try { 
          await updateUserInDb(updatedUser); 
          setUser(updatedUser); 
      } catch(e) {}
      
      setShowPkGame(false);
  };
  
  const handleAddResource = async (t: string, d: string, tags: string[], i: string[]) => { 
      if(!user) return;
      await createResource(user, t, d, tags, i); 
      await loadData(); setCurrentTab(Tab.RESOURCE);
  };
  const handleAddExam = async (s: string, t: string, d: string, tm: string) => { if(user) await createExam(user, s, t, d, tm); loadData(); };
  const handleDeleteContent = async (type: any, id: number) => { /* ... */ };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><RefreshCw className="animate-spin"/></div>;
  if (!user) return <LoginScreen onLogin={handleLogin} />;

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      
      {/* 2.0 Update Announcement Modal */}
      {showUpdateModal && (
          <UpdateAnnouncementModal onClose={() => {
              localStorage.setItem('hasSeenUpdate2.0', 'true');
              setShowUpdateModal(false);
          }} />
      )}

      {lightboxImage && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center" onClick={() => setLightboxImage(null)}>
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

      {/* --- GAMES SCREENS --- */}

      {showWordChallenge && (
        <WordChallengeScreen 
            user={user}
            words={WORD_DATABASE}
            onBack={() => setShowWordChallenge(false)}
            onFinish={handleFinishChallenge}
            onUpdateHearts={async (newPlays) => { const u = { ...user, dailyPlays: newPlays }; setUser(u); await updateUserInDb(u); }}
        />
      )}
      
      {showResistorGame && (
          <ResistorGameScreen 
              user={user}
              onBack={() => setShowResistorGame(false)}
              onFinish={handleFinishChallenge}
              onUpdateHearts={async (newPlays) => { const u = { ...user, dailyPlays: newPlays }; setUser(u); await updateUserInDb(u); }}
          />
      )}

      {showBlockBlast && (
          <BlockBlastScreen
              user={user}
              onBack={() => setShowBlockBlast(false)}
              onFinish={handleFinishChallenge}
              onUpdateHearts={async (newPlays) => { const u = { ...user, dailyPlays: newPlays }; setUser(u); await updateUserInDb(u); }}
          />
      )}
      
      {showPkGame && (
          <PkGameScreen
              user={user}
              onBack={() => setShowPkGame(false)}
              onFinish={handleFinishPk}
              initialMode={pkGameMode} 
          />
      )}

      {showVocabPractice && (
          <VocabPracticeScreen 
              onBack={() => setShowVocabPractice(false)}
          />
      )}

      {showDrawGuess && (
          <DrawGuessScreen 
              user={user}
              onBack={() => setShowDrawGuess(false)}
          />
      )}

      {/* --- GAMBLING SCREENS --- */}
      {showLuckyWheel && (
          <LuckyWheelScreen 
            user={user}
            onBack={() => setShowLuckyWheel(false)}
            onSpinEnd={handleWheelSpin}
          />
      )}

      {showHighLowGame && (
          <HighLowGameScreen 
              user={user}
              onBack={() => setShowHighLowGame(false)}
              onFinish={handleFinishHighLow}
          />
      )}

      {/* --- TOOLS SCREENS --- */}
      {showBaseConverter && (
          <BaseConverterScreen onBack={() => setShowBaseConverter(false)} />
      )}

      {/* Overlays */}
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
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
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
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
          <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 pt-safe flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 mt-2">
                   <h2 className="font-bold text-lg text-gray-800 dark:text-white">全班等級排名</h2>
                   <button onClick={() => setShowLeaderboardOverlay(false)} className="text-blue-600 font-bold px-4 py-1">返回</button>
               </div>
               <div className="flex-1 overflow-hidden no-scrollbar"><LeaderboardScreen currentUser={user} /></div>
          </div>
      ) : showModeration ? (
          <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 overflow-y-auto">
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
                        onOpenCheckIn={() => { pushHistory(); setShowCheckInModal(true); }}
                        onNavigateToAiTutor={() => handleTabChange(Tab.AI_TUTOR)} 
                        onRefresh={loadData}
                        onImageClick={(url) => { pushHistory(); setLightboxImage(url); }}
                        onOpenPkGame={(mode) => { 
                            setPkGameMode(mode);
                            pushHistory(); 
                            setShowPkGame(true); 
                        }}
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
                        onOpenWordChallenge={() => { pushHistory(); setShowWordChallenge(true); }}
                        onOpenResistorGame={() => { pushHistory(); setShowResistorGame(true); }}
                        onOpenLuckyWheel={() => { pushHistory(); setShowLuckyWheel(true); }}
                        onOpenBlockBlast={() => { pushHistory(); setShowBlockBlast(true); }}
                        onOpenPkGame={(mode) => { 
                            setPkGameMode(mode);
                            pushHistory(); 
                            setShowPkGame(true); 
                        }}
                        onOpenOhmsLaw={() => { pushHistory(); setShowBaseConverter(true); }}
                        onOpenVocabPractice={() => { pushHistory(); setShowVocabPractice(true); }}
                        onOpenDrawGuess={() => { pushHistory(); setShowDrawGuess(true); }}
                        onOpenHighLow={() => { pushHistory(); setShowHighLowGame(true); }}
                    />
                )}
                
                {currentTab === Tab.AI_TUTOR && <AiTutorScreen />}

                {currentTab === Tab.EXAM && <ExamScreen exams={exams} onAddExam={handleAddExam} onDeleteExam={()=>{}} />}
                {currentTab === Tab.STORE && <ShopScreen user={user} onBuy={handleBuyProduct} />}
                {currentTab === Tab.PROFILE && (
                    <ProfileScreen 
                        user={user} setUser={async (u) => { setUser(u); await updateUserInDb(u); }}
                        onNavigateToModeration={() => { pushHistory(); setShowModeration(true); }}
                        onNavigateToLeaderboard={() => { pushHistory(); setShowLeaderboardOverlay(true); }}
                        onOpenCheckIn={() => { pushHistory(); setShowCheckInModal(true); }}
                        onOpenExams={() => { pushHistory(); setCurrentTab(Tab.EXAM); }} 
                        onLogout={() => { logout(); setUser(null); }}
                        isDarkMode={user.settings?.darkMode || false}
                        toggleDarkMode={async () => { const s = { ...user.settings!, darkMode: !user.settings?.darkMode }; const u = { ...user, settings: s }; setUser(u); await updateUserInDb(u); }}
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
