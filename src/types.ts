export interface WordItem {
  no: number;
  word: string;
  meanings: string[];
  examples: string[];
  start?: number;
  end?: number;
}

export interface LessonData {
  lesson: string;
  source_file?: string;
  model?: string;
  duration_sec?: number;
  item_count: number;
  flags?: string[];
  items: WordItem[];
  source_method?: string;
}

export interface IncorrectAnswer {
  id?: string;
  user_id: string;
  lesson_id: string;
  word: string;
  meanings: string[];
  examples: string[];
  incorrect_count: number;
  last_incorrect_at?: string;
  is_learned: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'en-to-ko' | 'ko-to-en' | 'spelling';
  word: WordItem;
  options?: string[]; // Multiple choice options
  correctAnswer: string;
  userAnswer?: string;
  isCorrect?: boolean;
}
