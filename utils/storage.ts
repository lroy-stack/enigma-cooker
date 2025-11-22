import { UserSession } from '../types';

const KEY = 'chef_runner_data_v2';

export const storage = {
  load: (): UserSession => {
    try {
      const data = localStorage.getItem(KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          username: parsed.username || 'Chef',
          email: parsed.email || '',
          highScore: parsed.highScore || 0,
          history: Array.isArray(parsed.history) ? parsed.history : []
        };
      }
    } catch (e) {
      console.warn('Failed to load save data', e);
    }
    return { username: 'Chef', email: '', highScore: 0, history: [] };
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
    // Add to history (keep max 20 for detailed history)
    const newHistory = [{ date: Date.now(), score: newScore }, ...current.history].slice(0, 20);
    // Update High Score
    const newHighScore = Math.max(current.highScore, newScore);
    
    const newData = { ...current, highScore: newHighScore, history: newHistory };
    storage.save(newData);
    return newData;
  },

  updateProfile: (current: UserSession, name: string, email: string): UserSession => {
    const newData = { 
      ...current, 
      username: name.slice(0, 15),
      email: email.slice(0, 50)
    };
    storage.save(newData);
    return newData;
  },
  
  resetHistory: (current: UserSession): UserSession => {
      const newData = { ...current, highScore: 0, history: [] };
      storage.save(newData);
      return newData;
  }
};