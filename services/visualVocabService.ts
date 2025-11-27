
import { DrawGuessWord, DrawDifficulty } from '../types';

// Gartic-style Chinese Word Database
// Categories: Objects, Animals, Food, Occupations, Idioms/Abstract
const CHINESE_DRAW_DB: DrawGuessWord[] = [
    // --- 簡單 (物品/自然) ---
    { en: 'Sun', zh: '太陽', difficulty: 'EASY', category: '自然', points: 1 },
    { en: 'Moon', zh: '月亮', difficulty: 'EASY', category: '自然', points: 1 },
    { en: 'Tree', zh: '大樹', difficulty: 'EASY', category: '自然', points: 1 },
    { en: 'Flower', zh: '花朵', difficulty: 'EASY', category: '自然', points: 1 },
    { en: 'Cloud', zh: '雲', difficulty: 'EASY', category: '自然', points: 1 },
    { en: 'Rain', zh: '下雨', difficulty: 'EASY', category: '自然', points: 1 },
    { en: 'Mountain', zh: '山', difficulty: 'EASY', category: '自然', points: 1 },
    { en: 'Umbrella', zh: '雨傘', difficulty: 'EASY', category: '物品', points: 1 },
    { en: 'Clock', zh: '時鐘', difficulty: 'EASY', category: '物品', points: 1 },
    { en: 'Glasses', zh: '眼鏡', difficulty: 'EASY', category: '物品', points: 1 },
    { en: 'Book', zh: '書本', difficulty: 'EASY', category: '物品', points: 1 },
    { en: 'Cup', zh: '杯子', difficulty: 'EASY', category: '物品', points: 1 },
    { en: 'Chair', zh: '椅子', difficulty: 'EASY', category: '物品', points: 1 },
    { en: 'Car', zh: '汽車', difficulty: 'EASY', category: '交通', points: 1 },
    { en: 'Airplane', zh: '飛機', difficulty: 'EASY', category: '交通', points: 1 },
    { en: 'Bicycle', zh: '腳踏車', difficulty: 'EASY', category: '交通', points: 1 },

    // --- 動物/食物 ---
    { en: 'Cat', zh: '貓咪', difficulty: 'EASY', category: '動物', points: 1 },
    { en: 'Dog', zh: '小狗', difficulty: 'EASY', category: '動物', points: 1 },
    { en: 'Fish', zh: '魚', difficulty: 'EASY', category: '動物', points: 1 },
    { en: 'Bird', zh: '小鳥', difficulty: 'EASY', category: '動物', points: 1 },
    { en: 'Pig', zh: '豬', difficulty: 'EASY', category: '動物', points: 1 },
    { en: 'Snake', zh: '蛇', difficulty: 'EASY', category: '動物', points: 1 },
    { en: 'Apple', zh: '蘋果', difficulty: 'EASY', category: '食物', points: 1 },
    { en: 'Banana', zh: '香蕉', difficulty: 'EASY', category: '食物', points: 1 },
    { en: 'Egg', zh: '雞蛋', difficulty: 'EASY', category: '食物', points: 1 },
    { en: 'Bread', zh: '麵包', difficulty: 'EASY', category: '食物', points: 1 },

    // --- 中等 (具體特徵/職業/場所) ---
    { en: 'Giraffe', zh: '長頸鹿', difficulty: 'MEDIUM', category: '動物', points: 2 },
    { en: 'Elephant', zh: '大象', difficulty: 'MEDIUM', category: '動物', points: 2 },
    { en: 'Rabbit', zh: '兔子', difficulty: 'MEDIUM', category: '動物', points: 2 },
    { en: 'Spider', zh: '蜘蛛', difficulty: 'MEDIUM', category: '動物', points: 2 },
    { en: 'Dinosaur', zh: '恐龍', difficulty: 'MEDIUM', category: '動物', points: 2 },
    { en: 'Panda', zh: '熊貓', difficulty: 'MEDIUM', category: '動物', points: 2 },
    { en: 'Teacher', zh: '老師', difficulty: 'MEDIUM', category: '職業', points: 2 },
    { en: 'Doctor', zh: '醫生', difficulty: 'MEDIUM', category: '職業', points: 2 },
    { en: 'Police', zh: '警察', difficulty: 'MEDIUM', category: '職業', points: 2 },
    { en: 'Chef', zh: '廚師', difficulty: 'MEDIUM', category: '職業', points: 2 },
    { en: 'Singer', zh: '歌手', difficulty: 'MEDIUM', category: '職業', points: 2 },
    { en: 'School', zh: '學校', difficulty: 'MEDIUM', category: '場所', points: 2 },
    { en: 'Hospital', zh: '醫院', difficulty: 'MEDIUM', category: '場所', points: 2 },
    { en: 'Library', zh: '圖書館', difficulty: 'MEDIUM', category: '場所', points: 2 },
    { en: 'Park', zh: '公園', difficulty: 'MEDIUM', category: '場所', points: 2 },
    { en: 'Hamburger', zh: '漢堡', difficulty: 'MEDIUM', category: '食物', points: 2 },
    { en: 'Pizza', zh: '披薩', difficulty: 'MEDIUM', category: '食物', points: 2 },
    { en: 'IceCream', zh: '冰淇淋', difficulty: 'MEDIUM', category: '食物', points: 2 },
    { en: 'Computer', zh: '電腦', difficulty: 'MEDIUM', category: '物品', points: 2 },
    { en: 'Phone', zh: '手機', difficulty: 'MEDIUM', category: '物品', points: 2 },
    { en: 'Robot', zh: '機器人', difficulty: 'MEDIUM', category: '物品', points: 2 },
    { en: 'Camera', zh: '相機', difficulty: 'MEDIUM', category: '物品', points: 2 },

    // --- 困難 (抽象/成語/複雜動作) ---
    { en: 'Love', zh: '談戀愛', difficulty: 'HARD', category: '動作', points: 3 },
    { en: 'Sleep', zh: '睡覺', difficulty: 'HARD', category: '動作', points: 3 },
    { en: 'Swim', zh: '游泳', difficulty: 'HARD', category: '動作', points: 3 },
    { en: 'Dance', zh: '跳舞', difficulty: 'HARD', category: '動作', points: 3 },
    { en: 'Fishing', zh: '釣魚', difficulty: 'HARD', category: '動作', points: 3 },
    { en: 'Basketball', zh: '打籃球', difficulty: 'HARD', category: '運動', points: 3 },
    { en: 'Soccer', zh: '踢足球', difficulty: 'HARD', category: '運動', points: 3 },
    { en: 'Ghost', zh: '鬼魂', difficulty: 'HARD', category: '奇幻', points: 3 },
    { en: 'Alien', zh: '外星人', difficulty: 'HARD', category: '奇幻', points: 3 },
    { en: 'Vampire', zh: '吸血鬼', difficulty: 'HARD', category: '奇幻', points: 3 },
    { en: 'Mermaid', zh: '美人魚', difficulty: 'HARD', category: '奇幻', points: 3 },
    { en: 'Superman', zh: '超人', difficulty: 'HARD', category: '角色', points: 3 },
    { en: 'Pikachu', zh: '皮卡丘', difficulty: 'HARD', category: '角色', points: 3 },
    { en: 'Doraemon', zh: '哆啦A夢', difficulty: 'HARD', category: '角色', points: 3 },
    
    // --- 成語/俚語 ---
    { en: 'AddLegs', zh: '畫蛇添足', difficulty: 'HARD', category: '成語', points: 3 },
    { en: 'PlayCow', zh: '對牛彈琴', difficulty: 'HARD', category: '成語', points: 3 },
    { en: 'FrogWell', zh: '井底之蛙', difficulty: 'HARD', category: '成語', points: 3 },
    { en: 'ChickenFly', zh: '雞飛狗跳', difficulty: 'HARD', category: '成語', points: 3 },
    { en: 'FoxTiger', zh: '狐假虎威', difficulty: 'HARD', category: '成語', points: 3 },
    { en: 'OneStoneTwo', zh: '一石二鳥', difficulty: 'HARD', category: '成語', points: 3 },
];

export const getDrawChoices = (): DrawGuessWord[] => {
    // 隨機選出 3 個不同難度的題目供繪畫者選擇
    const shuffle = (array: DrawGuessWord[]) => array.sort(() => 0.5 - Math.random());
    
    const easy = shuffle(CHINESE_DRAW_DB.filter(w => w.difficulty === 'EASY'))[0];
    const medium = shuffle(CHINESE_DRAW_DB.filter(w => w.difficulty === 'MEDIUM'))[0];
    const hard = shuffle(CHINESE_DRAW_DB.filter(w => w.difficulty === 'HARD'))[0];

    // 如果某個難度沒有題目，就隨機補一個
    return [
        easy || shuffle(CHINESE_DRAW_DB)[0],
        medium || shuffle(CHINESE_DRAW_DB)[1],
        hard || shuffle(CHINESE_DRAW_DB)[2]
    ].filter(Boolean);
};

export const submitUserWord = async (en: string, zh: string): Promise<boolean> => {
    // Simulate API call for crowdsourcing
    return new Promise(resolve => {
        setTimeout(() => resolve(true), 1000);
    });
};
