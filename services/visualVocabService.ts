
import { DrawGuessWord, DrawDifficulty } from '../types';

// Visual Vocab Database
// Criteria: Concrete Nouns (80%), Action Verbs (15%), Visual Adjectives (5%)
const VISUAL_VOCAB_DB: DrawGuessWord[] = [
    // --- EASY (1 Point) - Concrete, Single Feature ---
    { en: 'Sun', zh: '太陽', difficulty: 'EASY', category: 'Nature', points: 1 },
    { en: 'Pizza', zh: '披薩', difficulty: 'EASY', category: 'Food', points: 1 },
    { en: 'Ghost', zh: '鬼', difficulty: 'EASY', category: 'Fantasy', points: 1 },
    { en: 'Ladder', zh: '梯子', difficulty: 'EASY', category: 'Tools', points: 1 },
    { en: 'Apple', zh: '蘋果', difficulty: 'EASY', category: 'Food', points: 1 },
    { en: 'Eye', zh: '眼睛', difficulty: 'EASY', category: 'Body', points: 1 },
    { en: 'Tree', zh: '樹', difficulty: 'EASY', category: 'Nature', points: 1 },
    { en: 'Fish', zh: '魚', difficulty: 'EASY', category: 'Animals', points: 1 },
    { en: 'Book', zh: '書', difficulty: 'EASY', category: 'Objects', points: 1 },
    { en: 'Smile', zh: '微笑', difficulty: 'EASY', category: 'Actions', points: 1 },
    { en: 'Snake', zh: '蛇', difficulty: 'EASY', category: 'Animals', points: 1 },
    { en: 'Ball', zh: '球', difficulty: 'EASY', category: 'Sports', points: 1 },
    { en: 'Star', zh: '星星', difficulty: 'EASY', category: 'Nature', points: 1 },
    { en: 'Cat', zh: '貓', difficulty: 'EASY', category: 'Animals', points: 1 },
    { en: 'Car', zh: '汽車', difficulty: 'EASY', category: 'Transport', points: 1 },

    // --- MEDIUM (2 Points) - Combined Features / Context Needed ---
    { en: 'Airport', zh: '機場', difficulty: 'MEDIUM', category: 'Places', points: 2 },
    { en: 'Dentist', zh: '牙醫', difficulty: 'MEDIUM', category: 'Jobs', points: 2 },
    { en: 'Tornado', zh: '龍捲風', difficulty: 'MEDIUM', category: 'Nature', points: 2 },
    { en: 'Camping', zh: '露營', difficulty: 'MEDIUM', category: 'Activities', points: 2 },
    { en: 'Giraffe', zh: '長頸鹿', difficulty: 'MEDIUM', category: 'Animals', points: 2 },
    { en: 'Vomit', zh: '嘔吐', difficulty: 'MEDIUM', category: 'Actions', points: 2 },
    { en: 'Explode', zh: '爆炸', difficulty: 'MEDIUM', category: 'Actions', points: 2 },
    { en: 'Pyramid', zh: '金字塔', difficulty: 'MEDIUM', category: 'Places', points: 2 },
    { en: 'Muscular', zh: '肌肉發達的', difficulty: 'MEDIUM', category: 'Adjectives', points: 2 },
    { en: 'Sticky', zh: '黏黏的', difficulty: 'MEDIUM', category: 'Adjectives', points: 2 },
    { en: 'Robot', zh: '機器人', difficulty: 'MEDIUM', category: 'Tech', points: 2 },
    { en: 'Angel', zh: '天使', difficulty: 'MEDIUM', category: 'Fantasy', points: 2 },
    { en: 'Pancake', zh: '鬆餅', difficulty: 'MEDIUM', category: 'Food', points: 2 },
    { en: 'Guitar', zh: '吉他', difficulty: 'MEDIUM', category: 'Music', points: 2 },
    { en: 'Zombie', zh: '殭屍', difficulty: 'MEDIUM', category: 'Fantasy', points: 2 },

    // --- HARD (3 Points) - Abstract / Confusable / Detailed ---
    { en: 'Bluetooth', zh: '藍牙', difficulty: 'HARD', category: 'Tech', points: 3 },
    { en: 'Insomnia', zh: '失眠', difficulty: 'HARD', category: 'Health', points: 3 },
    { en: 'Eclipse', zh: '日蝕', difficulty: 'HARD', category: 'Nature', points: 3 },
    { en: 'Quarantine', zh: '隔離', difficulty: 'HARD', category: 'Health', points: 3 },
    { en: 'Kidnap', zh: '綁架', difficulty: 'HARD', category: 'Actions', points: 3 },
    { en: 'Submarine', zh: '潛水艇', difficulty: 'HARD', category: 'Transport', points: 3 },
    { en: 'Recycle', zh: '回收', difficulty: 'HARD', category: 'Actions', points: 3 },
    { en: 'Gravity', zh: '地心引力', difficulty: 'HARD', category: 'Science', points: 3 },
    { en: 'Wifi', zh: '無線網路', difficulty: 'HARD', category: 'Tech', points: 3 },
    { en: 'Electricity', zh: '電力', difficulty: 'HARD', category: 'Science', points: 3 },
    { en: 'Headache', zh: '頭痛', difficulty: 'HARD', category: 'Health', points: 3 },
    { en: 'Invisible', zh: '隱形的', difficulty: 'HARD', category: 'Adjectives', points: 3 },
];

export const getDrawChoices = (): DrawGuessWord[] => {
    // Strategy: Pick 1 Easy, 1 Medium, 1 Hard
    const getOne = (diff: DrawDifficulty) => {
        const pool = VISUAL_VOCAB_DB.filter(w => w.difficulty === diff);
        if (pool.length === 0) return VISUAL_VOCAB_DB[0]; // Fallback
        return pool[Math.floor(Math.random() * pool.length)];
    };

    return [
        getOne('EASY'),
        getOne('MEDIUM'),
        getOne('HARD')
    ];
};

export const submitUserWord = async (en: string, zh: string): Promise<boolean> => {
    // Simulate API call for crowdsourcing
    return new Promise(resolve => {
        setTimeout(() => resolve(true), 1000);
    });
};
