export interface ScoreRecord {
  date: number;
  score: number;
}

export interface UserSession {
  username: string;
  highScore: number;
  history: ScoreRecord[];
}

const KEY = 'chef_runner_data';

export const storage = {
  load: (): UserSession => {
    try {
      const data = localStorage.getItem(KEY);
      if (data) {
        const parsed = JSON.parse(data);
        // Ensure schema integrity if upgrading from older versions (if any)
        return {
          username: parsed.username || 'Chef',
          highScore: parsed.highScore || 0,
          history: Array.isArray(parsed.history) ? parsed.history : []
        };
      }
    } catch (e) {
      console.warn('Failed to load save data', e);
    }
    return { username: 'Chef', highScore: 0, history: [] };
  },

  save: (data: UserSession) => {
    try {
      localStorage.setItem(KEY, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save progress', e);
    }
  },

  addScore: (current: UserSession, score: number): UserSession => {
    const newScore = Math.floor(score);
    // Add to history (keep max 10)
    const newHistory = [{ date: Date.now(), score: newScore }, ...current.history].slice(0, 10);
    // Update High Score
    const newHighScore = Math.max(current.highScore, newScore);
    
    const newData = { ...current, highScore: newHighScore, history: newHistory };
    storage.save(newData);
    return newData;
  },

  updateName: (current: UserSession, name: string): UserSession => {
    const newData = { ...current, username: name.slice(0, 12) }; // Limit name length
    storage.save(newData);
    return newData;
  }
};