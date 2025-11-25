

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
import { Tab, User, Question, Report, Product, Resource, Exam, GameResult, Notification } from './types';
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
      // Beta Frame: Gear/Crown tech look
      case 'frame_beta': return 'ring-2 ring-amber-500 border-2 border-dashed border-yellow-200 shadow-[0_0_10px_rgba(245,158,11,0.6)]';
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
};

const Header = ({ user, onOpenNotifications, unreadCount }: { user: User, onOpenNotifications: () => void, unreadCount: number }) => {
    const xp = user.lifetimePoints ?? user.points;
    const progress = (xp % 500) / 5; // 500 XP per level, so %500 / 500 * 100 = %500 / 5

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
                {/* Notification Bell */}
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

  // UI States - Modal/Overlay Management for Back Button
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showLeaderboardOverlay, setShowLeaderboardOverlay] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showWordChallenge, setShowWordChallenge] = useState(false);
  const [showResistorGame, setShowResistorGame] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showNotificationScreen, setShowNotificationScreen] = useState(false);
  
  // Global Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // --- NAVIGATION HANDLER ---
  const handleTabChange = (newTab: Tab) => {
      // Force close all overlays when switching main tabs to prevent "stuck" states
      setShowWordChallenge(false);
      setShowResistorGame(false);
      setShowLeaderboardOverlay(false);
      setSelectedQuestion(null);
      setSelectedResource(null);
      setShowModeration(false);
      setShowCheckInModal(false);
      setShowNotificationScreen(false);
      
      setCurrentTab(newTab);
  };

  // --- BACK BUTTON HANDLING ---
  useEffect(() => {
      const handlePopState = (event: PopStateEvent) => {
          // Order of closing: Lightbox -> Modals -> Games/Overlays -> Tabs
          if (lightboxImage) {
              setLightboxImage(null);
              return;
          }
          if (showCheckInModal) {
              setShowCheckInModal(false);
              return;
          }
          if (showNotificationScreen) {
              setShowNotificationScreen(false);
              return;
          }
          if (showWordChallenge) {
              setShowWordChallenge(false);
              return;
          }
          if (showResistorGame) {
              setShowResistorGame(false);
              return;
          }
          if (selectedQuestion) {
              setSelectedQuestion(null);
              return;
          }
          if (selectedResource) {
              setSelectedResource(null);
              return;
          }
          if (showLeaderboardOverlay) {
              setShowLeaderboardOverlay(false);
              return;
          }
          if (showModeration) {
              setShowModeration(false);
              return;
          }
          if (currentTab !== Tab.HOME) {
              setCurrentTab(Tab.HOME);
              return;
          }
      };

      window.addEventListener('popstate', handlePopState);
      return () => window.removeEventListener('popstate', handlePopState);
  }, [lightboxImage, showCheckInModal, showNotificationScreen, showWordChallenge, showResistorGame, selectedQuestion, selectedResource, showLeaderboardOverlay, showModeration, currentTab]);

  // Helper to push state when opening overlay
  const pushHistory = () => {
      window.history.pushState({ overlay: true }, '');
  };

  // Init
  useEffect(() => {
    const initSession = async () => {
        try {
            const sessionUser = await checkSession();
            if (sessionUser) {
                setUser(sessionUser);
                // Check for daily reset when session loads
                checkDailyReset(sessionUser);
                // Fetch Notifications
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

  // Supabase Realtime Listener for Notifications (Pure Web)
  useEffect(() => {
    if (!user) return;

    // Listen for new notifications intended for this user
    const channel = supabase
      .channel('public:notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.studentId}`
        },
        (payload) => {
            console.log('Realtime notification received:', payload);
            // Update Unread Count locally (Badge only, no native bridge)
            setUnreadNotifications(prev => prev + 1);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  // Polling for new notifications (every 60s) as backup
  useEffect(() => {
      if (!user) return;
      const interval = setInterval(() => {
          refreshNotifications(user.studentId);
      }, 60000);
      return () => clearInterval(interval);
  }, [user]);

  const refreshNotifications = async (studentId: string) => {
      try {
          const notifs = await fetchNotifications(studentId);
          setUnreadNotifications(notifs.filter(n => !n.isRead).length);
      } catch (e) {}
  };

  // Dark Mode Effect
  useEffect(() => {
      if (user?.settings?.darkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
  }, [user?.settings?.darkMode]);

  // Daily Reset Logic (Hearts)
  const checkDailyReset = async (currentUser: User) => {
    const today = new Date().toDateString();
    if (currentUser.lastHeartReset !== today) {
        const updatedUser = {
            ...currentUser,
            hearts: 3,
            lastHeartReset: today
        };
        // Persist reset
        try {
            await updateUserInDb(updatedUser);
            setUser(updatedUser);
        } catch(e) {
            console.error("Failed to reset hearts", e);
        }
    }
  };

  // Check-in Logic
  const handleCheckIn = async () => {
    if (!user) return;

    const today = new Date().toDateString();
    const lastDate = user.lastCheckInDate;
    let newStreak = user.checkInStreak || 0;
    let reward = 20; // Base reward

    // Check if already checked in
    if (lastDate === today) {
        return;
    }

    // Determine streak
    if (lastDate) {
        const lastCheckInTime = new Date(lastDate).getTime();
        const todayTime = new Date(today).getTime();
        const diffDays = (todayTime - lastCheckInTime) / (1000 * 3600 * 24);

        if (diffDays === 1) {
            newStreak += 1;
        } else {
            newStreak = 1; // Reset if missed a day
        }
    } else {
        newStreak = 1;
    }

    // Big Reward for 7 days
    if (newStreak % 7 === 0) {
        reward = 100;
    }

    const newPoints = user.points + reward;
    const newLifetime = (user.lifetimePoints ?? user.points) + reward; // XP Gain

    const updatedUser: User = {
        ...user,
        points: newPoints,
        lifetimePoints: newLifetime,
        level: calculateLevel(newLifetime),
        lastCheckInDate: today,
        checkInStreak: newStreak
    };

    try {
        await updateUserInDb(updatedUser);
        setUser(updatedUser);
    } catch (e) {
        alert("簽到失敗，請檢查網路");
    }
  };

  // Visibility change handler for auto-refresh when returning to app
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && user) {
              checkDailyReset(user);
              refreshNotifications(user.studentId);
          }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
  }, [user]);

  const loadData = async () => {
    try {
        const [qData, rData, eData] = await Promise.all([
            fetchQuestions(),
            fetchResources(),
            fetchExams()
        ]);
        setQuestions(qData);
        setResources(rData);
        setExams(eData);
    } catch (e) {
        console.error("Failed to load data", e);
    }
  };

  const handleLogin = async (name: string, studentId: string) => {
    try {
        const loggedUser = await login(name, studentId);
        setUser(loggedUser);
        checkDailyReset(loggedUser);
    } catch (error: any) {
        alert("登入失敗: " + error.message);
    }
  };

  const handlePostQuestion = async (q: Omit<Question, 'id' | 'replies' | 'views' | 'date'>, isAnonymous: boolean) => {
      if (!user) return;
      try {
        // If Anonymous, consume one 'card_anon'
        if (isAnonymous) {
            const cardIndex = user.inventory.indexOf('card_anon');
            if (cardIndex === -1) {
                alert("錯誤：您沒有匿名卡！");
                return;
            }
            const newInventory = [...user.inventory];
            newInventory.splice(cardIndex, 1);
            
            const updatedUser = { ...user, inventory: newInventory };
            setUser(updatedUser);
            // Wait for DB update to ensure sync
            await updateUserInDb(updatedUser);
        }

        await createQuestion(user, q.title, q.content, q.tags, q.image, isAnonymous);
        await loadData();
        setCurrentTab(Tab.HOME);
      } catch (e) {
          console.error(e);
          alert("發布失敗，請稍後再試");
          // If failure, we might want to revert the card consumption locally? 
          // Ideally, we would reload user from DB.
      }
  };

  const handleAddReply = async (qid: number, content: string, image?: string) => {
      if (!user) return;
      try {
          await createReply(user, qid, content, image);
          await loadData(); 
          
          const reward = 5;
          const newPoints = user.points + reward;
          const newLifetime = (user.lifetimePoints ?? user.points) + reward; // XP Gain

          const updatedUser: User = { 
              ...user, 
              points: newPoints,
              lifetimePoints: newLifetime,
              level: calculateLevel(newLifetime)
           };

          await updateUserInDb(updatedUser);
          setUser(updatedUser);
          
          const updatedQuestions = await fetchQuestions();
          const targetQ = updatedQuestions.find(q => q.id === qid);
          if (targetQ) setSelectedQuestion(targetQ);

      } catch(e) {
          alert("回覆失敗");
      }
  };

  const handleBuyProduct = async (product: Product) => {
      if (!user) return;
      if (user.points < product.price) {
          alert("積分不足！");
          return;
      }

      // Consumable Logic
      if (product.category === 'consumable') {
          if (product.id === 'item_heart_refill') {
              // Deduct points
              const newPoints = user.points - product.price;
              // Add heart
              const newHearts = (user.hearts || 0) + 1;
              
              const updatedUser: User = {
                  ...user,
                  points: newPoints,
                  hearts: newHearts
              };
              
              try {
                  await updateUserInDb(updatedUser);
                  setUser(updatedUser);
                  alert(`購買成功！目前遊玩次數: ${newHearts}`);
              } catch (e) {
                  console.error("Purchase error", e);
                  alert("購買失敗，請檢查網路連線");
              }
              return;
          }
      }

      // Check duplicate for non-consumable, non-stackable items
      // 'tool' (like anonymous card) and 'consumable' can be stacked/bought multiple times.
      // 'frame' and 'cosmetic' should typically be unique.
      const isStackable = product.category === 'tool' || product.category === 'consumable';
      if (!isStackable && user.inventory.includes(product.id) && product.category !== 'frame') {
          alert("您已擁有此商品");
          return;
      }

      // SPENDING: Only reduce points, do NOT reduce lifetimePoints (XP)
      const newPoints = user.points - product.price;
      
      const newInventory = [...user.inventory];
      newInventory.push(product.id);
      
      let newAvatarFrame = user.avatarFrame;
      if (product.category === 'frame') {
          newAvatarFrame = product.id;
      }

      const updatedUser: User = { 
          ...user, 
          points: newPoints, 
          // lifetimePoints remains unchanged, so Level is protected!
          inventory: newInventory,
          avatarFrame: newAvatarFrame
      };
      
      try {
          await updateUserInDb(updatedUser);
          setUser(updatedUser);
          if (product.category === 'frame') {
              alert(`購買成功！已為您換上 ${product.name}`);
          } else {
              alert(`購買成功！獲得 ${product.name}`);
          }
      } catch (e) {
          console.error("Purchase error", e);
          alert("購買失敗，請檢查網路連線");
      }
  };

  const handleMarkBest = async (qid: number, rid: number) => {
      try {
          await markBestAnswer(qid, rid);
          await loadData();
          if (selectedQuestion) setSelectedQuestion(null); 
      } catch(e) {
          alert("操作失敗");
      }
  };

  const handleFinishChallenge = async (result: GameResult) => {
      if (!user) return;
      const earnedPt = Math.floor(result.score / 50);
      
      const newPoints = user.points + earnedPt;
      const newLifetime = (user.lifetimePoints ?? user.points) + earnedPt; // XP Gain

      const updatedUser: User = { 
          ...user, 
          points: newPoints,
          lifetimePoints: newLifetime,
          level: calculateLevel(newLifetime)
      };
      
      try {
          await updateUserInDb(updatedUser);
          setUser(updatedUser);
      } catch(e) {
          console.error("Failed to update points", e);
      }
      setShowWordChallenge(false);
      setShowResistorGame(false);
  };

  const handleReport = (type: 'question' | 'reply', id: number, content: string, reason: string) => {
      const newReport: Report = {
          id: Date.now(),
          targetType: type,
          targetId: id,
          reason,
          contentSnippet: content,
          reporter: user?.name || 'Anonymous'
      };
      setReports(prev => [...prev, newReport]);
  };
  
  const handleAddResource = async (title: string, description: string, tags: string[], images: string[]) => {
      if (!user) return;
      try {
          await createResource(user, title, description, tags, images);
          
          // Reward for sharing resource
          const reward = 20;
          const newPoints = user.points + reward;
          const newLifetime = (user.lifetimePoints ?? user.points) + reward;

          const updatedUser: User = {
              ...user,
              points: newPoints,
              lifetimePoints: newLifetime,
              level: calculateLevel(newLifetime)
          };
          await updateUserInDb(updatedUser);
          setUser(updatedUser);

          await loadData();
          setCurrentTab(Tab.RESOURCE);
      } catch (e) {
          alert("發布資源失敗");
      }
  };

  const handleLikeResource = async (id: number) => {
      if (!user) return;
      const resource = resources.find(r => r.id === id);
      if (!resource) return;

      const isLiked = resource.likedBy.includes(user.name);
      let newLikes = resource.likes;
      let newLikedBy = [...resource.likedBy];

      if (isLiked) {
          newLikes--;
          newLikedBy = newLikedBy.filter(n => n !== user.name);
      } else {
          newLikes++;
          newLikedBy.push(user.name);
      }

      setResources(resources.map(r => r.id === id ? { ...r, likes: newLikes, likedBy: newLikedBy } : r));
      
      try {
          await updateResourceLikes(id, newLikes, newLikedBy);
      } catch (e) {
          console.error("Like failed", e);
      }
  };

  const handleAddExam = async (subject: string, title: string, date: string, time: string) => {
      if (!user) return;
      try {
          await createExam(user, subject, title, date, time);
          await loadData();
      } catch (e) {
          alert("新增考試失敗");
      }
  };

  const handleDeleteQuestion = async (id: number) => {
      if (!confirm("確定要刪除此問題？")) return;
      try {
          await deleteQuestion(id);
          await loadData();
          if (selectedQuestion?.id === id) setSelectedQuestion(null);
      } catch (e) {
          alert("刪除失敗");
      }
  };

  const handleDeleteReply = async (id: number) => {
      if (!confirm("確定要刪除此回覆？")) return;
      try {
          await deleteReply(id);
          await loadData();
          if (selectedQuestion) {
               const updatedQuestions = await fetchQuestions();
               const q = updatedQuestions.find(q => q.id === selectedQuestion.id);
               if(q) setSelectedQuestion(q);
          }
      } catch (e) {
          alert("刪除失敗");
      }
  };
  
  const handleDeleteResource = async (id: number) => {
      if (!confirm("確定要刪除此資源？")) return;
      try {
          await deleteResource(id);
          await loadData();
          if (selectedResource?.id === id) setSelectedResource(null);
      } catch (e) {
          alert("刪除失敗");
      }
  };

  const handleDeleteExam = async (id: number) => {
      if (!confirm("確定要刪除此考試？")) return;
      try {
          await deleteExam(id);
          await loadData();
      } catch (e) {
          alert("刪除失敗");
      }
  };

  const handleBanUser = async (studentId: string) => {
      try {
          await banUser(studentId);
          alert(`用戶 ${studentId} 已停權`);
      } catch (e) {
          alert("操作失敗");
      }
  };

  const handleUnbanUser = async (studentId: string) => {
      try {
          await unbanUser(studentId);
          alert(`用戶 ${studentId} 已解除停權`);
      } catch (e) {
          alert("操作失敗");
      }
  };

  const handleDeleteContent = async (type: 'question' | 'reply' | 'resource' | 'exam', id: number) => {
      try {
          switch(type) {
              case 'question': await deleteQuestion(id); break;
              case 'reply': await deleteReply(id); break;
              case 'resource': await deleteResource(id); break;
              case 'exam': await deleteExam(id); break;
          }
          await loadData();
          setReports(prev => prev.filter(r => !(r.targetType === type && r.targetId === id)));
      } catch (e) {
          alert("刪除失敗");
      }
  };

  // Handle clicking a notification
  const handleNotificationClick = async (notif: Notification) => {
      setShowNotificationScreen(false); // Close list
      if (notif.type === 'reply' && notif.link) {
          // Navigate to Question
          const qId = parseInt(notif.link);
          const question = questions.find(q => q.id === qId);
          if (question) {
              setSelectedQuestion(question);
              pushHistory();
          } else {
              // Might need to refetch if it's new
              const updatedQuestions = await fetchQuestions();
              const freshQ = updatedQuestions.find(q => q.id === qId);
              if (freshQ) {
                setQuestions(updatedQuestions);
                setSelectedQuestion(freshQ);
                pushHistory();
              }
          }
      }
  };

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center space-y-4">
            <RefreshCw className="animate-spin text-blue-600" size={40} />
            <p className="text-gray-500 text-sm">正在連接至電子三乙資料庫...</p>
        </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen transition-colors">
      
      {lightboxImage && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
            onClick={() => {
                setLightboxImage(null);
            }}
          >
              <button className="absolute top-6 right-6 text-white bg-white/10 p-2 rounded-full hover:bg-white/20 transition-colors">
                  <X size={24} />
              </button>
              <img 
                src={lightboxImage} 
                alt="Zoomed Content" 
                className="max-w-full max-h-full object-contain p-4 cursor-zoom-out" 
              />
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
              onNotificationClick={handleNotificationClick}
          />
      )}

      {showWordChallenge && (
        <WordChallengeScreen 
            user={user}
            words={WORD_DATABASE}
            onBack={() => setShowWordChallenge(false)}
            onFinish={handleFinishChallenge}
            onUpdateHearts={async (hearts) => {
                const updated = { ...user, hearts };
                setUser(updated);
                await updateUserInDb(updated);
            }}
        />
      )}
      
      {showResistorGame && (
          <ResistorGameScreen 
              user={user}
              onBack={() => setShowResistorGame(false)}
              onFinish={handleFinishChallenge}
              onUpdateHearts={async (hearts) => {
                  const updated = { ...user, hearts };
                  setUser(updated);
                  await updateUserInDb(updated);
              }}
          />
      )}
      
      {selectedQuestion && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
             <QuestionDetailScreen 
                question={selectedQuestion} 
                currentUser={user} 
                onBack={() => setSelectedQuestion(null)}
                onAddReply={handleAddReply}
                onReport={handleReport}
                onMarkBest={handleMarkBest}
                onImageClick={(url) => {
                    pushHistory();
                    setLightboxImage(url);
                }}
             />
        </div>
      )}

      {selectedResource && (
        <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
             <ResourceDetailScreen 
                resource={selectedResource} 
                currentUser={user} 
                onBack={() => setSelectedResource(null)}
                onLike={handleLikeResource}
                onImageClick={(url) => {
                    pushHistory();
                    setLightboxImage(url);
                }}
             />
        </div>
      )}

      {showLeaderboardOverlay ? (
          <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 pt-safe flex flex-col">
               <div className="flex items-center justify-between p-4 border-b border-gray-100 dark:border-gray-800 mt-2">
                   <h2 className="font-bold text-lg text-gray-800 dark:text-white">全班等級排名</h2>
                   <button 
                        onClick={() => setShowLeaderboardOverlay(false)} 
                        className="text-blue-600 dark:text-blue-400 font-bold px-4 py-1 hover:bg-blue-50 dark:hover:bg-gray-800 rounded transition-colors"
                   >
                       返回
                   </button>
               </div>
               <div className="flex-1 overflow-hidden">
                  <LeaderboardScreen currentUser={user} />
               </div>
          </div>
      ) : showModeration ? (
          <div className="fixed inset-0 z-40 bg-white dark:bg-gray-900 overflow-y-auto">
              <ModerationScreen 
                user={user}
                reports={reports}
                allQuestions={questions}
                allResources={resources}
                allExams={exams}
                onBack={() => setShowModeration(false)}
                onBanUser={handleBanUser}
                onUnbanUser={handleUnbanUser}
                onDeleteContent={handleDeleteContent}
              />
          </div>
      ) : (
          <>
            <Header 
                user={user} 
                onOpenNotifications={() => {
                    pushHistory();
                    setShowNotificationScreen(true);
                }}
                unreadCount={unreadNotifications}
            />

            <div className="pb-20">
                {currentTab === Tab.HOME && (
                    <HomeScreen 
                        questions={questions} 
                        onQuestionClick={(q) => {
                            pushHistory();
                            setSelectedQuestion(q);
                        }}
                        onAskClick={() => {
                            pushHistory();
                            setCurrentTab(Tab.ASK);
                        }}
                        onNavigateToPlayground={() => {
                            // Correct navigation with reset
                            handleTabChange(Tab.PLAYGROUND);
                        }}
                        onOpenLeaderboard={() => {
                            pushHistory();
                            setShowLeaderboardOverlay(true);
                        }}
                        onOpenCheckIn={() => {
                            pushHistory();
                            setShowCheckInModal(true);
                        }}
                        onRefresh={loadData}
                        onImageClick={(url) => {
                            pushHistory();
                            setLightboxImage(url);
                        }}
                    />
                )}
                {currentTab === Tab.RESOURCE && (
                    <ResourceScreen 
                        resources={resources}
                        currentUser={user}
                        onAddResource={handleAddResource}
                        onLikeResource={handleLikeResource}
                        onResourceClick={(r) => {
                            pushHistory();
                            setSelectedResource(r);
                        }}
                        onRefresh={loadData}
                        onImageClick={(url) => {
                            pushHistory();
                            setLightboxImage(url);
                        }}
                    />
                )}
                {currentTab === Tab.PLAYGROUND && (
                    <PlaygroundScreen 
                        user={user}
                        onOpenWordChallenge={() => {
                            pushHistory();
                            setShowWordChallenge(true);
                        }}
                        onOpenResistorGame={() => {
                            pushHistory();
                            setShowResistorGame(true);
                        }}
                    />
                )}
                {currentTab === Tab.EXAM && (
                    <ExamScreen 
                        exams={exams} 
                        onAddExam={handleAddExam}
                        onDeleteExam={handleDeleteExam}
                    />
                )}
                {currentTab === Tab.STORE && (
                    <ShopScreen user={user} onBuy={handleBuyProduct} />
                )}
                {currentTab === Tab.PROFILE && (
                    <ProfileScreen 
                        user={user} 
                        setUser={async (newUser) => {
                            setUser(newUser);
                            await updateUserInDb(newUser);
                        }}
                        onNavigateToModeration={() => {
                            pushHistory();
                            setShowModeration(true);
                        }}
                        onNavigateToLeaderboard={() => {
                            pushHistory();
                            setShowLeaderboardOverlay(true);
                        }}
                        onOpenCheckIn={() => {
                            pushHistory();
                            setShowCheckInModal(true);
                        }}
                        onLogout={() => { logout(); setUser(null); }}
                        isDarkMode={user.settings?.darkMode || false}
                        toggleDarkMode={async () => {
                            const newSettings = { 
                                ...user.settings!, 
                                darkMode: !user.settings?.darkMode 
                            };
                            const updated = { ...user, settings: newSettings };
                            setUser(updated);
                            await updateUserInDb(updated);
                        }}
                        userQuestions={questions.filter(q => q.author === user.name)}
                        userReplies={questions.filter(q => q.replies.some(r => r.author === user.name))}
                        userResources={resources.filter(r => r.author === user.name)}
                        onDeleteQuestion={handleDeleteQuestion}
                        onDeleteReply={handleDeleteReply}
                        onDeleteResource={handleDeleteResource}
                    />
                )}
                {currentTab === Tab.ASK && (
                    <AskScreen 
                        user={user}
                        onPostQuestion={handlePostQuestion} 
                        onImageClick={(url) => {
                            pushHistory();
                            setLightboxImage(url);
                        }}
                    />
                )}
            </div>

            <BottomNav currentTab={currentTab} setTab={handleTabChange} />
          </>
      )}
    </div>
  );
};

export default App;