
export const POINTS_PER_LEVEL = 500;

export const calculateLevel = (points: number): number => {
    // Level 1 starts at 0. Level 2 at 500, etc.
    // Ensure points is never negative for calculation
    const p = Math.max(0, points);
    return Math.floor(p / POINTS_PER_LEVEL) + 1;
};

export const calculateProgress = (points: number): number => {
    const p = Math.max(0, points);
    const currentLevelPoints = p % POINTS_PER_LEVEL;
    return Math.min(Math.floor((currentLevelPoints / POINTS_PER_LEVEL) * 100), 100);
};

export const getNextLevelThreshold = (level: number): number => {
    return level * POINTS_PER_LEVEL;
};
