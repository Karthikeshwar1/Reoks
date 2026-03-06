// Simple state management for the entire app using Zustand (since it's lighter and simpler than Redux for this use case)
export interface Chapter {
  id: string;
  title: string;
  content: string; // The raw content of the chapter
  paragraphs: string[]; // Parsed paragraphs
}

export interface Book {
  id: string;
  title: string;
  author: string;
  chapters: Chapter[];
}

export type Difficulty = 'zen' | 'lazy' | 'normal' | 'strict';
export type Theme = 'minimal' | 'explosive';

export interface Progress {
  bookId: string | null;
  chapterIndex: number;
  paragraphIndex: number;
}

export interface Settings {
  difficulty: Difficulty;
  theme: Theme;
}
