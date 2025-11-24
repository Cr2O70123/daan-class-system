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
import { Tab, User, Question, Report, Product, Resource, Exam, GameResult } from './types';
import { WifiOff, RefreshCcw } from 'lucide-react';

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
      default: return 'ring-2 ring-white dark:ring-gray-700';
    }
};

const Header = ({ user }: { user: User }) => (
  <div className="bg-white dark:bg-gray-800 px-4 py-3 sticky top-0 z-20 shadow-sm flex justify-between items-center transition-colors">
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
      <div className={`${user.avatarColor} w-8 h-8 text-white rounded-full flex items-center justify-center text-sm font-bold ${getFrameStyle(user.avatarFrame)} overflow-hidden bg-cover bg-center`}>
        {user.avatarImage ? (
          <img src={user.avatarImage} alt="avatar" className="w-full h-full object-cover" />
        ) : (
          user.name.charAt(0)
        )}
      </div>
    </div>
  </div>
);

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentTab, setTab] = useState<Tab>(Tab.HOME);
  const [darkMode, setDarkMode] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  
  // Data State
  const [questions, setQuestions] = useState<Question[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Navigation Stack
  const [showModeration, setShowModeration] = useState(false);
  const [showLeaderboardOverlay, setShowLeaderboardOverlay] = useState(false);
  const [showWordChallenge, setShowWordChallenge] = useState(false);

  // --- Effects ---

  // Auto Login Check
  useEffect(() => {
    const tryAutoLogin = async () => {
        setIsLoading(true);
        try {
            const sessionUser = await checkSession();
            if (sessionUser) {
                setUser(sessionUser);
                await loadAllData();
            }
        } catch (e: any) {
             if (e.message && e.message.includes("SESSION_ERROR")) {
                 console.error("Auto login error:", e);
                 setConnectionError(true);
             }
        }
        setIsLoading(false);
    };
    tryAutoLogin();
  }, []);

  const loadAllData = async () => {
      try {
          const [qs, rs, es] = await Promise.all([
              fetchQuestions(),
              fetchResources(),
              fetchExams()
          ]);
          setQuestions(qs);
          setResources(rs);
          setExams(es);
          setConnectionError(false);
      } catch (e) {
          console.error("Data Fetch Failed:", e);
          setConnectionError(true);
      }
  };

  // Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Level Recalculation Effect
  useEffect(() => {
    if (user) {
        const newLevel = calculateLevel(user.points);
        if (newLevel !== user.level) {
            setUser(prev => prev ? ({ ...prev, level: newLevel }) : null);
        }
    }
  }, [user?.points]);

  // Heart Daily Reset Check
  useEffect(() => {
    const checkReset = async () => {
        if (!user) return;
        
        // Use string comparison for dates (e.g. "Mon Nov 30 2023")
        const today = new Date().toDateString();
        const lastReset = user.lastHeartReset;

        // Reset if stored date is different from today (String comparison)
        if (lastReset !== today) {
            console.log(`[Reset Check] Last: ${lastReset}, Today: ${today}. Resetting...`);
            
            // Optimistic update
            const updatedUser = { ...user, hearts: 3, lastHeartReset: today };
            setUser(updatedUser); 
            
            try {
                // Persist to DB
                await updateUserInDb(updatedUser);
                alert("✨ 新的一天！遊戲愛心已補滿 (3/3)！");
            } catch (e: any) {
                console.error("Reset hearts DB sync failed:", e);
                // If DB fails, we might want to revert, but for hearts it's better to fail open usually, 
                // or just alert the user to check connection.
                alert(`愛心重置同步失敗: ${e.message}`);
            }
        }
    };
    
    // 1. Check immediately on load/user change
    checkReset();
    
    // 2. Check every minute (if user keeps tab open across midnight)
    const interval = setInterval(checkReset, 60000); 

    // 3. Check when window regains focus (e.g. user switches tabs and comes back next day)
    window.addEventListener('focus', checkReset);

    return () => {
        clearInterval(interval);
        window.removeEventListener('focus', checkReset);
    };
  }, [user?.studentId, user?.lastHeartReset]); 

  // --- Handlers ---

  const handleLogin = async (name: string, studentId: string) => {
    try {
        const loggedInUser = await login(name, studentId);
        setUser(loggedInUser);
        await loadAllData();
    } catch (e: any) {
        if (e.message === "ACCOUNT_BANNED") {
            alert("此帳號已被停權，請聯絡管理員。");
        } else if (e.message && e.message.includes("DB_ERROR")) {
            alert(`連線錯誤: ${e.message}`);
        } else {
            alert(`登入失敗: ${e.message || "未知錯誤"}`);
        }
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setTab(Tab.HOME);
    setShowModeration(false);
    setSelectedQuestion(null);
    setSelectedResource(null);
    setShowWordChallenge(false);
    setDarkMode(false);
  };

  const handleUpdateUser = async (updatedUser: User) => {
    try {
        await updateUserInDb(updatedUser);
        setUser(updatedUser);
    } catch (e) {
        alert("資料更新失敗，請檢查網路連線");
    }
  };

  const handleHeartUpdate = async (newHearts: number) => {
      if(!user) return;
      const updatedUser = { ...user, hearts: newHearts };
      try {
          await updateUserInDb(updatedUser);
          // Only update UI state if DB write succeeded
          setUser(updatedUser);
      } catch (e: any) {
          console.error("Update hearts failed", e);
          alert(`更新愛心失敗: ${e.message}\n請確認 SQL 資料庫已執行更新指令。`);
      }
  };

  const handlePostQuestion = async (newQ: Omit<Question, 'id' | 'replies' | 'views' | 'date'>) => {
    if (!user) return;
    try {
        await createQuestion(user, newQ.title, newQ.content, newQ.tags, newQ.image);
        await loadAllData();
        setTab(Tab.HOME);
        
        if(!user.isAdmin) {
             const updatedUser = {...user, points: user.points + 5};
             await updateUserInDb(updatedUser); // Await DB logic
             setUser(updatedUser);
        }
    } catch (e: any) {
        alert(`發佈失敗: ${e.message || JSON.stringify(e)}`);
    }
  };

  const handleDeleteQuestion = async (id: number) => {
      if (!confirm("確定要刪除這個問題嗎？")) return;
      try {
          await deleteQuestion(id);
          await loadAllData();
          setSelectedQuestion(null);
      } catch (e) {
          alert("刪除失敗");
      }
  };

  const handleDeleteReply = async (id: number) => {
      if (!confirm("確定要刪除這個回覆嗎？")) return;
      try {
          await deleteReply(id);
          await loadAllData();
          if (selectedQuestion) {
              const updatedQs = await fetchQuestions();
              const q = updatedQs.find(q => q.id === selectedQuestion.id);
              if (q) setSelectedQuestion(q);
          }
      } catch (e) {
          alert("刪除失敗");
      }
  };

  const handleDeleteResource = async (id: number) => {
      if (!confirm("確定要刪除這個資源嗎？")) return;
      try {
          await deleteResource(id);
          await loadAllData();
          setSelectedResource(null);
      } catch (e) {
          alert("刪除失敗");
      }
  };

  const handleDeleteExam = async (id: number) => {
      if (!confirm("確定要刪除這個考試嗎？")) return;
      try {
          await deleteExam(id);
          await loadAllData();
      } catch (e) {
          alert("刪除失敗");
      }
  };

  const handleAddReply = async (questionId: number, content: string, image?: string) => {
    if (!user) return;
    try {
        await createReply(user, questionId, content, image);
        const updatedQuestions = await fetchQuestions();
        setQuestions(updatedQuestions);
        
        const updatedQ = updatedQuestions.find(q => q.id === questionId);
        if (updatedQ) setSelectedQuestion(updatedQ);

        if (!user.isAdmin) {
            const updatedUser = {...user, points: user.points + 10};
            await updateUserInDb(updatedUser); // Await DB logic
            setUser(updatedUser);
        }
        alert(`回答成功！獲得 10 PT`);
    } catch (e) {
        alert("回覆失敗");
    }
  };

  const handleMarkBest = async (questionId: number, replyId: number) => {
    if (!user) return;
    try {
        await markBestAnswer(questionId, replyId);
        await loadAllData();
        
        const updatedQs = await fetchQuestions();
        const updatedQ = updatedQs.find(q => q.id === questionId);
        if (updatedQ) setSelectedQuestion(updatedQ);

        if (!user.isAdmin) {
            const updatedUser = {...user, points: user.points + 10};
            await updateUserInDb(updatedUser); // Await DB logic
            setUser(updatedUser);
        }
        alert(`已選為最佳解答！`);
    } catch (e) {
        alert("操作失敗");
    }
  };

  const handleReport = (type: 'question' | 'reply', id: number, contentSnippet: string, reason: string) => {
    if(!user) return;
    const newReport: Report = {
        id: Date.now(),
        targetType: type,
        targetId: id,
        contentSnippet: contentSnippet.substring(0, 50) + '...',
        reason: reason,
        reporter: user.name
    };
    setReports([...reports, newReport]);
  };

  const handleBanUser = async (studentId: string) => {
      try {
          await banUser(studentId);
          alert(`使用者 ${studentId} 已停權`);
      } catch(e) {
          alert("停權失敗");
      }
  };

  const handleUnbanUser = async (studentId: string) => {
      try {
          await unbanUser(studentId);
          alert(`使用者 ${studentId} 已解除停權`);
      } catch(e) {
          alert("解除失敗");
      }
  };

  const handleBuyProduct = async (product: Product) => {
    if(!user) return;
    const isOwned = user.inventory.includes(product.id) || user.avatarFrame === product.id || user.nameColor === product.color;
    if (isOwned) {
        // Just switching equipment (cosmetic/frame), no point deduction
        if (product.category === 'frame') {
            const u = { ...user, avatarFrame: product.id };
            try {
                await updateUserInDb(u);
                setUser(u);
                alert(`已裝備：${product.name}`);
            } catch (e: any) { alert(`裝備失敗: ${e.message}`); }
        } else if (product.category === 'cosmetic') {
            const textClass = product.color.split(' ').find(c => c.startsWith('text-'));
            const u = { ...user, nameColor: textClass };
            try {
                await updateUserInDb(u);
                setUser(u);
                alert(`已啟用：${product.name}`);
            } catch (e: any) { alert(`啟用失敗: ${e.message}`); }
        }
        return;
    }
    
    if(user.points >= product.price) {
        // Buying new item
        let updatedUser = {
            ...user,
            points: user.isAdmin ? user.points : user.points - product.price,
            inventory: [...user.inventory, product.id]
        };
        if (product.category === 'frame') updatedUser.avatarFrame = product.id;
        else if (product.category === 'cosmetic') {
             const textClass = product.color.split(' ').find(c => c.startsWith('text-'));
             updatedUser.nameColor = textClass;
        }
        
        try {
            await updateUserInDb(updatedUser); // Critical: Await this
            setUser(updatedUser);
            alert(`購買成功：${product.name}`);
        } catch (e: any) {
            alert(`購買失敗: ${e.message}`);
        }
    } else {
        alert("積分不足！");
    }
  };

  const handleAddResource = async (title: string, description: string, tags: string[], images: string[]) => {
      if(!user) return;
      try {
          await createResource(user, title, description, tags, images);
          await loadAllData();

          if(!user.isAdmin) {
              const u = {...user, points: user.points + 20};
              await updateUserInDb(u); // Await DB
              setUser(u);
          }
          alert('發佈成功！獲得 20 PT');
      } catch (e) {
          alert("發佈失敗");
      }
  };

  const handleLikeResource = async (resourceId: number) => {
      if(!user) return;
      const res = resources.find(r => r.id === resourceId);
      if (!res) return;

      const hasLiked = res.likedBy.includes(user.name);
      const newLikedBy = hasLiked 
        ? res.likedBy.filter(name => name !== user.name) 
        : [...res.likedBy, user.name];
      
      setResources(resources.map(r => r.id === resourceId ? { ...r, likes: newLikedBy.length, likedBy: newLikedBy } : r));
      if (selectedResource?.id === resourceId) {
          setSelectedResource({ ...selectedResource, likes: newLikedBy.length, likedBy: newLikedBy });
      }

      await updateResourceLikes(resourceId, newLikedBy.length, newLikedBy);
  };

  const handleAddExam = async (subject: string, title: string, date: string, time: string) => {
      if(!user) return;
      try {
          await createExam(user, subject, title, date, time);
          await loadAllData();
      } catch (e) {
          alert("新增失敗");
      }
  };

  const handleFinishChallenge = async (result: GameResult) => {
      if (!user) return;
      const pointsWon = Math.floor(result.score / 50); 
      if (!user.isAdmin && pointsWon > 0) {
          const u = { ...user, points: user.points + pointsWon };
          try {
            await updateUserInDb(u); // Sync to Cloud
            setUser(u); // Then Sync to UI
          } catch (e: any) {
            console.error("Failed to sync points", e);
            alert(`積分同步失敗: ${e.message}\n(可能原因：資料庫缺少欄位，請執行 SQL 更新)`);
          }
      }
  };

  // --- Render ---

  if (connectionError) {
      return (
          <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-6 text-center">
              <div className="bg-red-100 p-6 rounded-full text-red-500 mb-6">
                  <WifiOff size={48} />
              </div>
              <h2 className="text-xl font-bold text-gray-800 mb-2">無法連接伺服器</h2>
              <p className="text-gray-500 mb-6">請檢查您的網路連線，或稍後再試。</p>
              <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2">
                  <RefreshCcw size={18} /> 重新整理
              </button>
          </div>
      );
  }

  if (isLoading && !user) {
      return (
          <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center">
              <div className="text-gray-500 font-bold animate-pulse">系統載入中...</div>
          </div>
      );
  }

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const commonLayoutClasses = `${darkMode ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 min-h-screen`;

  if (showModeration) {
    return (
        <div className={commonLayoutClasses}>
            <main className="w-full max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen shadow-xl relative flex flex-col">
                <ModerationScreen 
                    user={user} 
                    reports={reports}
                    allQuestions={questions}
                    allResources={resources}
                    allExams={exams}
                    onBack={() => setShowModeration(false)}
                    onBanUser={handleBanUser}
                    onUnbanUser={handleUnbanUser}
                    onDeleteContent={(type, id) => {
                        if (type === 'question') handleDeleteQuestion(id);
                        else if (type === 'reply') handleDeleteReply(id);
                        else if (type === 'resource') handleDeleteResource(id);
                        else if (type === 'exam') handleDeleteExam(id);
                    }}
                />
            </main>
        </div>
    );
  }
  
  if (showWordChallenge) {
    return (
        <div className={commonLayoutClasses}>
             <main className="w-full max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen shadow-xl relative flex flex-col">
                <WordChallengeScreen 
                    user={user}
                    words={WORD_DATABASE}
                    onBack={() => setShowWordChallenge(false)}
                    onFinish={handleFinishChallenge}
                    onUpdateHearts={handleHeartUpdate}
                />
             </main>
        </div>
    );
  }
  
  if (showLeaderboardOverlay) {
      return (
        <div className={commonLayoutClasses}>
             <main className="w-full max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen shadow-xl relative flex flex-col">
                <div className="bg-white dark:bg-gray-800 p-4 flex items-center shadow-sm sticky top-0 z-30">
                    <button onClick={() => setShowLeaderboardOverlay(false)} className="text-blue-600 font-bold">返回</button>
                    <h1 className="flex-1 text-center font-bold text-gray-800 dark:text-white">班級風雲榜</h1>
                    <div className="w-8"></div>
                </div>
                <LeaderboardScreen currentUser={user} />
             </main>
        </div>
      );
  }

  if (selectedQuestion) {
    return (
      <div className={commonLayoutClasses}>
            <main className="w-full max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen shadow-xl relative flex flex-col">
                <QuestionDetailScreen 
                question={selectedQuestion}
                currentUser={user}
                onBack={() => setSelectedQuestion(null)}
                onAddReply={handleAddReply}
                onReport={handleReport}
                onMarkBest={handleMarkBest}
                />
            </main>
      </div>
    );
  }

  if (selectedResource) {
    return (
      <div className={commonLayoutClasses}>
            <main className="w-full max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen shadow-xl relative flex flex-col">
                <ResourceDetailScreen 
                    resource={selectedResource}
                    currentUser={user}
                    onBack={() => setSelectedResource(null)}
                    onLike={handleLikeResource}
                />
            </main>
      </div>
    );
  }

  const renderScreen = () => {
    switch (currentTab) {
      case Tab.HOME: 
      case Tab.ASK:
        if (currentTab === Tab.ASK) return <AskScreen onPostQuestion={handlePostQuestion} />;
        return <HomeScreen 
                    questions={questions} 
                    onQuestionClick={setSelectedQuestion} 
                    onAskClick={() => setTab(Tab.ASK)}
                    onStartChallenge={() => setShowWordChallenge(true)}
                    onOpenLeaderboard={() => setShowLeaderboardOverlay(true)}
               />;
      case Tab.RESOURCE:
        return <ResourceScreen 
                  resources={resources} 
                  onAddResource={handleAddResource} 
                  onLikeResource={handleLikeResource}
                  onResourceClick={setSelectedResource}
                  currentUser={user}
                />;
      case Tab.EXAM:
        return <ExamScreen exams={exams} onAddExam={handleAddExam} onDeleteExam={handleDeleteExam} />;
      case Tab.STORE: 
        return <ShopScreen user={user} onBuy={handleBuyProduct} />;
      case Tab.PROFILE: 
        return <ProfileScreen 
                    user={user} 
                    setUser={handleUpdateUser}
                    onNavigateToModeration={() => setShowModeration(true)}
                    onNavigateToLeaderboard={() => setShowLeaderboardOverlay(true)}
                    onLogout={handleLogout}
                    isDarkMode={darkMode}
                    toggleDarkMode={() => setDarkMode(!darkMode)}
                    userQuestions={questions.filter(q => q.author === user.name)}
                    userReplies={questions.filter(q => q.replies.some(r => r.author === user.name))}
                    userResources={resources.filter(r => r.author === user.name)}
                    onDeleteQuestion={handleDeleteQuestion}
                    onDeleteReply={handleDeleteReply}
                    onDeleteResource={handleDeleteResource}
               />;
      default: 
        return <HomeScreen questions={questions} onQuestionClick={setSelectedQuestion} onAskClick={() => setTab(Tab.ASK)} />;
    }
  };

  return (
    <div className={commonLayoutClasses}>
        <main className="max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen shadow-xl relative flex flex-col transition-colors duration-300">
            <Header user={user} />
            <div className="flex-1 overflow-y-auto">
                {renderScreen()}
            </div>
            <BottomNav 
                currentTab={currentTab === Tab.ASK ? Tab.HOME : currentTab} 
                setTab={setTab} 
            />
        </main>
    </div>
  );
}