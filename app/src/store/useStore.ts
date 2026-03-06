import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Book, Progress, Settings } from '../types';

interface StoreState {
  // Books library
  books: Record<string, Book>;

  // Current user progress
  progress: Progress;

  // App settings
  settings: Settings;

  // Stats
  wpm: number;
  accuracy: number;

  // Actions
  addBook: (book: Book) => void;
  setCurrentBook: (bookId: string) => void;
  setChapterIndex: (index: number) => void;
  setParagraphIndex: (index: number) => void;
  nextParagraph: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
  updateStats: (wpm: number, accuracy: number) => void;
}

export const useStore = create<StoreState>()(
  persist(
    (set) => ({
      books: {},
      progress: {
        bookId: null,
        chapterIndex: 0,
        paragraphIndex: 0,
      },
      settings: {
        difficulty: 'normal',
        theme: 'explosive',
      },
      wpm: 0,
      accuracy: 100,

      addBook: (book) => set((state) => ({ books: { ...state.books, [book.id]: book } })),

      setCurrentBook: (bookId) => set({
        progress: { bookId, chapterIndex: 0, paragraphIndex: 0 }
      }),

      setChapterIndex: (index) => set((state) => ({
        progress: { ...state.progress, chapterIndex: index, paragraphIndex: 0 }
      })),

      setParagraphIndex: (index) => set((state) => ({
        progress: { ...state.progress, paragraphIndex: index }
      })),

      nextParagraph: () => set((state) => {
        const { bookId, chapterIndex, paragraphIndex } = state.progress;
        if (!bookId) return state;

        const book = state.books[bookId];
        if (!book) return state;

        const currentChapter = book.chapters[chapterIndex];

        if (paragraphIndex < currentChapter.paragraphs.length - 1) {
          // Go to next paragraph in current chapter
          return { progress: { ...state.progress, paragraphIndex: paragraphIndex + 1 } };
        } else if (chapterIndex < book.chapters.length - 1) {
          // Go to first paragraph of next chapter
          return { progress: { bookId, chapterIndex: chapterIndex + 1, paragraphIndex: 0 } };
        }

        // Book finished
        return state;
      }),

      updateSettings: (newSettings) => set((state) => ({
        settings: { ...state.settings, ...newSettings }
      })),

      updateStats: (wpm, accuracy) => set({ wpm, accuracy })
    }),
    {
      name: 'typebook-storage',
      // We don't persist 'books' completely to avoid blowing up localStorage.
      // In a real app with large epubs, we'd use IndexedDB.
      // For this demo, we'll just persist progress and settings.
      partialize: (state) => ({
        progress: state.progress,
        settings: state.settings,
        wpm: state.wpm,
        accuracy: state.accuracy
      }),
    }
  )
);
