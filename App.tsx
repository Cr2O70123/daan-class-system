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

// Services & Mock Data
import { INITIAL_QUESTIONS, INITIAL_RESOURCES, INITIAL_EXAMS, WORD_DATABASE, GAME_WEEKLY_LEADERBOARD } from './services/mockData';
import { calculateLevel } from './services/levelService';
import { mockLogin, saveUserHeartState } from './services/authService';

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
  
  // Data State
  const [questions, setQuestions] = useState<Question[]>(INITIAL_QUESTIONS);
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [reports, setReports] = useState<Report[]>([]);
  const [resources, setResources] = useState<Resource[]>(INITIAL_RESOURCES);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [exams, setExams] = useState<Exam[]>(INITIAL_EXAMS);

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

  // Level Recalculation Effect
  useEffect(() => {
    if (user) {
        const newLevel = calculateLevel(user.points);
        if (newLevel !== user.level) {
            setUser(prev => prev ? ({ ...prev, level: newLevel }) : null);
        }
    }
  }, [user?.points]);

  // Heart Daily Reset Check (Runs on mount and periodically)
  useEffect(() => {
    const checkReset = () => {
        if (!user) return;
        const today = new Date().toDateString();
        if (user.lastHeartReset !== today) {
            const updatedUser = { ...user, hearts: 3, lastHeartReset: today };
            setUser(updatedUser);
            saveUserHeartState(updatedUser);
        }
    };
    const interval = setInterval(checkReset, 60000); // Check every minute
    checkReset(); // Check immediately
    return () => clearInterval(interval);
  }, [user?.name]); // Dependency on name ensures it runs after login

  // --- Handlers ---

  const handleLogin = async (name: string, studentId: string) => {
    const loggedInUser = await mockLogin(name, studentId);
    setUser(loggedInUser);
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
    if (updatedUser.avatarImage) {
        localStorage.setItem(`avatar_${updatedUser.studentId}`, updatedUser.avatarImage);
    }
  };

  // Hearts Logic
  const handleHeartUpdate = (newHearts: number) => {
      if(!user) return;
      const updatedUser = { ...user, hearts: newHearts };
      setUser(updatedUser);
      saveUserHeartState(updatedUser);
  };

  const handlePostQuestion = (newQ: Omit<Question, 'id' | 'replies' | 'views' | 'date'>) => {
    const question: Question = {
      ...newQ,
      id: Date.now(),
      date: new Date().toLocaleDateString(),
      replies: [],
      views: 0,
      replyCount: 0,
      authorAvatarImage: user?.avatarImage,
      authorAvatarFrame: user?.avatarFrame,
      authorNameColor: user?.nameColor
    };
    setQuestions([question, ...questions]);
    setTab(Tab.HOME);
    if(user && !user.isAdmin) setUser({...user, points: user.points + 5}); 
  };

  const handleAddReply = (questionId: number, content: string, image?: string) => {
    if (!user) return;
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const newReply = {
          id: Date.now(),
          content,
          image,
          author: user.name,
          avatarColor: user.avatarColor,
          avatarImage: user.avatarImage,
          avatarFrame: user.avatarFrame,
          nameColor: user.nameColor,
          date: new Date().toLocaleDateString()
        };
        const updatedQ = {
          ...q,
          replies: [...q.replies, newReply],
          replyCount: q.replies.length + 1
        };
        if (selectedQuestion?.id === questionId) setSelectedQuestion(updatedQ);
        return updatedQ;
      }
      return q;
    }));
    if (!user.isAdmin) setUser({...user, points: user.points + 10});
    alert(`回答成功！獲得 10 PT`);
  };

  const handleMarkBest = (questionId: number, replyId: number) => {
    if (!user) return;
    const targetQuestion = questions.find(q => q.id === questionId);
    if (!targetQuestion) return;
    const targetReply = targetQuestion.replies.find(r => r.id === replyId);
    if (!targetReply) return;
    if (targetReply.author === user.name) {
      alert("不能將自己的回答選為最佳解答喔！");
      return;
    }
    setQuestions(questions.map(q => {
      if (q.id === questionId) {
        const updatedReplies = q.replies.map(r => {
            if (r.id === replyId) return { ...r, isBestAnswer: true };
            return r;
        });
        const updatedQ = { ...q, status: 'solved' as const, replies: updatedReplies };
        if (selectedQuestion?.id === questionId) setSelectedQuestion(updatedQ);
        return updatedQ;
      }
      return q;
    }));
    if (!user.isAdmin) setUser(prev => prev ? ({ ...prev, points: prev.points + 10 }) : null);
    alert(`已選為最佳解答！\n\n🎉 對方獲得 +30 PT\n🎉 您獲得 +10 PT (結案獎勵)`);
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

  const handleBuyProduct = (product: Product) => {
    if(!user) return;
    const isOwned = user.inventory.includes(product.id) || user.avatarFrame === product.id || user.nameColor === product.color;
    if (isOwned) {
        if (product.category === 'frame') {
            setUser({ ...user, avatarFrame: product.id });
            alert(`已裝備：${product.name}`);
        } else if (product.category === 'cosmetic') {
            const textClass = product.color.split(' ').find(c => c.startsWith('text-'));
            setUser({ ...user, nameColor: textClass });
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
        alert(`購買成功：${product.name}`);
    } else {
        alert("積分不足！");
    }
  };

  const handleAddResource = (title: string, description: string, tags: string[], images: string[]) => {
      if(!user) return;
      const newRes: Resource = {
          id: Date.now(),
          title, description, tags, images,
          author: user.name,
          authorAvatarColor: user.avatarColor,
          authorAvatarImage: user.avatarImage,
          authorAvatarFrame: user.avatarFrame,
          authorNameColor: user.nameColor,
          date: new Date().toLocaleDateString(),
          likes: 0,
          likedBy: []
      };
      setResources([newRes, ...resources]);
      if(!user.isAdmin) setUser({...user, points: user.points + 20});
      alert('發佈成功！獲得 20 PT');
  };

  const handleLikeResource = (resourceId: number) => {
      if(!user) return;
      setResources(resources.map(res => {
          if (res.id === resourceId) {
              const hasLiked = res.likedBy.includes(user.name);
              const newLikedBy = hasLiked 
                ? res.likedBy.filter(name => name !== user.name) 
                : [...res.likedBy, user.name];
              const updatedRes = { ...res, likes: newLikedBy.length, likedBy: newLikedBy };
              if(selectedResource?.id === resourceId) setSelectedResource(updatedRes);
              return updatedRes;
          }
          return res;
      }));
  };

  const handleAddExam = (subject: string, title: string, date: string, time: string) => {
      if(!user) return;
      const newExam: Exam = { id: Date.now(), subject, title, date, time, author: user.name };
      setExams([...exams, newExam]);
  };

  const handleFinishChallenge = (result: GameResult) => {
      if (!user) return;
      const pointsWon = Math.floor(result.score / 50); // Adjusted reward
      if (!user.isAdmin && pointsWon > 0) {
          setUser({ ...user, points: user.points + pointsWon });
      }
  };

  // --- Render ---

  if (!user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // NOTE: background color is applied here to the root wrapper to fix "white space" issue
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
                    words={WORD_DATABASE}
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
