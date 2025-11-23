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

// Services
import { WORD_DATABASE, GAME_WEEKLY_LEADERBOARD } from './services/mockData'; // Word DB can stay mock for now
import { calculateLevel } from './services/levelService';
import { login, updateUserInDb } from './services/authService';
import { 
    fetchQuestions, createQuestion, createReply, markBestAnswer, 
    fetchResources, createResource, updateResourceLikes,
    fetchExams, createExam 
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
        {/* Level Indicator */}
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
  
  // Data State - Initialize empty, fetch via Effect
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

  // Dark Mode
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Load Data on Mount (or when user logs in)
  useEffect(() => {
      const loadData = async () => {
          setIsLoading(true);
          const [qs, rs, es] = await Promise.all([
              fetchQuestions(),
              fetchResources(),
              fetchExams()
          ]);
          setQuestions(qs);
          setResources(rs);
          setExams(es);
          setIsLoading(false);
      };
      
      // Load data immediately or only if user is logged in?
      // Better to load publicly visible data anyway
      loadData();
  }, [user]); // Reload if user changes (optional, but good for syncing)

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
    const checkReset = () => {
        if (!user) return;
        const today = new Date().toDateString();
        if (user.lastHeartReset !== today) {
            const updatedUser = { ...user, hearts: 3, lastHeartReset: today };
            setUser(updatedUser);
            updateUserInDb(updatedUser);
        }
    };
    const interval = setInterval(checkReset, 60000); 
    checkReset(); 
    return () => clearInterval(interval);
  }, [user?.name]); 

  // --- Handlers ---

  const handleLogin = async (name: string, studentId: string) => {
    try {
        const loggedInUser = await login(name, studentId);
        setUser(loggedInUser);
    } catch (e) {
        alert("登入失敗，請檢查網路連線");
        console.error(e);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setTab(Tab.HOME);
    setShowModeration(false);
    setSelectedQuestion(null);
    setSelectedResource(null);
    setShowWordChallenge(false);
    setDarkMode(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    updateUserInDb(updatedUser);
  };

  const handleHeartUpdate = (newHearts: number) => {
      if(!user) return;
      const updatedUser = { ...user, hearts: newHearts };
      setUser(updatedUser);
      updateUserInDb(updatedUser);
  };

  const handlePostQuestion = async (newQ: Omit<Question, 'id' | 'replies' | 'views' | 'date'>) => {
    if (!user) return;
    try {
        await createQuestion(user, newQ.title, newQ.content, newQ.tags, newQ.image);
        const updatedQuestions = await fetchQuestions(); // Refresh
        setQuestions(updatedQuestions);
        setTab(Tab.HOME);
        
        if(!user.isAdmin) {
             const updatedUser = {...user, points: user.points + 5};
             setUser(updatedUser);
             updateUserInDb(updatedUser);
        }
    } catch (e) {
        alert("發佈失敗");
    }
  };

  const handleAddReply = async (questionId: number, content: string, image?: string) => {
    if (!user) return;
    try {
        await createReply(user, questionId, content, image);
        // Refresh Question Detail
        const updatedQuestions = await fetchQuestions();
        setQuestions(updatedQuestions);
        
        // Update selected question view if open
        const updatedQ = updatedQuestions.find(q => q.id === questionId);
        if (updatedQ) setSelectedQuestion(updatedQ);

        if (!user.isAdmin) {
            const updatedUser = {...user, points: user.points + 10};
            setUser(updatedUser);
            updateUserInDb(updatedUser);
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
        const updatedQuestions = await fetchQuestions();
        setQuestions(updatedQuestions);
        const updatedQ = updatedQuestions.find(q => q.id === questionId);
        if (updatedQ) setSelectedQuestion(updatedQ);

        if (!user.isAdmin) {
            const updatedUser = {...user, points: user.points + 10};
            setUser(updatedUser);
            updateUserInDb(updatedUser);
        }
        alert(`已選為最佳解答！\n\n🎉 對方獲得 +30 PT\n🎉 您獲得 +10 PT (結案獎勵)`);
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
    // Note: Reports are currently local only. Create a 'reports' table in DB to persist.
  };

  const handleBuyProduct = (product: Product) => {
    if(!user) return;
    const isOwned = user.inventory.includes(product.id) || user.avatarFrame === product.id || user.nameColor === product.color;
    if (isOwned) {
        if (product.category === 'frame') {
            const u = { ...user, avatarFrame: product.id };
            setUser(u);
            updateUserInDb(u);
            alert(`已裝備：${product.name}`);
        } else if (product.category === 'cosmetic') {
            const textClass = product.color.split(' ').find(c => c.startsWith('text-'));
            const u = { ...user, nameColor: textClass };
            setUser(u);
            updateUserInDb(u);
            alert(`已啟用：${product.name}`);
        }
        return;
    }
    if(user.points >= product.price) {
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
        setUser(updatedUser);
        updateUserInDb(updatedUser);
        alert(`購買成功：${product.name}`);
    } else {
        alert("積分不足！");
    }
  };

  const handleAddResource = async (title: string, description: string, tags: string[], images: string[]) => {
      if(!user) return;
      try {
          await createResource(user, title, description, tags, images);
          const res = await fetchResources();
          setResources(res);

          if(!user.isAdmin) {
              const u = {...user, points: user.points + 20};
              setUser(u);
              updateUserInDb(u);
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
      
      // Optimistic update locally
      setResources(resources.map(r => r.id === resourceId ? { ...r, likes: newLikedBy.length, likedBy: newLikedBy } : r));
      if (selectedResource?.id === resourceId) {
          setSelectedResource({ ...selectedResource, likes: newLikedBy.length, likedBy: newLikedBy });
      }

      // Sync DB
      await updateResourceLikes(resourceId, newLikedBy.length, newLikedBy);
  };

  const handleAddExam = async (subject: string, title: string, date: string, time: string) => {
      if(!user) return;
      await createExam(user, subject, title, date, time);
      const es = await fetchExams();
      setExams(es);
  };

  const handleFinishChallenge = (result: GameResult) => {
      if (!user) return;
      const pointsWon = Math.floor(result.score / 50); 
      if (!user.isAdmin && pointsWon > 0) {
          const u = { ...user, points: user.points + pointsWon };
          setUser(u);
          updateUserInDb(u);
      }
  };

  // --- Render ---

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  const commonLayoutClasses = `${darkMode ? 'dark' : ''} bg-gray-100 dark:bg-gray-900 min-h-screen`;

  if (showModeration) {
    return (
        <div className={commonLayoutClasses}>
            <main className="w-full max-w-md mx-auto bg-gray-50 dark:bg-gray-900 min-h-screen shadow-xl relative flex flex-col">
                <ModerationScreen user={user} reports={reports} onBack={() => setShowModeration(false)} />
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
                    words={WORD_DATABASE} // Keeping Word DB static for now
                    leaderboard={GAME_WEEKLY_LEADERBOARD}
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
        return <ExamScreen exams={exams} onAddExam={handleAddExam} onDeleteExam={(id) => setExams(exams.filter(e => e.id !== id))} />;
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
                {isLoading ? (
                    <div className="flex items-center justify-center h-40 text-gray-400">載入資料中...</div>
                ) : (
                    renderScreen()
                )}
            </div>
            <BottomNav 
                currentTab={currentTab === Tab.ASK ? Tab.HOME : currentTab} 
                setTab={setTab} 
            />
        </main>
    </div>
  );
}