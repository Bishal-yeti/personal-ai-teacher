export interface Course {
  id: string;
  title: string;
  description: string;
  category: string;
  subject_code?: string;
  icon?: string;
  color?: string;
  created_at: string;
  document_count?: number;
  conversation_count?: number;
  note_count?: number;
}

export interface DocumentRecord {
  id: string;
  course_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  page_count: number;
  doc_category: 'lecture_notes' | 'textbook' | 'syllabus' | 'exam_paper';
  summary?: string;
  chunk_count?: number;
  created_at: string;
}

export interface Citation {
  filename: string;
  page_number: number;
  chapter?: string;
  heading?: string;
  snippet?: string;
}

export interface MathStep {
  step: number;
  title: string;
  explanation: string;
  math: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  mode?: string;
  citations?: Citation[];
  math_steps?: MathStep[];
  pedagogical_meta?: {
    provider?: string;
    needs_api_key?: boolean;
    note?: string;
  };
  created_at: string;
}

export interface Conversation {
  id: string;
  course_id: string;
  title: string;
  mode: 'zero' | 'deepdive' | 'guided' | 'socratic' | 'exam_prep';
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface MasteryRecord {
  id: string;
  topic: string;
  mastery_score: number;
  total_attempts: number;
  correct_attempts: number;
  last_practiced: string;
  misconceptions: string[];
  needs_revision: boolean;
}

export interface QuizQuestion {
  id: string;
  type: 'multiple_choice' | 'numerical';
  question: string;
  options?: { key: string; text: string }[];
  unit?: string;
  explanation?: string;
}

export interface QuizFeedback {
  question_id: string;
  is_correct: boolean;
  user_answer: any;
  correct_answer: any;
  explanation: string;
  misconception?: string;
}

export interface Note {
  id: string;
  course_id: string;
  title: string;
  content: string;
  tags: string[];
  is_bookmark: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudyPlan {
  id: string;
  course_id: string;
  title: string;
  exam_date: string;
  target_goal: string;
  topics: string[];
  schedule: {
    id: string;
    topic: string;
    repetition: number;
    date: string;
    status: 'pending' | 'completed';
    session_type: string;
  }[];
}
