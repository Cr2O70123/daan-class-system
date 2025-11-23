import { Question, Resource, Exam, Word } from '../types';

// --- Questions ---
export const INITIAL_QUESTIONS: Question[] = [];

// --- Resources ---
export const INITIAL_RESOURCES: Resource[] = [];

// --- Exams ---
export const INITIAL_EXAMS: Exam[] = [];

// --- Word Database (Level 3-6 Academic/Professional) ---
export const WORD_DATABASE: Word[] = [
    // LEVEL 3
    { id: 101, en: 'Analyze', zh: '分析', level: 3 },
    { id: 102, en: 'Approach', zh: '方法/途徑', level: 3 },
    { id: 103, en: 'Area', zh: '區域/領域', level: 3 },
    { id: 104, en: 'Assess', zh: '評估', level: 3 },
    { id: 105, en: 'Assume', zh: '假設', level: 3 },
    { id: 106, en: 'Authority', zh: '權威/當局', level: 3 },
    { id: 107, en: 'Available', zh: '可用的', level: 3 },
    { id: 108, en: 'Benefit', zh: '益處', level: 3 },
    { id: 109, en: 'Concept', zh: '概念', level: 3 },
    { id: 110, en: 'Consist', zh: '組成', level: 3 },
    { id: 111, en: 'Context', zh: '情境/上下文', level: 3 },
    { id: 112, en: 'Create', zh: '創造', level: 3 },
    { id: 113, en: 'Data', zh: '資料', level: 3 },
    { id: 114, en: 'Define', zh: '定義', level: 3 },
    { id: 115, en: 'Derive', zh: '起源於/導出', level: 3 },
    { id: 116, en: 'Distribute', zh: '分發/分佈', level: 3 },
    { id: 117, en: 'Economy', zh: '經濟', level: 3 },
    { id: 118, en: 'Environment', zh: '環境', level: 3 },
    { id: 119, en: 'Establish', zh: '建立', level: 3 },
    { id: 120, en: 'Estimate', zh: '估計', level: 3 },

    // LEVEL 4
    { id: 201, en: 'Evidence', zh: '證據', level: 4 },
    { id: 202, en: 'Export', zh: '出口/輸出', level: 4 },
    { id: 203, en: 'Factor', zh: '因素', level: 4 },
    { id: 204, en: 'Finance', zh: '財務', level: 4 },
    { id: 205, en: 'Formula', zh: '公式/配方', level: 4 },
    { id: 206, en: 'Function', zh: '功能/函數', level: 4 },
    { id: 207, en: 'Identify', zh: '識別', level: 4 },
    { id: 208, en: 'Income', zh: '收入', level: 4 },
    { id: 209, en: 'Indicate', zh: '指出', level: 4 },
    { id: 210, en: 'Individual', zh: '個人的', level: 4 },
    { id: 211, en: 'Interpret', zh: '詮釋/口譯', level: 4 },
    { id: 212, en: 'Involve', zh: '涉及', level: 4 },
    { id: 213, en: 'Issue', zh: '議題/發行', level: 4 },
    { id: 214, en: 'Labor', zh: '勞力', level: 4 },
    { id: 215, en: 'Legal', zh: '法律的', level: 4 },
    { id: 216, en: 'Legislate', zh: '立法', level: 4 },
    { id: 217, en: 'Major', zh: '主要的/主修', level: 4 },
    { id: 218, en: 'Method', zh: '方法', level: 4 },
    { id: 219, en: 'Occur', zh: '發生', level: 4 },
    { id: 220, en: 'Percent', zh: '百分比', level: 4 },

    // LEVEL 5
    { id: 301, en: 'Period', zh: '時期/週期', level: 5 },
    { id: 302, en: 'Policy', zh: '政策', level: 5 },
    { id: 303, en: 'Principle', zh: '原則', level: 5 },
    { id: 304, en: 'Proceed', zh: '繼續進行', level: 5 },
    { id: 305, en: 'Process', zh: '過程', level: 5 },
    { id: 306, en: 'Require', zh: '需要', level: 5 },
    { id: 307, en: 'Research', zh: '研究', level: 5 },
    { id: 308, en: 'Respond', zh: '回應', level: 5 },
    { id: 309, en: 'Role', zh: '角色', level: 5 },
    { id: 310, en: 'Section', zh: '部分/章節', level: 5 },
    { id: 311, en: 'Sector', zh: '部門/領域', level: 5 },
    { id: 312, en: 'Significant', zh: '顯著的/重要的', level: 5 },
    { id: 313, en: 'Similar', zh: '相似的', level: 5 },
    { id: 314, en: 'Source', zh: '來源', level: 5 },
    { id: 315, en: 'Specific', zh: '特定的', level: 5 },
    { id: 316, en: 'Structure', zh: '結構', level: 5 },
    { id: 317, en: 'Theory', zh: '理論', level: 5 },
    { id: 318, en: 'Vary', zh: '變化', level: 5 },
    { id: 319, en: 'Acquire', zh: '獲得', level: 5 },
    { id: 320, en: 'Administer', zh: '管理/執行', level: 5 },

    // LEVEL 6
    { id: 401, en: 'Affect', zh: '影響', level: 6 },
    { id: 402, en: 'Appropriate', zh: '適當的', level: 6 },
    { id: 403, en: 'Aspect', zh: '方面', level: 6 },
    { id: 404, en: 'Assist', zh: '協助', level: 6 },
    { id: 405, en: 'Category', zh: '類別', level: 6 },
    { id: 406, en: 'Chapter', zh: '章節', level: 6 },
    { id: 407, en: 'Commission', zh: '委員會/佣金', level: 6 },
    { id: 408, en: 'Community', zh: '社區/社群', level: 6 },
    { id: 409, en: 'Complex', zh: '複雜的', level: 6 },
    { id: 410, en: 'Compute', zh: '計算', level: 6 },
    { id: 411, en: 'Conclude', zh: '下結論', level: 6 },
    { id: 412, en: 'Conduct', zh: '進行/傳導', level: 6 },
    { id: 413, en: 'Consequent', zh: '隨之發生的', level: 6 },
    { id: 414, en: 'Construct', zh: '建造', level: 6 },
    { id: 415, en: 'Consume', zh: '消耗/消費', level: 6 },
    { id: 416, en: 'Credit', zh: '信用/學分', level: 6 },
    { id: 417, en: 'Culture', zh: '文化', level: 6 },
    { id: 418, en: 'Design', zh: '設計', level: 6 },
    { id: 419, en: 'Distinct', zh: '獨特的', level: 6 },
    { id: 420, en: 'Element', zh: '元素', level: 6 },
];