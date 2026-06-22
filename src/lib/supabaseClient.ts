import { createClient } from '@supabase/supabase-js';
import type { IncorrectAnswer } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = supabaseUrl && supabaseAnonKey;

export const supabase = isSupabaseConfigured 
  ? createClient(supabaseUrl, supabaseAnonKey) 
  : null;

const LOCAL_STORAGE_KEY = 'english_1800_incorrect_notes';

// Helper: Check if userId is a valid UUID (Authenticated users use UUID, guest users use 'guest_xxx')
export const isUuid = (str: string): boolean => {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
};

// Helper: Get local data
function getLocalIncorrectAnswers(): IncorrectAnswer[] {
  try {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (e) {
    console.error('Failed to parse local incorrect answers', e);
    return [];
  }
}

// Helper: Save local data
function saveLocalIncorrectAnswers(answers: IncorrectAnswer[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(answers));
  } catch (e) {
    console.error('Failed to save local incorrect answers', e);
  }
}

/**
 * DB Operations Abstraction (Supabase <-> LocalStorage Fallback)
 */
export const db = {
  /**
   * Auth: Sign In with Google
   */
  async signInWithGoogle() {
    if (!supabase) return { error: new Error('Supabase가 설정되지 않았습니다.') };
    return await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
      }
    });
  },

  /**
   * Auth: Sign Out
   */
  async signOut() {
    if (!supabase) return;
    return await supabase.auth.signOut();
  },

  /**
   * Fetch all incorrect answers for a user
   */
  async getIncorrectAnswers(userId: string): Promise<IncorrectAnswer[]> {
    if (supabase && isUuid(userId)) {
      try {
        const { data, error } = await supabase
          .from('incorrect_answers')
          .select('*')
          .eq('user_id', userId)
          .order('last_incorrect_at', { ascending: false });

        if (error) throw error;
        return data as IncorrectAnswer[];
      } catch (e) {
        console.error('Supabase fetch failed. Falling back to LocalStorage.', e);
      }
    }
    
    return getLocalIncorrectAnswers().filter(item => item.user_id === userId);
  },

  /**
   * Add or increment incorrect count for a word
   */
  async addIncorrectAnswer(
    userId: string, 
    lessonId: string, 
    word: string, 
    meanings: string[], 
    examples: string[]
  ): Promise<IncorrectAnswer> {
    const nowString = new Date().toISOString();

    if (supabase && isUuid(userId)) {
      try {
        const { data: existing, error: selectError } = await supabase
          .from('incorrect_answers')
          .select('*')
          .eq('user_id', userId)
          .eq('word', word)
          .single();

        if (selectError && selectError.code !== 'PGRST116') {
          throw selectError;
        }

        if (existing) {
          const { data, error } = await supabase
            .from('incorrect_answers')
            .update({
              incorrect_count: existing.incorrect_count + 1,
              is_learned: false,
              last_incorrect_at: nowString
            })
            .eq('id', existing.id)
            .select()
            .single();

          if (error) throw error;
          return data as IncorrectAnswer;
        } else {
          const { data, error } = await supabase
            .from('incorrect_answers')
            .insert({
              user_id: userId,
              lesson_id: lessonId,
              word,
              meanings,
              examples,
              incorrect_count: 1,
              is_learned: false,
              last_incorrect_at: nowString
            })
            .select()
            .single();

          if (error) throw error;
          return data as IncorrectAnswer;
        }
      } catch (e) {
        console.error('Supabase add failed. Falling back to LocalStorage.', e);
      }
    }

    const localData = getLocalIncorrectAnswers();
    const existingIndex = localData.findIndex(item => item.user_id === userId && item.word === word);

    if (existingIndex > -1) {
      localData[existingIndex] = {
        ...localData[existingIndex],
        incorrect_count: localData[existingIndex].incorrect_count + 1,
        is_learned: false,
        last_incorrect_at: nowString
      };
      saveLocalIncorrectAnswers(localData);
      return localData[existingIndex];
    } else {
      const newItem: IncorrectAnswer = {
        id: Math.random().toString(36).substr(2, 9),
        user_id: userId,
        lesson_id: lessonId,
        word,
        meanings,
        examples,
        incorrect_count: 1,
        is_learned: false,
        last_incorrect_at: nowString
      };
      localData.push(newItem);
      saveLocalIncorrectAnswers(localData);
      return newItem;
    }
  },

  /**
   * Mark word as learned (mastered)
   */
  async markAsLearned(userId: string, word: string, isLearned: boolean = true): Promise<boolean> {
    if (supabase && isUuid(userId)) {
      try {
        const { error } = await supabase
          .from('incorrect_answers')
          .update({ is_learned: isLearned })
          .eq('user_id', userId)
          .eq('word', word);

        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Supabase update failed. Falling back to LocalStorage.', e);
      }
    }

    const localData = getLocalIncorrectAnswers();
    const existingIndex = localData.findIndex(item => item.user_id === userId && item.word === word);

    if (existingIndex > -1) {
      localData[existingIndex].is_learned = isLearned;
      saveLocalIncorrectAnswers(localData);
      return true;
    }
    return false;
  },

  /**
   * Delete incorrect answer entry completely
   */
  async deleteIncorrectAnswer(userId: string, word: string): Promise<boolean> {
    if (supabase && isUuid(userId)) {
      try {
        const { error } = await supabase
          .from('incorrect_answers')
          .delete()
          .eq('user_id', userId)
          .eq('word', word);

        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Supabase delete failed. Falling back to LocalStorage.', e);
      }
    }

    const localData = getLocalIncorrectAnswers();
    const filtered = localData.filter(item => !(item.user_id === userId && item.word === word));
    saveLocalIncorrectAnswers(filtered);
    return true;
  },

  /**
   * Progress Sync: Get user completed lessons & quiz scores
   */
  async getUserProgress(userId: string): Promise<{ completed_lessons: string[], quiz_scores: any } | null> {
    if (supabase && isUuid(userId)) {
      try {
        const { data, error } = await supabase
          .from('user_progress')
          .select('completed_lessons, quiz_scores')
          .eq('user_id', userId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') { // Record doesn't exist yet
            return { completed_lessons: [], quiz_scores: {} };
          }
          throw error;
        }
        return data;
      } catch (e) {
        console.error('Failed to get user progress from Supabase:', e);
      }
    }
    return null;
  },

  /**
   * Progress Sync: Save user completed lessons & quiz scores
   */
  async saveUserProgress(userId: string, completedLessons: string[], quizScores: any): Promise<boolean> {
    if (supabase && isUuid(userId)) {
      try {
        const { error } = await supabase
          .from('user_progress')
          .upsert({
            user_id: userId,
            completed_lessons: completedLessons,
            quiz_scores: quizScores,
            updated_at: new Date().toISOString()
          });

        if (error) throw error;
        return true;
      } catch (e) {
        console.error('Failed to save user progress to Supabase:', e);
      }
    }
    return false;
  }
};
