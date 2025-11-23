import { Question, Resource, Exam, Word, GameLeaderboardEntry } from '../types';

// --- Questions ---
export const INITIAL_QUESTIONS: Question[] = [
  {
    id: 1,
    title: 'C語言 指標與陣列問題',
    content: '請問這段程式碼為什麼會報錯？\n```c\n#include <stdio.h>\nint main() {\n  int arr[5] = {1, 2, 3, 4, 5};\n  int *p = arr;\n  printf("%d", *p++);\n  return 0;\n}\n```\n我想要印出第一個元素，但指標移動好像有問題。',
    author: '張美麗',
    authorAvatarColor: 'bg-red-500',
    authorNameColor: 'text-pink-600',
    date: '2025/11/23',
    tags: ['程式設計', 'C語言'],
    status: 'open',
    replyCount: 0,
    views: 12,
    replies: []
  },
  {
    id: 2,
    title: '基本電學 戴維寧計算',
    content: '請問這題的戴維寧等效電阻 $$R_{th}$$ 怎麼算？\n電源是 $$12V$$，電阻分別是 $$3\\Omega$$ 和 $$6\\Omega$$ 並聯。\n我算出來是 $$2\\Omega$$ 對嗎？',
    author: '王小明',
    authorAvatarColor: 'bg-purple-500',
    date: '2025/11/22',
    tags: ['基本電學', '已解決'],
    status: 'solved',
    replyCount: 1,
    views: 45,
    replies: [
      {
        id: 101,
        author: '李大同',
        avatarColor: 'bg-green-500',
        content: '沒錯！並聯公式：\n$$R_{th} = \\frac{R1 \\times R2}{R1 + R2} = \\frac{3 \\times 6}{3 + 6} = 2\\Omega$$\n觀念正確喔！',
        date: '2025/11/22',
        isBestAnswer: true
      }
    ]
  }
];

// --- Resources ---
export const INITIAL_RESOURCES: Resource[] = [
    {
        id: 1, 
        title: '電子學 Ch1 筆記', 
        description: '整理了關於二極體的重點，包含順向偏壓與逆向偏壓的特性曲線。\n\n$$I_D = I_S(e^{V_D/n V_T} - 1)$$', 
        tags: ['筆記'], 
        author: '王小明', 
        authorAvatarColor: 'bg-purple-500', 
        date: '2025/11/25', 
        likes: 5,
        likedBy: [],
        images: []
    }
];

// --- Exams ---
export const INITIAL_EXAMS: Exam[] = [
    {id: 1, subject: '電子學', title: 'Ch1-Ch3 第一次段考', date: '2025-12-01', time: '08:10', author: 'Admin'}
];

// --- Word Database (Level 3-6) ---
export const WORD_DATABASE: Word[] = [
    // Level 3 (General Engineering / Basic Academic)
    { id: 101, en: 'Component', zh: '元件', level: 3 },
    { id: 102, en: 'Simulation', zh: '模擬', level: 3 },
    { id: 103, en: 'Parameter', zh: '參數', level: 3 },
    { id: 104, en: 'Efficient', zh: '有效率的', level: 3 },
    { id: 105, en: 'Generate', zh: '產生', level: 3 },
    { id: 106, en: 'Monitor', zh: '監控', level: 3 },
    { id: 107, en: 'Calculate', zh: '計算', level: 3 },
    { id: 108, en: 'Structure', zh: '結構', level: 3 },
    
    // Level 4 (Technical Core)
    { id: 201, en: 'Amplification', zh: '放大', level: 4 },
    { id: 202, en: 'Oscillation', zh: '振盪', level: 4 },
    { id: 203, en: 'Capacitance', zh: '電容量', level: 4 },
    { id: 204, en: 'Inductance', zh: '電感量', level: 4 },
    { id: 205, en: 'Conductivity', zh: '導電度', level: 4 },
    { id: 206, en: 'Schematic', zh: '電路圖', level: 4 },
    { id: 207, en: 'Microprocessor', zh: '微處理器', level: 4 },
    { id: 208, en: 'Peripheral', zh: '周邊設備', level: 4 },

    // Level 5 (Advanced Technical)
    { id: 301, en: 'Semiconductor', zh: '半導體', level: 5 },
    { id: 302, en: 'Integrated', zh: '積體/整合的', level: 5 },
    { id: 303, en: 'Characteristic', zh: '特性', level: 5 },
    { id: 304, en: 'Implementation', zh: '實作/實現', level: 5 },
    { id: 305, en: 'Configuration', zh: '組態/配置', level: 5 },
    { id: 306, en: 'Transmission', zh: '傳輸', level: 5 },
    { id: 307, en: 'Electromagnetic', zh: '電磁的', level: 5 },
    { id: 308, en: 'Specification', zh: '規格', level: 5 },

    // Level 6 (Professional / Abstract)
    { id: 401, en: 'Algorithm', zh: '演算法', level: 6 },
    { id: 402, en: 'Optimization', zh: '最佳化', level: 6 },
    { id: 403, en: 'Synchronization', zh: '同步', level: 6 },
    { id: 404, en: 'Architecture', zh: '架構', level: 6 },
    { id: 405, en: 'Simultaneous', zh: '同時的', level: 6 },
    { id: 406, en: 'Hypothesis', zh: '假設', level: 6 },
    { id: 407, en: 'Theoretical', zh: '理論的', level: 6 },
    { id: 408, en: 'Methodology', zh: '方法論', level: 6 },
];

export const GAME_WEEKLY_LEADERBOARD: GameLeaderboardEntry[] = [
    { rank: 1, name: '李大同', score: 12450, avatarColor: 'bg-green-500', avatarFrame: 'frame_gold' },
    { rank: 2, name: '陳大華', score: 9800, avatarColor: 'bg-pink-500', avatarFrame: 'frame_neon' },
    { rank: 3, name: '王小明', score: 8540, avatarColor: 'bg-purple-500' },
];