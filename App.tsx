import React, { useState, useEffect } from 'react';
import { BottomNav } from './components/BottomNav';
import { InstallModal } from './components/InstallModal';
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
import { CheckInModal } from './components/CheckInModal';
import { Tab, User, Question, Report, Product, Resource, Exam, GameResult } from './types';
import { RefreshCw, X, ZoomIn } from 'lucide-react';

// Services
import { WORD_DATABASE } from './services/mockData'; 
import { calculateLevel } from './services/levelService';
import { login, updateUserInDb, checkSession, logout } from './services/authService';
import { 
    fetchQuestions, createQuestion, deleteQuestion, createReply, deleteReply, markBestAnswer, 
    fetchResources, createResource, deleteResource, updateResourceLikes,
    fetchExams, createExam, deleteExam, banUser, unbanUser
} from './services/dataService';

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

const Header = ({ user }: { user: User }) => (
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
                    style={{ width: `${(user.points % 500) / 5}%` }}
                ></div>
            </div>
        </div>
    </div>
    
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
);

const App = () => {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setCurrentTab] = useState<Tab>(Tab.HOME);
  const [isLoading, setIsLoading] = useState(true);
  
  // Data States
  const [questions, setQuestions] = useState<Question[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [reports, setReports] = useState<Report[]>([]);

  // UI States
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [showLeaderboardOverlay, setShowLeaderboardOverlay] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [showWordChallenge, setShowWordChallenge] = useState(false);
  const [showResistorGame, setShowResistorGame] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showInstallModal, setShowInstallModal] = useState(false);
  
  // Global Lightbox
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Init
  useEffect(() => {
    const initSession = async () => {
        try {
            const sessionUser = await checkSession();
            if (sessionUser) {
                setUser(sessionUser);
                // Check for daily reset when session loads
                checkDailyReset(sessionUser);
            }
        } catch (e) {
            console.error("Session check failed", e);
        } finally {
            setIsLoading(false);
        }
    };
    initSession();
    loadData();
    
    // Simulating install prompt check
    if (Math.random() > 0.7) {
        setShowInstallModal(true);
    }
  }, []);

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
            // alert("新的一天！愛心已補滿 ❤️");
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

    const updatedUser = {
        ...user,
        points: user.points + reward,
        lastCheckInDate: today,
        checkInStreak: newStreak
    };

    try {
        await updateUserInDb(updatedUser);
        setUser(updatedUser);
        // alert(`簽到成功！獲得 ${reward} PT (連續 ${newStreak} 天)`);
    } catch (e) {
        alert("簽到失敗，請檢查網路");
    }
  };

  // Visibility change handler for auto-refresh when returning to app
  useEffect(() => {
      const handleVisibilityChange = () => {
          if (document.visibilityState === 'visible' && user) {
              checkDailyReset(user);
          }
      };
      document.addEventListener("visibilitychange", handleVisibilityChange);
      return () => {
          document.removeEventListener("visibilitychange", handleVisibilityChange);
      };
  }, [user]);

  const loadData = async () => {
    try {
        // Real data fetch - no artificial delays
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

  const handlePostQuestion = async (q: Omit<Question, 'id' | 'replies' | 'views' | 'date'>) => {
      if (!user) return;
      try {
        await createQuestion(user, q.title, q.content, q.tags, q.image);
        await loadData();
        setCurrentTab(Tab.HOME);
      } catch (e) {
          alert("發布失敗，請稍後再試");
      }
  };

  const handleAddReply = async (qid: number, content: string, image?: string) => {
      if (!user) return;
      try {
          await createReply(user, qid, content, image);
          // Update local state optimistically or reload
          await loadData(); 
          
          // Give User Points (5pt for reply)
          const newPoints = user.points + 5;
          const updatedUser = { ...user, points: newPoints };
          await updateUserInDb(updatedUser);
          setUser(updatedUser);
          
          // Update currently selected question
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

      // Optimistic checks
      if (user.inventory.includes(product.id) && product.category !== 'frame') {
          alert("您已擁有此商品");
          return;
      }

      const newPoints = user.points - product.price;
      const newInventory = [...user.inventory];
      if (!newInventory.includes(product.id)) {
          newInventory.push(product.id);
      }
      
      // Auto-equip frames
      let newAvatarFrame = user.avatarFrame;
      if (product.category === 'frame') {
          newAvatarFrame = product.id;
      }

      const updatedUser = { 
          ...user, 
          points: newPoints, 
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
          // Award Points logic would go here (handled by DB triggers or separate update)
          if (selectedQuestion) setSelectedQuestion(null); // Close detail to refresh
      } catch(e) {
          alert("操作失敗");
      }
  };

  const handleFinishChallenge = async (result: GameResult) => {
      if (!user) return;
      // Calculate points: score / 50
      const earnedPt = Math.floor(result.score / 50);
      const newPoints = user.points + earnedPt;
      const updatedUser = { ...user, points: newPoints };
      
      try {
          await updateUserInDb(updatedUser);
          setUser(updatedUser);
      } catch(e) {
          console.error("Failed to update points", e);
      }
      setShowWordChallenge(false);
      setShowResistorGame(false);
  };

  // --- Missing Handlers ---

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
      // In a real app, send to server here
  };
  
  const handleAddResource = async (title: string, description: string, tags: string[], images: string[]) => {
      if (!user) return;
      try {
          await createResource(user, title, description, tags, images);
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

      // Optimistic update
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

  // Moderation Handlers
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

  // --- Render ---

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
      
      {/* Global Lightbox Overlay */}
      {lightboxImage && (
          <div 
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-sm flex items-center justify-center animate-in fade-in duration-200"
            onClick={() => setLightboxImage(null)}
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

      {/* Modals & Overlays */}
      <InstallModal isOpen={showInstallModal} onClose={() => setShowInstallModal(false)} />
      
      <CheckInModal 
        isOpen={showCheckInModal} 
        onClose={() => setShowCheckInModal(false)} 
        onCheckIn={handleCheckIn}
        streak={user.checkInStreak || 0}
        isCheckedInToday={user.lastCheckInDate === new Date().toDateString()}
      />

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
                onImageClick={setLightboxImage}
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
                onImageClick={setLightboxImage}
             />
        </div>
      )}

      {/* Conditional Full Screen Views */}
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
            <Header user={user} />

            <div className="pb-20">
                {currentTab === Tab.HOME && (
                    <HomeScreen 
                        questions={questions} 
                        onQuestionClick={setSelectedQuestion}
                        onAskClick={() => setCurrentTab(Tab.ASK)}
                        onStartChallenge={() => setShowWordChallenge(true)}
                        onOpenLeaderboard={() => setShowLeaderboardOverlay(true)}
                        onOpenCheckIn={() => setShowCheckInModal(true)}
                        onRefresh={loadData}
                        onImageClick={setLightboxImage}
                    />
                )}
                {currentTab === Tab.RESOURCE && (
                    <ResourceScreen 
                        resources={resources}
                        currentUser={user}
                        onAddResource={handleAddResource}
                        onLikeResource={handleLikeResource}
                        onResourceClick={setSelectedResource}
                        onRefresh={loadData}
                        onImageClick={setLightboxImage}
                    />
                )}
                {currentTab === Tab.PLAYGROUND && (
                    <PlaygroundScreen 
                        user={user}
                        onOpenWordChallenge={() => setShowWordChallenge(true)}
                        onOpenResistorGame={() => setShowResistorGame(true)}
                    />
                )}
                {currentTab === Tab.EXAM && (
                    // We keep this route accessible even if not in bottom nav directly
                    // Or we could fully remove it. Let's keep it but it might only be reachable if we added a link elsewhere.
                    // For now, Playgound replaces it in Nav.
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
                        setUser={setUser}
                        onNavigateToModeration={() => setShowModeration(true)}
                        onNavigateToLeaderboard={() => setShowLeaderboardOverlay(true)}
                        onOpenCheckIn={() => setShowCheckInModal(true)}
                        onLogout={() => { logout(); setUser(null); }}
                        isDarkMode={user.settings?.darkMode || false}
                        toggleDarkMode={async () => {
                            const newSettings = { 
                                ...user.settings!, 
                                darkMode: !user.settings?.darkMode 
                            };
                            const updated = { ...user, settings: newSettings };
                            setUser(updated);
                            // Strictly await the DB update to prevent loss on reload
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
                        onPostQuestion={handlePostQuestion} 
                        onImageClick={setLightboxImage}
                    />
                )}
            </div>

            <BottomNav currentTab={currentTab} setTab={setCurrentTab} />
          </>
      )}
    </div>
  );
};

export default App;